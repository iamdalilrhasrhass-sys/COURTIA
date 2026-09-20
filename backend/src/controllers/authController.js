/**
 * Auth Controller
 * Login, Register, JWT tokens
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const { getJwtSecret } = require('../utils/jwtSecret');
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

// Refresh token
exports.refresh = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Token manquant' });
    }

    const decoded = jwt.verify(token, getJwtSecret(), {
      ignoreExpiration: true
    });

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
