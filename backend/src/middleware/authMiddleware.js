/**
 * Authentication Middleware
 * JWT token verification
 */

const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('../utils/jwtSecret');

function verifyToken(req, res, next) {
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

module.exports = verifyToken;
