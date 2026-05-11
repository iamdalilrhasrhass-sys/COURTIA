/**
 * Routes Portail Client — Côté Courtier — LOT 12
 * Gestion des invitations, comptes et messages
 * Toutes les routes sont protégées par verifyToken (courtier)
 */

const express = require('express');
const router = express.Router();
const pool = require('../db');
const portalInvite = require('../services/portail/portalInvite');

/**
 * POST /api/portail/invitations
 * Crée une invitation portail pour un client
 */
router.post('/invitations', async (req, res) => {
  try {
    const brokerId = req.user.id || req.user.userId;
    const { client_id, email } = req.body;

    if (!client_id || !email) {
      return res.status(400).json({ error: 'client_id et email sont requis' });
    }

    const result = await portalInvite.inviteClient({
      brokerId,
      clientId: client_id,
      email
    });

    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * GET /api/portail/accounts
 * Liste les comptes portail du courtier
 */
router.get('/accounts', async (req, res) => {
  try {
    const brokerId = req.user.id || req.user.userId;
    const { status, limit, offset } = req.query;

    const result = await portalInvite.listAccounts(brokerId, {
      status,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/portail/accounts/:id
 * Récupère un compte portail
 */
router.get('/accounts/:id', async (req, res) => {
  try {
    const brokerId = req.user.id || req.user.userId;
    const accountId = parseInt(req.params.id, 10);

    const account = await portalInvite.getAccount(accountId, brokerId);

    if (!account) {
      return res.status(404).json({ error: 'Compte non trouvé' });
    }

    res.json({ account });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/portail/accounts/:id/reinvite
 * Régénère le token d'activation
 */
router.post('/accounts/:id/reinvite', async (req, res) => {
  try {
    const brokerId = req.user.id || req.user.userId;
    const accountId = parseInt(req.params.id, 10);

    // Vérifier que le compte appartient au courtier
    const account = await portalInvite.getAccount(accountId, brokerId);
    if (!account) {
      return res.status(404).json({ error: 'Compte non trouvé' });
    }

    if (account.status === 'active') {
      return res.status(400).json({ error: 'Le compte est déjà actif' });
    }

    const result = await portalInvite.regenerateInvitation(accountId);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * DELETE /api/portail/accounts/:id
 * Désactive un compte portail
 */
router.delete('/accounts/:id', async (req, res) => {
  try {
    const brokerId = req.user.id || req.user.userId;
    const accountId = parseInt(req.params.id, 10);

    const result = await portalInvite.deactivateAccount(accountId, brokerId);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * GET /api/portail/messages
 * Liste les messages échangés avec un client
 */
router.get('/messages', async (req, res) => {
  try {
    const brokerId = req.user.id || req.user.userId;
    const { client_id, limit = 50, offset = 0 } = req.query;

    if (!client_id) {
      return res.status(400).json({ error: 'client_id requis' });
    }

    // Vérifier que le client appartient au courtier
    const clientCheck = await pool.query(
      'SELECT id FROM clients WHERE id = $1 AND courtier_id = $2',
      [client_id, brokerId]
    );
    if (clientCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Client non trouvé' });
    }

    // Récupérer les messages
    const messagesRes = await pool.query(
      `SELECT id, sender, body, attachments, read_at, created_at
       FROM client_portal_messages
       WHERE client_id = $1 AND broker_id = $2
       ORDER BY created_at DESC
       LIMIT $3 OFFSET $4`,
      [client_id, brokerId, parseInt(limit, 10), parseInt(offset, 10)]
    );

    // Marquer comme lus les messages du client
    await pool.query(
      `UPDATE client_portal_messages
       SET read_at = NOW()
       WHERE client_id = $1 AND broker_id = $2 AND sender = 'client' AND read_at IS NULL`,
      [client_id, brokerId]
    );

    // Compter total
    const countRes = await pool.query(
      'SELECT COUNT(*) FROM client_portal_messages WHERE client_id = $1 AND broker_id = $2',
      [client_id, brokerId]
    );

    // Compter non lus
    const unreadRes = await pool.query(
      `SELECT COUNT(*) FROM client_portal_messages
       WHERE broker_id = $1 AND sender = 'client' AND read_at IS NULL`,
      [brokerId]
    );

    res.json({
      messages: messagesRes.rows,
      total: parseInt(countRes.rows[0].count, 10),
      unreadTotal: parseInt(unreadRes.rows[0].count, 10)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/portail/messages
 * Envoie un message au client
 */
router.post('/messages', async (req, res) => {
  try {
    const brokerId = req.user.id || req.user.userId;
    const { client_id, body, attachments = [] } = req.body;

    if (!client_id || !body) {
      return res.status(400).json({ error: 'client_id et body requis' });
    }

    // Vérifier que le client appartient au courtier
    const clientCheck = await pool.query(
      'SELECT id FROM clients WHERE id = $1 AND courtier_id = $2',
      [client_id, brokerId]
    );
    if (clientCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Client non trouvé' });
    }

    // Insérer le message
    const insertRes = await pool.query(
      `INSERT INTO client_portal_messages (client_id, broker_id, sender, body, attachments)
       VALUES ($1, $2, 'broker', $3, $4)
       RETURNING id, sender, body, attachments, created_at`,
      [client_id, brokerId, body, JSON.stringify(attachments)]
    );

    res.status(201).json({ message: insertRes.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/portail/unread-count
 * Compte les messages non lus de tous les clients
 */
router.get('/unread-count', async (req, res) => {
  try {
    const brokerId = req.user.id || req.user.userId;

    const countRes = await pool.query(
      `SELECT COUNT(*) FROM client_portal_messages
       WHERE broker_id = $1 AND sender = 'client' AND read_at IS NULL`,
      [brokerId]
    );

    res.json({ unreadCount: parseInt(countRes.rows[0].count, 10) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/portail/document-requests
 * Demande une pièce au client
 */
router.post('/document-requests', async (req, res) => {
  try {
    const brokerId = req.user.id || req.user.userId;
    const { client_id, document_type, description } = req.body;

    if (!client_id || !document_type) {
      return res.status(400).json({ error: 'client_id et document_type requis' });
    }

    // Vérifier client
    const clientCheck = await pool.query(
      'SELECT id FROM clients WHERE id = $1 AND courtier_id = $2',
      [client_id, brokerId]
    );
    if (clientCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Client non trouvé' });
    }

    const insertRes = await pool.query(
      `INSERT INTO client_document_requests (client_id, broker_id, document_type, description)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [client_id, brokerId, document_type, description || null]
    );

    res.status(201).json({ request: insertRes.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/portail/document-requests
 * Liste les demandes de pièces
 */
router.get('/document-requests', async (req, res) => {
  try {
    const brokerId = req.user.id || req.user.userId;
    const { client_id, status } = req.query;

    let query = `
      SELECT dr.*, c.first_name, c.last_name
      FROM client_document_requests dr
      JOIN clients c ON c.id = dr.client_id
      WHERE dr.broker_id = $1
    `;
    const params = [brokerId];

    if (client_id) {
      query += ` AND dr.client_id = $${params.length + 1}`;
      params.push(client_id);
    }
    if (status) {
      query += ` AND dr.status = $${params.length + 1}`;
      params.push(status);
    }

    query += ' ORDER BY dr.created_at DESC';

    const result = await pool.query(query, params);

    res.json({ requests: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;