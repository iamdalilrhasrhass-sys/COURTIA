/**
 * Authentication Middleware
 * JWT verification + révocation de session (SEC-016, déconnexion)
 *
 * DEUX MARQUES DE RÉVOCATION, UNE SEULE RÈGLE
 *   * `users.password_changed_at` (migrations 109/110, SEC-016) : un jeton émis
 *     AVANT le dernier changement de mot de passe n'est plus accepté (401).
 *     Sans cela, un mot de passe volé puis réinitialisé laissait l'attaquant
 *     connecté jusqu'à l'expiration naturelle du jeton (7 j).
 *   * `users.sessions_revoked_at` (migration 116) : même règle, posée par la
 *     déconnexion (POST /api/auth/logout). Aucun stockage de jetons révoqués :
 *     la comparaison `iat` / marque suffit et ne peut pas « oublier » un jeton.
 * Les comptes dont les deux colonnes sont NULL (jamais réinitialisés, jamais
 * déconnectés) ne sont PAS impactés : aucune session pilote n'est cassée.
 *
 * CODES DE RÉPONSE
 * Un jeton absent ou invalide signifie « non authentifié » : 401 (RFC 7235), et
 * non 403 qui signifie « authentifié mais interdit » et ferait croire au client
 * que sa session est ouverte (défaut relevé le 20/09/2026).
 */

const jwt = require('jsonwebtoken');
const pool = require('../db');
const { getJwtSecret } = require('../utils/jwtSecret');

// Tolérance d'horloge (secondes) : un jeton émis dans la même seconde que la
// marque de révocation reste valide (le login qui suit un changement de mot de
// passe, la session appelante d'une déconnexion).
const CLOCK_SKEW_SECONDS = 2;

// Une base dont les colonnes n'ont pas encore été migrées ne doit pas mettre
// l'API par terre : on retombe alors sur l'ancien comportement (moins de
// révocation), jamais sur des droits supplémentaires.
let passwordChangedColumnMissing = false;

/**
 * Remet à zéro la détection « colonne absente » (réservé aux tests : sans cela,
 * l'ordre d'exécution des tests changerait leur verdict).
 */
function reinitialiserCacheColonnes() {
  passwordChangedColumnMissing = false;
}

/**
 * Fonction PURE : ce jeton a-t-il été émis avant la marque de révocation ?
 * Marque NULL/absente (compte jamais réinitialisé ni déconnecté) => jamais vrai.
 */
function sessionRevokedByPasswordChange(decoded, passwordChangedAt) {
  if (!passwordChangedAt) return false;
  const changedMs = new Date(passwordChangedAt).getTime();
  if (!Number.isFinite(changedMs)) return false;
  const iat = Number(decoded && decoded.iat);
  if (!Number.isFinite(iat)) return false; // jeton sans date d'émission : non datable
  return iat * 1000 < changedMs - CLOCK_SKEW_SECONDS * 1000;
}

/** Même règle pour la marque de déconnexion (migration 116). */
function sessionRevokedByLogout(decoded, sessionsRevokedAt) {
  return sessionRevokedByPasswordChange(decoded, sessionsRevokedAt);
}

/**
 * Révoque-t-il cette session ? Interroge `users` (les deux marques, sinon la
 * seule colonne disponible).
 * @param {{id?: number, userId?: number, iat?: number}} decoded
 * @returns {Promise<{revoked: boolean, dbError?: boolean}>}
 */
async function isSessionRevoked(decoded) {
  const userId = Number(decoded && (decoded.id || decoded.userId));
  if (!Number.isFinite(userId) || userId <= 0) return { revoked: false };
  if (!Number.isFinite(Number(decoded && decoded.iat))) return { revoked: false };
  if (passwordChangedColumnMissing) return { revoked: false };

  try {
    // `to_jsonb` plutôt qu'une liste de colonnes : une colonne de révocation
    // absente (migration non jouée) rend `null` au lieu de faire échouer la
    // requête. Les deux marques sont lues en UNE requête, quel que soit l'état
    // du schéma — aucune requête en échec à chaque appel HTTP.
    const result = await pool.query(
      `SELECT to_jsonb(u)->>'password_changed_at' AS password_changed_at,
              to_jsonb(u)->>'sessions_revoked_at' AS sessions_revoked_at
         FROM users u WHERE u.id = $1`,
      [userId]
    );
    if (result.rows.length === 0) return { revoked: false };
    const ligne = result.rows[0] || {};
    return {
      revoked: sessionRevokedByPasswordChange(decoded, ligne.password_changed_at)
        || sessionRevokedByLogout(decoded, ligne.sessions_revoked_at),
    };
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
    // 401 et non 403 : un jeton illisible, expiré ou signé avec un autre secret
    // ne prouve AUCUNE authentification. 403 ferait croire à un compte valide
    // dont l'action serait interdite.
    return res.status(401).json({
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
  sessionRevokedByLogout,
  isSessionRevoked,
  reinitialiserCacheColonnes,
  CLOCK_SKEW_SECONDS
};
