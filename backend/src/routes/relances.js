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
 */

const express = require('express')
const router = express.Router()
const pool = require('../db')
const { callArkStructured } = require('../services/arkEngine')
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
    const brokerId = req.user.id
    const { status, client_id, type, priority, channel, limit = 50, offset = 0 } = req.query

    let sql = `
      SELECT 
        r.*,
        c.first_name AS client_first_name, c.last_name AS client_last_name,
        c.company_name AS client_company, c.email AS client_email, c.phone AS client_phone,
        q.quote_data->>'reference' AS quote_reference, q.quote_data->>'product_type' AS quote_product
      FROM relances r
      LEFT JOIN clients c ON r.client_id = c.id
      LEFT JOIN quotes q ON r.quote_id = q.id
      WHERE r.broker_id = $1
    `
    const params = [brokerId]
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
    const brokerId = req.user.id
    const { days = 30 } = req.query

    const statsResult = await pool.query(`
      SELECT 
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status = 'pending') AS pending,
        COUNT(*) FILTER (WHERE status = 'sent') AS sent,
        COUNT(*) FILTER (WHERE status = 'sent' AND created_at >= NOW() - INTERVAL '${parseInt(days, 10)} days') AS sent_period,
        COUNT(*) FILTER (WHERE response_received = true) AS responses,
        COUNT(*) FILTER (WHERE response_received = true AND created_at >= NOW() - INTERVAL '${parseInt(days, 10)} days') AS responses_period,
        COUNT(*) FILTER (WHERE priority = 'high' AND status = 'pending') AS urgent_pending,
        COUNT(*) FILTER (WHERE ai_generated = true) AS ai_generated_count
      FROM relances WHERE broker_id = $1
    `, [brokerId])

    // Calcul taux de réponse
    const stats = statsResult.rows[0]
    const tauxReponse = stats.sent_period > 0 
      ? Math.round((stats.responses_period / stats.sent_period) * 100) 
      : 0

    // Relances par type
    const byTypeResult = await pool.query(`
      SELECT type, COUNT(*) AS count
      FROM relances WHERE broker_id = $1 AND created_at >= NOW() - INTERVAL '${parseInt(days, 10)} days'
      GROUP BY type ORDER BY count DESC
    `, [brokerId])

    // Relances par canal
    const byChannelResult = await pool.query(`
      SELECT channel, COUNT(*) AS count
      FROM relances WHERE broker_id = $1 AND created_at >= NOW() - INTERVAL '${parseInt(days, 10)} days'
      GROUP BY channel ORDER BY count DESC
    `, [brokerId])

    res.json({
      period_days: parseInt(days, 10),
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
    const brokerId = req.user.id
    const relanceId = parseInt(req.params.id, 10)

    const result = await pool.query(`
      SELECT 
        r.*,
        c.first_name AS client_first_name, c.last_name AS client_last_name,
        c.company_name AS client_company, c.email AS client_email, c.phone AS client_phone,
        q.quote_data->>'reference' AS quote_reference, q.quote_data->>'product_type' AS quote_product
      FROM relances r
      LEFT JOIN clients c ON r.client_id = c.id
      LEFT JOIN quotes q ON r.quote_id = q.id
      WHERE r.id = $1 AND r.broker_id = $2
    `, [relanceId, brokerId])

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
    const brokerId = req.user.id
    const { client_id, quote_id, quote_request_id, type, channel, priority, subject, content, scheduled_at, metadata } = req.body

    if (!client_id) {
      return res.status(400).json({ error: 'client_id requis' })
    }

    const result = await pool.query(`
      INSERT INTO relances (
        broker_id, client_id, quote_id, quote_request_id, type, channel, priority,
        subject, content, scheduled_at, ai_generated, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, false, $11)
      RETURNING *
    `, [
      brokerId,
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

    logger.info({ brokerId, relanceId: result.rows[0].id }, 'Relance created')

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
    const brokerId = req.user.id
    const relanceId = parseInt(req.params.id, 10)
    const { status, priority, channel, subject, content, scheduled_at, response_received, metadata } = req.body

    // Vérifier appartenance
    const check = await pool.query('SELECT id FROM relances WHERE id = $1 AND broker_id = $2', [relanceId, brokerId])
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

    params.push(relanceId, brokerId)
    const result = await pool.query(`
      UPDATE relances SET ${updates.join(', ')}
      WHERE id = $${paramIndex++} AND broker_id = $${paramIndex}
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
    const brokerId = req.user.id
    const relanceId = parseInt(req.params.id, 10)

    const result = await pool.query(
      'DELETE FROM relances WHERE id = $1 AND broker_id = $2 RETURNING id',
      [relanceId, brokerId]
    )

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
    const brokerId = req.user.id
    const relanceId = parseInt(req.params.id, 10)

    const result = await pool.query(`
      UPDATE relances 
      SET status = 'sent', sent_at = NOW(), updated_at = NOW()
      WHERE id = $1 AND broker_id = $2
      RETURNING *
    `, [relanceId, brokerId])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Relance non trouvée' })
    }

    res.json({ success: true, relance: result.rows[0] })
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
    const brokerId = req.user.id
    const { max_relances = 10 } = req.body

    // Récupérer données du portefeuille pour l'analyse
    // 1. Clients silencieux (pas de contact depuis 45+ jours)
    const silencieuxRes = await pool.query(`
      SELECT c.id, c.first_name, c.last_name, c.company_name, c.email, c.type,
             MAX(COALESCE(q.updated_at, c.created_at)) AS last_activity
      FROM clients c
      LEFT JOIN quotes q ON q.client_id = c.id
      WHERE c.id IN (SELECT DISTINCT client_id FROM quotes WHERE broker_id = $1)
      GROUP BY c.id
      HAVING MAX(COALESCE(q.updated_at, c.created_at)) < NOW() - INTERVAL '45 days'
      LIMIT 20
    `, [brokerId])

    // 2. Devis sans réponse (quote_requests submitted sans résultat accepté)
    const devisSansReponseRes = await pool.query(`
      SELECT qr.id AS request_id, qr.product_type, qr.created_at, qr.client_id,
             c.first_name, c.last_name, c.company_name
      FROM quote_requests qr
      JOIN clients c ON qr.client_id = c.id
      WHERE qr.broker_id = $1 AND qr.status IN ('submitted', 'completed')
        AND qr.created_at > NOW() - INTERVAL '30 days'
        AND NOT EXISTS (
          SELECT 1 FROM relances r WHERE r.quote_request_id = qr.id AND r.status = 'sent'
            AND r.created_at > NOW() - INTERVAL '7 days'
        )
      LIMIT 20
    `, [brokerId])

    // 3. Échéances contrats dans 30 jours
    const echeancesRes = await pool.query(`
      SELECT q.id AS quote_id, q.quote_data->>'product_type' AS product_type, q.quote_data->>'end_date' AS end_date, q.client_id, q.quote_data->>'premium' AS premium,
             c.first_name, c.last_name, c.company_name
      FROM quotes q
      JOIN clients c ON q.client_id = c.id
      WHERE q.broker_id = $1 AND q.status = 'active'
        AND q.end_date BETWEEN NOW() AND NOW() + INTERVAL '30 days'
      ORDER BY q.end_date ASC
      LIMIT 20
    `, [brokerId])

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
      userId: brokerId,
      route: 'relances-auto-generate'
    })

    // Insérer les relances générées
    const insertedRelances = []
    const relancesProposees = arkResponse.structured?.relances || []

    for (const rel of relancesProposees.slice(0, max_relances)) {
      // Vérifier que le client existe et appartient au courtier
      const clientCheck = await pool.query(`
        SELECT c.id FROM clients c
        JOIN quotes q ON q.client_id = c.id
        WHERE c.id = $1 AND q.broker_id = $2
        LIMIT 1
      `, [rel.client_id, brokerId])

      if (clientCheck.rows.length === 0) continue

      // Éviter les doublons récents
      const dupCheck = await pool.query(`
        SELECT id FROM relances 
        WHERE broker_id = $1 AND client_id = $2 AND type = $3
          AND created_at > NOW() - INTERVAL '7 days'
        LIMIT 1
      `, [brokerId, rel.client_id, rel.type])

      if (dupCheck.rows.length > 0) continue

      const insertRes = await pool.query(`
        INSERT INTO relances (
          broker_id, client_id, type, channel, priority, subject,
          ai_generated, ai_reasoning, scheduled_at, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, true, $7, $8, $9)
        RETURNING *
      `, [
        brokerId,
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

    logger.info({ brokerId, generated: insertedRelances.length }, 'Auto-generated relances')

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
    const brokerId = req.user.id
    const relanceId = parseInt(req.params.id, 10)
    const { channel } = req.body // email, sms, whatsapp

    // Récupérer la relance avec infos client
    const relanceRes = await pool.query(`
      SELECT r.*, c.first_name, c.last_name, c.company_name, c.type AS client_type,
             c.preferred_canal, q.quote_data->>'product_type' AS quote_product, q.quote_data->>'premium' AS premium
      FROM relances r
      LEFT JOIN clients c ON r.client_id = c.id
      LEFT JOIN quotes q ON r.quote_id = q.id
      WHERE r.id = $1 AND r.broker_id = $2
    `, [relanceId, brokerId])

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
Canal préféré: ${relance.preferred_canal || 'email'}
Type de relance: ${relance.type}
Contexte: ${relance.ai_reasoning || 'Relance standard'}
${relance.quote_product ? `Produit concerné: ${relance.quote_product}` : ''}
${relance.premium ? `Prime: ${relance.premium}€` : ''}

Génère le contenu avec variantes si possible.`,
      schema: SCHEMA_AI_CONTENT,
      context: { channel: targetChannel, relance_type: relance.type, client_type: relance.client_type },
      userId: brokerId,
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
