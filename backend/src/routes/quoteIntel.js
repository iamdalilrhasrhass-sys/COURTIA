/**
 * LOT 11 — Quote Intelligence Routes
 * Génération et envoi de briefs de devis personnalisés par compagnie
 * 
 * Routes:
 * - POST   /briefs                    — Génère N briefs en parallèle
 * - GET    /briefs                    — Liste les briefs (filtres)
 * - GET    /briefs/:id                — Détail d'un brief
 * - PUT    /briefs/:id                — Modifier subject/body
 * - POST   /briefs/:id/send           — Marquer envoyé (V1: dry-run)
 * - POST   /briefs/:id/regenerate     — Relancer génération ARK
 * - DELETE /briefs/:id                — Supprimer un brief
 * - POST   /check-pieces              — Vérifier pièces manquantes
 * - GET    /providers/:id/profile     — Profil intel d'un provider
 * 
 * @module routes/quoteIntel
 */

const express = require('express')
const router = express.Router()
const pool = require('../db')
const logger = require('../lib/logger')

const {
  buildBrief,
  buildBriefsBatch,
  saveBrief,
  getProviderIntel,
  checkPieces,
  sendBrief,
  cancelBrief,
  getDispatchStats
} = require('../services/quoteIntel')

/**
 * POST /briefs
 * Génère des briefs pour plusieurs providers
 */
router.post('/briefs', async (req, res) => {
  try {
    const brokerId = req.user.id || req.user.userId
    const { quote_request_id, provider_ids, broker_info } = req.body
    
    if (!quote_request_id) {
      return res.status(400).json({ error: 'quote_request_id requis' })
    }
    
    if (!provider_ids || !Array.isArray(provider_ids) || provider_ids.length === 0) {
      return res.status(400).json({ error: 'provider_ids requis (array)' })
    }
    
    if (provider_ids.length > 10) {
      return res.status(400).json({ error: 'Maximum 10 providers par requête' })
    }
    
    // Générer les briefs
    const { briefs, errors } = await buildBriefsBatch({
      quoteRequestId: quote_request_id,
      providerIds: provider_ids,
      brokerId,
      brokerInfo: broker_info || {}
    })
    
    // Sauvegarder chaque brief généré
    const savedBriefs = []
    for (const brief of briefs) {
      const saved = await saveBrief(brief, brokerId, quote_request_id)
      savedBriefs.push({
        ...saved,
        provider_name: brief.provider.name,
        provider_code: brief.provider.code,
        suggested_product: brief.suggested_product
      })
    }
    
    res.json({
      success: true,
      generated: savedBriefs.length,
      errors: errors.length,
      briefs: savedBriefs,
      generation_errors: errors.length > 0 ? errors : undefined,
      total_cost_usd: briefs.reduce((sum, b) => sum + (b.ai_cost_usd || 0), 0).toFixed(6)
    })
    
  } catch (err) {
    logger.error({ err }, 'POST /quote-intel/briefs error')
    res.status(500).json({ error: err.message })
  }
})

/**
 * GET /briefs
 * Liste les briefs avec filtres
 */
router.get('/briefs', async (req, res) => {
  try {
    const brokerId = req.user.id || req.user.userId
    const { quote_request_id, provider_id, status, limit = 50, offset = 0 } = req.query
    
    let query = `
      SELECT b.*, 
             p.name as provider_name, p.code as provider_code, p.contact_email as provider_email,
             qr.insurance_type
      FROM provider_quote_briefs b
      JOIN insurance_providers p ON b.provider_id = p.id
      LEFT JOIN quote_requests qr ON b.quote_request_id = qr.id
      WHERE b.broker_id = $1
    `
    const params = [brokerId]
    let paramIndex = 2
    
    if (quote_request_id) {
      query += ` AND b.quote_request_id = $${paramIndex++}`
      params.push(quote_request_id)
    }
    
    if (provider_id) {
      query += ` AND b.provider_id = $${paramIndex++}`
      params.push(provider_id)
    }
    
    if (status) {
      query += ` AND b.status = $${paramIndex++}`
      params.push(status)
    }
    
    query += ` ORDER BY b.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`
    params.push(parseInt(limit), parseInt(offset))
    
    const result = await pool.query(query, params)
    
    // Count total
    let countQuery = `
      SELECT COUNT(*) FROM provider_quote_briefs WHERE broker_id = $1
    `
    const countParams = [brokerId]
    let countIndex = 2
    
    if (quote_request_id) {
      countQuery += ` AND quote_request_id = $${countIndex++}`
      countParams.push(quote_request_id)
    }
    if (provider_id) {
      countQuery += ` AND provider_id = $${countIndex++}`
      countParams.push(provider_id)
    }
    if (status) {
      countQuery += ` AND status = $${countIndex++}`
      countParams.push(status)
    }
    
    const countResult = await pool.query(countQuery, countParams)
    
    res.json({
      briefs: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit: parseInt(limit),
      offset: parseInt(offset)
    })
    
  } catch (err) {
    logger.error({ err }, 'GET /quote-intel/briefs error')
    res.status(500).json({ error: err.message })
  }
})

/**
 * GET /briefs/:id
 * Détail d'un brief
 */
router.get('/briefs/:id', async (req, res) => {
  try {
    const brokerId = req.user.id || req.user.userId
    const { id } = req.params
    
    const result = await pool.query(
      `SELECT b.*, 
              p.name as provider_name, p.code as provider_code, 
              p.contact_email as provider_email, p.response_time_hours,
              p.communication_style, p.submission_instructions,
              qr.insurance_type, qr.criteria as request_criteria,
              c.first_name || ' ' || c.last_name as client_name
       FROM provider_quote_briefs b
       JOIN insurance_providers p ON b.provider_id = p.id
       LEFT JOIN quote_requests qr ON b.quote_request_id = qr.id
       LEFT JOIN clients c ON qr.client_id = c.id
       WHERE b.id = $1 AND b.broker_id = $2`,
      [id, brokerId]
    )
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Brief non trouvé' })
    }
    
    res.json(result.rows[0])
    
  } catch (err) {
    logger.error({ err }, 'GET /quote-intel/briefs/:id error')
    res.status(500).json({ error: err.message })
  }
})

/**
 * PUT /briefs/:id
 * Modifier subject/body manuellement
 */
router.put('/briefs/:id', async (req, res) => {
  try {
    const brokerId = req.user.id || req.user.userId
    const { id } = req.params
    const { subject, body_html, body_plain } = req.body
    
    // Vérifier que le brief existe et appartient au courtier
    const checkResult = await pool.query(
      `SELECT id, status FROM provider_quote_briefs WHERE id = $1 AND broker_id = $2`,
      [id, brokerId]
    )
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Brief non trouvé' })
    }
    
    if (checkResult.rows[0].status === 'sent') {
      return res.status(400).json({ error: 'Impossible de modifier un brief déjà envoyé' })
    }
    
    // Mise à jour
    const updates = []
    const values = []
    let paramIndex = 1
    
    if (subject !== undefined) {
      updates.push(`subject = $${paramIndex++}`)
      values.push(subject)
    }
    if (body_html !== undefined) {
      updates.push(`body_html = $${paramIndex++}`)
      values.push(body_html)
    }
    if (body_plain !== undefined) {
      updates.push(`body_plain = $${paramIndex++}`)
      values.push(body_plain)
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'Aucun champ à modifier' })
    }
    
    updates.push(`metadata = metadata || $${paramIndex++}`)
    values.push(JSON.stringify({ manually_edited: true, edited_at: new Date().toISOString() }))
    
    values.push(id, brokerId)
    
    const result = await pool.query(
      `UPDATE provider_quote_briefs 
       SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $${paramIndex++} AND broker_id = $${paramIndex}
       RETURNING *`,
      values
    )
    
    res.json(result.rows[0])
    
  } catch (err) {
    logger.error({ err }, 'PUT /quote-intel/briefs/:id error')
    res.status(500).json({ error: err.message })
  }
})

/**
 * POST /briefs/:id/send
 * Marquer comme envoyé (V1: dry-run mode)
 */
router.post('/briefs/:id/send', async (req, res) => {
  try {
    const brokerId = req.user.id || req.user.userId
    const { id } = req.params
    const { dry_run = true } = req.body
    
    const result = await sendBrief(id, brokerId, { dryRun: dry_run })
    
    res.json(result)
    
  } catch (err) {
    logger.error({ err }, 'POST /quote-intel/briefs/:id/send error')
    res.status(500).json({ error: err.message })
  }
})

/**
 * POST /briefs/:id/regenerate
 * Relancer la génération ARK avec contexte mis à jour
 */
router.post('/briefs/:id/regenerate', async (req, res) => {
  try {
    const brokerId = req.user.id || req.user.userId
    const { id } = req.params
    const { broker_info } = req.body
    
    // Récupérer le brief existant
    const existingResult = await pool.query(
      `SELECT quote_request_id, provider_id FROM provider_quote_briefs 
       WHERE id = $1 AND broker_id = $2`,
      [id, brokerId]
    )
    
    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Brief non trouvé' })
    }
    
    const { quote_request_id, provider_id } = existingResult.rows[0]
    
    // Régénérer
    const newBrief = await buildBrief({
      quoteRequestId: quote_request_id,
      providerId: provider_id,
      brokerId,
      brokerInfo: broker_info || {}
    })
    
    // Mettre à jour le brief existant
    const updateResult = await pool.query(
      `UPDATE provider_quote_briefs 
       SET subject = $1, body_html = $2, body_plain = $3,
           missing_pieces = $4, ai_confidence = $5, ai_cost_usd = ai_cost_usd + $6,
           ai_model = $7, status = 'draft',
           metadata = metadata || $8,
           updated_at = NOW()
       WHERE id = $9 AND broker_id = $10
       RETURNING *`,
      [
        newBrief.subject,
        newBrief.body_html,
        newBrief.body_plain,
        JSON.stringify(newBrief.missing_pieces),
        newBrief.confidence,
        newBrief.ai_cost_usd,
        newBrief.ai_model,
        JSON.stringify({ 
          regenerated_at: new Date().toISOString(),
          suggested_product: newBrief.suggested_product,
          notes: newBrief.notes
        }),
        id,
        brokerId
      ]
    )
    
    res.json({
      success: true,
      brief: updateResult.rows[0],
      regeneration_cost_usd: newBrief.ai_cost_usd
    })
    
  } catch (err) {
    logger.error({ err }, 'POST /quote-intel/briefs/:id/regenerate error')
    res.status(500).json({ error: err.message })
  }
})

/**
 * DELETE /briefs/:id
 * Supprimer (ou annuler) un brief
 */
router.delete('/briefs/:id', async (req, res) => {
  try {
    const brokerId = req.user.id || req.user.userId
    const { id } = req.params
    const { reason } = req.body || {}
    
    // Vérifier si c'est un brief envoyé (cancel) ou draft (delete)
    const checkResult = await pool.query(
      `SELECT status FROM provider_quote_briefs WHERE id = $1 AND broker_id = $2`,
      [id, brokerId]
    )
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Brief non trouvé' })
    }
    
    const status = checkResult.rows[0].status
    
    if (status === 'sent') {
      // Annuler plutôt que supprimer
      const cancelled = await cancelBrief(id, brokerId, reason)
      return res.json({ success: true, action: 'cancelled', brief: cancelled })
    }
    
    // Supprimer
    await pool.query(
      `DELETE FROM provider_quote_briefs WHERE id = $1 AND broker_id = $2`,
      [id, brokerId]
    )
    
    res.json({ success: true, action: 'deleted' })
    
  } catch (err) {
    logger.error({ err }, 'DELETE /quote-intel/briefs/:id error')
    res.status(500).json({ error: err.message })
  }
})

/**
 * POST /check-pieces
 * Vérifier les pièces manquantes pour un quote_request + provider
 */
router.post('/check-pieces', async (req, res) => {
  try {
    const brokerId = req.user.id || req.user.userId
    const { quote_request_id, provider_id, client_id } = req.body
    
    let targetClientId = client_id
    
    // Si quote_request_id fourni, récupérer le client_id
    if (quote_request_id && !client_id) {
      const qrResult = await pool.query(
        `SELECT client_id FROM quote_requests WHERE id = $1 AND broker_id = $2`,
        [quote_request_id, brokerId]
      )
      
      if (qrResult.rows.length === 0) {
        return res.status(404).json({ error: 'Quote request non trouvée' })
      }
      
      targetClientId = qrResult.rows[0].client_id
    }
    
    if (!targetClientId) {
      return res.status(400).json({ error: 'client_id ou quote_request_id requis' })
    }
    
    if (!provider_id) {
      return res.status(400).json({ error: 'provider_id requis' })
    }
    
    // Vérifier que le client appartient au courtier
    const clientCheck = await pool.query(
      `SELECT id FROM clients WHERE id = $1 AND broker_id = $2`,
      [targetClientId, brokerId]
    )
    
    if (clientCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Accès refusé au client' })
    }
    
    const result = await checkPieces({
      clientId: targetClientId,
      providerId: provider_id
    })
    
    res.json(result)
    
  } catch (err) {
    logger.error({ err }, 'POST /quote-intel/check-pieces error')
    res.status(500).json({ error: err.message })
  }
})

/**
 * GET /providers/:id/profile
 * Profil intelligence d'un provider
 */
router.get('/providers/:id/profile', async (req, res) => {
  try {
    const { id } = req.params
    
    const provider = await getProviderIntel(id)
    
    if (!provider) {
      return res.status(404).json({ error: 'Provider non trouvé' })
    }
    
    res.json({
      id: provider.id,
      code: provider.code,
      name: provider.name,
      type: provider.type,
      website: provider.website,
      contact_email: provider.contact_email,
      // Intelligence
      communication_style: provider.communication_style,
      mandatory_documents: provider.mandatory_documents,
      product_catalog: provider.product_catalog,
      specific_fields: provider.specific_fields,
      preferred_format: provider.preferred_format,
      response_time_hours: provider.response_time_hours,
      submission_instructions: provider.submission_instructions,
      quote_email_template: provider.quote_email_template
    })
    
  } catch (err) {
    logger.error({ err }, 'GET /quote-intel/providers/:id/profile error')
    res.status(500).json({ error: err.message })
  }
})

/**
 * GET /stats
 * Statistiques d'envoi de briefs
 */
router.get('/stats', async (req, res) => {
  try {
    const brokerId = req.user.id || req.user.userId
    const { date_from } = req.query
    
    const stats = await getDispatchStats(brokerId, date_from || null)
    
    // Top providers par nombre de briefs
    const topProvidersResult = await pool.query(
      `SELECT p.name, p.code, COUNT(*) as brief_count,
              SUM(CASE WHEN b.status = 'sent' THEN 1 ELSE 0 END) as sent_count
       FROM provider_quote_briefs b
       JOIN insurance_providers p ON b.provider_id = p.id
       WHERE b.broker_id = $1
       GROUP BY p.id, p.name, p.code
       ORDER BY brief_count DESC
       LIMIT 5`,
      [brokerId]
    )
    
    // Coût total ARK
    const costResult = await pool.query(
      `SELECT COALESCE(SUM(ai_cost_usd), 0)::numeric(10,4) as total_cost
       FROM provider_quote_briefs
       WHERE broker_id = $1`,
      [brokerId]
    )
    
    res.json({
      ...stats,
      top_providers: topProvidersResult.rows,
      total_ai_cost_usd: parseFloat(costResult.rows[0].total_cost)
    })
    
  } catch (err) {
    logger.error({ err }, 'GET /quote-intel/stats error')
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
