/**
 * impersonationContext.js — Middleware de contexte d'impersonation.
 *
 * Si le JWT contient un bloc `impersonation: { active: true }`, ce middleware :
 *   1. Attache req.impersonation avec le contexte admin complet
 *   2. Laisse req.user intact (déjà = target user par construction du JWT)
 *      → les routes métier voient le target user de façon transparente
 *   3. Logge automatiquement l'action dans admin_action_log
 *
 * Si le JWT est normal (pas d'impersonation) : transparent, next() immédiat.
 *
 * Monté APRÈS verifyToken, AVANT les handlers métier.
 * Peut être appliqué globalement sur app.use() ou route par route.
 *
 * Usage dans server.js (exemple global) :
 *   const impersonationContext = require('./src/middleware/impersonationContext')
 *   app.use(impersonationContext)
 */

const { logAdminAction } = require('../services/impersonationService');

async function impersonationContext(req, res, next) {
  // Pas de user décodé → laisser passer (verifyToken gérera le 401)
  if (!req.user) {
    return next();
  }

  const imp = req.user.impersonation;

  // JWT normal (pas d'impersonation active) → transparent
  if (!imp || !imp.active) {
    return next();
  }

  // Attacher le contexte d'impersonation à la requête
  req.impersonation = {
    active:           true,
    admin_id:         imp.original_user_id,
    admin_email:      imp.original_email,
    admin_role:       imp.original_role,
    target_user_id:   imp.target_user_id,
    log_id:           imp.log_id,
    started_at:       imp.started_at,
  };

  // Log asynchrone de l'action (ne bloque pas la réponse)
  // On évite de logger les GET "lecture seule" pour ne pas polluer les logs
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    logAdminAction(
      imp.original_user_id,
      imp.target_user_id,
      imp.log_id,
      {
        actionType:     `${req.method} ${req.route?.path || req.path}`,
        endpoint:       req.originalUrl,
        httpMethod:     req.method,
        requestBody:    sanitizeBody(req.body),
        responseStatus: null, // On ne peut pas connaître le statut avant la réponse
      }
    ).catch(() => {});  // Silence — logAdminAction gère déjà les erreurs en interne
  }

  next();
}

/**
 * Retire les champs sensibles du body avant de les logger.
 */
function sanitizeBody(body) {
  if (!body || typeof body !== 'object') return null;
  const safe = { ...body };
  ['password', 'token', 'secret', 'card', 'cvv', 'stripe'].forEach(k => {
    if (k in safe) safe[k] = '[REDACTED]';
  });
  return safe;
}

module.exports = impersonationContext;
