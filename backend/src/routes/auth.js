/**
 * Auth Routes — /api/auth/*
 */
const express = require('express');
const authController = require('../controllers/authController');
const verifyToken = require('../middleware/authMiddleware');
const { verifyToken: verifyTokenMiddleware } = require('../middleware/auth');
const pool = require('../db');

const router = express.Router();

// Public
router.post('/register', authController.register);
router.post('/login', authController.login);

// Protected
router.post('/verify', verifyToken, authController.verify);
router.post('/refresh', authController.refresh);

/**
 * GET /api/auth/me — Profil de l'utilisateur connecté
 */
router.get('/me', verifyTokenMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const userResult = await pool.query(
      `SELECT id, email, first_name, last_name, role, status, pricing_tier, created_at
       FROM users WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    const user = userResult.rows[0];

    // Récupérer le profil courtier si existant
    const profileResult = await pool.query(
      `SELECT cabinet, orias, telephone, adresse, ville, code_postal
       FROM broker_profiles WHERE user_id = $1`,
      [userId]
    );

    const brokerProfile = profileResult.rows[0] || {};

    res.json({
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      pricing_tier: user.pricing_tier || 'Starter',
      created_at: user.created_at,
      cabinet: brokerProfile.cabinet || '',
      orias: brokerProfile.orias || '',
      telephone: brokerProfile.telephone || '',
      adresse: brokerProfile.adresse || '',
      ville: brokerProfile.ville || '',
      code_postal: brokerProfile.code_postal || ''
    });
  } catch (err) {
    console.error('GET /api/auth/me error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/auth/me — Mettre à jour le profil
 */
router.put('/me', verifyTokenMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { first_name, last_name, cabinet, orias, telephone, adresse, ville, code_postal } = req.body;

    // Update users table
    await pool.query(
      `UPDATE users SET first_name = $1, last_name = $2, updated_at = NOW() WHERE id = $3`,
      [first_name, last_name, userId]
    );

    // Upsert broker_profiles
    const existing = await pool.query('SELECT id FROM broker_profiles WHERE user_id = $1', [userId]);
    if (existing.rows.length > 0) {
      await pool.query(
        `UPDATE broker_profiles SET cabinet=$1, orias=$2, telephone=$3, adresse=$4, ville=$5, code_postal=$6, updated_at=NOW()
         WHERE user_id=$7`,
        [cabinet, orias, telephone, adresse, ville, code_postal, userId]
      );
    } else {
      await pool.query(
        `INSERT INTO broker_profiles (user_id, cabinet, orias, telephone, adresse, ville, code_postal, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),NOW())`,
        [userId, cabinet, orias, telephone, adresse, ville, code_postal]
      );
    }

    res.json({ success: true, message: 'Profil mis à jour' });
  } catch (err) {
    console.error('PUT /api/auth/me error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
