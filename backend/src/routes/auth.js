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
const { marcheDepuis, devise: deviseDuMarche } = require('../lib/devise');

const router = express.Router();

/**
 * Colonnes de l'identité du cabinet relues après CHAQUE écriture.
 * POURQUOI une constante : l'écriture (`PUT /api/auth/me`) et la lecture
 * (`GET /api/auth/me`) DOIVENT porter sur la même liste. Le canton était
 * persisté en base mais absent de la lecture : l'écran Paramètres le perdait au
 * premier rechargement. Une seule liste = plus de divergence possible.
 */
const COLONNES_CABINET = `cabinet, orias, telephone, adresse, ville, code_postal,
              registre_type, registre_numero, uid, site_web, pays, langue, canton`;

/**
 * Cantons suisses officiels (codes à deux lettres). Un canton inventé ne doit
 * pas être enregistré en silence : le cabinet croirait sa fiche complète alors
 * que l'échéancier cantonal n'aurait aucune valeur exploitable.
 */
const CANTONS_SUISSES = new Set([
  'AG', 'AI', 'AR', 'BE', 'BL', 'BS', 'FR', 'GE', 'GL', 'GR', 'JU', 'LU', 'NE',
  'NW', 'OW', 'SG', 'SH', 'SO', 'SZ', 'TG', 'TI', 'UR', 'VD', 'VS', 'ZG', 'ZH',
]);

/** Normalise « ge » / « GE » en « GE ». Renvoie null si le code est inconnu. */
function normaliserCanton(valeur) {
  const code = String(valeur ?? '').trim().toUpperCase();
  if (!code) return null;
  return CANTONS_SUISSES.has(code) ? code : null;
}

/**
 * Identité du cabinet telle qu'elle est RÉELLEMENT en base (ou {} si la fiche
 * n'existe pas encore). Aucune valeur n'est inventée : un champ vide reste vide.
 */
async function lireCabinet(userId) {
  const { rows } = await pool.query(
    `SELECT ${COLONNES_CABINET} FROM broker_profiles WHERE user_id = $1`,
    [userId]
  );
  return rows[0] || {};
}

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

    // Récupérer le profil courtier si existant — la MÊME liste de colonnes que
    // celle relue après écriture (voir COLONNES_CABINET).
    const brokerProfile = await lireCabinet(userId);
    const featureFlags = await getFeatureFlagsForUser({ userId }).catch(() => ({}));

    // Marché réel du cabinet déduit de son pays / de son registre (CH → CHF).
    // Exposé explicitement : un écran n'a pas à redéduire la devise d'un pays
    // mal orthographié, et la recette peut vérifier ce que l'API déclare.
    const marche = marcheDepuis(brokerProfile);

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
      // Canton RÉELLEMENT enregistré (vide si le cabinet n'en a pas). C'est le
      // seul moyen pour l'écran Paramètres de le réafficher après rechargement.
      canton: brokerProfile.canton || '',
      // Marché et devise du cabinet : « CH »/« CHF » ou « FR »/« EUR ».
      marche,
      devise: deviseDuMarche(marche),
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

    const corps = req.body || {};

    // Le canton est une donnée d'identité du cabinet suisse (Paramètres >
    // Profil, affiché quand le pays vaut « CH »). Le modèle de profil ne le
    // connaît pas : il est écrit ici, dans la même requête HTTP, pour que le
    // champ ne soit jamais ni ignoré en silence ni perdu après rechargement.
    const cantonFourni = corps.canton !== undefined && String(corps.canton ?? '').trim() !== '';
    let cantonNormalise = null;
    if (cantonFourni) {
      cantonNormalise = normaliserCanton(corps.canton);
      if (!cantonNormalise) {
        // On refuse plutôt que d'enregistrer un canton qui n'existe pas : rien
        // n'est écrit, l'appelant sait exactement pourquoi.
        return res.status(400).json({
          error: 'canton_inconnu',
          message: `« ${String(corps.canton).trim()} » n'est pas un canton suisse reconnu (codes acceptés : ${[...CANTONS_SUISSES].join(', ')}). Rien n'a été modifié.`,
        });
      }
    }

    // Le canton ne doit pas être présenté au modèle comme un champ qu'il
    // enregistrerait : il est retiré du corps qui lui est transmis.
    const corpsPourModele = { ...corps };
    delete corpsPourModele.canton;

    const resultat = await User.mettreAJourProfil(userId, corpsPourModele);

    // Seul le canton fourni : ce n'est PAS « aucun champ enregistrable », c'est
    // une modification réelle que personne d'autre n'écrit.
    const cantonSeul = !resultat.ok
      && resultat.raison === 'aucun_champ_modifiable'
      && cantonFourni;

    if (!resultat.ok && !cantonSeul) {
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

    if (cantonFourni) {
      // `COALESCE` volontairement absent : le canton fourni est écrit tel quel
      // (normalisé en majuscules). Une fiche cabinet absente est créée — sans
      // aucun autre champ inventé.
      const maj = await pool.query(
        `UPDATE broker_profiles SET canton = $2, updated_at = NOW()
          WHERE user_id = $1
          RETURNING canton`,
        [userId, cantonNormalise]
      );
      if (maj.rows.length === 0) {
        await pool.query(
          `INSERT INTO broker_profiles (user_id, canton, created_at, updated_at)
           VALUES ($1, $2, NOW(), NOW())`,
          [userId, cantonNormalise]
        );
      }
    }

    // Relecture de ce qui est RÉELLEMENT en base, canton compris : le client
    // n'affiche jamais une valeur déduite de ce qu'il a envoyé.
    const cabinetEnBase = await lireCabinet(userId);

    res.json({
      success: true,
      message: 'Profil mis à jour',
      // Relecture de ce qui vient d'être écrit : le client n'affiche pas une
      // valeur qu'il aurait inventée si l'enregistrement avait échoué.
      utilisateur: resultat.utilisateur || null,
      profil_cabinet: { ...(resultat.profil || {}), ...cabinetEnBase },
      canton: cabinetEnBase.canton || '',
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
