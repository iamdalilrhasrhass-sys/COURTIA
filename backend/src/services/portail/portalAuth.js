/**
 * Portal Auth Service — Authentification clients portail LOT 12
 * Système JWT séparé avec audience='client_portal'
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../../db');
const { getJwtSecret } = require('../../utils/jwtSecret');

// Constantes
const BCRYPT_ROUNDS = 12;
const JWT_EXPIRATION = '7d';
const ACTIVATION_TOKEN_EXPIRY_HOURS = 48;
const RESET_TOKEN_EXPIRY_HOURS = 1;

/**
 * Génère un token aléatoire sécurisé (32 bytes hex)
 */
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Empreinte SHA-256 d'un jeton de réinitialisation.
 * Le jeton n'est JAMAIS stocké en clair : seule son empreinte est écrite en base
 * (les jetons portail sont à usage unique et expirent en 1 h).
 */
function hashResetToken(token) {
  return crypto.createHash('sha256').update(String(token || '')).digest('hex');
}

// Réponse UNIFORME de la demande de réinitialisation : même texte, même code,
// que le compte existe ou non (anti-énumération). Aucun jeton n'y figure.
const RESET_REQUEST_RESPONSE = {
  success: true,
  message: 'Si ce compte existe, un lien de réinitialisation a été envoyé'
};

/**
 * Génère un JWT pour le portail client
 */
function generateClientJwt(account, client) {
  const payload = {
    portalAccountId: account.id,
    clientId: account.client_id,
    brokerId: account.broker_id,
    email: account.email,
    clientName: client ? `${client.first_name || ''} ${client.last_name || ''}`.trim() : null,
    aud: 'client_portal'
  };

  return jwt.sign(payload, getJwtSecret(), { expiresIn: JWT_EXPIRATION });
}

/**
 * Active un compte portail avec le token d'activation
 */
async function activate(token, password) {
  if (!token || !password) {
    throw new Error('Token et mot de passe requis');
  }

  if (password.length < 8) {
    throw new Error('Le mot de passe doit contenir au moins 8 caractères');
  }

  // Vérifier token valide et non expiré
  const accountRes = await pool.query(
    `SELECT cpa.*, c.first_name, c.last_name
     FROM client_portal_accounts cpa
     JOIN clients c ON c.id = cpa.client_id
     WHERE cpa.activation_token = $1
       AND cpa.activation_token_expires_at > NOW()
       AND cpa.status = 'pending'`,
    [token]
  );

  if (accountRes.rows.length === 0) {
    throw new Error('Token invalide ou expiré');
  }

  const account = accountRes.rows[0];

  // Hasher le mot de passe
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  // Activer le compte
  await pool.query(
    `UPDATE client_portal_accounts
     SET password_hash = $1,
         activation_token = NULL,
         activation_token_expires_at = NULL,
         activated_at = NOW(),
         status = 'active',
         updated_at = NOW()
     WHERE id = $2`,
    [passwordHash, account.id]
  );

  // Générer JWT
  const jwtToken = generateClientJwt(account, account);

  return {
    success: true,
    token: jwtToken,
    account: {
      id: account.id,
      clientId: account.client_id,
      email: account.email,
      name: `${account.first_name || ''} ${account.last_name || ''}`.trim()
    }
  };
}

/**
 * Connexion au portail client
 */
async function login(email, password) {
  if (!email || !password) {
    throw new Error('Email et mot de passe requis');
  }

  // Rechercher compte par email
  const accountRes = await pool.query(
    `SELECT cpa.*, c.first_name, c.last_name
     FROM client_portal_accounts cpa
     JOIN clients c ON c.id = cpa.client_id
     WHERE cpa.email = $1 AND cpa.status = 'active'`,
    [email.toLowerCase().trim()]
  );

  if (accountRes.rows.length === 0) {
    throw new Error('Identifiants incorrects');
  }

  const account = accountRes.rows[0];

  // Vérifier mot de passe
  const passwordValid = await bcrypt.compare(password, account.password_hash);
  if (!passwordValid) {
    throw new Error('Identifiants incorrects');
  }

  // Mettre à jour last_login et compteur
  await pool.query(
    `UPDATE client_portal_accounts
     SET last_login_at = NOW(),
         login_count = login_count + 1,
         updated_at = NOW()
     WHERE id = $1`,
    [account.id]
  );

  // Générer JWT
  const jwtToken = generateClientJwt(account, account);

  return {
    success: true,
    token: jwtToken,
    account: {
      id: account.id,
      clientId: account.client_id,
      brokerId: account.broker_id,
      email: account.email,
      name: `${account.first_name || ''} ${account.last_name || ''}`.trim()
    }
  };
}

/**
 * Demande de réinitialisation de mot de passe (route PUBLIQUE).
 *
 * SEC-002 — Un endpoint public ne renvoie JAMAIS le jeton : la réponse est
 * strictement identique que le compte existe ou non (anti-énumération). Le jeton
 * est tout de même généré, stocké (haché, usage unique, expiration 1 h) et, si
 * un canal d'envoi est configuré, transmis par e-mail.
 */
async function requestReset(email) {
  if (!email) {
    throw new Error('Email requis');
  }

  const accountRes = await pool.query(
    "SELECT * FROM client_portal_accounts WHERE email = $1 AND status = 'active'",
    [email.toLowerCase().trim()]
  );

  // Compte inexistant : même réponse, aucune écriture.
  if (accountRes.rows.length === 0) {
    return { ...RESET_REQUEST_RESPONSE };
  }

  const account = accountRes.rows[0];
  const issued = await issueResetToken(account);

  // L'envoi du lien reste optionnel : sans configuration e-mail, le courtier
  // peut réémettre un lien via le chemin interne (requestResetForBroker).
  await envoyerLienReset(account, issued.resetLink);

  return { ...RESET_REQUEST_RESPONSE };
}

/**
 * Émission du jeton de réinitialisation pour un compte donné.
 * @returns {Promise<{resetToken: string, resetLink: string, expiresAt: Date}>}
 */
async function issueResetToken(account) {
  const resetToken = generateToken();
  const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

  await pool.query(
    `UPDATE client_portal_accounts
     SET reset_token = $1,
         reset_token_expires_at = $2,
         updated_at = NOW()
     WHERE id = $3`,
    [hashResetToken(resetToken), expiresAt, account.id]
  );

  return {
    resetToken,
    resetLink: `/portal/reset-password?token=${resetToken}`,
    expiresAt
  };
}

/**
 * Chemin INTERNE courtier : réémet un lien de réinitialisation pour un client du
 * cabinet. À n'appeler QUE depuis une route authentifiée courtier — jamais depuis
 * la route publique /portal/auth/request-reset (SEC-002).
 */
async function requestResetForBroker(email, brokerId) {
  if (!email) {
    throw new Error('Email requis');
  }

  const params = [email.toLowerCase().trim()];
  let sql = "SELECT * FROM client_portal_accounts WHERE email = $1 AND status = 'active'";
  if (brokerId) {
    sql += ' AND broker_id = $2';
    params.push(brokerId);
  }

  const accountRes = await pool.query(sql, params);
  if (accountRes.rows.length === 0) {
    return { success: false, error: 'account_not_found' };
  }

  const issued = await issueResetToken(accountRes.rows[0]);
  return {
    success: true,
    resetToken: issued.resetToken,
    resetLink: issued.resetLink,
    expiresAt: issued.expiresAt
  };
}

/**
 * Envoi du lien de réinitialisation. Non bloquant : une configuration e-mail
 * absente ne doit pas faire échouer la demande (et n'expose jamais le jeton).
 */
async function envoyerLienReset(account, resetLink) {
  try {
    const { sendEmail } = require('../emailService');
    const frontendUrl = process.env.FRONTEND_URL || 'https://courtiark.fr';
    const lien = resetLink.startsWith('http') ? resetLink : `${frontendUrl}${resetLink}`;
    await sendEmail({
      to: account.email,
      subject: 'COURTIA — Réinitialisation de votre mot de passe',
      html: `<p>Bonjour,</p><p>Un lien de réinitialisation de votre mot de passe portail COURTIA a été demandé.</p><p><a href="${lien}">Choisir un nouveau mot de passe</a> (valable 1 heure).</p><p>Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.</p>`,
      text: `Réinitialisez votre mot de passe portail COURTIA : ${lien} (valable 1 heure).`
    });
  } catch (err) {
    console.warn('[PortalAuth] envoi du lien de réinitialisation impossible:', err.message);
  }
}

/**
 * Réinitialisation du mot de passe
 */
async function resetPassword(token, newPassword) {
  if (!token || !newPassword) {
    throw new Error('Token et nouveau mot de passe requis');
  }

  if (newPassword.length < 8) {
    throw new Error('Le mot de passe doit contenir au moins 8 caractères');
  }

  const accountRes = await pool.query(
    `SELECT * FROM client_portal_accounts
     WHERE reset_token = $1
       AND reset_token_expires_at > NOW()
       AND status = 'active'`,
    [hashResetToken(token)]
  );

  if (accountRes.rows.length === 0) {
    throw new Error('Token invalide ou expiré');
  }

  const account = accountRes.rows[0];
  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

  await pool.query(
    `UPDATE client_portal_accounts
     SET password_hash = $1,
         reset_token = NULL,
         reset_token_expires_at = NULL,
         updated_at = NOW()
     WHERE id = $2`,
    [passwordHash, account.id]
  );

  return { success: true, message: 'Mot de passe réinitialisé avec succès' };
}

/**
 * Middleware de vérification du token portail client
 */
function verifyClientPortalToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: "En-tête d'authentification manquant" });
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({ error: "Format d'authentification invalide" });
    }

    const token = parts[1];
    const decoded = jwt.verify(token, getJwtSecret());

    // Vérifier audience
    if (decoded.aud !== 'client_portal') {
      return res.status(401).json({ error: 'Token non autorisé pour ce service' });
    }

    req.portalUser = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expirée, veuillez vous reconnecter' });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Token invalide' });
    }
    return res.status(500).json({ error: 'Erreur de vérification du token' });
  }
}

/**
 * Récupère les infos du compte portail
 */
async function getAccountInfo(portalAccountId) {
  const res = await pool.query(
    `SELECT cpa.id, cpa.client_id, cpa.broker_id, cpa.email, cpa.status,
            cpa.activated_at, cpa.last_login_at, cpa.login_count,
            c.first_name, c.last_name, c.phone, c.address, c.postal_code, c.city,
            u.full_name as broker_name, u.email as broker_email
     FROM client_portal_accounts cpa
     JOIN clients c ON c.id = cpa.client_id
     JOIN users u ON u.id = cpa.broker_id
     WHERE cpa.id = $1`,
    [portalAccountId]
  );

  if (res.rows.length === 0) {
    throw new Error('Compte non trouvé');
  }

  const row = res.rows[0];
  return {
    id: row.id,
    clientId: row.client_id,
    brokerId: row.broker_id,
    email: row.email,
    status: row.status,
    activatedAt: row.activated_at,
    lastLoginAt: row.last_login_at,
    loginCount: row.login_count,
    client: {
      firstName: row.first_name,
      lastName: row.last_name,
      phone: row.phone,
      address: row.address,
      postalCode: row.postal_code,
      city: row.city
    },
    broker: {
      name: row.broker_name,
      email: row.broker_email
    }
  };
}

module.exports = {
  generateToken,
  hashResetToken,
  activate,
  login,
  requestReset,
  requestResetForBroker,
  resetPassword,
  verifyClientPortalToken,
  getAccountInfo,
  ACTIVATION_TOKEN_EXPIRY_HOURS,
  RESET_TOKEN_EXPIRY_HOURS,
  RESET_REQUEST_RESPONSE
};