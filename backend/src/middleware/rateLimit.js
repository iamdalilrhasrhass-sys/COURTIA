// backend/middleware/rateLimit.js
const rateLimit = require('express-rate-limit');

const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'too_many_requests', details: '120 requêtes max par minute' }
});

const arkLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  keyGenerator: (req) => (req.user ? `u:${req.user.id}` : `ip:${req.ip}`),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'ark_rate_limit', details: '20 appels ARK max par minute' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'too_many_attempts', details: '10 tentatives max par 15 minutes' }
});

module.exports = { globalLimiter, arkLimiter, authLimiter };
