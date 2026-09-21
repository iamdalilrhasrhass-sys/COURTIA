/**
 * Enterprise Routes — LOT 23
 * Fonctionnalités grands comptes : Audit logs, Rôles, SSO
 */

const express = require('express');
const router = express.Router();
const pool = require('../db');
const verifyToken = require('../middleware/authMiddleware');
const { getAuditLogs, logAction } = require('../middleware/auditLogger');
const { getSafeUserId, normalizeCabinetRole } = require('../services/cabinetMembershipService');
const { messagePublic } = require('../lib/erreursPubliques')

// ==================== GARDE CABINET (SEC-005 / SEC-010) ====================
//
// Les routes de gestion des rôles s'appuyaient sur `req.user.cabinet_id`, une
// revendication du jeton JWT : n'importe quel porteur d'un jeton valide pouvait
// lire/modifier/supprimer les rôles et les attributions d'un AUTRE cabinet en la
// falsifiant, et un utilisateur sans aucun rattachement `cabinet_members`
// pouvait créer des rôles orphelins. Le cabinet est désormais RÉSOLU CÔTÉ
// SERVEUR depuis `cabinet_members` (jamais depuis le jeton) et ces routes sont
// réservées aux rôles owner/admin du cabinet (ou super_admin plateforme).

// 'admin' est normalisé en 'manager' par le modèle cabinet.
const ADMIN_CABINET_ROLES = new Set(['owner', 'manager']);

async function requireCabinetAdmin(req, res, next) {
  try {
    const userId = getSafeUserId(req.user);
    if (!userId) {
      return res.status(401).json({ error: 'auth_required', message: 'Authentification requise.' });
    }

    const memberships = await pool.query(
      `SELECT cabinet_id, role
         FROM cabinet_members
        WHERE user_id = $1 AND removed_at IS NULL
        ORDER BY created_at ASC`,
      [userId]
    );

    if (memberships.rows.length === 0) {
      return res.status(403).json({
        error: 'cabinet_required',
        message: 'Aucun cabinet associé à ce compte : ces routes sont réservées aux membres d\'un cabinet.'
      });
    }

    // super_admin plateforme : rattachement facultatif.
    if (String(req.user?.role || '').toLowerCase() === 'super_admin') {
      req.cabinetId = memberships.rows[0].cabinet_id;
      return next();
    }

    const adminMembership = memberships.rows.find((row) => {
      try {
        return ADMIN_CABINET_ROLES.has(normalizeCabinetRole(row.role));
      } catch (e) {
        return false;
      }
    });

    if (!adminMembership) {
      return res.status(403).json({
        error: 'forbidden_role',
        message: 'Réservé aux rôles owner/admin du cabinet.'
      });
    }

    req.cabinetId = adminMembership.cabinet_id;
    req.cabinetMembership = adminMembership;
    return next();
  } catch (error) {
    console.error('requireCabinetAdmin error:', error);
    return res.status(500).json({ error: 'internal_error', message: messagePublic(error, { statut: 500 }) });
  }
}

/**
 * L'utilisateur cible appartient-il bien au cabinet résolu côté serveur ?
 */
async function isUserInCabinet(userId, cabinetId) {
  if (!cabinetId || !Number.isFinite(Number(userId))) return false;
  const result = await pool.query(
    `SELECT 1 FROM cabinet_members
      WHERE user_id = $1 AND cabinet_id = $2 AND removed_at IS NULL
      LIMIT 1`,
    [Number(userId), cabinetId]
  );
  return result.rows.length > 0;
}

// ==================== AUDIT LOGS ====================

/**
 * GET /api/enterprise/audit-logs
 * Historique des actions (qui a fait quoi quand)
 */
router.get('/audit-logs', verifyToken, async (req, res) => {
  try {
    const { limit = 100, offset = 0, resource_type, action, start_date, end_date } = req.query;
    
    const logs = await getAuditLogs(req.user.id, {
      limit: Math.min(parseInt(limit, 10), 500),
      offset: parseInt(offset, 10),
      resourceType: resource_type,
      action,
      startDate: start_date,
      endDate: end_date,
      searchUserId: req.user.role === 'super_admin' ? null : req.user.id
    });
    
    // Compter le total
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM audit_logs WHERE user_id = $1`,
      [req.user.id]
    );
    
    res.json({
      logs,
      pagination: {
        total: parseInt(countResult.rows[0].count, 10),
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10)
      }
    });
  } catch (error) {
    console.error('GET /audit-logs error:', error);
    res.status(500).json({ error: 'internal_error', message: messagePublic(error, { statut: 500 }) });
  }
});

/**
 * GET /api/enterprise/audit-logs/stats
 * Statistiques d'audit (pour dashboard)
 */
router.get('/audit-logs/stats', verifyToken, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    
    // Actions par jour
    const actionsPerDay = await pool.query(
      `SELECT DATE(created_at) as date, COUNT(*) as count
       FROM audit_logs
       WHERE user_id = $1 AND created_at > NOW() - INTERVAL '${days} days'
       GROUP BY DATE(created_at)
       ORDER BY date DESC`,
      [req.user.id]
    );
    
    // Top actions
    const topActions = await pool.query(
      `SELECT action, COUNT(*) as count
       FROM audit_logs
       WHERE user_id = $1 AND created_at > NOW() - INTERVAL '${days} days'
       GROUP BY action
       ORDER BY count DESC
       LIMIT 10`,
      [req.user.id]
    );
    
    // Top resources
    const topResources = await pool.query(
      `SELECT resource_type, COUNT(*) as count
       FROM audit_logs
       WHERE user_id = $1 AND created_at > NOW() - INTERVAL '${days} days'
       GROUP BY resource_type
       ORDER BY count DESC
       LIMIT 10`,
      [req.user.id]
    );
    
    res.json({
      actionsPerDay: actionsPerDay.rows,
      topActions: topActions.rows,
      topResources: topResources.rows,
      period: `${days} days`
    });
  } catch (error) {
    console.error('GET /audit-logs/stats error:', error);
    res.status(500).json({ error: 'internal_error', message: messagePublic(error, { statut: 500 }) });
  }
});

// ==================== RÔLES & PERMISSIONS ====================

/**
 * GET /api/enterprise/roles
 * Liste des rôles disponibles
 */
router.get('/roles', verifyToken, async (req, res) => {
  try {
    // Rôles système + rôles custom du cabinet
    const result = await pool.query(
      `SELECT id, name, description, permissions, is_system, created_at
       FROM enterprise_roles
       WHERE is_system = true OR cabinet_id = $1
       ORDER BY is_system DESC, name ASC`,
      [req.user.cabinet_id || null]
    );
    
    res.json({ roles: result.rows });
  } catch (error) {
    console.error('GET /roles error:', error);
    res.status(500).json({ error: 'internal_error', message: messagePublic(error, { statut: 500 }) });
  }
});

/**
 * POST /api/enterprise/roles
 * Crée un rôle personnalisé
 */
router.post('/roles', verifyToken, requireCabinetAdmin, async (req, res) => {
  try {
    const { name, description, permissions } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'missing_name', message: 'Le nom du rôle est requis' });
    }
    
    // Vérifier que le nom n'existe pas déjà
    const existing = await pool.query(
      `SELECT id FROM enterprise_roles WHERE name = $1 AND (is_system = true OR cabinet_id = $2)`,
      [name, req.cabinetId]
    );
    
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'role_exists', message: 'Un rôle avec ce nom existe déjà' });
    }
    
    const result = await pool.query(
      `INSERT INTO enterprise_roles (cabinet_id, name, description, permissions, is_system)
       VALUES ($1, $2, $3, $4, false)
       RETURNING *`,
      [req.cabinetId, name, description || '', permissions || {}]
    );
    
    // Log audit
    await logAction(req.user.id, 'create', 'roles', result.rows[0].id, {
      newValues: { name, permissions },
      ipAddress: req.ip
    });
    
    res.status(201).json({ role: result.rows[0] });
  } catch (error) {
    console.error('POST /roles error:', error);
    res.status(500).json({ error: 'internal_error', message: messagePublic(error, { statut: 500 }) });
  }
});

/**
 * PUT /api/enterprise/roles/:id
 * Modifie un rôle personnalisé
 */
router.put('/roles/:id', verifyToken, requireCabinetAdmin, async (req, res) => {
  try {
    const { name, description, permissions } = req.body;
    
    // Vérifier que ce n'est pas un rôle système
    const existing = await pool.query(
      `SELECT * FROM enterprise_roles WHERE id = $1`,
      [req.params.id]
    );
    
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'role_not_found' });
    }
    
    if (existing.rows[0].is_system) {
      return res.status(403).json({ error: 'cannot_edit_system_role', message: 'Les rôles système ne peuvent pas être modifiés' });
    }

    // SEC-005 : un rôle d'un AUTRE cabinet est introuvable (pas de fuite
    // d'existence, aucune modification possible).
    if (Number(existing.rows[0].cabinet_id) !== Number(req.cabinetId)) {
      return res.status(404).json({ error: 'role_not_found' });
    }
    
    const result = await pool.query(
      `UPDATE enterprise_roles 
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           permissions = COALESCE($3, permissions),
           updated_at = NOW()
       WHERE id = $4 AND cabinet_id = $5
       RETURNING *`,
      [name, description, permissions, req.params.id, req.cabinetId]
    );
    
    // Log audit
    await logAction(req.user.id, 'update', 'roles', req.params.id, {
      oldValues: { name: existing.rows[0].name, permissions: existing.rows[0].permissions },
      newValues: { name, permissions },
      ipAddress: req.ip
    });
    
    res.json({ role: result.rows[0] });
  } catch (error) {
    console.error('PUT /roles/:id error:', error);
    res.status(500).json({ error: 'internal_error', message: messagePublic(error, { statut: 500 }) });
  }
});

/**
 * DELETE /api/enterprise/roles/:id
 * Supprime un rôle personnalisé
 */
router.delete('/roles/:id', verifyToken, requireCabinetAdmin, async (req, res) => {
  try {
    const existing = await pool.query(
      `SELECT * FROM enterprise_roles WHERE id = $1`,
      [req.params.id]
    );
    
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'role_not_found' });
    }
    
    if (existing.rows[0].is_system) {
      return res.status(403).json({ error: 'cannot_delete_system_role', message: 'Les rôles système ne peuvent pas être supprimés' });
    }

    // SEC-005 : suppression limitée au cabinet résolu côté serveur.
    if (Number(existing.rows[0].cabinet_id) !== Number(req.cabinetId)) {
      return res.status(404).json({ error: 'role_not_found' });
    }
    
    await pool.query('DELETE FROM enterprise_roles WHERE id = $1 AND cabinet_id = $2', [req.params.id, req.cabinetId]);
    
    // Log audit
    await logAction(req.user.id, 'delete', 'roles', req.params.id, {
      oldValues: { name: existing.rows[0].name },
      ipAddress: req.ip
    });
    
    res.json({ message: 'Rôle supprimé' });
  } catch (error) {
    console.error('DELETE /roles/:id error:', error);
    res.status(500).json({ error: 'internal_error', message: messagePublic(error, { statut: 500 }) });
  }
});

/**
 * POST /api/enterprise/users/:userId/roles
 * Assigne un rôle à un utilisateur
 */
router.post('/users/:userId/roles', verifyToken, requireCabinetAdmin, async (req, res) => {
  try {
    const { role_id } = req.body;
    const targetUserId = parseInt(req.params.userId, 10);
    
    if (!role_id) {
      return res.status(400).json({ error: 'missing_role_id' });
    }

    // SEC-010 : l'utilisateur cible doit appartenir au cabinet résolu côté serveur.
    if (!(await isUserInCabinet(targetUserId, req.cabinetId))) {
      return res.status(403).json({
        error: 'user_not_in_cabinet',
        message: 'Cet utilisateur n\'appartient pas à votre cabinet.'
      });
    }
    
    // Vérifier que le rôle existe ET qu'il est attribuable par ce cabinet
    const roleExists = await pool.query(
      'SELECT id, name, cabinet_id FROM enterprise_roles WHERE id = $1',
      [role_id]
    );
    
    if (roleExists.rows.length === 0) {
      return res.status(404).json({ error: 'role_not_found' });
    }

    const roleCible = roleExists.rows[0];
    if (roleCible.cabinet_id != null && Number(roleCible.cabinet_id) !== Number(req.cabinetId)) {
      return res.status(403).json({
        error: 'role_not_in_cabinet',
        message: 'Ce rôle appartient à un autre cabinet.'
      });
    }
    
    // Assigner le rôle (upsert)
    await pool.query(
      `INSERT INTO user_roles (user_id, role_id, granted_by)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, role_id) DO NOTHING`,
      [targetUserId, role_id, req.user.id]
    );
    
    // Log audit
    await logAction(req.user.id, 'role_change', 'users', targetUserId, {
      newValues: { role_id, role_name: roleCible.name },
      ipAddress: req.ip
    });
    
    res.json({ message: 'Rôle assigné', userId: targetUserId, roleId: role_id });
  } catch (error) {
    console.error('POST /users/:userId/roles error:', error);
    res.status(500).json({ error: 'internal_error', message: messagePublic(error, { statut: 500 }) });
  }
});

/**
 * GET /api/enterprise/users/:userId/roles
 * Liste les rôles d'un utilisateur
 */
router.get('/users/:userId/roles', verifyToken, requireCabinetAdmin, async (req, res) => {
  try {
    // SEC-010 : les rôles d'un utilisateur d'un autre cabinet ne sont pas lisibles.
    if (!(await isUserInCabinet(req.params.userId, req.cabinetId))) {
      return res.status(403).json({
        error: 'user_not_in_cabinet',
        message: 'Cet utilisateur n\'appartient pas à votre cabinet.'
      });
    }

    const result = await pool.query(
      `SELECT er.*, ur.granted_at, u.email as granted_by_email
       FROM user_roles ur
       JOIN enterprise_roles er ON er.id = ur.role_id
       LEFT JOIN users u ON u.id = ur.granted_by
       WHERE ur.user_id = $1`,
      [req.params.userId]
    );
    
    res.json({ roles: result.rows });
  } catch (error) {
    console.error('GET /users/:userId/roles error:', error);
    res.status(500).json({ error: 'internal_error', message: messagePublic(error, { statut: 500 }) });
  }
});

/**
 * DELETE /api/enterprise/users/:userId/roles/:roleId
 * Retire un rôle à un utilisateur
 */
router.delete('/users/:userId/roles/:roleId', verifyToken, requireCabinetAdmin, async (req, res) => {
  try {
    // SEC-010 : retrait limité aux utilisateurs du cabinet résolu côté serveur.
    if (!(await isUserInCabinet(req.params.userId, req.cabinetId))) {
      return res.status(403).json({
        error: 'user_not_in_cabinet',
        message: 'Cet utilisateur n\'appartient pas à votre cabinet.'
      });
    }

    await pool.query(
      'DELETE FROM user_roles WHERE user_id = $1 AND role_id = $2',
      [req.params.userId, req.params.roleId]
    );
    
    // Log audit
    await logAction(req.user.id, 'role_change', 'users', req.params.userId, {
      oldValues: { removed_role_id: req.params.roleId },
      ipAddress: req.ip
    });
    
    res.json({ message: 'Rôle retiré' });
  } catch (error) {
    console.error('DELETE /users/:userId/roles/:roleId error:', error);
    res.status(500).json({ error: 'internal_error', message: messagePublic(error, { statut: 500 }) });
  }
});

// ==================== SSO (PLACEHOLDER) ====================

/**
 * GET /api/enterprise/sso
 * Configuration SSO actuelle
 */
router.get('/sso', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, provider, entity_id, sso_url, is_active, created_at, updated_at
       FROM sso_configurations
       WHERE cabinet_id = $1`,
      [req.user.cabinet_id || req.user.id]
    );
    
    res.json({
      configured: result.rows.length > 0,
      config: result.rows[0] || null,
      supported_providers: ['saml', 'oidc'],
      note: 'Configuration SSO disponible sur les plans Enterprise. Contactez-nous pour l\'activation.'
    });
  } catch (error) {
    console.error('GET /sso error:', error);
    res.status(500).json({ error: 'internal_error', message: messagePublic(error, { statut: 500 }) });
  }
});

/**
 * POST /api/enterprise/sso
 * Configure SSO (placeholder - nécessite plan Enterprise)
 */
router.post('/sso', verifyToken, async (req, res) => {
  try {
    // Vérifier le plan
    if (req.user.plan !== 'enterprise') {
      return res.status(403).json({
        error: 'enterprise_required',
        message: 'La configuration SSO est réservée aux plans Enterprise.'
      });
    }
    
    const { provider, entity_id, sso_url, certificate, client_id, client_secret } = req.body;
    
    if (!provider || !['saml', 'oidc'].includes(provider)) {
      return res.status(400).json({ error: 'invalid_provider', message: 'Provider doit être saml ou oidc' });
    }
    
    const result = await pool.query(
      `INSERT INTO sso_configurations (cabinet_id, provider, entity_id, sso_url, certificate, client_id, client_secret)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (cabinet_id) 
       DO UPDATE SET provider = $2, entity_id = $3, sso_url = $4, certificate = $5, 
                     client_id = $6, client_secret = $7, updated_at = NOW()
       RETURNING id, provider, is_active`,
      [req.user.cabinet_id || req.user.id, provider, entity_id, sso_url, certificate, client_id, client_secret]
    );
    
    res.json({
      message: 'Configuration SSO enregistrée',
      config: result.rows[0]
    });
  } catch (error) {
    console.error('POST /sso error:', error);
    res.status(500).json({ error: 'internal_error', message: messagePublic(error, { statut: 500 }) });
  }
});

module.exports = router;
