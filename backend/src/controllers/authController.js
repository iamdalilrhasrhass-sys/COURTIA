/**
 * Auth Controller
 * Login, Register, JWT tokens
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Générer un JWT token
function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role
    },
    process.env.JWT_SECRET || 'crm-assurance-secret-key-2026',
    {
      expiresIn: process.env.JWT_EXPIRY || '7d'
    }
  );
}

// Inscription
exports.register = async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    // Validation
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({
        error: 'Email, password, firstName, and lastName are required'
      });
    }

    // Créer l'utilisateur
    const user = await User.create(email, password, firstName, lastName, 'broker');

    // Générer token
    const token = generateToken(user);

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role
      },
      token
    });
  } catch (err) {
    console.error('Register error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// Connexion
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password are required'
      });
    }

    // Vérifier les credentials
    const user = await User.verifyPassword(email, password);

    if (!user) {
      return res.status(401).json({
        error: 'Invalid email or password'
      });
    }

    // Générer token
    const token = generateToken(user);

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role
      },
      token
    });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// Vérifier le token (optionnel)
exports.verify = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'crm-assurance-secret-key-2026');
    const user = await User.findById(decoded.id);

    res.json({
      valid: true,
      user
    });
  } catch (err) {
    res.status(401).json({
      valid: false,
      error: 'Invalid or expired token'
    });
  }
};

// Refresh token
exports.refresh = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'crm-assurance-secret-key-2026', {
      ignoreExpiration: true
    });

    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const newToken = generateToken(user);

    res.json({
      message: 'Token refreshed',
      token: newToken
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
