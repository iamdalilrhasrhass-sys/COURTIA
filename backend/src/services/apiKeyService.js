/**
 * API Key Service — LOT 23
 * Gestion des clés API publiques pour intégrations tierces
 */

const crypto = require('crypto');
const pool = require('../db');

const API_KEY_PREFIX = 'sk-ark-';

/**
 * Génère une nouvelle clé API pour un utilisateur
 * @param {number} userId 
 * @param {string} name - Nom de la clé (ex: "Production", "Dev")
 * @param {string[]} scopes - Permissions accordées
 * @returns {Promise<{key: string, keyId: number}>}
 */
async function generateApiKey(userId, name = 'Default API Key', scopes = ['read:clients', 'read:contracts', 'read:commissions']) {
  // Génère une clé aléatoire de 32 bytes encodée en base64url
  const randomBytes = crypto.randomBytes(32);
  const keyRandom = randomBytes.toString('base64url');
  const fullKey = `${API_KEY_PREFIX}${keyRandom}`;
  
  // Hash la clé pour stockage sécurisé
  const keyHash = crypto.createHash('sha256').update(fullKey).digest('hex');
  const keyPrefix = fullKey.substring(0, 12); // sk-ark-XXXX pour identification
  
  const result = await pool.query(
    `INSERT INTO api_keys (user_id, key_hash, key_prefix, name, scopes)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, name, key_prefix, scopes, created_at`,
    [userId, keyHash, keyPrefix, name, scopes]
  );
  
  return {
    key: fullKey, // Retournée UNE SEULE FOIS, jamais stockée en clair
    keyId: result.rows[0].id,
    name: result.rows[0].name,
    keyPrefix: result.rows[0].key_prefix,
    scopes: result.rows[0].scopes,
    createdAt: result.rows[0].created_at
  };
}

/**
 * Valide une clé API et retourne l'utilisateur associé
 * @param {string} key - Clé complète (sk-ark-XXXX...)
 * @returns {Promise<{valid: boolean, user?: object, apiKey?: object}>}
 */
async function validateApiKey(key) {
  if (!key || !key.startsWith(API_KEY_PREFIX)) {
    return { valid: false, error: 'invalid_format' };
  }
  
  const keyHash = crypto.createHash('sha256').update(key).digest('hex');
  
  const result = await pool.query(
    `SELECT ak.id, ak.user_id, ak.name, ak.scopes, ak.key_prefix, ak.last_used_at,
            u.email, u.cabinet_name, u.plan
     FROM api_keys ak
     JOIN users u ON u.id = ak.user_id
     WHERE ak.key_hash = $1 
       AND ak.revoked_at IS NULL
       AND (ak.expires_at IS NULL OR ak.expires_at > NOW())`,
    [keyHash]
  );
  
  if (result.rows.length === 0) {
    return { valid: false, error: 'key_not_found_or_revoked' };
  }
  
  const apiKey = result.rows[0];
  
  // Met à jour last_used_at
  await pool.query(
    'UPDATE api_keys SET last_used_at = NOW() WHERE id = $1',
    [apiKey.id]
  );
  
  return {
    valid: true,
    user: {
      id: apiKey.user_id,
      email: apiKey.email,
      cabinet_name: apiKey.cabinet_name,
      plan: apiKey.plan
    },
    apiKey: {
      id: apiKey.id,
      name: apiKey.name,
      scopes: apiKey.scopes,
      keyPrefix: apiKey.key_prefix
    }
  };
}

/**
 * Révoque une clé API
 * @param {number} keyId 
 * @param {number} userId - Pour vérifier la propriété
 */
async function revokeApiKey(keyId, userId) {
  const result = await pool.query(
    `UPDATE api_keys 
     SET revoked_at = NOW() 
     WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL
     RETURNING id`,
    [keyId, userId]
  );
  
  return result.rows.length > 0;
}

/**
 * Liste les clés API d'un utilisateur
 * @param {number} userId 
 */
async function listApiKeys(userId) {
  const result = await pool.query(
    `SELECT id, name, key_prefix, scopes, last_used_at, created_at, revoked_at, expires_at
     FROM api_keys
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId]
  );
  
  return result.rows.map(row => ({
    id: row.id,
    name: row.name,
    keyPrefix: row.key_prefix,
    scopes: row.scopes,
    lastUsedAt: row.last_used_at,
    createdAt: row.created_at,
    revokedAt: row.revoked_at,
    expiresAt: row.expires_at,
    isActive: !row.revoked_at && (!row.expires_at || new Date(row.expires_at) > new Date())
  }));
}

/**
 * Enregistre l'usage d'une API key
 * @param {number} apiKeyId 
 * @param {object} details 
 */
async function logUsage(apiKeyId, { endpoint, method, statusCode, responseTimeMs, ipAddress, userAgent }) {
  await pool.query(
    `INSERT INTO api_usage (api_key_id, endpoint, method, status_code, response_time_ms, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [apiKeyId, endpoint, method || 'GET', statusCode, responseTimeMs, ipAddress, userAgent]
  );
}

/**
 * Vérifie le rate limit pour une clé (1000 req/heure)
 * @param {number} apiKeyId 
 * @returns {Promise<{allowed: boolean, remaining: number, resetAt: Date}>}
 */
async function checkRateLimit(apiKeyId, limit = 1000) {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  
  const result = await pool.query(
    `SELECT COUNT(*) as count FROM api_usage 
     WHERE api_key_id = $1 AND created_at > $2`,
    [apiKeyId, oneHourAgo]
  );
  
  const count = parseInt(result.rows[0].count, 10);
  const remaining = Math.max(0, limit - count);
  const resetAt = new Date(Date.now() + 60 * 60 * 1000);
  
  return {
    allowed: count < limit,
    remaining,
    resetAt,
    limit
  };
}

/**
 * Statistiques d'usage pour une clé
 * @param {number} apiKeyId 
 * @param {number} days 
 */
async function getUsageStats(apiKeyId, days = 30) {
  const result = await pool.query(
    `SELECT 
       DATE(created_at) as date,
       COUNT(*) as requests,
       AVG(response_time_ms)::integer as avg_response_time,
       COUNT(*) FILTER (WHERE status_code >= 400) as errors
     FROM api_usage
     WHERE api_key_id = $1 AND created_at > NOW() - INTERVAL '${days} days'
     GROUP BY DATE(created_at)
     ORDER BY date DESC`,
    [apiKeyId]
  );
  
  return result.rows;
}

// ==================== WEBHOOKS ====================

async function registerWebhook(userId, url, events = ['client.created', 'contract.created', 'commission.received']) {
  // Génère un secret pour signature des webhooks
  const secret = crypto.randomBytes(32).toString('hex');
  
  const result = await pool.query(
    `INSERT INTO api_webhooks (user_id, url, events, secret)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id) WHERE url = $2
     DO UPDATE SET events = $3, is_active = true, updated_at = NOW()
     RETURNING id, url, events, is_active, created_at`,
    [userId, url, events, secret]
  );
  
  return {
    ...result.rows[0],
    secret // Retourné une seule fois
  };
}

async function listWebhooks(userId) {
  const result = await pool.query(
    `SELECT id, url, events, is_active, last_triggered_at, failure_count, created_at
     FROM api_webhooks
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId]
  );
  
  return result.rows;
}

async function deleteWebhook(webhookId, userId) {
  const result = await pool.query(
    'DELETE FROM api_webhooks WHERE id = $1 AND user_id = $2 RETURNING id',
    [webhookId, userId]
  );
  
  return result.rows.length > 0;
}

async function triggerWebhook(userId, event, payload) {
  const webhooks = await pool.query(
    `SELECT id, url, secret FROM api_webhooks 
     WHERE user_id = $1 AND is_active = true AND $2 = ANY(events)`,
    [userId, event]
  );
  
  const results = [];
  
  for (const webhook of webhooks.rows) {
    try {
      const timestamp = Date.now();
      const body = JSON.stringify({ event, payload, timestamp });
      const signature = crypto
        .createHmac('sha256', webhook.secret)
        .update(body)
        .digest('hex');
      
      // En production, utiliser fetch pour envoyer le webhook
      // Pour le mock, on simule juste le succès
      await pool.query(
        `UPDATE api_webhooks SET last_triggered_at = NOW(), failure_count = 0 WHERE id = $1`,
        [webhook.id]
      );
      
      results.push({ webhookId: webhook.id, success: true });
    } catch (error) {
      await pool.query(
        `UPDATE api_webhooks SET failure_count = failure_count + 1 WHERE id = $1`,
        [webhook.id]
      );
      results.push({ webhookId: webhook.id, success: false, error: error.message });
    }
  }
  
  return results;
}

module.exports = {
  generateApiKey,
  validateApiKey,
  revokeApiKey,
  listApiKeys,
  logUsage,
  checkRateLimit,
  getUsageStats,
  registerWebhook,
  listWebhooks,
  deleteWebhook,
  triggerWebhook,
  API_KEY_PREFIX
};
