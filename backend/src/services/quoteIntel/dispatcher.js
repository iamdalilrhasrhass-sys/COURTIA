/**
 * LOT 11 — Quote Intelligence: Dispatcher
 * Gère l'envoi des briefs aux compagnies (V1 = mode dry-run / préparation)
 * 
 * @module quoteIntel/dispatcher
 */

const pool = require('../../db')
const logger = require('../../lib/logger')

/**
 * Statuts possibles d'un brief
 */
const BRIEF_STATUS = {
  DRAFT: 'draft',           // Généré, en attente de validation
  READY: 'ready',           // Validé, prêt à envoyer
  PENDING: 'pending',       // En cours d'envoi
  SENT: 'sent',             // Envoyé
  DELIVERED: 'delivered',   // Confirmé livré
  ERROR: 'error',           // Erreur d'envoi
  CANCELLED: 'cancelled'    // Annulé
}

/**
 * Marque un brief comme prêt à l'envoi
 */
async function markReady(briefId, brokerId) {
  const result = await pool.query(
    `UPDATE provider_quote_briefs 
     SET status = $1, updated_at = NOW()
     WHERE id = $2 AND broker_id = $3 AND status = 'draft'
     RETURNING *`,
    [BRIEF_STATUS.READY, briefId, brokerId]
  )
  
  if (result.rows.length === 0) {
    throw new Error('Brief non trouvé ou déjà traité')
  }
  
  return result.rows[0]
}

/**
 * Simule l'envoi d'un brief (V1 : mode dry-run)
 * En production V2, cette fonction utilisera un vrai transporter SMTP/SES
 * 
 * @param {number} briefId - ID du brief
 * @param {number} brokerId - ID du courtier
 * @param {Object} options - Options d'envoi
 * @returns {Promise<Object>} Résultat de l'envoi
 */
async function sendBrief(briefId, brokerId, options = {}) {
  const { dryRun = true } = options
  
  // Récupérer le brief avec le provider
  const briefResult = await pool.query(
    `SELECT b.*, p.name as provider_name, p.contact_email as provider_email
     FROM provider_quote_briefs b
     JOIN insurance_providers p ON b.provider_id = p.id
     WHERE b.id = $1 AND b.broker_id = $2`,
    [briefId, brokerId]
  )
  
  if (briefResult.rows.length === 0) {
    throw new Error('Brief non trouvé')
  }
  
  const brief = briefResult.rows[0]
  
  if (brief.status === 'sent') {
    throw new Error('Brief déjà envoyé')
  }
  
  if (dryRun) {
    // Mode V1 : dry-run, on simule l'envoi
    logger.info({
      briefId,
      providerId: brief.provider_id,
      providerName: brief.provider_name,
      providerEmail: brief.provider_email,
      subject: brief.subject,
      dryRun: true
    }, 'Quote brief dry-run send')
    
    // Marquer comme "sent" avec metadata dry-run
    await pool.query(
      `UPDATE provider_quote_briefs 
       SET status = $1, sent_at = NOW(), 
           metadata = metadata || $2
       WHERE id = $3`,
      [
        BRIEF_STATUS.SENT,
        JSON.stringify({ dry_run: true, simulated_at: new Date().toISOString() }),
        briefId
      ]
    )
    
    return {
      success: true,
      dry_run: true,
      brief_id: briefId,
      provider: brief.provider_name,
      to_email: brief.provider_email,
      subject: brief.subject,
      message: 'Brief marqué comme envoyé (mode simulation V1). En V2, un email réel sera envoyé.'
    }
  }
  
  // Mode V2 (futur) : envoi réel via emailService
  // TODO: Implémenter avec nodemailer/SES
  /*
  const { sendEmail } = require('../emailService')
  await sendEmail({
    to: brief.provider_email,
    subject: brief.subject,
    html: brief.body_html,
    text: brief.body_plain,
    attachments: brief.attachments
  })
  */
  
  throw new Error('Envoi réel non implémenté en V1. Utilisez dryRun=true.')
}

/**
 * Envoie plusieurs briefs en batch
 */
async function sendBriefsBatch(briefIds, brokerId, options = {}) {
  const results = await Promise.allSettled(
    briefIds.map(briefId => sendBrief(briefId, brokerId, options))
  )
  
  const sent = []
  const errors = []
  
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      sent.push(result.value)
    } else {
      errors.push({
        briefId: briefIds[index],
        error: result.reason.message
      })
    }
  })
  
  return { sent, errors }
}

/**
 * Annule un brief
 */
async function cancelBrief(briefId, brokerId, reason = null) {
  const result = await pool.query(
    `UPDATE provider_quote_briefs 
     SET status = $1, 
         metadata = metadata || $2,
         updated_at = NOW()
     WHERE id = $3 AND broker_id = $4 AND status IN ('draft', 'ready')
     RETURNING *`,
    [
      BRIEF_STATUS.CANCELLED,
      JSON.stringify({ cancelled_at: new Date().toISOString(), cancel_reason: reason }),
      briefId,
      brokerId
    ]
  )
  
  if (result.rows.length === 0) {
    throw new Error('Brief non trouvé ou ne peut être annulé')
  }
  
  return result.rows[0]
}

/**
 * Enregistre une réponse reçue du provider
 */
async function recordProviderResponse(briefId, brokerId, responseData) {
  const { notes, received_at } = responseData
  
  const result = await pool.query(
    `UPDATE provider_quote_briefs 
     SET response_received_at = $1,
         provider_response_notes = $2,
         metadata = metadata || $3,
         updated_at = NOW()
     WHERE id = $4 AND broker_id = $5
     RETURNING *`,
    [
      received_at || new Date(),
      notes,
      JSON.stringify({ response_logged_at: new Date().toISOString() }),
      briefId,
      brokerId
    ]
  )
  
  if (result.rows.length === 0) {
    throw new Error('Brief non trouvé')
  }
  
  return result.rows[0]
}

/**
 * Statistiques d'envoi pour un courtier
 */
async function getDispatchStats(brokerId, dateFrom = null) {
  const query = `
    SELECT 
      status,
      COUNT(*) as count,
      AVG(EXTRACT(EPOCH FROM (response_received_at - sent_at))/3600)::numeric(10,2) as avg_response_hours
    FROM provider_quote_briefs
    WHERE broker_id = $1
      AND ($2::date IS NULL OR created_at >= $2)
    GROUP BY status
  `
  
  const result = await pool.query(query, [brokerId, dateFrom])
  
  const stats = {
    total: 0,
    by_status: {},
    avg_response_time_hours: null
  }
  
  for (const row of result.rows) {
    stats.by_status[row.status] = parseInt(row.count)
    stats.total += parseInt(row.count)
    if (row.status === 'sent' && row.avg_response_hours) {
      stats.avg_response_time_hours = parseFloat(row.avg_response_hours)
    }
  }
  
  return stats
}

module.exports = {
  BRIEF_STATUS,
  markReady,
  sendBrief,
  sendBriefsBatch,
  cancelBrief,
  recordProviderResponse,
  getDispatchStats
}
