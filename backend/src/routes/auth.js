/**
 * Auth Routes — /api/auth/*
 */
const express = require('express');
const authController = require('../controllers/authController');
const verifyToken = require('../middleware/authMiddleware');
const { verifyToken: verifyTokenMiddleware } = require('../middleware/auth');
const { loginLimiter, meLimiter } = require('../middleware/rateLimit');
const User = require('../models/User');
const pool = require('../db');
const { getJwtSecret } = require('../utils/jwtSecret');
const { getFeatureFlagsForUser } = require('../lib/featureFlags');

const router = express.Router();

// Public
router.post('/register', authController.register);
router.post('/login', loginLimiter, authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// Protected
router.post('/verify', verifyToken, authController.verify);
router.post('/refresh', authController.refresh);

// Changement de mot de passe par le titulaire (Paramètres > Sécurité).
// Route protégée : l'ancien mot de passe est exigé, l'ancien devient inopérant.
router.post('/change-password', verifyTokenMiddleware, authController.changePassword);

/**
 * GET /api/auth/me — Profil de l'utilisateur connecté
 */
router.get('/me', meLimiter, verifyTokenMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const userResult = await pool.query(
      `SELECT id, email, first_name, last_name, role, plan, subscription_status, created_at,
              must_change_password, trial_started_at, trial_ends_at, trial_days
       FROM users WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    const user = userResult.rows[0];

    // Récupérer le profil courtier si existant
    const profileResult = await pool.query(
      `SELECT cabinet, orias, telephone, adresse, ville, code_postal,
              registre_type, registre_numero, uid, site_web, pays, langue
       FROM broker_profiles WHERE user_id = $1`,
      [userId]
    );

    const brokerProfile = profileResult.rows[0] || {};
    const featureFlags = await getFeatureFlagsForUser({ userId }).catch(() => ({}));

    res.json({
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      plan: user.plan || 'trial',
      subscription_status: user.subscription_status || 'trialing',
      created_at: user.created_at,
      // Le mot de passe initial remis par COURTIA est temporaire : l'interface
      // invite à le remplacer (Paramètres > Sécurité). Aucune route n'est bridée.
      must_change_password: user.must_change_password === true,
      trial_started_at: user.trial_started_at,
      trial_ends_at: user.trial_ends_at,
      trial_days: user.trial_days,
      cabinet: brokerProfile.cabinet || '',
      orias: brokerProfile.orias || '',
      telephone: brokerProfile.telephone || '',
      adresse: brokerProfile.adresse || '',
      ville: brokerProfile.ville || '',
      code_postal: brokerProfile.code_postal || '',
      // Identite reglementaire reelle du cabinet : en Suisse un numero FINMA et
      // un UID, pas un numero ORIAS. Renvoyes distinctement pour ne jamais
      // afficher un registre sous le libelle d'un autre.
      registre_type: brokerProfile.registre_type || '',
      registre_numero: brokerProfile.registre_numero || '',
      uid: brokerProfile.uid || '',
      site_web: brokerProfile.site_web || '',
      pays: brokerProfile.pays || '',
      langue: brokerProfile.langue || '',
      feature_flags: featureFlags
    });
  } catch (err) {
    console.error('GET /api/auth/me error:', err.message);
    res.status(500).json({ error: 'Profil indisponible pour le moment' });
  }
});

/**
 * PUT /api/auth/me — Mettre à jour le profil
 */
router.put('/me', verifyTokenMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      first_name, last_name, cabinet, orias, telephone, adresse, ville, code_postal,
      registre_type, registre_numero, uid, site_web, pays, langue,
    } = req.body;

    // Update users table
    await pool.query(
      `UPDATE users SET first_name = $1, last_name = $2, updated_at = NOW() WHERE id = $3`,
      [first_name, last_name, userId]
    );

    // Upsert broker_profiles
    const existing = await pool.query('SELECT id FROM broker_profiles WHERE user_id = $1', [userId]);
    if (existing.rows.length > 0) {
      await pool.query(
        `UPDATE broker_profiles
            SET cabinet=$1, orias=$2, telephone=$3, adresse=$4, ville=$5, code_postal=$6,
                registre_type=COALESCE(NULLIF($8,''), registre_type),
                registre_numero=COALESCE(NULLIF($9,''), registre_numero),
                uid=COALESCE(NULLIF($10,''), uid),
                site_web=COALESCE(NULLIF($11,''), site_web),
                pays=COALESCE(NULLIF($12,''), pays),
                langue=COALESCE(NULLIF($13,''), langue),
                updated_at=NOW()
         WHERE user_id=$7`,
        [cabinet, orias, telephone, adresse, ville, code_postal, userId,
         registre_type, registre_numero, uid, site_web, pays, langue]
      );
    } else {
      await pool.query(
        `INSERT INTO broker_profiles (user_id, cabinet, orias, telephone, adresse, ville, code_postal,
                                      registre_type, registre_numero, uid, site_web, pays, langue,
                                      created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW(),NOW())`,
        [userId, cabinet, orias, telephone, adresse, ville, code_postal,
         registre_type, registre_numero, uid, site_web, pays, langue]
      );
    }

    res.json({ success: true, message: 'Profil mis à jour' });
  } catch (err) {
    console.error('PUT /api/auth/me error:', err.message);
    res.status(500).json({ error: 'Mise à jour du profil impossible pour le moment' });
  }
});

/**
 * POST /api/auth/google — Authentification via Google
 */
router.post('/google', async (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return res.status(503).json({ error: 'Connexion Google indisponible. Utilisez votre email et votre mot de passe.' });
  }
  const { credential } = req.body;
  if (typeof credential !== 'string' || !credential) {
    return res.status(401).json({ error: 'Identite Google non verifiee' });
  }
  let identity;
  try {
    const { OAuth2Client } = require('google-auth-library');
    const ticket = await new OAuth2Client(clientId).verifyIdToken({ idToken: credential, audience: clientId });
    identity = ticket.getPayload();
    if (!identity?.email_verified || !identity.email || !identity.sub) throw new Error('unverified_identity');
  } catch {
    return res.status(401).json({ error: 'Identite Google non verifiee' });
  }
  const email = identity.email.trim().toLowerCase();
  const firstName = identity.given_name;
  const lastName = identity.family_name;

  try {
    // Cherche si l'user existe déjà par email
    let user = await User.findByEmail(email);

    if (!user) {
      // Nouvel utilisateur — créer le compte automatiquement
      // Google users receive a random unusable local password hash.
      const crypto = require('crypto');
      const tempPassword = crypto.randomBytes(32).toString('hex');

      user = await User.create(email, tempPassword, firstName || '', lastName || '', 'broker');
    }

    // Générer JWT standard (même fonction que login)
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      getJwtSecret(),
      { expiresIn: process.env.JWT_EXPIRY || '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Google auth error:', err);
    res.status(500).json({ message: 'Erreur serveur lors de la connexion Google' });
  }
});

module.exports = router;
