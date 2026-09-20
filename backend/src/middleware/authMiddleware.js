/**
 * Authentication Middleware
 * JWT token verification + révocation de session après changement de mot de passe
 *
 * SEC-016 — ce middleware est celui monté par server.js sur toutes les routes
 * protégées : la vérification de révocation doit donc vivre ici pour être
 * réellement effective. Un jeton émis avant `users.password_changed_at` est
 * refusé (401) ; `password_changed_at` NULL (compte jamais réinitialisé) laisse
 * la session intacte.
 */

const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('../utils/jwtSecret');
const { isSessionRevoked, chargeSessionRefusee } = require('./auth');

async function verifyToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        error: 'En-tête d’authentification manquant'
      });
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({
        error: 'Format d’authentification invalide'
      });
    }

    const token = parts[1];

    const decoded = jwt.verify(token, getJwtSecret());

    const session = await isSessionRevoked(decoded);
    if (session.dbError) {
      return res.status(503).json({
        error: 'Vérification de session indisponible'
      });
    }
    if (session.revoked) {
      // 401 dans tous les cas : jeton révoqué (déconnexion, mot de passe changé)
      // ou compte SUPPRIMÉ (D3-08). Un compte inexistant n'a plus de session.
      return res.status(401).json({ error: chargeSessionRefusee(session).message });
    }

    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expiré'
      });
    }

    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Token invalide'
      });
    }

    res.status(500).json({
      error: 'Vérification du token impossible'
    });
  }
}

verifyToken.verifyToken = verifyToken;

module.exports = verifyToken;
