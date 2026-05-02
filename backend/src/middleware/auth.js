/**
 * Authentication Middleware
 * JWT verification
 */

const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('../utils/jwtSecret');

const verifyToken = (req, res, next) => {
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
  generateRefreshToken
};
