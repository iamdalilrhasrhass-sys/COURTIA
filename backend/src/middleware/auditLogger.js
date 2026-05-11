/**
 * Audit Logger Middleware — LOT 23
 * Log automatique des actions sensibles pour audit trail
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
 * Sauvegarde l'entrée d'audit dans la base
 */
async function saveAuditLog(entry) {
  try {
    await pool.query(
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
  
  const sensitiveFields = ['password', 'token', 'secret', 'api_key', 'apiKey', 'key_hash', 'config_encrypted'];
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

module.exports = {
  auditLog,
  logAction,
  saveAuditLog,
  getAuditLogs,
  sanitizeForAudit,
  AUDITED_ACTIONS
};
