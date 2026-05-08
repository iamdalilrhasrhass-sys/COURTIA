// backend/middleware/rateLimit.js
const crypto = require('crypto');
const rateLimitPkg = require('express-rate-limit');

const rateLimit = rateLimitPkg.rateLimit || rateLimitPkg;
const ipKeyGenerator = rateLimitPkg.ipKeyGenerator || ((ip) => ip);

function toPositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function isPreviewLikeEnv() {
  return process.env.NODE_ENV !== 'production' || process.env.VERCEL_ENV === 'preview';
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    const first = forwarded.split(',')[0].trim();
    if (first) return first;
  }
  return req.ip || req.socket?.remoteAddress || '0.0.0.0';
}

function fingerprintToken(req) {
  const auth = String(req.headers.authorization || '');
  if (!auth.startsWith('Bearer ')) return 'anonymous';
  const token = auth.slice(7).trim();
  if (!token) return 'anonymous';
  return crypto.createHash('sha1').update(token).digest('hex').slice(0, 16);
}

const previewLike = isPreviewLikeEnv();
const defaults = previewLike
  ? {
      apiMax: 3000,
      authMeMax: 900,
      authLoginMax: 25,
    }
  : {
      apiMax: 1000,
      authMeMax: 300,
      authLoginMax: 10,
    };

const API_RATE_LIMIT_WINDOW_MS = toPositiveInt(process.env.API_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000);
const API_RATE_LIMIT_MAX = toPositiveInt(process.env.API_RATE_LIMIT_MAX, defaults.apiMax);
const AUTH_LOGIN_RATE_LIMIT_WINDOW_MS = toPositiveInt(process.env.AUTH_LOGIN_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000);
const AUTH_LOGIN_RATE_LIMIT_MAX = toPositiveInt(process.env.AUTH_LOGIN_RATE_LIMIT_MAX, defaults.authLoginMax);
const AUTH_ME_RATE_LIMIT_WINDOW_MS = toPositiveInt(process.env.AUTH_ME_RATE_LIMIT_WINDOW_MS, 5 * 60 * 1000);
const AUTH_ME_RATE_LIMIT_MAX = toPositiveInt(process.env.AUTH_ME_RATE_LIMIT_MAX, defaults.authMeMax);
const HEALTH_RATE_LIMIT_WINDOW_MS = toPositiveInt(process.env.HEALTH_RATE_LIMIT_WINDOW_MS, 60 * 1000);
const HEALTH_RATE_LIMIT_MAX = toPositiveInt(process.env.HEALTH_RATE_LIMIT_MAX, 240);
const ARK_RATE_LIMIT_WINDOW_MS = toPositiveInt(process.env.ARK_RATE_LIMIT_WINDOW_MS, 60 * 1000);
const ARK_RATE_LIMIT_MAX = toPositiveInt(process.env.ARK_RATE_LIMIT_MAX, 20);

const apiLimiter = rateLimit({
  windowMs: API_RATE_LIMIT_WINDOW_MS,
  max: API_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path.startsWith('/auth') || req.path.startsWith('/health'),
  keyGenerator: (req) => ipKeyGenerator(getClientIp(req)),
  message: {
    error: 'too_many_requests',
    details: `${API_RATE_LIMIT_MAX} requêtes max toutes les ${Math.round(API_RATE_LIMIT_WINDOW_MS / 60000)} minutes`,
  },
});

const healthLimiter = rateLimit({
  windowMs: HEALTH_RATE_LIMIT_WINDOW_MS,
  max: HEALTH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(getClientIp(req)),
  message: { error: 'too_many_requests', details: 'Limiter /health atteint temporairement' },
});

const arkLimiter = rateLimit({
  windowMs: ARK_RATE_LIMIT_WINDOW_MS,
  max: ARK_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(getClientIp(req)),
  message: { error: 'ark_rate_limit', details: `${ARK_RATE_LIMIT_MAX} appels ARK max par minute` },
});

const loginLimiter = rateLimit({
  windowMs: AUTH_LOGIN_RATE_LIMIT_WINDOW_MS,
  max: AUTH_LOGIN_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    return `${ipKeyGenerator(getClientIp(req))}:${email || 'anonymous'}`;
  },
  message: {
    error: 'too_many_attempts',
    details: 'Trop de tentatives de connexion. Patientez quelques minutes avant de réessayer.',
  },
});

const meLimiter = rateLimit({
  windowMs: AUTH_ME_RATE_LIMIT_WINDOW_MS,
  max: AUTH_ME_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `${ipKeyGenerator(getClientIp(req))}:${fingerprintToken(req)}`,
  message: {
    error: 'session_rate_limit',
    details: 'Vérification de session temporairement limitée. Réessayez dans quelques secondes.',
  },
});

module.exports = { apiLimiter, healthLimiter, arkLimiter, loginLimiter, meLimiter };
