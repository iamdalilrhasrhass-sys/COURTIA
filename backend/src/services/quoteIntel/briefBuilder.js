/**
 * LOT 11 — Quote Intelligence: Brief Builder
 * Génère des briefs de devis sur mesure pour chaque compagnie
 * 
 * @module quoteIntel/briefBuilder
 */

const pool = require('../../db')
const { callArkStructured } = require('../arkEngine')
const logger = require('../../lib/logger')

/**
 * Prompt système pour génération de brief personnalisé
 */
const BRIEF_SYSTEM_PROMPT = `Tu es un expert en courtage d'assurance français. Tu dois générer un email de demande de devis 
personnalisé pour une compagnie d'assurance spécifique.

RÈGLES IMPORTANTES:
1. Adapte STRICTEMENT le ton au style de communication de la compagnie
2. Mentionne les références/codes spécifiques requis par le provider
3. Organise le contenu selon les préférences du provider
4. Liste les pièces jointes dans l'ordre attendu
5. Identifie les pièces manquantes pour ce provider spécifique
6. Suggère le produit le plus adapté de leur catalogue
7. Sois professionnel et efficace

FORMAT DE RÉPONSE (JSON strict):
{
  "subject": "Objet de l'email",
  "body_html": "<p>Corps HTML de l'email</p>",
  "body_plain": "Corps texte brut",
  "suggested_product": "Nom du produit recommandé du catalogue",
  "missing_pieces": ["liste", "des", "pièces", "manquantes"],
  "confidence": 0.85,
  "notes": "Notes éventuelles pour le courtier"
}`

/**
 * Récupère les infos complètes d'un provider
 */
async function getProviderIntel(providerId) {
  const result = await pool.query(
    `SELECT id, code, name, type, website, supported_products, metadata,
            communication_style, mandatory_documents, product_catalog,
            quote_email_template, specific_fields, preferred_format,
            response_time_hours, contact_email, submission_instructions
     FROM insurance_providers
     WHERE id = $1`,
    [providerId]
  )
  return result.rows[0] || null
}

/**
 * Récupère une demande de devis avec client et documents
 */
async function getQuoteRequestDetails(quoteRequestId, brokerId) {
  // Quote request
  const qrResult = await pool.query(
    `SELECT qr.*, c.first_name, c.last_name, c.email, c.phone, c.address, c.city, c.postal_code,
            c.birth_date, c.profession, c.company_name
     FROM quote_requests qr
     LEFT JOIN clients c ON qr.client_id = c.id
     WHERE qr.id = $1 AND qr.broker_id = $2`,
    [quoteRequestId, brokerId]
  )
  
  if (qrResult.rows.length === 0) return null
  
  const quoteRequest = qrResult.rows[0]
  
  // Documents du client
  const docsResult = await pool.query(
    `SELECT document_type, file_name, status, created_at, metadata
     FROM client_documents
     WHERE client_id = $1
     ORDER BY created_at DESC`,
    [quoteRequest.client_id]
  )
  
  quoteRequest.client_documents = docsResult.rows
  
  return quoteRequest
}

/**
 * Génère un brief de devis personnalisé pour un provider
 * 
 * @param {Object} options
 * @param {number} options.quoteRequestId - ID de la demande de devis
 * @param {number} options.providerId - ID du provider cible
 * @param {number} options.brokerId - ID du courtier
 * @param {Object} options.brokerInfo - Infos courtier (nom, codes, etc.)
 * @returns {Promise<Object>} Brief généré
 */
async function buildBrief(options) {
  const { quoteRequestId, providerId, brokerId, brokerInfo = {} } = options
  
  const startTime = Date.now()
  
  // Récupérer provider intel
  const provider = await getProviderIntel(providerId)
  if (!provider) {
    throw new Error(`Provider ${providerId} non trouvé`)
  }
  
  // Récupérer quote request + client
  const quoteRequest = await getQuoteRequestDetails(quoteRequestId, brokerId)
  if (!quoteRequest) {
    throw new Error(`Quote request ${quoteRequestId} non trouvée ou accès refusé`)
  }
  
  // Construire le contexte pour ARK
  const context = {
    provider: {
      name: provider.name,
      code: provider.code,
      type: provider.type,
      communication_style: provider.communication_style,
      mandatory_documents: provider.mandatory_documents,
      product_catalog: provider.product_catalog,
      specific_fields: provider.specific_fields,
      preferred_format: provider.preferred_format,
      submission_instructions: provider.submission_instructions,
      email_template: provider.quote_email_template,
      contact_email: provider.contact_email
    },
    client: {
      nom: `${quoteRequest.first_name || ''} ${quoteRequest.last_name || ''}`.trim() || 'Client',
      email: quoteRequest.email,
      telephone: quoteRequest.phone,
      adresse: `${quoteRequest.address || ''}, ${quoteRequest.postal_code || ''} ${quoteRequest.city || ''}`.trim(),
      date_naissance: quoteRequest.birth_date,
      profession: quoteRequest.profession,
      entreprise: quoteRequest.company_name
    },
    demande: {
      type_assurance: quoteRequest.insurance_type,
      criteres: quoteRequest.criteria,
      budget: quoteRequest.budget,
      date_effet_souhaitee: quoteRequest.desired_start_date,
      notes: quoteRequest.notes,
      metadata: quoteRequest.metadata
    },
    documents_disponibles: (quoteRequest.client_documents || []).map(d => ({
      type: d.document_type,
      nom: d.file_name,
      statut: d.status,
      date: d.created_at
    })),
    courtier: {
      nom: brokerInfo.name || 'Courtier',
      cabinet: brokerInfo.cabinet || '',
      orias: brokerInfo.orias || '',
      codes_partenaires: brokerInfo.partner_codes || {}
    }
  }
  
  const userPrompt = `Génère un email de demande de devis ${quoteRequest.insurance_type || 'assurance'} 
pour la compagnie ${provider.name}.

Le brief doit être parfaitement adapté au style de communication de ${provider.name} et inclure tous leurs champs spécifiques requis.

Contexte complet fourni ci-dessus.`
  
  try {
    const arkResult = await callArkStructured({
      system: BRIEF_SYSTEM_PROMPT,
      user: userPrompt,
      context,
      userId: brokerId,
      route: 'quote-intel/build-brief'
    })
    
    const latencyMs = Date.now() - startTime
    
    if (!arkResult.structured) {
      logger.warn({ text: arkResult.text?.substring(0, 200) }, 'Brief builder: JSON parsing failed')
      throw new Error('Erreur de parsing de la réponse ARK')
    }
    
    const brief = arkResult.structured
    
    // Enrichir avec métadonnées
    return {
      subject: brief.subject || `Demande de devis ${quoteRequest.insurance_type} - ${context.client.nom}`,
      body_html: brief.body_html || '',
      body_plain: brief.body_plain || '',
      suggested_product: brief.suggested_product || null,
      missing_pieces: brief.missing_pieces || [],
      confidence: brief.confidence || 0.8,
      notes: brief.notes || null,
      ai_model: arkResult.model,
      ai_cost_usd: arkResult.costUsd,
      latency_ms: latencyMs,
      provider: {
        id: provider.id,
        name: provider.name,
        code: provider.code,
        contact_email: provider.contact_email,
        response_time_hours: provider.response_time_hours
      }
    }
    
  } catch (err) {
    logger.error({ err, providerId, quoteRequestId }, 'Brief builder error')
    throw err
  }
}

/**
 * Génère des briefs pour plusieurs providers en parallèle
 */
async function buildBriefsBatch(options) {
  const { quoteRequestId, providerIds, brokerId, brokerInfo = {} } = options
  
  const results = await Promise.allSettled(
    providerIds.map(providerId => 
      buildBrief({ quoteRequestId, providerId, brokerId, brokerInfo })
    )
  )
  
  const briefs = []
  const errors = []
  
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      briefs.push(result.value)
    } else {
      errors.push({
        providerId: providerIds[index],
        error: result.reason.message
      })
    }
  })
  
  return { briefs, errors }
}

/**
 * Sauvegarde un brief en base
 */
async function saveBrief(brief, brokerId, quoteRequestId) {
  const result = await pool.query(
    `INSERT INTO provider_quote_briefs 
     (broker_id, quote_request_id, provider_id, subject, body_html, body_plain,
      missing_pieces, ai_confidence, ai_cost_usd, ai_model, status, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'draft', $11)
     RETURNING *`,
    [
      brokerId,
      quoteRequestId,
      brief.provider.id,
      brief.subject,
      brief.body_html,
      brief.body_plain,
      JSON.stringify(brief.missing_pieces),
      brief.confidence,
      brief.ai_cost_usd,
      brief.ai_model,
      JSON.stringify({
        suggested_product: brief.suggested_product,
        notes: brief.notes,
        latency_ms: brief.latency_ms,
        generated_at: new Date().toISOString()
      })
    ]
  )
  
  return result.rows[0]
}

module.exports = {
  buildBrief,
  buildBriefsBatch,
  saveBrief,
  getProviderIntel,
  getQuoteRequestDetails
}
