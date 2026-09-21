/**
 * Routes Portail Client — Côté Courtier — LOT 12
 * Gestion des invitations, comptes et messages
 * Toutes les routes sont protégées par verifyToken (courtier)
 */

const express = require('express');
const router = express.Router();
const pool = require('../db');
const portalInvite = require('../services/portail/portalInvite');
const { messagePublic } = require('../lib/erreursPubliques')
const porteeCabinet = require('../lib/porteeCabinet')

// ─────────────────────────────────────────────────────────────────────────────
// PORTÉE = CABINET
//
// POURQUOI : la messagerie du portail et les demandes de pièces appartiennent à
// un CLIENT — donc au CABINET qui le traite. Tant que ces requêtes filtraient
// `broker_id = moi`, un collaborateur voyait un fil vide avec un client de son
// cabinet et ne pouvait pas y répondre : la conversation d'un collègue était
// invisible, alors que le dossier client, lui, est commun.
//
// COMMENT : ni `client_portal_messages` ni `client_document_requests` ne
// portent de colonne `cabinet_id` (vérifié dans `information_schema` /
// migrations) ; leur cabinet est celui de leur propriétaire (`broker_id`),
// résolu dans `cabinet_members` — la règle de rattachement de la migration 113.
// La DÉCISION de portée reste entièrement dans `lib/porteeCabinet` (seule
// autorité) ; seule la colonne « cabinet » du fragment change de forme, faute de
// colonne dédiée. Sans cabinet, le fragment retombe sur `broker_id = $n` :
// comportement historique strictement inchangé.
//
// Les routes de COMPTES/invitations du portail (`GET /accounts`,
// `POST /invitations`…) délèguent à `services/portail/portalInvite` (périmètre
// par utilisateur) : ce service n'est pas dans le périmètre de ce correctif et
// reste donc inchangé.
// ─────────────────────────────────────────────────────────────────────────────

/** Fragment de portée sur une table du portail (propriétaire = `broker_id`). */
function filtrePortail(portee, { alias, depart = 1, ecriture = false } = {}) {
  return porteeCabinet.fragment(portee, {
    cabinet: `(SELECT cm.cabinet_id FROM cabinet_members cm
                WHERE cm.user_id = ${alias}.broker_id
                  AND cm.removed_at IS NULL
                  AND cm.cabinet_id = ANY($${depart}::uuid[])
                LIMIT 1)`,
    proprietaire: `${alias}.broker_id`,
    depart,
    ecriture,
  })
}

/** Fragment de portée sur `clients` (alias `c`) — ancre du tenant. */
function filtreClient(portee, { depart = 1, ecriture = false } = {}) {
  return porteeCabinet.fragment(portee, {
    cabinet: 'c.cabinet_id',
    proprietaire: 'c.courtier_id',
    depart,
    ecriture,
  })
}

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
    res.status(400).json({ error: messagePublic(err, { statut: 400 }) });
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
    res.status(500).json({ error: messagePublic(err, { statut: 500 }) });
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
    res.status(500).json({ error: messagePublic(err, { statut: 500 }) });
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
    res.status(400).json({ error: messagePublic(err, { statut: 400 }) });
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
    res.status(400).json({ error: messagePublic(err, { statut: 400 }) });
  }
});

/**
 * GET /api/portail/messages
 * Liste les messages échangés avec un client
 */
router.get('/messages', async (req, res) => {
  try {
    const portee = await porteeCabinet.resoudrePortee(pool, req)
    const { client_id, limit = 50, offset = 0 } = req.query

    if (!client_id) {
      return res.status(400).json({ error: 'client_id requis' })
    }

    // Vérifier que le client appartient au CABINET
    const fC = filtreClient(portee, { depart: 1 })
    const clientCheck = await pool.query(
      `SELECT c.id FROM clients c WHERE c.id = $${fC.suivant} AND ${fC.sql}`,
      [...fC.params, client_id]
    )
    if (clientCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Client non trouvé' })
    }

    // Récupérer les messages — portée CABINET (un collègue a pu écrire au même client)
    const fM = filtrePortail(portee, { alias: 'm', depart: 1 })
    const messagesRes = await pool.query(
      `SELECT m.id, m.sender, m.body, m.attachments, m.read_at, m.created_at
       FROM client_portal_messages m
       WHERE m.client_id = $${fM.suivant} AND ${fM.sql}
       ORDER BY m.created_at DESC
       LIMIT $${fM.suivant + 1} OFFSET $${fM.suivant + 2}`,
      [...fM.params, client_id, parseInt(limit, 10), parseInt(offset, 10)]
    )

    // Marquer comme lus les messages du client
    await pool.query(
      `UPDATE client_portal_messages m
       SET read_at = NOW()
       WHERE m.client_id = $${fM.suivant} AND ${fM.sql} AND m.sender = 'client' AND m.read_at IS NULL`,
      [...fM.params, client_id]
    )

    // Compter total
    const countRes = await pool.query(
      `SELECT COUNT(*) FROM client_portal_messages m WHERE m.client_id = $${fM.suivant} AND ${fM.sql}`,
      [...fM.params, client_id]
    )

    // Compter non lus — portée CABINET (le compteur du cabinet, pas « les miens »)
    const fUnread = filtrePortail(portee, { alias: 'u', depart: 1 })
    const unreadRes = await pool.query(
      `SELECT COUNT(*) FROM client_portal_messages u
       WHERE ${fUnread.sql} AND u.sender = 'client' AND u.read_at IS NULL`,
      [...fUnread.params]
    )

    res.json({
      messages: messagesRes.rows,
      total: parseInt(countRes.rows[0].count, 10),
      unreadTotal: parseInt(unreadRes.rows[0].count, 10)
    });
  } catch (err) {
    res.status(500).json({ error: messagePublic(err, { statut: 500 }) });
  }
});

/**
 * POST /api/portail/messages
 * Envoie un message au client
 */
router.post('/messages', async (req, res) => {
  try {
    const portee = await porteeCabinet.resoudrePortee(pool, req)
    if (porteeCabinet.refuserEcriture(portee, res, 'envoyer un message au client')) return
    const brokerId = portee.userId || req.user.id || req.user.userId;
    const { client_id, body, attachments = [] } = req.body;

    if (!client_id || !body) {
      return res.status(400).json({ error: 'client_id et body requis' });
    }

    // Vérifier que le client appartient au CABINET
    const fC = filtreClient(portee, { depart: 1, ecriture: true })
    const clientCheck = await pool.query(
      `SELECT c.id FROM clients c WHERE c.id = $${fC.suivant} AND ${fC.sql}`,
      [...fC.params, client_id]
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
    res.status(500).json({ error: messagePublic(err, { statut: 500 }) });
  }
});

/**
 * GET /api/portail/unread-count
 * Compte les messages non lus de tous les clients
 */
router.get('/unread-count', async (req, res) => {
  try {
    const portee = await porteeCabinet.resoudrePortee(pool, req)

    // Portée CABINET : le compteur du cabinet, pas celui du seul appelant.
    const f = filtrePortail(portee, { alias: 'u', depart: 1 })
    const countRes = await pool.query(
      `SELECT COUNT(*) FROM client_portal_messages u
       WHERE ${f.sql} AND u.sender = 'client' AND u.read_at IS NULL`,
      [...f.params]
    );

    res.json({ unreadCount: parseInt(countRes.rows[0].count, 10) });
  } catch (err) {
    res.status(500).json({ error: messagePublic(err, { statut: 500 }) });
  }
});

/**
 * POST /api/portail/document-requests
 * Demande une pièce au client
 */
router.post('/document-requests', async (req, res) => {
  try {
    const portee = await porteeCabinet.resoudrePortee(pool, req)
    if (porteeCabinet.refuserEcriture(portee, res, 'demander une pièce au client')) return
    const brokerId = portee.userId || req.user.id || req.user.userId;
    const { client_id, document_type, description } = req.body;

    if (!client_id || !document_type) {
      return res.status(400).json({ error: 'client_id et document_type requis' });
    }

    // Vérifier client — portée CABINET
    const fC = filtreClient(portee, { depart: 1, ecriture: true })
    const clientCheck = await pool.query(
      `SELECT c.id FROM clients c WHERE c.id = $${fC.suivant} AND ${fC.sql}`,
      [...fC.params, client_id]
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
    res.status(500).json({ error: messagePublic(err, { statut: 500 }) });
  }
});

/**
 * GET /api/portail/document-requests
 * Liste les demandes de pièces
 */
router.get('/document-requests', async (req, res) => {
  try {
    const portee = await porteeCabinet.resoudrePortee(pool, req)
    const { client_id, status } = req.query

    // Portée CABINET : les demandes de pièces des clients du cabinet, posées par
    // n'importe lequel de ses membres.
    const f = filtrePortail(portee, { alias: 'dr', depart: 1 })
    let query = `
      SELECT dr.*, c.first_name, c.last_name
      FROM client_document_requests dr
      LEFT JOIN clients c ON c.id = dr.client_id
      WHERE ${f.sql}
    `
    const params = [...f.params]

    if (client_id) {
      query += ` AND dr.client_id = $${params.length + 1}`
      params.push(client_id)
    }
    if (status) {
      query += ` AND dr.status = $${params.length + 1}`;
      params.push(status);
    }

    query += ' ORDER BY dr.created_at DESC';

    const result = await pool.query(query, params);

    res.json({ requests: result.rows });
  } catch (err) {
    res.status(500).json({ error: messagePublic(err, { statut: 500 }) });
  }
});

module.exports = router;