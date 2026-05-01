/**
 * impersonationService.js — STUB SÉCURISÉ
 * 
 * L'impersonation est TEMPORAIREMENT DÉSACTIVÉE pour audit sécurité.
 * 
 * Toutes les fonctions exportent les signatures attendues par adminSuperAdmin.js
 * et impersonationContext.js, mais :
 *   - AUCUN JWT d'impersonation n'est généré
 *   - AUCUNE session d'impersonation n'est ouverte
 *   - Les tentatives sont logguées (si la table existe)
 *   - Les routes admin restent stables (pas de crash)
 */

const pool = require('../db');

function disabledError() {
  const err = new Error("Impersonation temporairement désactivée pour audit sécurité.");
  err.status = 501;
  return err;
}

/**
 * startImpersonation — BLOQUÉ
 * Loggue la tentative mais refuse l'impersonation.
 */
async function startImpersonation(adminId, targetId, ctx = {}) {
  // Logger la tentative (best-effort, ne bloque pas si la table n'existe pas)
  try {
    await pool.query(
      `INSERT INTO admin_audit_logs
        (admin_user_id, action, target_type, target_id, details, ip_address, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [
        adminId || null,
        'IMPERSONATION_BLOCKED',
        'user',
        targetId || null,
        JSON.stringify({
          reason: ctx.reason || null,
          message: 'Impersonation attempted but disabled pending security audit'
        }),
        ctx.ip || null
      ]
    );
  } catch (e) {
    // Table peut ne pas exister encore — ne pas casser la route
  }
  throw disabledError();
}

/**
 * stopImpersonation — Réponse propre
 */
async function stopImpersonation(adminId, logId) {
  return {
    stopped: true,
    disabled: true,
    message: "Impersonation non active : fonctionnalité désactivée pour audit sécurité."
  };
}

/**
 * logAdminAction — Fire-and-forget
 * Loggue les actions admin sans bloquer la réponse.
 */
async function logAdminAction(adminUserId, targetUserId, logId, details = {}) {
  try {
    await pool.query(
      `INSERT INTO admin_audit_logs
        (admin_user_id, action, target_type, target_id, details, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [
        adminUserId || null,
        details.actionType || 'ADMIN_ACTION',
        'user',
        targetUserId || null,
        JSON.stringify(details)
      ]
    );
  } catch (e) {
    // Fire-and-forget — ne jamais faire tomber l'API pour un log
  }
}

/**
 * getImpersonationLogs — Retourne tableau vide (pas de sessions actives)
 */
async function getImpersonationLogs() {
  return [];
}

module.exports = {
  startImpersonation,
  stopImpersonation,
  logAdminAction,
  getImpersonationLogs,
};
