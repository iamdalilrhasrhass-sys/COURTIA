/**
 * Auth Controller
 * Login, Register, JWT tokens
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const pool = require('../db');
const { getJwtSecret } = require('../utils/jwtSecret');
const { isSessionRevoked } = require('../middleware/auth');
const { trackEvent } = require('../services/analyticsService');
const { sendEmail } = require('../services/emailService');
const { notifierAdminSansBloquer } = require('../services/adminNotifier');

// Générer un JWT token
function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      userId: user.id,
      email: user.email,
      role: user.role
    },
    getJwtSecret(),
    {
      expiresIn: process.env.JWT_EXPIRY || '7d'
    }
  );
}

// Inscription
exports.register = async (req, res) => {
  try {
    const { password } = req.body;
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const firstName = typeof req.body.firstName === 'string' ? req.body.firstName.trim() : '';
    const lastName = typeof req.body.lastName === 'string' ? req.body.lastName.trim() : '';

    // Validation
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({
        error: 'Champs requis manquants'
      });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Adresse email invalide' });
    }
    if (typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
      return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 8 caracteres et au plus 72 octets.' });
    }

    // Créer l'utilisateur
    const user = await User.create(email, password, firstName, lastName, 'broker');

    // Générer token
    const token = generateToken(user);

    // Événement commercial : une nouvelle inscription (essai) doit être visible
    // par l'exploitant. Non bloquant : l'inscription réussit même si l'e-mail
    // de notification échoue ou si COURTIA_ADMIN_EMAIL n'est pas configurée.
    notifierAdminSansBloquer({
      evenement: 'nouvelle_inscription',
      sujet: `COURTIA — nouvelle inscription : ${email}`,
      replyTo: email,
      lignes: [
        'Événement : nouvelle inscription (essai COURTIA)',
        `Adresse : ${email}`,
        `Nom : ${firstName} ${lastName}`,
        `Compte interne : ${user.id}`,
        `Horodatage : ${new Date().toISOString()}`,
      ],
    });

    res.status(201).json({
      message: 'Compte créé avec succès',
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
    // Duplicate email — friendly message
    if (err.code === '23505' || err.constraint === 'users_email_key') {
      return res.status(409).json({
        error: 'duplicate_email',
        message: 'Cette adresse email est déjà utilisée. Connectez-vous ou utilisez une autre adresse.'
      });
    }
    res.status(500).json({
      error: 'registration_failed',
      message: 'Une erreur est survenue lors de l\'inscription. Veuillez réessayer.'
    });
  }
};

// Connexion
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Email et mot de passe requis'
      });
    }

    // Vérifier les credentials
    const user = await User.verifyPassword(email, password);

    if (!user) {
      return res.status(401).json({
        error: 'Email ou mot de passe incorrect'
      });
    }

    // Générer token
    const token = generateToken(user);

    await trackEvent({
      userId: user.id,
      event: 'login',
      properties: { method: 'password' },
    }).catch(() => {});

    res.json({
      message: 'Connexion réussie',
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
    res.status(500).json({ error: 'Connexion impossible pour le moment' });
  }
};

// Vérifier le token (optionnel)
exports.verify = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Token manquant' });
    }

    const decoded = jwt.verify(token, getJwtSecret());
    const user = await User.findById(decoded.id);

    res.json({
      valid: true,
      user
    });
  } catch (err) {
    res.status(401).json({
      valid: false,
      error: 'Token invalide ou expiré'
    });
  }
};

// Mot de passe oublié — génère un token et envoie l'email de reset
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email requis' });
    }

    const user = await User.findByEmail(email);

    // Réponse identique que le compte existe ou non (anti-énumération)
    const genericResponse = {
      message: 'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.'
    };

    if (!user) {
      return res.json(genericResponse);
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1h

    await User.setResetToken(email, token, expiresAt);

    const frontendUrl = process.env.FRONTEND_URL || 'https://courtiark.fr';
    const resetLink = `${frontendUrl}/reset-password?token=${token}`;

    await sendEmail({
      to: email,
      subject: 'COURTIA — Réinitialisation de votre mot de passe',
      html: `<p>Bonjour,</p>
        <p>Vous avez demandé la réinitialisation de votre mot de passe COURTIA.</p>
        <p><a href="${resetLink}">Cliquez ici pour choisir un nouveau mot de passe</a> (lien valable 1 heure).</p>
        <p>Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>`,
      text: `Réinitialisez votre mot de passe COURTIA : ${resetLink} (valable 1 heure). Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.`
    });

    res.json(genericResponse);
  } catch (err) {
    console.error('Forgot password error:', err.message);
    res.status(500).json({ error: 'Impossible de traiter la demande pour le moment' });
  }
};

// Réinitialisation — vérifie le token et applique le nouveau mot de passe
exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ error: 'Token et nouveau mot de passe requis' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 8 caractères' });
    }

    const record = await User.findByResetToken(token);
    if (!record) {
      return res.status(400).json({ error: 'Lien de réinitialisation invalide ou déjà utilisé' });
    }
    if (new Date(record.password_reset_expires) < new Date()) {
      return res.status(400).json({ error: 'Lien de réinitialisation expiré. Refaites une demande.' });
    }

    await User.resetPassword(token, password);

    // ACTIVATION DE L'ESSAI (20/09/2026) : c'est ICI que les 7 jours commencent
    // pour un cabinet invité. Le compte n'était pas en essai avant ce choix de
    // mot de passe ; il le devient maintenant, pour la durée annoncée.
    // Sans effet pour une simple réinitialisation de mot de passe d'un compte
    // déjà en essai ou abonné (aucune date n'est recalculée).
    let essai = null;
    try {
      essai = await User.demarrerEssai(record.id);
    } catch (e) {
      // Ne jamais bloquer l'activation pour un incident sur les dates d'essai :
      // le mot de passe est enregistré, l'essai sera rattrapé par le support.
      console.error('Démarrage essai après activation impossible:', e.message);
    }

    res.json({
      message: 'Mot de passe mis à jour avec succès. Vous pouvez vous connecter.',
      ...(essai
        ? {
            essai: {
              demarre: true,
              debut: new Date(essai.debut).toISOString(),
              fin: new Date(essai.fin).toISOString(),
              jours: essai.jours,
            },
          }
        : {}),
    });
  } catch (err) {
    console.error('Reset password error:', err.message);
    res.status(500).json({ error: 'Impossible de réinitialiser le mot de passe pour le moment' });
  }
};

// Changement de mot de passe par le titulaire du compte — Paramètres > Sécurité.
//
// POURQUOI : jusqu'ici l'écran Sécurité répondait « configuration requise :
// passez par le support ». Un cabinet en essai ne pouvait donc pas remplacer le
// mot de passe initial remis par COURTIA. Le parcours est désormais réel :
// ancien mot de passe exigé, nouveau confirmé, ancien invalidé.
exports.changePassword = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentification requise' });
    }

    const actuel = typeof req.body?.currentPassword === 'string' ? req.body.currentPassword : '';
    const nouveau = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';
    const confirmation = typeof req.body?.confirmPassword === 'string' ? req.body.confirmPassword : '';

    if (!actuel || !nouveau || !confirmation) {
      return res.status(400).json({
        error: 'champs_manquants',
        message: 'Mot de passe actuel, nouveau mot de passe et confirmation sont requis.',
      });
    }
    if (nouveau !== confirmation) {
      return res.status(400).json({
        error: 'confirmation_differente',
        message: 'La confirmation ne correspond pas au nouveau mot de passe.',
      });
    }
    if (nouveau.length < 8 || Buffer.byteLength(nouveau, 'utf8') > 72) {
      return res.status(400).json({
        error: 'mot_de_passe_invalide',
        message: 'Le nouveau mot de passe doit contenir au moins 8 caractères et au plus 72 octets.',
      });
    }
    if (nouveau === actuel) {
      return res.status(400).json({
        error: 'mot_de_passe_identique',
        message: 'Le nouveau mot de passe doit être différent du mot de passe actuel.',
      });
    }

    const resultat = await User.changerMotDePasse(userId, actuel, nouveau);
    if (!resultat.ok) {
      const messages = {
        compte_introuvable: 'Compte introuvable.',
        mot_de_passe_actuel_invalide: 'Le mot de passe actuel est incorrect.',
        mot_de_passe_identique: 'Le nouveau mot de passe doit être différent du mot de passe actuel.',
      };
      const statut = resultat.raison === 'compte_introuvable' ? 404 : 400;
      return res.status(statut).json({
        error: resultat.raison,
        message: messages[resultat.raison] || 'Changement de mot de passe impossible.',
      });
    }

    try {
      await trackEvent({ userId, event: 'mot_de_passe_modifie', properties: { source: 'parametres_securite' } });
    } catch (e) {
      // La trace analytique ne doit jamais faire échouer un changement réussi.
    }

    return res.json({
      success: true,
      message: 'Mot de passe modifié. Votre ancien mot de passe ne fonctionne plus : utilisez le nouveau à la prochaine connexion.',
      must_change_password: false,
    });
  } catch (err) {
    console.error('Change password error:', err.message);
    return res.status(500).json({ error: 'Changement de mot de passe impossible pour le moment' });
  }
};

// Refresh token
//
// SEC-009 — l'ancienne implémentation faisait `jwt.verify(token, secret,
// { ignoreExpiration: true })` : n'importe quel jeton expiré, même vieux de
// plusieurs mois, renouvelait indéfiniment la session. Désormais:
//   - jeton NON expiré  -> renouvelé (comportement normal) ;
//   - jeton expiré      -> toléré seulement dans une fenêtre de grâce COURTE
//                          (JWT_REFRESH_GRACE_SECONDS, plafonnée à 15 min) ;
//   - au-delà           -> 401.
// La signature est TOUJOURS vérifiée, y compris dans la fenêtre de grâce.
const REFRESH_GRACE_SECONDS_MAX = 15 * 60;

function getRefreshGraceSeconds() {
  const raw = Number(process.env.JWT_REFRESH_GRACE_SECONDS);
  if (!Number.isFinite(raw) || raw < 0) return REFRESH_GRACE_SECONDS_MAX;
  return Math.min(Math.floor(raw), REFRESH_GRACE_SECONDS_MAX);
}

function verifyRefreshToken(token) {
  try {
    return { decoded: jwt.verify(token, getJwtSecret()) };
  } catch (err) {
    if (err.name !== 'TokenExpiredError') {
      return { error: 'invalid' };
    }

    // Jeton expiré : on revérifie la signature en ignorant seulement l'expiration,
    // le temps de mesurer le dépassement réel.
    let decoded;
    try {
      decoded = jwt.verify(token, getJwtSecret(), { ignoreExpiration: true });
    } catch (verifyErr) {
      return { error: 'invalid' };
    }

    const exp = Number(decoded.exp);
    const iat = Number(decoded.iat);
    if (!Number.isFinite(exp) || !Number.isFinite(iat)) {
      return { error: 'invalid' };
    }
    if (Date.now() / 1000 > exp + getRefreshGraceSeconds()) {
      return { error: 'expired' };
    }
    return { decoded, expiredWithinGrace: true };
  }
}

exports.refresh = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Token manquant' });
    }

    const resultat = verifyRefreshToken(token);
    if (resultat.error) {
      return res.status(401).json({
        error: 'session_expiree',
        message: 'Session expirée, veuillez vous reconnecter.'
      });
    }

    const decoded = resultat.decoded;

    // SEC-016 : un jeton émis avant le dernier changement de mot de passe ne
    // peut pas être renouvelé.
    const session = await isSessionRevoked(decoded);
    if (session.revoked) {
      return res.status(401).json({
        error: 'session_revoquee',
        message: 'Session expirée, veuillez vous reconnecter.'
      });
    }
    if (session.dbError) {
      return res.status(503).json({ error: 'Actualisation de session indisponible' });
    }

    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    const newToken = generateToken(user);

    res.json({
      message: 'Session actualisée',
      token: newToken
    });
  } catch (err) {
    res.status(500).json({ error: 'Actualisation de session impossible' });
  }
};

// Déconnexion — POST /api/auth/logout
//
// POURQUOI : jusqu'ici le client jetait son jeton, mais le serveur continuait
// de l'accepter jusqu'à son expiration (7 jours). Un jeton copié restait donc
// utilisable après une déconnexion : aucune révocation serveur n'existait.
//
// MÉCANISME (aucun stockage de jetons révoqués) : on pose la MÊME marque que
// celle du changement de mot de passe (`users.sessions_revoked_at`, migration
// 116 ; voir middleware/auth.js) : tout jeton dont `iat` est antérieur est
// refusé avec 401. Un jeton ne peut donc jamais « revenir » après reconnexion.
//
// DEUX PORTÉES, ANNONCÉES DANS LA RÉPONSE
//   * par défaut (`toutes_les_sessions` absent) : marque = `iat` de la session
//     appelante ⇒ les sessions ouvertes AVANT celle-ci (autres appareils) sont
//     fermées, la session appelante reste valide jusqu'à l'expiration de son
//     jeton et c'est le client qui l'efface. Un appelant qui enchaîne une
//     déconnexion puis un appel avec le même jeton — ce que fait la recette E2E
//     de production — reste donc fonctionnel.
//   * `{ "toutes_les_sessions": true }` (ou `?toutes_les_sessions=true`) :
//     marque = NOW() ⇒ la session appelante est fermée aussi ; l'appel suivant
//     avec le même jeton reçoit 401. C'est la déconnexion « de partout ».
//
// La marque ne recule JAMAIS (`sessions_revoked_at < $2`) : un jeton ancien ne
// peut pas rouvrir les sessions déjà fermées.
exports.logout = async (req, res) => {
  const userId = Number(req.user && (req.user.id || req.user.userId));
  const iat = Number(req.user && req.user.iat);

  if (!Number.isFinite(userId) || userId <= 0) {
    return res.status(401).json({ error: 'Authentification requise' });
  }

  const toutes = req.body?.toutes_les_sessions === true
    || String(req.query?.toutes_les_sessions || '').toLowerCase() === 'true';

  // Sans `iat`, la marque ne peut pas être bornée : fermer TOUTES les sessions
  // « au cas où » fermerait aussi celles des autres appareils sans le dire.
  if (!toutes && !Number.isFinite(iat)) {
    return res.status(400).json({
      error: 'jeton_sans_date_emission',
      message: "Ce jeton ne porte pas de date d'émission : la portée de la déconnexion ne peut pas être bornée. Utilisez toutes_les_sessions=true pour fermer toutes les sessions.",
    });
  }

  const marque = new Date(toutes ? Date.now() : iat * 1000);

  try {
    const maj = await pool.query(
      `UPDATE users
          SET sessions_revoked_at = $2
        WHERE id = $1
          AND (sessions_revoked_at IS NULL OR sessions_revoked_at < $2)
        RETURNING sessions_revoked_at`,
      [userId, marque.toISOString()]
    );

    const enregistree = maj.rows.length > 0;
    // `rowCount = 0` : une marque au moins aussi récente est déjà en place. La
    // déconnexion demandée est donc déjà effective — on ne prétend pas avoir
    // écrit, on relit la marque réellement en base.
    const marqueEnBase = enregistree
      ? maj.rows[0].sessions_revoked_at
      : (await pool.query(
        `SELECT to_jsonb(u)->>'sessions_revoked_at' AS sessions_revoked_at FROM users u WHERE u.id = $1`,
        [userId]
      )).rows[0]?.sessions_revoked_at || marque.toISOString();

    return res.json({
      success: true,
      deconnexion: toutes ? 'toutes_les_sessions' : 'sessions_anterieures',
      revocation_serveur: true,
      sessions_revoked_at: new Date(marqueEnBase).toISOString(),
      ecriture_effectuee: enregistree,
      message: toutes
        ? 'Toutes les sessions de ce compte sont fermées côté serveur, y compris celle-ci : effacez le jeton côté client.'
        : 'Les sessions ouvertes avant celle-ci sont fermées côté serveur. La session appelante reste valide jusqu\'à l\'expiration de son jeton : effacez-le côté client.',
    });
  } catch (err) {
    // 42703 = `users.sessions_revoked_at` absente (migration 116 non jouée) :
    // on refuse explicitement plutôt que de répondre « déconnecté » sans effet.
    if (err && err.code === '42703') {
      console.error('[logout] users.sessions_revoked_at absente : migration 116 non appliquée');
      return res.status(503).json({
        error: 'revocation_indisponible',
        message: "La déconnexion n'a pas pu être enregistrée côté serveur (migration 116 non appliquée). Le jeton reste valide jusqu'à son expiration : ne le considérez pas comme révoqué.",
      });
    }
    console.error('Logout error:', err.message);
    return res.status(503).json({
      error: 'revocation_indisponible',
      message: "La déconnexion n'a pas pu être enregistrée côté serveur : le jeton reste valide jusqu'à son expiration.",
    });
  }
};
