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

/**
 * Adresse de l'appelant, NON FALSIFIABLE.
 *
 * DÉFAUT FERMÉ (P3 SEC-018, mesuré en production le 20/09/2026) : cette fonction
 * renvoyait la PREMIÈRE entrée de `X-Forwarded-For`. Or cet en-tête est fourni
 * par le client : `X-Forwarded-For: 1.2.3.4` suffisait à changer de clé de
 * comptage à chaque requête. Tous les limiteurs fondés sur l'IP — connexion,
 * inscription, mot de passe oublié — étaient donc contournables sans effort, ce
 * qui rouvrait la porte à la force brute sur les mots de passe.
 *
 * CORRECTION : on lit `req.ip`, calculé par Express à partir de `trust proxy`
 * (server.js : `app.set('trust proxy', 1)`). Express ne retient, dans la chaîne
 * `X-Forwarded-For`, que la partie qui précède le proxy DE CONFIANCE : une
 * valeur injectée par le client à l'autre bout de la chaîne est ignorée. Le
 * socket est le repli quand `req.ip` est indisponible (tests, appels internes).
 */
function getClientIp(req) {
  if (req.ip) return req.ip
  const socket = req.socket?.remoteAddress
  if (socket) return socket
  return '0.0.0.0'
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

// ─────────────────────────────────────────────────────────────────────────────
// LIMITEURS AJOUTÉS (P3 SEC-018, mesuré le 20/09/2026)
//
// Quatre routes d'authentification n'avaient AUCUN limiteur :
//   POST /api/auth/forgot-password  → envoi d'e-mail à volonté (coût + spam) ;
//   POST /api/auth/reset-password   → essais illimités sur un jeton de 1 h, donc
//                                     attaque par force brute praticable ;
//   POST /api/auth/refresh          → ouverture de jetons à volonté ;
//   POST /api/auth/google           → création de comptes sans aucune limite
//                                     (la seule route qui crée un compte sans
//                                     passer par l'inscription).
//
// PLAFONDS volontairement GÉNÉREUX : ces routes ne doivent pas gêner un cabinet
// réel qui se reconnecte, même en série. Ils bornent l'abus, ils ne brident pas
// l'usage. Le plafond du mot de passe oublié est plus serré parce qu'il envoie
// un e-mail : c'est le seul effet de bord payant.
// ─────────────────────────────────────────────────────────────────────────────
const AUTH_FORGOT_RATE_LIMIT_WINDOW_MS = toPositiveInt(process.env.AUTH_FORGOT_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000);
const AUTH_FORGOT_RATE_LIMIT_MAX = toPositiveInt(process.env.AUTH_FORGOT_RATE_LIMIT_MAX, 5);
const AUTH_RESET_RATE_LIMIT_WINDOW_MS = toPositiveInt(process.env.AUTH_RESET_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000);
const AUTH_RESET_RATE_LIMIT_MAX = toPositiveInt(process.env.AUTH_RESET_RATE_LIMIT_MAX, 10);
const AUTH_REFRESH_RATE_LIMIT_WINDOW_MS = toPositiveInt(process.env.AUTH_REFRESH_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000);
const AUTH_REFRESH_RATE_LIMIT_MAX = toPositiveInt(process.env.AUTH_REFRESH_RATE_LIMIT_MAX, 60);
const AUTH_OAUTH_RATE_LIMIT_WINDOW_MS = toPositiveInt(process.env.AUTH_OAUTH_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000);
const AUTH_OAUTH_RATE_LIMIT_MAX = toPositiveInt(process.env.AUTH_OAUTH_RATE_LIMIT_MAX, 20);

/**
 * Mot de passe oublié : clé IP + e-mail visé. Deux protections en une — on ne
 * peut pas bombarder d'e-mails une adresse, et un attaquant ne peut pas balayer
 * mille adresses depuis la même IP.
 */
const forgotPasswordLimiter = rateLimit({
  windowMs: AUTH_FORGOT_RATE_LIMIT_WINDOW_MS,
  max: AUTH_FORGOT_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    return `${ipKeyGenerator(getClientIp(req))}:${email || 'anonymous'}`;
  },
  message: {
    error: 'too_many_requests',
    details: 'Trop de demandes de réinitialisation. Patientez quelques minutes avant de réessayer.',
  },
});

/** Réinitialisation : clé IP. Le jeton reste vérifié par la base, ceci borne l'essai. */
const resetPasswordLimiter = rateLimit({
  windowMs: AUTH_RESET_RATE_LIMIT_WINDOW_MS,
  max: AUTH_RESET_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(getClientIp(req)),
  message: {
    error: 'too_many_requests',
    details: 'Trop de tentatives de réinitialisation. Patientez quelques minutes avant de réessayer.',
  },
});

/** Rafraîchissement de session : clé IP + jeton présenté. */
const refreshLimiter = rateLimit({
  windowMs: AUTH_REFRESH_RATE_LIMIT_WINDOW_MS,
  max: AUTH_REFRESH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `${ipKeyGenerator(getClientIp(req))}:${fingerprintToken(req)}`,
  message: {
    error: 'too_many_requests',
    details: 'Trop de rafraîchissements de session. Patientez quelques minutes avant de réessayer.',
  },
});

/** Connexion Google : clé IP — c'est la seule route qui crée un compte sans mot de passe. */
const googleAuthLimiter = rateLimit({
  windowMs: AUTH_OAUTH_RATE_LIMIT_WINDOW_MS,
  max: AUTH_OAUTH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(getClientIp(req)),
  message: {
    error: 'too_many_requests',
    details: 'Trop de tentatives de connexion Google. Patientez quelques minutes avant de réessayer.',
  },
});

module.exports = {
  apiLimiter,
  healthLimiter,
  arkLimiter,
  loginLimiter,
  meLimiter,
  forgotPasswordLimiter,
  resetPasswordLimiter,
  refreshLimiter,
  googleAuthLimiter,
  getClientIp,
};
