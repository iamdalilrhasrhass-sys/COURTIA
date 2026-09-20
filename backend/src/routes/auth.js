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
    // Les jetons de l'application portent `id` ET `userId` ; certains jetons
    // (rafraîchissement, portail) ne portent que l'un des deux. Sans ce repli,
    // `req.user.id` valait undefined et la lecture répondait 404.
    const userId = req.user?.id || req.user?.userId;

    const userResult = await pool.query(
      `SELECT id, email, first_name, last_name, role, plan, subscription_status, created_at,
              must_change_password, trial_started_at, trial_ends_at, trial_days, phone
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
      // Le numéro de téléphone vit dans broker_profiles.telephone (fiche
      // cabinet) ; users.phone est l'ancien emplacement. On expose la valeur
      // réellement remplie, sans en inventer une.
      telephone: brokerProfile.telephone || user.phone || '',
      phone: user.phone || brokerProfile.telephone || '',
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
 *
 * Ce handler ne répond `success: true` QUE si une écriture a réellement eu
 * lieu. Avant ce correctif il renvoyait « Profil mis à jour » après un
 * `UPDATE ... WHERE id = $3` où `$3` était `undefined` (jeton sans `id`) :
 * zéro ligne touchée, aucun champ modifié — un succès sans écriture. Les
 * champs d'identité réglementaire du cabinet (registre FINMA/ORIAS, UID, pays,
 * langue, adresse) sont désormais réellement persistés dans `broker_profiles`.
 */
router.put('/me', verifyTokenMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentification requise' });
    }

    const resultat = await User.mettreAJourProfil(userId, req.body || {});

    if (!resultat.ok) {
      if (resultat.raison === 'aucun_champ_modifiable') {
        return res.status(400).json({
          error: 'aucune_modification',
          message: 'Aucun champ enregistrable reçu : rien n’a été modifié.',
        });
      }
      if (resultat.raison === 'email_non_modifiable') {
        return res.status(409).json({
          error: 'email_non_modifiable',
          message: 'L’adresse e-mail de connexion ne peut pas être modifiée depuis cet écran : rien n’a été modifié.',
        });
      }
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    res.json({
      success: true,
      message: 'Profil mis à jour',
      // Relecture de ce qui vient d'être écrit : le client n'affiche pas une
      // valeur qu'il aurait inventée si l'enregistrement avait échoué.
      utilisateur: resultat.utilisateur,
      profil_cabinet: resultat.profil,
      // Champs reçus mais NON enregistrables ici : dits explicitement, jamais
      // présentés comme enregistrés.
      champs_ignores: resultat.champs_ignores || [],
    });
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
