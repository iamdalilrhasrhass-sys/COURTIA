/**
 * Public API Routes — LOT 23
 * API REST publique pour intégrations tierces
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CORRECTION 20/09/2026 (Red Team P2 #5) — l'API publique v1 était cassée sur
 * ses quatre lectures mesurées en production :
 *   * GET /api/v1/me        → `cabinet_name: null` (lu dans `users.cabinet_name`,
 *                             colonne vide : le nom du cabinet vit dans
 *                             `cabinets` / `broker_profiles`) ;
 *   * GET /api/v1/clients   → 200 `total: 0` alors que le cabinet A des clients
 *                             (la requête filtrait `clients.user_id`, colonne
 *                             JAMAIS renseignée : le code écrit `courtier_id`
 *                             et `cabinet_id`) ;
 *   * GET /api/v1/contracts → 500 `column ct.product_type does not exist` (la
 *                             table `contracts` ne porte pas ces colonnes ; les
 *                             contrats COURTIA vivent dans `quotes.quote_data`) ;
 *   * GET /api/v1/commissions → 500 `column cm.amount_cents does not exist`
 *                             (les colonnes réelles sont `expected_amount_cents`
 *                             et `received_amount_cents`).
 *
 * La portée est désormais celle du produit : `lib/porteeCabinet` (le CABINET
 * quand la clé appartient à un membre de cabinet, ses propres lignes sinon).
 * C'est la même autorité que les routes internes — une clé d'API ne peut pas
 * voir plus que son porteur dans l'application.
 *
 * Une clé émise avec les droits par défaut (read:clients, read:contracts,
 * read:commissions) reste en LECTURE SEULE : l'enregistrement d'un webhook
 * exige le scope `write:webhooks` — un accès technique qui écrit n'est pas une
 * lecture, et l'émission d'une clé est désormais réservée aux rôles d'écriture
 * du cabinet (voir routes/developer.js).
 */

const express = require('express');
const router = express.Router();
const pool = require('../db');
const { apiKeyAuth } = require('../middleware/apiKeyAuth');
const apiKeyService = require('../services/apiKeyService');
const porteeCabinet = require('../lib/porteeCabinet');
const { messagePublic } = require('../lib/erreursPubliques')

/** Portée de l'appelant (celle de la clé d'API : son porteur). */
function porteeDe(req) {
  return porteeCabinet.resoudrePortee(pool, req);
}

/** Identifiant numérique strict (jamais un « abc » envoyé à PostgreSQL). */
function entier(valeur) {
  const texte = String(valeur ?? '').trim();
  return /^\d+$/.test(texte) ? Number(texte) : null;
}

/** Entier de pagination borné (les défauts sont ceux de l'API publique). */
function page(valeur, defaut, max) {
  const n = Number.parseInt(valeur, 10);
  if (!Number.isFinite(n) || n < 0) return defaut;
  return Math.min(n, max);
}

// ==================== INFO CABINET ====================

/**
 * GET /api/v1/me
 * Infos du cabinet porteur de la clé.
 *
 * POURQUOI CETTE REQUÊTE : `users.cabinet_name` est NULL pour la plupart des
 * comptes (le nom du cabinet a été saisi à l'invitation, donc dans
 * `broker_profiles` / `cabinets`). L'API renvoyait donc `cabinet_name: null` à
 * l'intégrateur. On lit le premier nom réellement renseigné, sans en inventer
 * aucun : si les trois sources sont vides, la réponse dit `null` — un nom
 * fabriqué serait pire qu'un nom absent.
 */
router.get('/me', apiKeyAuth(), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.email, u.phone, u.plan, u.created_at,
              COALESCE(
                NULLIF(u.cabinet_name, ''),
                NULLIF(bp.cabinet_name, ''),
                NULLIF(bp.cabinet, ''),
                (SELECT NULLIF(ca.name, '') FROM cabinet_members cm
                   JOIN cabinets ca ON ca.id = cm.cabinet_id
                  WHERE cm.user_id = u.id AND cm.removed_at IS NULL
                  ORDER BY cm.created_at ASC LIMIT 1)
              ) AS cabinet_name,
              bp.pays, bp.registre_type, bp.registre_numero
         FROM users u
         LEFT JOIN broker_profiles bp ON bp.user_id = u.id
        WHERE u.id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'cabinet_not_found' });
    }

    const user = result.rows[0];

    res.json({
      id: user.id,
      email: user.email,
      cabinet_name: user.cabinet_name,
      phone: user.phone,
      plan: user.plan,
      pays: user.pays || null,
      registre_type: user.registre_type || null,
      registre_numero: user.registre_numero || null,
      created_at: user.created_at,
      api_key: {
        name: req.apiKey.name,
        scopes: req.apiKey.scopes
      }
    });
  } catch (error) {
    console.error('GET /me error:', error);
    res.status(500).json({ error: 'internal_error', message: messagePublic(error, { statut: 500 }) });
  }
});

// ==================== CLIENTS ====================

/**
 * GET /api/v1/clients
 * Clients du CABINET de la clé.
 *
 * POURQUOI LE FILTRE A CHANGÉ : `WHERE user_id = $1` ne renvoyait jamais rien
 * (`clients.user_id` n'est pas alimentée) — `total: 0` pour un cabinet qui a
 * des clients. Le filtre est celui du produit : `courtier_id` / `cabinet_id`.
 */
router.get('/clients', apiKeyAuth(['read:clients']), async (req, res) => {
  try {
    const { search } = req.query;
    const limite = page(req.query.limit, 100, 1000);
    const decalage = page(req.query.offset, 0, Number.MAX_SAFE_INTEGER);

    const portee = await porteeDe(req);
    const f = porteeCabinet.fragment(portee, {
      cabinet: 'clients.cabinet_id',
      proprietaire: 'clients.courtier_id',
      depart: 1,
    });

    const params = [...f.params];
    let condition = f.sql;
    if (search) {
      params.push(`%${search}%`);
      condition += ` AND (first_name ILIKE $${params.length} OR last_name ILIKE $${params.length}`
        + ` OR email ILIKE $${params.length} OR company_name ILIKE $${params.length})`;
    }

    const result = await pool.query(
      `SELECT id, first_name, last_name, email, phone, type,
              company_name, city, postal_code, status, created_at, updated_at
         FROM clients
        WHERE ${condition}
        ORDER BY created_at DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limite, decalage]
    );

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total FROM clients WHERE ${f.sql}`,
      [...f.params]
    );

    res.json({
      data: result.rows,
      pagination: {
        total: countResult.rows[0] ? countResult.rows[0].total : 0,
        limit: limite,
        offset: decalage
      },
      scope: portee.mode === 'cabinet' ? 'cabinet' : 'utilisateur'
    });
  } catch (error) {
    console.error('GET /clients error:', error);
    res.status(500).json({ error: 'internal_error', message: messagePublic(error, { statut: 500 }) });
  }
});

/**
 * GET /api/v1/clients/:id
 * Détail d'un client du cabinet. Le compteur de contrats lit `quotes` : c'est
 * la table où COURTIA stocke réellement les contrats (la table `contracts`
 * existe mais n'est pas alimentée par le produit).
 */
router.get('/clients/:id', apiKeyAuth(['read:clients']), async (req, res) => {
  try {
    const clientId = entier(req.params.id);
    if (clientId === null) {
      return res.status(404).json({ error: 'client_not_found' });
    }

    const portee = await porteeDe(req);
    const f = porteeCabinet.fragment(portee, {
      cabinet: 'c.cabinet_id',
      proprietaire: 'c.courtier_id',
      depart: 2,
    });

    const result = await pool.query(
      `SELECT c.*,
              (SELECT COUNT(*)::int FROM quotes q WHERE q.client_id = c.id) AS contracts_count
         FROM clients c
        WHERE c.id = $1 AND ${f.sql}`,
      [clientId, ...f.params]
    );

    if (result.rows.length === 0) {
      // 404 (et non 403) : ne jamais confirmer l'existence d'un client d'un
      // autre cabinet à un porteur de clé.
      return res.status(404).json({ error: 'client_not_found' });
    }

    res.json({ data: result.rows[0] });
  } catch (error) {
    console.error('GET /clients/:id error:', error);
    res.status(500).json({ error: 'internal_error', message: messagePublic(error, { statut: 500 }) });
  }
});

// ==================== CONTRATS ====================

/**
 * GET /api/v1/contracts
 * Contrats (polices) du cabinet, lus dans `quotes.quote_data` — la source
 * réelle du produit (`contracts.product_type` n'existe pas).
 */
router.get('/contracts', apiKeyAuth(['read:contracts']), async (req, res) => {
  try {
    const { client_id, status } = req.query;
    const limite = page(req.query.limit, 100, 1000);
    const decalage = page(req.query.offset, 0, Number.MAX_SAFE_INTEGER);

    const portee = await porteeDe(req);
    const f = porteeCabinet.fragment(portee, {
      cabinet: 'c.cabinet_id',
      proprietaire: 'c.courtier_id',
      depart: 1,
    });

    const params = [...f.params];
    const conditions = [f.sql];
    if (client_id) {
      const cid = entier(client_id);
      if (cid === null) return res.status(400).json({ error: 'invalid_client_id' });
      params.push(cid);
      conditions.push(`q.client_id = $${params.length}`);
    }
    if (status) {
      params.push(status);
      conditions.push(`q.status = $${params.length}`);
    }

    const result = await pool.query(
      `SELECT q.id,
              q.client_id,
              q.status,
              q.quote_data->>'numero' AS contract_number,
              q.quote_data->>'type_contrat' AS type,
              q.quote_data->>'compagnie' AS insurer,
              (q.quote_data->>'prime_annuelle')::numeric AS annual_premium,
              q.quote_data->>'date_effet' AS start_date,
              q.quote_data->>'date_echeance' AS end_date,
              c.first_name AS client_first_name,
              c.last_name AS client_last_name,
              q.created_at,
              q.updated_at
         FROM quotes q
         JOIN clients c ON c.id = q.client_id
        WHERE ${conditions.join(' AND ')}
        ORDER BY (q.quote_data->>'date_echeance') ASC NULLS LAST
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limite, decalage]
    );

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total
         FROM quotes q JOIN clients c ON c.id = q.client_id
        WHERE ${f.sql}`,
      [...f.params]
    );

    res.json({
      data: result.rows,
      pagination: {
        total: countResult.rows[0] ? countResult.rows[0].total : 0,
        limit: limite,
        offset: decalage
      }
    });
  } catch (error) {
    console.error('GET /contracts error:', error);
    res.status(500).json({ error: 'internal_error', message: messagePublic(error, { statut: 500 }) });
  }
});

// ==================== COMMISSIONS ====================

/**
 * GET /api/v1/commissions
 * Commissions du cabinet, avec les colonnes RÉELLES
 * (`expected_amount_cents` / `received_amount_cents` / `period_year` /
 * `period_month`). Les montants sont donnés à la fois en centimes (source) et
 * en unité monétaire, convertis — aucune valeur n'est inventée.
 */
router.get('/commissions', apiKeyAuth(['read:commissions']), async (req, res) => {
  try {
    const { year, month, status } = req.query;
    const limite = page(req.query.limit, 100, 1000);
    const decalage = page(req.query.offset, 0, Number.MAX_SAFE_INTEGER);

    const portee = await porteeDe(req);
    const f = porteeCabinet.fragment(portee, {
      cabinet: 'cm.cabinet_id',
      proprietaire: 'cm.user_id',
      depart: 1,
    });

    const params = [...f.params];
    const conditions = [f.sql];
    const annee = entier(year);
    if (annee !== null) {
      params.push(annee);
      conditions.push(`cm.period_year = $${params.length}`);
    }
    const mois = entier(month);
    if (mois !== null && mois >= 1 && mois <= 12) {
      params.push(mois);
      conditions.push(`cm.period_month = $${params.length}`);
    }
    if (status) {
      params.push(status);
      conditions.push(`cm.status = $${params.length}`);
    }

    const result = await pool.query(
      `SELECT cm.id, cm.contract_id, cm.insurer,
              cm.period_year, cm.period_month,
              cm.expected_amount_cents, cm.received_amount_cents,
              cm.currency, cm.status, cm.payment_date, cm.reconciled_at,
              cm.notes, cm.created_at, cm.updated_at,
              q.quote_data->>'numero' AS contract_number
         FROM commissions cm
         LEFT JOIN quotes q ON q.id = cm.contract_id
        WHERE ${conditions.join(' AND ')}
        ORDER BY cm.period_year DESC, cm.period_month DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limite, decalage]
    );

    const totalResult = await pool.query(
      `SELECT COALESCE(SUM(cm.expected_amount_cents), 0)::bigint AS expected_cents,
              COALESCE(SUM(cm.received_amount_cents), 0)::bigint AS received_cents,
              COUNT(*)::int AS total
         FROM commissions cm
        WHERE ${f.sql}`,
      [...f.params]
    );
    const totaux = totalResult.rows[0] || { expected_cents: 0, received_cents: 0, total: 0 }
    const centimes = (valeur) => Number(valeur || 0)

    res.json({
      data: result.rows.map((row) => ({
        ...row,
        // Conversion d'unité explicite : les colonnes `*_cents` restent la
        // source, les champs suivants sont la même valeur en euros / CHF.
        expected_amount: centimes(row.expected_amount_cents) / 100,
        received_amount: centimes(row.received_amount_cents) / 100,
      })),
      summary: {
        expected_amount: centimes(totaux.expected_cents) / 100,
        received_amount: centimes(totaux.received_cents) / 100,
        commissions: totaux.total || 0,
      },
      pagination: {
        total: totaux.total || 0,
        limit: limite,
        offset: decalage
      }
    });
  } catch (error) {
    console.error('GET /commissions error:', error);
    res.status(500).json({ error: 'internal_error', message: messagePublic(error, { statut: 500 }) });
  }
});

// ==================== WEBHOOKS ====================

/**
 * POST /api/v1/webhooks
 * Enregistre une URL de webhook. ÉCRITURE : elle exige le scope
 * `write:webhooks` — une clé de lecture seule (scopes par défaut) reçoit 403.
 */
router.post('/webhooks', apiKeyAuth(['write:webhooks']), async (req, res) => {
  try {
    const { url, events } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'missing_url', message: 'Webhook URL is required' });
    }

    try {
      new URL(url);
    } catch {
      return res.status(400).json({ error: 'invalid_url', message: 'Invalid webhook URL format' });
    }

    const validEvents = ['client.created', 'client.updated', 'contract.created', 'contract.updated', 'commission.received'];
    const requestedEvents = events || validEvents.slice(0, 3);

    const invalidEvents = requestedEvents.filter(e => !validEvents.includes(e));
    if (invalidEvents.length > 0) {
      return res.status(400).json({
        error: 'invalid_events',
        message: `Invalid events: ${invalidEvents.join(', ')}`,
        valid_events: validEvents
      });
    }

    const webhook = await apiKeyService.registerWebhook(req.user.id, url, requestedEvents);

    res.status(201).json({
      message: 'Webhook registered successfully',
      webhook: {
        id: webhook.id,
        url: webhook.url,
        events: webhook.events,
        // Le secret n'est rendu QUE s'il vient d'être créé : sur un
        // ré-abonnement, l'intégration conserve celui qu'elle détient déjà.
        // (Un `secret: null` ferait croire à une rotation de secret.)
        ...(webhook.secret ? { secret: webhook.secret } : {}),
      },
      note: webhook.secret
        ? 'Store the secret securely. It will be used to sign webhook payloads.'
        : 'This URL was already registered: the existing secret is unchanged.',
    });
  } catch (error) {
    console.error('POST /webhooks error:', error);
    res.status(500).json({ error: 'internal_error', message: messagePublic(error, { statut: 500 }) });
  }
});

/**
 * GET /api/v1/webhooks
 * Liste les webhooks configurés
 */
router.get('/webhooks', apiKeyAuth(), async (req, res) => {
  try {
    const webhooks = await apiKeyService.listWebhooks(req.user.id);
    res.json({ data: webhooks });
  } catch (error) {
    console.error('GET /webhooks error:', error);
    res.status(500).json({ error: 'internal_error', message: messagePublic(error, { statut: 500 }) });
  }
});

/**
 * DELETE /api/v1/webhooks/:id
 * Supprime un webhook (écriture : scope requis).
 */
router.delete('/webhooks/:id', apiKeyAuth(['write:webhooks']), async (req, res) => {
  try {
    const deleted = await apiKeyService.deleteWebhook(req.params.id, req.user.id);

    if (!deleted) {
      return res.status(404).json({ error: 'webhook_not_found' });
    }

    res.json({ message: 'Webhook deleted successfully' });
  } catch (error) {
    console.error('DELETE /webhooks/:id error:', error);
    res.status(500).json({ error: 'internal_error', message: messagePublic(error, { statut: 500 }) });
  }
});

// ==================== API DOCS REDIRECT ====================

router.get('/', (req, res) => {
  res.json({
    name: 'COURTIA Public API',
    version: 'v1',
    documentation: '/api/docs',
    scopes: {
      'read:clients': 'GET /api/v1/clients, GET /api/v1/clients/:id',
      'read:contracts': 'GET /api/v1/contracts',
      'read:commissions': 'GET /api/v1/commissions',
      'write:webhooks': 'POST /api/v1/webhooks, DELETE /api/v1/webhooks/:id',
    },
    endpoints: {
      me: 'GET /api/v1/me',
      clients: 'GET /api/v1/clients',
      client_detail: 'GET /api/v1/clients/:id',
      contracts: 'GET /api/v1/contracts',
      commissions: 'GET /api/v1/commissions',
      webhooks: 'POST /api/v1/webhooks'
    }
  });
});

module.exports = router;
