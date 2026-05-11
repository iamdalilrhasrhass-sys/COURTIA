/**
 * Portal Invite Service — Gestion des invitations portail client LOT 12
 */

const pool = require('../../db');
const { generateToken, ACTIVATION_TOKEN_EXPIRY_HOURS } = require('./portalAuth');

/**
 * Invite un client à rejoindre son portail
 * @param {Object} params - { brokerId, clientId, email }
 * @returns {Object} - Compte créé + lien d'activation
 */
async function inviteClient({ brokerId, clientId, email }) {
  if (!brokerId || !clientId || !email) {
    throw new Error('brokerId, clientId et email sont requis');
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Vérifier que le client existe et appartient au courtier
  const clientRes = await pool.query(
    'SELECT id, first_name, last_name, email FROM clients WHERE id = $1 AND courtier_id = $2',
    [clientId, brokerId]
  );

  if (clientRes.rows.length === 0) {
    throw new Error('Client non trouvé ou non autorisé');
  }

  const client = clientRes.rows[0];

  // Vérifier si un compte existe déjà
  const existingRes = await pool.query(
    'SELECT id, status FROM client_portal_accounts WHERE client_id = $1',
    [clientId]
  );

  if (existingRes.rows.length > 0) {
    const existing = existingRes.rows[0];
    if (existing.status === 'active') {
      throw new Error('Ce client possède déjà un compte portail actif');
    }
    // Compte pending : on peut régénérer le token
    return await regenerateInvitation(existing.id);
  }

  // Générer token d'activation
  const activationToken = generateToken();
  const expiresAt = new Date(Date.now() + ACTIVATION_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

  // Créer le compte
  const insertRes = await pool.query(
    `INSERT INTO client_portal_accounts
       (client_id, broker_id, email, activation_token, activation_token_expires_at, status)
     VALUES ($1, $2, $3, $4, $5, 'pending')
     RETURNING id, client_id, broker_id, email, status, created_at`,
    [clientId, brokerId, normalizedEmail, activationToken, expiresAt]
  );

  const account = insertRes.rows[0];

  // Générer le lien d'activation (V1 : lien direct, pas d'envoi email automatique)
  const baseUrl = process.env.FRONTEND_URL || 'https://app.courtiark.fr';
  const activationLink = `${baseUrl}/portal/activate?token=${activationToken}`;

  return {
    success: true,
    account: {
      id: account.id,
      clientId: account.client_id,
      email: account.email,
      status: account.status,
      createdAt: account.created_at
    },
    client: {
      name: `${client.first_name || ''} ${client.last_name || ''}`.trim(),
      originalEmail: client.email
    },
    activation: {
      token: activationToken,
      link: activationLink,
      expiresAt: expiresAt.toISOString(),
      expiresInHours: ACTIVATION_TOKEN_EXPIRY_HOURS
    },
    message: 'Invitation créée. Envoyez le lien d\'activation au client par WhatsApp, SMS ou email.'
  };
}

/**
 * Régénère le token d'activation pour un compte pending
 */
async function regenerateInvitation(accountId) {
  const activationToken = generateToken();
  const expiresAt = new Date(Date.now() + ACTIVATION_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

  const updateRes = await pool.query(
    `UPDATE client_portal_accounts
     SET activation_token = $1,
         activation_token_expires_at = $2,
         updated_at = NOW()
     WHERE id = $3 AND status = 'pending'
     RETURNING id, client_id, broker_id, email, status`,
    [activationToken, expiresAt, accountId]
  );

  if (updateRes.rows.length === 0) {
    throw new Error('Compte non trouvé ou déjà activé');
  }

  const account = updateRes.rows[0];

  // Récupérer infos client
  const clientRes = await pool.query(
    'SELECT first_name, last_name FROM clients WHERE id = $1',
    [account.client_id]
  );
  const client = clientRes.rows[0] || {};

  const baseUrl = process.env.FRONTEND_URL || 'https://app.courtiark.fr';
  const activationLink = `${baseUrl}/portal/activate?token=${activationToken}`;

  return {
    success: true,
    account: {
      id: account.id,
      clientId: account.client_id,
      email: account.email,
      status: account.status
    },
    client: {
      name: `${client.first_name || ''} ${client.last_name || ''}`.trim()
    },
    activation: {
      token: activationToken,
      link: activationLink,
      expiresAt: expiresAt.toISOString(),
      expiresInHours: ACTIVATION_TOKEN_EXPIRY_HOURS
    },
    message: 'Nouveau lien d\'activation généré.'
  };
}

/**
 * Liste les comptes portail d'un courtier
 */
async function listAccounts(brokerId, options = {}) {
  const { status, limit = 50, offset = 0 } = options;

  let query = `
    SELECT cpa.id, cpa.client_id, cpa.email, cpa.status,
           cpa.activated_at, cpa.last_login_at, cpa.login_count,
           cpa.created_at, cpa.updated_at,
           c.first_name, c.last_name, c.phone
    FROM client_portal_accounts cpa
    JOIN clients c ON c.id = cpa.client_id
    WHERE cpa.broker_id = $1
  `;

  const params = [brokerId];

  if (status) {
    query += ` AND cpa.status = $2`;
    params.push(status);
  }

  query += ` ORDER BY cpa.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(limit, offset);

  const res = await pool.query(query, params);

  // Compter total
  let countQuery = 'SELECT COUNT(*) FROM client_portal_accounts WHERE broker_id = $1';
  const countParams = [brokerId];
  if (status) {
    countQuery += ' AND status = $2';
    countParams.push(status);
  }
  const countRes = await pool.query(countQuery, countParams);

  return {
    accounts: res.rows.map(row => ({
      id: row.id,
      clientId: row.client_id,
      email: row.email,
      status: row.status,
      activatedAt: row.activated_at,
      lastLoginAt: row.last_login_at,
      loginCount: row.login_count,
      createdAt: row.created_at,
      client: {
        firstName: row.first_name,
        lastName: row.last_name,
        phone: row.phone
      }
    })),
    total: parseInt(countRes.rows[0].count, 10),
    limit,
    offset
  };
}

/**
 * Récupère un compte portail par ID
 */
async function getAccount(accountId, brokerId) {
  const res = await pool.query(
    `SELECT cpa.*, c.first_name, c.last_name, c.phone, c.email as client_email
     FROM client_portal_accounts cpa
     JOIN clients c ON c.id = cpa.client_id
     WHERE cpa.id = $1 AND cpa.broker_id = $2`,
    [accountId, brokerId]
  );

  if (res.rows.length === 0) {
    return null;
  }

  const row = res.rows[0];
  return {
    id: row.id,
    clientId: row.client_id,
    email: row.email,
    status: row.status,
    activatedAt: row.activated_at,
    lastLoginAt: row.last_login_at,
    loginCount: row.login_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    client: {
      firstName: row.first_name,
      lastName: row.last_name,
      phone: row.phone,
      originalEmail: row.client_email
    }
  };
}

/**
 * Désactive un compte portail
 */
async function deactivateAccount(accountId, brokerId) {
  const res = await pool.query(
    `UPDATE client_portal_accounts
     SET status = 'disabled',
         updated_at = NOW()
     WHERE id = $1 AND broker_id = $2
     RETURNING id, status`,
    [accountId, brokerId]
  );

  if (res.rows.length === 0) {
    throw new Error('Compte non trouvé');
  }

  return { success: true, account: res.rows[0] };
}

module.exports = {
  inviteClient,
  regenerateInvitation,
  listAccounts,
  getAccount,
  deactivateAccount
};