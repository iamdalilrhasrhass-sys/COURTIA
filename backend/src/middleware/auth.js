/**
 * Authentication Middleware
 * JWT verification + révocation de session (SEC-016)
 *
 * SEC-016 : un jeton émis AVANT le dernier changement de mot de passe du compte
 * n'est plus accepté (401). Sans cela, un mot de passe volé puis réinitialisé
 * laissait l'attaquant connecté jusqu'à l'expiration naturelle du jeton (7 j).
 * Les comptes dont `password_changed_at` est NULL (jamais changé de mot de passe)
 * ne sont PAS impactés : aucune session pilote n'est cassée.
 */

const jwt = require('jsonwebtoken');
const pool = require('../db');
const { getJwtSecret } = require('../utils/jwtSecret');

// Tolérance d'horloge (secondes) : un jeton émis dans la même seconde que le
// changement de mot de passe reste valide (le login qui suit le changement).
const CLOCK_SKEW_SECONDS = 2;

// Une base dont la colonne n'a pas encore été migrée ne doit pas mettre l'API
// par terre : on retombe alors sur l'ancien comportement (pas de révocation).
let passwordChangedColumnMissing = false;

/**
 * Fonction PURE : ce jeton a-t-il été émis avant le dernier changement de mot de
 * passe ? `password_changed_at` NULL (compte jamais réinitialisé) => jamais vrai.
 */
function sessionRevokedByPasswordChange(decoded, passwordChangedAt) {
  if (!passwordChangedAt) return false;
  const changedMs = new Date(passwordChangedAt).getTime();
  if (!Number.isFinite(changedMs)) return false;
  const iat = Number(decoded && decoded.iat);
  if (!Number.isFinite(iat)) return false; // jeton sans date d'émission : non datable
  return iat * 1000 < changedMs - CLOCK_SKEW_SECONDS * 1000;
}

/**
 * Révoque-t-il cette session ? Interroge `users.password_changed_at`.
 * @param {{id?: number, userId?: number, iat?: number}} decoded
 * @returns {Promise<{revoked: boolean, dbError?: boolean}>}
 */
async function isSessionRevoked(decoded) {
  const userId = Number(decoded && (decoded.id || decoded.userId));
  if (!Number.isFinite(userId) || userId <= 0) return { revoked: false };
  if (!Number.isFinite(Number(decoded && decoded.iat))) return { revoked: false };
  if (passwordChangedColumnMissing) return { revoked: false };

  try {
    const result = await pool.query('SELECT password_changed_at FROM users WHERE id = $1', [userId]);
    if (result.rows.length === 0) return { revoked: false };
    return { revoked: sessionRevokedByPasswordChange(decoded, result.rows[0].password_changed_at) };
  } catch (err) {
    // 42703 = colonne inexistante : migration non appliquée, on n'agit pas.
    if (err && err.code === '42703') {
      passwordChangedColumnMissing = true;
      console.warn('[auth] users.password_changed_at absente : révocation de session inactive');
      return { revoked: false };
    }
    console.error('[auth] vérification de révocation de session impossible:', err.message);
    return { revoked: false, dbError: true };
  }
}

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'AuthenticationError',
      message: 'Token manquant'
    });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, getJwtSecret());
    const session = await isSessionRevoked(decoded);
    if (session.dbError) {
      return res.status(503).json({
        success: false,
        error: 'AuthenticationError',
        message: 'Vérification de session indisponible'
      });
    }
    if (session.revoked) {
      return res.status(401).json({
        success: false,
        error: 'SessionRevoked',
        message: 'Session expirée, veuillez vous reconnecter'
      });
    }
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      error: 'AuthenticationError',
      message: 'Token invalide ou expiré'
    });
  }
};

const generateToken = (userId, email) => {
  return jwt.sign(
    { userId, email },
    getJwtSecret(),
    { expiresIn: process.env.JWT_EXPIRY || '7d' }
  );
};

const generateRefreshToken = (userId) => {
  return jwt.sign(
    { userId },
    getJwtSecret(),
    { expiresIn: '30d' }
  );
};

module.exports = {
  verifyToken,
  generateToken,
  generateRefreshToken,
  sessionRevokedByPasswordChange,
  isSessionRevoked,
  CLOCK_SKEW_SECONDS
};
