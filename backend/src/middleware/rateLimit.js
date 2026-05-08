// backend/middleware/rateLimit.js
const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'too_many_requests', details: '300 requêtes max toutes les 15 minutes' }
});

const healthLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 240,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'too_many_requests', details: 'Limiter /health atteint temporairement' }
});

const arkLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'ark_rate_limit', details: '20 appels ARK max par minute' }
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: {
    error: 'too_many_attempts',
    details: 'Trop de tentatives de connexion. Patientez quelques minutes avant de réessayer.'
  }
});

const meLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'session_rate_limit',
    details: 'Vérification de session temporairement limitée. Réessayez dans quelques secondes.'
  }
});

module.exports = { apiLimiter, healthLimiter, arkLimiter, loginLimiter, meLimiter };
