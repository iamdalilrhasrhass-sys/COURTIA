/**
 * Module Relances — LOT 6
 * Système de relances automatiques et manuelles avec IA ARK
 *
 * Routes:
 * - GET    /api/relances                     Liste des relances
 * - GET    /api/relances/stats               KPIs et statistiques
 * - GET    /api/relances/:id                 Détail d'une relance
 * - POST   /api/relances                     Créer une relance manuelle
 * - PUT    /api/relances/:id                 Modifier une relance
 * - DELETE /api/relances/:id                 Supprimer une relance
 * - POST   /api/relances/:id/send            Marquer comme envoyée
 * - POST   /api/relances/auto-generate       ARK génère relances prioritaires
 * - POST   /api/relances/:id/ai-content      ARK génère contenu personnalisé
 *
 * NOTE SCHEMA (corrigé le 2026-07-04) :
 * La table `relances` de base (migration 004) ne contient que
 * id/client_id/etape/derniere_relance/prochaine_relance/canal/statut/created_at,
 * utilisée par jobs/relanceScheduler.js (cron quotidien). La migration 032
 * ajoute les colonnes nécessaires à ce routeur (type/channel/priority/status/
 * subject/content/scheduled_at/sent_at/ai_generated/ai_reasoning/
 * response_received/response_at/metadata/updated_at/quote_id/quote_request_id)
 * SANS toucher aux colonnes historiques.
 *
 * Il n'y a pas de colonne broker_id/courtier_id sur `relances` ni sur `quotes` :
 * l'appartenance à un courtier est toujours dérivée via client_id -> clients.courtier_id
 * (cf. routes/contrats.js, routes/clients.js). `quotes.quote_data` est un JSONB
 * contenant notamment 'numero', 'type_contrat', 'compagnie', 'prime_annuelle',
 * 'date_effet', 'date_echeance'. `quotes.status` prend la valeur 'actif' (pas 'active').
 */

const express = require('express')
const router = express.Router()
const pool = require('../db')
const { callArkStructured } = require('../services/arkEngine')
const { sendEmail, getEmailStatus } = require('../services/emailService')
const { sendSMS, getSmsStatus } = require('../services/smsService')
const whatsappMeta = require('../services/whatsappMetaService')
const logger = require('../lib/logger')

// =============================================================================
// SCHEMAS JSON pour les réponses ARK
// =============================================================================

const SCHEMA_AUTO_GENERATE = {
  type: 'object',
  properties: {
    relances: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          client_id: { type: 'number' },
          client_name: { type: 'string' },
          type: { type: 'string', enum: ['devis_sans_reponse', 'echeance_proche', 'client_silencieux', 'document_manquant', 'opportunite', 'renouvellement'] },
          priority: { type: 'string', enum: ['high', 'medium', 'low'] },
          channel: { type: 'string', enum: ['email', 'sms', 'phone', 'whatsapp'] },
          subject: { type: 'string' },
          reasoning: { type: 'string' },
          suggested_date: { type: 'string' }
        },
        required: ['client_id', 'type', 'priority', 'reasoning']
      }
    },
    analyse_globale: { type: 'string' },
    priorite_jour: { type: 'array', items: { type: 'number' } }
  },
  required: ['relances']
}

const SCHEMA_AI_CONTENT = {
  type: 'object',
  properties: {
    subject: { type: 'string' },
    content: { type: 'string' },
    tone: { type: 'string' },
    call_to_action: { type: 'string' },
    variantes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          version: { type: 'string' },
          subject: { type: 'string' },
          content: { type: 'string' }
        }
      }
    },
    conseils_timing: { type: 'string' }
  },
  required: ['subject', 'content', 'call_to_action']
}

// =============================================================================
// GET /api/relances — Liste des relances
// =============================================================================

router.get('/', async (req, res) => {
  try {
    const courtierId = req.user.id
    const { status, client_id, type, priority, channel, limit = 50, offset = 0 } = req.query

    let sql = `
      SELECT
        r.*,
        c.first_name AS client_first_name, c.last_name AS client_last_name,
        c.company_name AS client_company, c.email AS client_email, c.phone AS client_phone,
        q.quote_data->>'numero' AS quote_reference, q.quote_data->>'type_contrat' AS quote_product
      FROM relances r
      JOIN clients c ON r.client_id = c.id
      LEFT JOIN quotes q ON r.quote_id = q.id
      WHERE c.courtier_id = $1
    `
    const params = [courtierId]
    let paramIndex = 2

    if (status) {
      sql += ` AND r.status = $${paramIndex++}`
      params.push(status)
    }
    if (client_id) {
      sql += ` AND r.client_id = $${paramIndex++}`
      params.push(parseInt(client_id, 10))
    }
    if (type) {
      sql += ` AND r.type = $${paramIndex++}`
      params.push(type)
    }
    if (priority) {
      sql += ` AND r.priority = $${paramIndex++}`
      params.push(priority)
    }
    if (channel) {
      sql += ` AND r.channel = $${paramIndex++}`
      params.push(channel)
    }

    sql += ` ORDER BY
      CASE r.priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
      r.scheduled_at ASC NULLS LAST,
      r.created_at DESC
    LIMIT $${paramIndex++} OFFSET $${paramIndex++}`
    params.push(parseInt(limit, 10), parseInt(offset, 10))

    const result = await pool.query(sql, params)

    res.json({
      relances: result.rows.map(row => ({
        id: row.id,
        client_id: row.client_id,
        client_name: row.client_company || `${row.client_first_name || ''} ${row.client_last_name || ''}`.trim(),
        client_email: row.client_email,
        client_phone: row.client_phone,
        quote_id: row.quote_id,
        quote_reference: row.quote_reference,
        quote_product: row.quote_product,
        type: row.type,
        channel: row.channel,
        priority: row.priority,
        status: row.status,
        subject: row.subject,
        content: row.content,
        scheduled_at: row.scheduled_at,
        sent_at: row.sent_at,
        ai_generated: row.ai_generated,
        ai_reasoning: row.ai_reasoning,
        response_received: row.response_received,
        response_at: row.response_at,
        created_at: row.created_at,
        metadata: row.metadata || {}
      })),
      pagination: { limit: parseInt(limit, 10), offset: parseInt(offset, 10) }
    })
  } catch (err) {
    logger.error({ error: err.message }, 'GET /api/relances error')
    res.status(500).json({ error: 'Erreur serveur', details: err.message })
  }
})

// =============================================================================
// GET /api/relances/stats — Statistiques
// =============================================================================

router.get('/stats', async (req, res) => {
  try {
    const courtierId = req.user.id
    const { days = 30 } = req.query
    const daysInt = parseInt(days, 10) || 30

    const statsResult = await pool.query(`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE r.status = 'pending') AS pending,
        COUNT(*) FILTER (WHERE r.status = 'sent') AS sent,
        COUNT(*) FILTER (WHERE r.status = 'sent' AND r.created_at >= NOW() - ($2 || ' days')::interval) AS sent_period,
        COUNT(*) FILTER (WHERE r.response_received = true) AS responses,
        COUNT(*) FILTER (WHERE r.response_received = true AND r.created_at >= NOW() - ($2 || ' days')::interval) AS responses_period,
        COUNT(*) FILTER (WHERE r.priority = 'high' AND r.status = 'pending') AS urgent_pending,
        COUNT(*) FILTER (WHERE r.ai_generated = true) AS ai_generated_count
      FROM relances r
      JOIN clients c ON r.client_id = c.id
      WHERE c.courtier_id = $1
    `, [courtierId, daysInt])

    // Calcul taux de réponse
    const stats = statsResult.rows[0]
    const tauxReponse = stats.sent_period > 0
      ? Math.round((stats.responses_period / stats.sent_period) * 100)
      : 0

    // Relances par type
    const byTypeResult = await pool.query(`
      SELECT r.type, COUNT(*) AS count
      FROM relances r
      JOIN clients c ON r.client_id = c.id
      WHERE c.courtier_id = $1 AND r.created_at >= NOW() - ($2 || ' days')::interval
      GROUP BY r.type ORDER BY count DESC
    `, [courtierId, daysInt])

    // Relances par canal
    const byChannelResult = await pool.query(`
      SELECT r.channel, COUNT(*) AS count
      FROM relances r
      JOIN clients c ON r.client_id = c.id
      WHERE c.courtier_id = $1 AND r.created_at >= NOW() - ($2 || ' days')::interval
      GROUP BY r.channel ORDER BY count DESC
    `, [courtierId, daysInt])

    res.json({
      period_days: daysInt,
      totals: {
        total: parseInt(stats.total, 10),
        pending: parseInt(stats.pending, 10),
        sent: parseInt(stats.sent, 10),
        urgent_pending: parseInt(stats.urgent_pending, 10),
        ai_generated: parseInt(stats.ai_generated_count, 10)
      },
      period: {
        sent: parseInt(stats.sent_period, 10),
        responses: parseInt(stats.responses_period, 10),
        taux_reponse: tauxReponse
      },
      by_type: byTypeResult.rows,
      by_channel: byChannelResult.rows
    })
  } catch (err) {
    logger.error({ error: err.message }, 'GET /api/relances/stats error')
    res.status(500).json({ error: 'Erreur serveur', details: err.message })
  }
})

// =============================================================================
// GET /api/relances/:id — Détail d'une relance
// =============================================================================

router.get('/:id', async (req, res) => {
  try {
    const courtierId = req.user.id
    const relanceId = parseInt(req.params.id, 10)

    const result = await pool.query(`
      SELECT
        r.*,
        c.first_name AS client_first_name, c.last_name AS client_last_name,
        c.company_name AS client_company, c.email AS client_email, c.phone AS client_phone,
        q.quote_data->>'numero' AS quote_reference, q.quote_data->>'type_contrat' AS quote_product
      FROM relances r
      JOIN clients c ON r.client_id = c.id
      LEFT JOIN quotes q ON r.quote_id = q.id
      WHERE r.id = $1 AND c.courtier_id = $2
    `, [relanceId, courtierId])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Relance non trouvée' })
    }

    const row = result.rows[0]
    res.json({
      relance: {
        id: row.id,
        client_id: row.client_id,
        client: {
          name: row.client_company || `${row.client_first_name || ''} ${row.client_last_name || ''}`.trim(),
          email: row.client_email,
          phone: row.client_phone
        },
        quote_id: row.quote_id,
        quote_reference: row.quote_reference,
        quote_product: row.quote_product,
        type: row.type,
        channel: row.channel,
        priority: row.priority,
        status: row.status,
        subject: row.subject,
        content: row.content,
        scheduled_at: row.scheduled_at,
        sent_at: row.sent_at,
        ai_generated: row.ai_generated,
        ai_reasoning: row.ai_reasoning,
        response_received: row.response_received,
        response_at: row.response_at,
        metadata: row.metadata || {},
        created_at: row.created_at,
        updated_at: row.updated_at
      }
    })
  } catch (err) {
    logger.error({ error: err.message }, 'GET /api/relances/:id error')
    res.status(500).json({ error: 'Erreur serveur', details: err.message })
  }
})

// =============================================================================
// POST /api/relances — Créer une relance manuelle
// =============================================================================

router.post('/', async (req, res) => {
  try {
    const courtierId = req.user.id
    const { client_id, quote_id, quote_request_id, type, channel, priority, subject, content, scheduled_at, metadata } = req.body

    if (!client_id) {
      return res.status(400).json({ error: 'client_id requis' })
    }

    // Vérifier que le client appartient bien au courtier connecté
    const own = await pool.query('SELECT 1 FROM clients WHERE id = $1 AND courtier_id = $2', [client_id, courtierId])
    if (own.rows.length === 0) {
      return res.status(403).json({ error: 'Client non trouvé ou non autorisé' })
    }

    const result = await pool.query(`
      INSERT INTO relances (
        client_id, quote_id, quote_request_id, type, channel, priority,
        subject, content, scheduled_at, ai_generated, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, false, $10)
      RETURNING *
    `, [
      client_id,
      quote_id || null,
      quote_request_id || null,
      type || 'manuel',
      channel || 'email',
      priority || 'medium',
      subject || null,
      content || null,
      scheduled_at || null,
      metadata || {}
    ])

    logger.info({ courtierId, relanceId: result.rows[0].id }, 'Relance created')

    res.status(201).json({
      success: true,
      relance: result.rows[0]
    })
  } catch (err) {
    logger.error({ error: err.message }, 'POST /api/relances error')
    res.status(500).json({ error: 'Erreur serveur', details: err.message })
  }
})

// =============================================================================
// PUT /api/relances/:id — Modifier une relance
// =============================================================================

router.put('/:id', async (req, res) => {
  try {
    const courtierId = req.user.id
    const relanceId = parseInt(req.params.id, 10)
    const { status, priority, channel, subject, content, scheduled_at, response_received, metadata } = req.body

    // Vérifier appartenance (via client -> courtier)
    const check = await pool.query(`
      SELECT r.id FROM relances r
      JOIN clients c ON r.client_id = c.id
      WHERE r.id = $1 AND c.courtier_id = $2
    `, [relanceId, courtierId])
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Relance non trouvée' })
    }

    const updates = []
    const params = []
    let paramIndex = 1

    if (status !== undefined) {
      updates.push(`status = $${paramIndex++}`)
      params.push(status)
    }
    if (priority !== undefined) {
      updates.push(`priority = $${paramIndex++}`)
      params.push(priority)
    }
    if (channel !== undefined) {
      updates.push(`channel = $${paramIndex++}`)
      params.push(channel)
    }
    if (subject !== undefined) {
      updates.push(`subject = $${paramIndex++}`)
      params.push(subject)
    }
    if (content !== undefined) {
      updates.push(`content = $${paramIndex++}`)
      params.push(content)
    }
    if (scheduled_at !== undefined) {
      updates.push(`scheduled_at = $${paramIndex++}`)
      params.push(scheduled_at)
    }
    if (response_received !== undefined) {
      updates.push(`response_received = $${paramIndex++}`)
      params.push(response_received)
      if (response_received) {
        updates.push(`response_at = NOW()`)
      }
    }
    if (metadata !== undefined) {
      updates.push(`metadata = COALESCE(metadata, '{}') || $${paramIndex++}`)
      params.push(metadata)
    }

    updates.push('updated_at = NOW()')

    if (updates.length === 1) {
      return res.status(400).json({ error: 'Aucune modification fournie' })
    }

    params.push(relanceId)
    const result = await pool.query(`
      UPDATE relances SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `, params)

    res.json({ success: true, relance: result.rows[0] })
  } catch (err) {
    logger.error({ error: err.message }, 'PUT /api/relances/:id error')
    res.status(500).json({ error: 'Erreur serveur', details: err.message })
  }
})

// =============================================================================
// DELETE /api/relances/:id — Supprimer une relance
// =============================================================================

router.delete('/:id', async (req, res) => {
  try {
    const courtierId = req.user.id
    const relanceId = parseInt(req.params.id, 10)

    const result = await pool.query(`
      DELETE FROM relances r
      USING clients c
      WHERE r.id = $1 AND r.client_id = c.id AND c.courtier_id = $2
      RETURNING r.id
    `, [relanceId, courtierId])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Relance non trouvée' })
    }

    res.json({ success: true, deleted_id: relanceId })
  } catch (err) {
    logger.error({ error: err.message }, 'DELETE /api/relances/:id error')
    res.status(500).json({ error: 'Erreur serveur', details: err.message })
  }
})

// =============================================================================
// POST /api/relances/:id/send — Marquer comme envoyée
// =============================================================================

router.post('/:id/send', async (req, res) => {
  try {
    const courtierId = req.user.id
    const relanceId = parseInt(req.params.id, 10)

    // Charge la relance + coordonnées du client (envoi réel, plus de simulation)
    const found = await pool.query(`
      SELECT r.*, c.email AS client_email, c.phone AS client_phone,
             c.first_name AS client_first_name, c.last_name AS client_last_name,
             c.company_name AS client_company, c.courtier_id AS owner_id
      FROM relances r
      JOIN clients c ON r.client_id = c.id
      WHERE r.id = $1 AND c.courtier_id = $2
    `, [relanceId, courtierId])

    if (found.rows.length === 0) {
      return res.status(404).json({ error: 'Relance non trouvée' })
    }

    const relance = found.rows[0]
    const clientName = relance.client_company || `${relance.client_first_name || ''} ${relance.client_last_name || ''}`.trim() || 'client'
    const channel = String(relance.channel || 'email').toLowerCase()
    const subject = relance.subject || `Relance — ${clientName}`
    const content = relance.content || subject
    let delivery = { channel, provider: null, id: null, manual: false }

    if (channel === 'email') {
      if (!relance.client_email) {
        return res.status(400).json({ error: "Ce client n'a pas d'adresse email." })
      }
      const sent = await sendEmail({
        to: relance.client_email,
        subject,
        text: content,
        html: `<div style="font-family:Inter,Arial,sans-serif;font-size:14px;line-height:1.6;color:#111">${String(content).replace(/\n/g, '<br/>')}</div>`,
      })
      if (!sent.success) {
        const status = getEmailStatus()
        const code = sent.skipped ? 503 : 502
        return res.status(code).json({
          error: sent.skipped
            ? `Envoi email non configuré (${(status.missing || []).join(', ')} manquant).`
            : "L'envoi de l'email a échoué. Réessayez ou vérifiez la configuration.",
          email_status: status,
        })
      }
      delivery.provider = sent.provider
      delivery.id = sent.id || null
    } else if (channel === 'sms') {
      if (!relance.client_phone) {
        return res.status(400).json({ error: "Ce client n'a pas de numéro de téléphone." })
      }
      const sent = await sendSMS({ to: relance.client_phone, message: content })
      if (!sent.success) {
        const status = getSmsStatus()
        return res.status(sent.skipped ? 503 : 502).json({
          error: sent.skipped
            ? `Envoi SMS non configuré (${(status.missing || []).join(', ')} manquant).`
            : "L'envoi du SMS a échoué. Réessayez ou vérifiez la configuration.",
          sms_status: status,
        })
      }
      delivery.provider = sent.provider
      delivery.id = sent.id || null
    } else if (channel === 'whatsapp') {
      if (!relance.client_phone) {
        return res.status(400).json({ error: "Ce client n'a pas de numéro de téléphone." })
      }
      if (!whatsappMeta.isConfigured()) {
        // Pas de mode mock ici : on refuse clairement plutôt que simuler un envoi
        return res.status(503).json({
          error: 'Envoi WhatsApp non configuré (WHATSAPP_ACCESS_TOKEN et WHATSAPP_PHONE_NUMBER_ID manquants).',
        })
      }
      try {
        const sent = await whatsappMeta.sendMessage(pool, courtierId, {
          phone: relance.client_phone,
          message: content,
          clientId: relance.client_id,
        })
        delivery.provider = 'whatsapp_meta'
        delivery.id = (sent && sent.data && (sent.data.wa_message_id || sent.data.id)) || null
      } catch (waErr) {
        return res.status(502).json({ error: "L'envoi WhatsApp a échoué : " + waErr.message })
      }
    } else {
      // Canal "appel" ou autre : action humaine, on marque simplement comme traitée
      delivery.manual = true
    }

    const result = await pool.query(`
      UPDATE relances
      SET status = 'sent', sent_at = NOW(), updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [relanceId])

    logger.info({ courtierId, relanceId, channel, provider: delivery.provider }, 'Relance envoyée (réel)')
    res.json({ success: true, relance: result.rows[0], delivery })
  } catch (err) {
    logger.error({ error: err.message }, 'POST /api/relances/:id/send error')
    res.status(500).json({ error: 'Erreur serveur', details: err.message })
  }
})

// =============================================================================
// POST /api/relances/auto-generate — ARK génère relances prioritaires
// =============================================================================

router.post('/auto-generate', async (req, res) => {
  try {
    const courtierId = req.user.id
    const { max_relances = 10 } = req.body

    // Récupérer données du portefeuille pour l'analyse
    // 1. Clients silencieux (pas de contact depuis 45+ jours)
    const silencieuxRes = await pool.query(`
      SELECT c.id, c.first_name, c.last_name, c.company_name, c.email, c.type,
             MAX(COALESCE(q.created_at, c.created_at)) AS last_activity
      FROM clients c
      LEFT JOIN quotes q ON q.client_id = c.id
      WHERE c.courtier_id = $1
      GROUP BY c.id
      HAVING MAX(COALESCE(q.created_at, c.created_at)) < NOW() - INTERVAL '45 days'
      LIMIT 20
    `, [courtierId])

    // 2. Devis sans réponse (quote_requests submitted sans résultat accepté)
    // NOTE: la table quote_requests (comparateur multi-compagnies) peut être
    // absente selon l'environnement — on tolère l'échec sans bloquer la route.
    let devisSansReponseRes = { rows: [] }
    try {
      devisSansReponseRes = await pool.query(`
        SELECT qr.id AS request_id, qr.product_type, qr.created_at, qr.client_id,
               c.first_name, c.last_name, c.company_name
        FROM quote_requests qr
        JOIN clients c ON qr.client_id = c.id
        WHERE c.courtier_id = $1 AND qr.status IN ('submitted', 'completed')
          AND qr.created_at > NOW() - INTERVAL '30 days'
          AND NOT EXISTS (
            SELECT 1 FROM relances r WHERE r.quote_request_id = qr.id AND r.status = 'sent'
              AND r.created_at > NOW() - INTERVAL '7 days'
          )
        LIMIT 20
      `, [courtierId])
    } catch (qrErr) {
      logger.warn({ error: qrErr.message }, 'quote_requests indisponible pour auto-generate (ignoré)')
    }

    // 3. Échéances contrats dans 30 jours (quotes.quote_data->>'date_echeance')
    const echeancesRes = await pool.query(`
      SELECT q.id AS quote_id, q.quote_data->>'type_contrat' AS product_type,
             q.quote_data->>'date_echeance' AS end_date, q.client_id,
             NULLIF(q.quote_data->>'prime_annuelle', '')::numeric AS premium,
             c.first_name, c.last_name, c.company_name
      FROM quotes q
      JOIN clients c ON q.client_id = c.id
      WHERE c.courtier_id = $1 AND q.status = 'actif'
        AND NULLIF(q.quote_data->>'date_echeance', '')::date BETWEEN NOW() AND NOW() + INTERVAL '30 days'
      ORDER BY (q.quote_data->>'date_echeance') ASC
      LIMIT 20
    `, [courtierId])

    // Appel ARK pour prioriser
    const arkResponse = await callArkStructured({
      system: `Tu es ARK, assistant IA expert en assurance pour courtiers.
Tu dois analyser le portefeuille et proposer des relances prioritaires.
Types de relances possibles:
- devis_sans_reponse: Devis envoyés sans retour client
- echeance_proche: Contrats arrivant à échéance
- client_silencieux: Clients sans activité depuis longtemps
- renouvellement: Renouvellements à préparer
- opportunite: Vente additionnelle potentielle

Priorise les relances par impact commercial (high/medium/low).
Suggère le meilleur canal de contact selon le profil client.`,
      user: `Analyse ce portefeuille et propose jusqu'à ${max_relances} relances prioritaires:

CLIENTS SILENCIEUX (${silencieuxRes.rows.length}):
${silencieuxRes.rows.map(c => `- ID ${c.id}: ${c.company_name || `${c.first_name} ${c.last_name}`} (${c.type || 'particulier'}) - dernière activité: ${c.last_activity}`).join('\n')}

DEVIS SANS RÉPONSE (${devisSansReponseRes.rows.length}):
${devisSansReponseRes.rows.map(d => `- Request ${d.request_id}: ${d.company_name || `${d.first_name} ${d.last_name}`} - ${d.product_type} (créé: ${d.created_at})`).join('\n')}

ÉCHÉANCES PROCHES (${echeancesRes.rows.length}):
${echeancesRes.rows.map(e => `- Quote ${e.quote_id}: ${e.company_name || `${e.first_name} ${e.last_name}`} - ${e.product_type} ${e.premium}€ (fin: ${e.end_date})`).join('\n')}

Génère les relances les plus impactantes.`,
      schema: SCHEMA_AUTO_GENERATE,
      context: {
        silencieux_count: silencieuxRes.rows.length,
        devis_count: devisSansReponseRes.rows.length,
        echeances_count: echeancesRes.rows.length
      },
      userId: courtierId,
      route: 'relances-auto-generate'
    })

    // Insérer les relances générées
    const insertedRelances = []
    const relancesProposees = arkResponse.structured?.relances || []

    for (const rel of relancesProposees.slice(0, max_relances)) {
      // Vérifier que le client existe et appartient au courtier
      const clientCheck = await pool.query(`
        SELECT id FROM clients WHERE id = $1 AND courtier_id = $2
      `, [rel.client_id, courtierId])

      if (clientCheck.rows.length === 0) continue

      // Éviter les doublons récents
      const dupCheck = await pool.query(`
        SELECT id FROM relances
        WHERE client_id = $1 AND type = $2
          AND created_at > NOW() - INTERVAL '7 days'
      `, [rel.client_id, rel.type])

      if (dupCheck.rows.length > 0) continue

      const insertRes = await pool.query(`
        INSERT INTO relances (
          client_id, type, channel, priority, subject,
          ai_generated, ai_reasoning, scheduled_at, metadata
        ) VALUES ($1, $2, $3, $4, $5, true, $6, $7, $8)
        RETURNING *
      `, [
        rel.client_id,
        rel.type,
        rel.channel || 'email',
        rel.priority || 'medium',
        rel.subject || null,
        rel.reasoning,
        rel.suggested_date || null,
        { ark_generated: true }
      ])

      insertedRelances.push(insertRes.rows[0])
    }

    logger.info({ courtierId, generated: insertedRelances.length }, 'Auto-generated relances')

    res.json({
      success: true,
      generated: insertedRelances.length,
      relances: insertedRelances,
      analyse: arkResponse.structured?.analyse_globale || null,
      priorite_jour: arkResponse.structured?.priorite_jour || [],
      usage: arkResponse.usage,
      model: arkResponse.model
    })
  } catch (err) {
    logger.error({ error: err.message }, 'POST /api/relances/auto-generate error')
    res.status(500).json({ error: 'Erreur ARK', details: err.message })
  }
})

// =============================================================================
// POST /api/relances/:id/ai-content — ARK génère contenu personnalisé
// =============================================================================

router.post('/:id/ai-content', async (req, res) => {
  try {
    const courtierId = req.user.id
    const relanceId = parseInt(req.params.id, 10)
    const { channel } = req.body // email, sms, whatsapp

    // Récupérer la relance avec infos client
    const relanceRes = await pool.query(`
      SELECT r.*, c.first_name, c.last_name, c.company_name, c.type AS client_type,
             q.quote_data->>'type_contrat' AS quote_product,
             NULLIF(q.quote_data->>'prime_annuelle', '')::numeric AS premium
      FROM relances r
      JOIN clients c ON r.client_id = c.id
      LEFT JOIN quotes q ON r.quote_id = q.id
      WHERE r.id = $1 AND c.courtier_id = $2
    `, [relanceId, courtierId])

    if (relanceRes.rows.length === 0) {
      return res.status(404).json({ error: 'Relance non trouvée' })
    }

    const relance = relanceRes.rows[0]
    const clientName = relance.company_name || `${relance.first_name || ''} ${relance.last_name || ''}`.trim()
    const targetChannel = channel || relance.channel || 'email'

    // Instructions spécifiques par canal
    const channelInstructions = {
      email: 'Format email professionnel avec objet accrocheur, corps structuré et signature.',
      sms: 'Message SMS court (max 160 caractères), direct et avec call-to-action clair.',
      whatsapp: 'Message WhatsApp conversationnel, amical mais professionnel, avec émojis si approprié.',
      phone: 'Script d\'appel téléphonique avec points clés à aborder et questions de découverte.'
    }

    const arkResponse = await callArkStructured({
      system: `Tu es ARK, assistant IA expert en assurance pour courtiers.
Tu dois générer un message de relance personnalisé et efficace.
${channelInstructions[targetChannel] || channelInstructions.email}
Le message doit être naturel et adapté au profil du client.`,
      user: `Génère un message de relance ${targetChannel} pour:
Client: ${clientName} (${relance.client_type || 'particulier'})
Type de relance: ${relance.type}
Contexte: ${relance.ai_reasoning || 'Relance standard'}
${relance.quote_product ? `Produit concerné: ${relance.quote_product}` : ''}
${relance.premium ? `Prime: ${relance.premium}€` : ''}

Génère le contenu avec variantes si possible.`,
      schema: SCHEMA_AI_CONTENT,
      context: { channel: targetChannel, relance_type: relance.type, client_type: relance.client_type },
      userId: courtierId,
      clientId: relance.client_id,
      route: 'relances-ai-content'
    })

    // Mettre à jour la relance avec le contenu généré
    await pool.query(`
      UPDATE relances
      SET subject = COALESCE(subject, $1),
          content = $2,
          channel = $3,
          metadata = COALESCE(metadata, '{}') || $4,
          updated_at = NOW()
      WHERE id = $5
    `, [
      arkResponse.structured?.subject,
      arkResponse.structured?.content,
      targetChannel,
      { ai_content: arkResponse.structured, ai_content_at: new Date().toISOString() },
      relanceId
    ])

    res.json({
      success: true,
      content: arkResponse.structured,
      channel: targetChannel,
      usage: arkResponse.usage,
      model: arkResponse.model
    })
  } catch (err) {
    logger.error({ error: err.message }, 'POST /api/relances/:id/ai-content error')
    res.status(500).json({ error: 'Erreur ARK', details: err.message })
  }
})

module.exports = router
