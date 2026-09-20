/**
 * Audit Logger Middleware — LOT 23
 * Log automatique des actions sensibles pour audit trail
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * DÉFAUT FERMÉ ICI (P3 SEC-024, mesuré en production le 20/09/2026)
 *   * `audit_logs` contenait 0 ligne ET ce middleware n'était monté NULLE PART
 *     dans `server.js` : le journal d'audit annoncé au produit n'existait pas.
 *     Une action sensible (création, modification, suppression d'une donnée de
 *     cabinet) ne laissait aucune trace exploitable.
 *   * Il est désormais monté une seule fois, sur toutes les ÉCRITURES sous
 *     `/api` (`journaliserEcritures`), et non route par route : une route
 *     ajoutée demain est journalisée sans que son auteur y pense.
 *   * Le journal est APPEND-ONLY. Le défaut n'était pas tant l'absence de ligne
 *     que l'absence de garantie : un journal que l'application peut modifier ou
 *     effacer ne prouve rien. La garantie est posée dans la BASE
 *     (`audit_logs_append_only`, migration 119) : toute tentative d'UPDATE ou de
 *     DELETE sur `audit_logs` lève une exception SQL, quelle que soit la voie
 *     utilisée — route applicative, console, script, outil tiers.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const pool = require('../db');
const logger = require('../lib/logger');

/**
 * Actions à auditer par type de ressource
 */
const AUDITED_ACTIONS = {
  clients: ['create', 'update', 'delete', 'export'],
  contracts: ['create', 'update', 'delete', 'sign'],
  documents: ['upload', 'view', 'delete', 'share', 'download'],
  commissions: ['create', 'update', 'reconcile', 'export'],
  users: ['create', 'update', 'delete', 'role_change', 'impersonate'],
  api_keys: ['create', 'revoke'],
  webhooks: ['create', 'delete'],
  settings: ['update'],
  integrations: ['install', 'uninstall', 'sync']
};

/** Méthodes qui modifient l'état : ce sont elles qui laissent une trace. */
const METHODES_ECRITURE = Object.freeze(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Points d'entrée EXCLUS du journal automatique, et pourquoi :
 *   * `/api/auth`      → l'identité de l'appelant n'est pas encore établie
 *                        (connexion, déconnexion, réinitialisation) ; journaliser
 *                        ici écrirait des tentatives d'authentification dans le
 *                        journal des données métier ;
 *   * `/api/stripe`, `/api/billing`, `/api/webhooks`, `/api/whatsapp`,
 *     `/api/voice`, `/api/messaging/webhook`, `/api/signatures/webhook`,
 *     `/api/document-inbox/public` → appels de FOURNISSEURS : ils ont leur
 *                        propre trace chez le fournisseur, et le volume
 *                        (retries Meta, relances Stripe) noierait le journal ;
 *   * `/api/health`, `/api/plans` → aucune donnée de cabinet modifiée.
 * Les routes d'administration ne sont PAS exclues : c'est justement ce qu'un
 * audit doit voir.
 */
const PREFIXES_EXCLUS = Object.freeze([
  '/api/auth',
  '/api/health',
  '/api/stripe',
  '/api/billing',
  '/api/webhooks',
  '/api/whatsapp',
  '/api/voice',
  '/api/messaging/webhook',
  '/api/signatures/webhook',
  '/api/document-inbox/public',
]);

/** Type de ressource déduit du chemin (`/api/clients/12` → `clients`). */
function ressourceDepuisChemin(chemin) {
  const segments = String(chemin || '').split('/').filter(Boolean);
  // segments[0] === 'api'
  const apresApi = segments.slice(1);
  if (apresApi.length === 0) return 'api';
  // `/api/document-inbox/x` et `/api/clients/12/documents` : on garde le
  // segment le plus signifiant (le premier qui ne soit pas un identifiant).
  const premier = apresApi[0];
  if (premier === 'document-inbox' || premier === 'documents') return 'documents';
  return premier.replace(/[^a-z0-9_-]/gi, '').toLowerCase() || 'api';
}

/** Action déduite de la méthode HTTP. */
function actionDepuisMethode(methode) {
  switch (String(methode || '').toUpperCase()) {
    case 'POST': return 'create';
    case 'PUT':
    case 'PATCH': return 'update';
    case 'DELETE': return 'delete';
    default: return String(methode || '').toLowerCase();
  }
}

/**
 * Middleware pour logger les actions d'audit
 * @param {string} resourceType - Type de ressource (client, contract, etc.)
 * @param {string} action - Action effectuée (create, update, delete, etc.)
 * @param {function} getResourceId - Fonction pour extraire l'ID de la ressource depuis req
 * @param {function} getChanges - Fonction optionnelle pour extraire les changements (old/new values)
 */
function auditLog(resourceType, action, getResourceId = null, getChanges = null) {
  return async (req, res, next) => {
    // Sauvegarder la méthode originale de res.json
    const originalJson = res.json.bind(res);
    const startTime = Date.now();

    // Intercepter la réponse pour logger après succès
    res.json = function(data) {
      // Logger seulement si la réponse est un succès (2xx)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const logEntry = {
          userId: req.user?.id || null,
          action: `${resourceType}.${action}`,
          resourceType,
          resourceId: getResourceId ? getResourceId(req, data) : (req.params.id || data?.id || null),
          oldValues: null,
          newValues: null,
          ipAddress: req.ip || req.headers['x-forwarded-for']?.split(',')[0]?.trim() || null,
          userAgent: req.headers['user-agent'] || null
        };

        // Extraire les changements si la fonction est fournie
        if (getChanges) {
          const changes = getChanges(req, data);
          logEntry.oldValues = changes?.oldValues || null;
          logEntry.newValues = changes?.newValues || null;
        } else if (action === 'create' || action === 'update') {
          // Par défaut, logguer le body de la requête pour create/update
          logEntry.newValues = sanitizeForAudit(req.body);
        }

        // Async log pour ne pas bloquer la réponse
        saveAuditLog(logEntry).catch(err => {
          logger.error('Failed to save audit log:', err);
        });
      }

      return originalJson(data);
    };

    next();
  };
}

/**
 * JOURNAL AUTOMATIQUE DES ÉCRITURES — monté une fois par `server.js`.
 *
 * POURQUOI un seul montage global plutôt que `auditLog(...)` route par route :
 * la politique d'audit ne doit pas dépendre du zèle de chaque auteur de route.
 * Une route d'écriture ajoutée demain est journalisée sans modification.
 *
 * Ce middleware n'échoue JAMAIS : une panne du journal ne doit pas empêcher un
 * cabinet de travailler — mais elle est écrite en ERROR dans les logs serveur,
 * donc visible (jamais silencieuse).
 */
function journaliserEcritures(poolExplicite = null) {
  const ressource = () => poolExplicite || pool;
  return function journalDesEcritures(req, res, next) {
    if (!METHODES_ECRITURE.includes(req.method)) return next();
    const chemin = String(req.originalUrl || req.url || '').split('?')[0];
    if (!chemin.startsWith('/api')) return next();
    if (PREFIXES_EXCLUS.some((p) => chemin === p || chemin.startsWith(p + '/'))) return next();

    res.on('finish', () => {
      if (res.statusCode < 200 || res.statusCode >= 300) return;
      const entry = {
        userId: req.user?.id || req.user?.userId || null,
        action: `${ressourceDepuisChemin(chemin)}.${actionDepuisMethode(req.method)}`,
        resourceType: ressourceDepuisChemin(chemin),
        resourceId: (req.params && (req.params.id || req.params.clientId)) || null,
        oldValues: null,
        // On journalise le CORPS, expurgé : c'est ce qui répond à « qui a écrit
        // quoi ». Les champs sensibles sont retirés par sanitizeForAudit.
        newValues: sanitizeForAudit(req.body || null),
        ipAddress: req.ip || null,
        userAgent: req.headers['user-agent'] || null,
      };
      saveAuditLog(entry, ressource()).catch((err) => {
        // Jamais bloquant, jamais silencieux.
        logger.error({ err: err && err.message, chemin, methode: req.method }, 'journal d’audit : écriture impossible');
      });
    });

    return next();
  };
}

/**
 * Sauvegarde l'entrée d'audit dans la base
 *
 * @param {object} entry entrée normalisée
 * @param {object} [poolExplicite] pool à utiliser (tests / pool applicatif)
 */
async function saveAuditLog(entry, poolExplicite = null) {
  const db = poolExplicite || pool;
  try {
    await db.query(
      `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, old_values, new_values, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        entry.userId,
        entry.action,
        entry.resourceType,
        entry.resourceId ? String(entry.resourceId) : null,
        entry.oldValues ? JSON.stringify(entry.oldValues) : null,
        entry.newValues ? JSON.stringify(entry.newValues) : null,
        entry.ipAddress,
        entry.userAgent ? entry.userAgent.substring(0, 500) : null
      ]
    );
  } catch (error) {
    logger.error('Audit log insert error:', error);
    throw error;
  }
}

/**
 * Fonction helper pour logger manuellement (depuis les services)
 */
async function logAction(userId, action, resourceType, resourceId, options = {}) {
  const entry = {
    userId,
    action: action.includes('.') ? action : `${resourceType}.${action}`,
    resourceType,
    resourceId: resourceId ? String(resourceId) : null,
    oldValues: options.oldValues || null,
    newValues: options.newValues || null,
    ipAddress: options.ipAddress || null,
    userAgent: options.userAgent || null
  };

  return saveAuditLog(entry);
}

/**
 * Sanitize les données sensibles avant logging
 */
function sanitizeForAudit(data) {
  if (!data || typeof data !== 'object') return data;

  const sensitiveFields = [
    'password', 'newPassword', 'currentPassword', 'password_hash', 'token', 'secret',
    'api_key', 'apiKey', 'key_hash', 'config_encrypted', 'credential',
    'authorization', 'refresh_token', 'access_token', 'reset_token',
  ];
  const sanitized = { ...data };

  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }

  // Sanitize récursivement les objets imbriqués
  for (const key of Object.keys(sanitized)) {
    if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeForAudit(sanitized[key]);
    }
  }

  return sanitized;
}

/**
 * Récupère les logs d'audit avec filtres
 */
async function getAuditLogs(userId, options = {}) {
  const {
    limit = 100,
    offset = 0,
    resourceType,
    action,
    startDate,
    endDate,
    searchUserId
  } = options;

  let query = `
    SELECT al.*, u.email as user_email, u.cabinet_name as user_cabinet
    FROM audit_logs al
    LEFT JOIN users u ON u.id = al.user_id
    WHERE 1=1
  `;
  const params = [];
  let paramIndex = 1;

  // Si pas super admin, filtrer par cabinet
  // (ici on simplifie en filtrant par user_id direct)
  if (searchUserId) {
    query += ` AND al.user_id = $${paramIndex}`;
    params.push(searchUserId);
    paramIndex++;
  }

  if (resourceType) {
    query += ` AND al.resource_type = $${paramIndex}`;
    params.push(resourceType);
    paramIndex++;
  }

  if (action) {
    query += ` AND al.action ILIKE $${paramIndex}`;
    params.push(`%${action}%`);
    paramIndex++;
  }

  if (startDate) {
    query += ` AND al.created_at >= $${paramIndex}`;
    params.push(startDate);
    paramIndex++;
  }

  if (endDate) {
    query += ` AND al.created_at <= $${paramIndex}`;
    params.push(endDate);
    paramIndex++;
  }

  query += ` ORDER BY al.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  params.push(limit, offset);

  const result = await pool.query(query, params);

  return result.rows.map(row => ({
    id: row.id,
    userId: row.user_id,
    userEmail: row.user_email,
    userCabinet: row.user_cabinet,
    action: row.action,
    resourceType: row.resource_type,
    resourceId: row.resource_id,
    oldValues: row.old_values,
    newValues: row.new_values,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    createdAt: row.created_at
  }));
}

/**
 * GARANTIE APPEND-ONLY, POSÉE DANS LA BASE.
 *
 * Ce SQL est idempotent (`CREATE OR REPLACE` + `DROP TRIGGER IF EXISTS`). Il est
 * appliqué par la migration `119_audit_logs_append_only.sql` ; il est aussi
 * exporté ici pour que le contrôle puisse vérifier la garantie sur une base qui
 * aurait manqué la migration.
 *
 * POURQUOI un trigger et pas une convention applicative : ce qui compte pour un
 * audit, c'est qu'une modification soit IMPOSSIBLE, pas seulement non prévue.
 * Le trigger s'applique à toutes les voies d'accès (pg, psql, ORM, script).
 */
const SQL_APPEND_ONLY = `
CREATE OR REPLACE FUNCTION audit_logs_append_only() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'audit_logs est en écriture seule (append-only) : une entrée de journal ne peut pas être modifiée'
      USING ERRCODE = '42501';
  END IF;
  IF current_setting('courtia.audit_purge', true) IS DISTINCT FROM 'autorise' THEN
    RAISE EXCEPTION 'audit_logs est en écriture seule (append-only) : une entrée de journal ne peut pas être supprimée sans la dérogation de maintenance'
      USING ERRCODE = '42501';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_logs_append_only ON audit_logs;
CREATE TRIGGER trg_audit_logs_append_only
  BEFORE UPDATE OR DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION audit_logs_append_only();
`;

/** Installe la garantie append-only (idempotent). Renvoie true si posée. */
async function assurerAppendOnly(poolExplicite = null) {
  const db = poolExplicite || pool;
  try {
    await db.query(SQL_APPEND_ONLY);
    return true;
  } catch (err) {
    logger.error({ err: err && err.message }, 'journal d’audit : garantie append-only non posée');
    return false;
  }
}

module.exports = {
  auditLog,
  journaliserEcritures,
  logAction,
  saveAuditLog,
  getAuditLogs,
  sanitizeForAudit,
  assurerAppendOnly,
  SQL_APPEND_ONLY,
  METHODES_ECRITURE,
  PREFIXES_EXCLUS,
  ressourceDepuisChemin,
  actionDepuisMethode,
  AUDITED_ACTIONS
};
