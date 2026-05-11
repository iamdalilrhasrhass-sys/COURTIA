/**
 * COURTIA — LOT 5 : Routes Quotes Comparator
 * 
 * Routes:
 * - POST   /api/comparator/quote-request              Créer demande tarif
 * - GET    /api/comparator/quote-request/:id          Détails demande
 * - POST   /api/comparator/quote-request/:id/submit   Soumettre aux providers
 * - POST   /api/comparator/quote-request/:id/manual-result  Ajouter devis manuel
 * - GET    /api/comparator/quote-request/:id/results  Liste résultats
 * - POST   /api/comparator/quote-request/:id/compare  Générer recommandation ARK
 */

const express = require('express')
const router = express.Router()
const verifyToken = require('../middleware/authMiddleware')
const { requestQuotesMulti, getConnector } = require('../services/connectors')
const cryptoVault = require('../services/cryptoVault')

// ============================================================
// HELPERS
// ============================================================

function getUserId(user) {
  return user?.id || user?.userId || null
}

/**
 * Récupère les credentials déchiffrés pour une liste de providers
 */
async function getDecryptedCredentials(pool, userId, providerCodes) {
  const credentialsByCode = new Map()
  
  for (const code of providerCodes) {
    try {
      const result = await pool.query(`
        SELECT ic.encrypted_value, ic.iv, ic.auth_tag, ic.credential_type
        FROM integration_credentials ic
        JOIN broker_integrations bi ON ic.integration_id = bi.id
        JOIN insurance_providers ip ON bi.provider_id = ip.id
        WHERE bi.broker_id = $1 AND ip.code = $2
        ORDER BY ic.created_at DESC
        LIMIT 1
      `, [userId, code])
      
      if (result.rows[0]) {
        const row = result.rows[0]
        const decrypted = cryptoVault.decrypt({
          ciphertext: row.encrypted_value,
          iv: row.iv,
          authTag: row.auth_tag
        })
        credentialsByCode.set(code, {
          type: row.credential_type,
          value: decrypted
        })
      }
    } catch (err) {
      console.warn(`[quotesComparator] Failed to decrypt credentials for ${code}:`, err.message)
    }
  }
  
  return credentialsByCode
}

// ============================================================
// ROUTES (Protected)
// ============================================================

router.use(verifyToken)

/**
 * POST /api/comparator/quote-request
 * Créer une nouvelle demande de tarification
 */
router.post('/quote-request', async (req, res) => {
  try {
    const pool = req.app.locals.pool
    const userId = getUserId(req.user)
    
    if (!userId) {
      return res.status(401).json({ error: 'unauthorized' })
    }
    
    const {
      client_id,
      product_type,
      normalized_data,
      target_providers
    } = req.body
    
    if (!normalized_data || typeof normalized_data !== 'object') {
      return res.status(400).json({ error: 'normalized_data_required' })
    }
    
    // Vérifier que le client appartient au courtier (si fourni)
    if (client_id) {
      const clientCheck = await pool.query(
        'SELECT id FROM clients WHERE id = $1 AND courtier_id = $2',
        [client_id, userId]
      )
      if (!clientCheck.rows[0]) {
        return res.status(404).json({ error: 'client_not_found' })
      }
    }
    
    const result = await pool.query(`
      INSERT INTO quote_requests (
        client_id, broker_id, product_type, normalized_data, target_providers, status
      ) VALUES ($1, $2, $3, $4, $5, 'draft')
      RETURNING *
    `, [
      client_id || null,
      userId,
      product_type || null,
      JSON.stringify(normalized_data),
      target_providers ? JSON.stringify(target_providers) : null
    ])
    
    return res.status(201).json({
      success: true,
      quote_request: result.rows[0]
    })
  } catch (err) {
    console.error('[quotesComparator] POST /quote-request error:', err.message)
    return res.status(500).json({ error: 'quote_request_create_failed', details: err.message })
  }
})

/**
 * GET /api/comparator/quote-request/:id
 * Détails d'une demande de tarification
 */
router.get('/quote-request/:id', async (req, res) => {
  try {
    const pool = req.app.locals.pool
    const userId = getUserId(req.user)
    const requestId = parseInt(req.params.id, 10)
    
    if (!userId || !requestId) {
      return res.status(400).json({ error: 'invalid_request' })
    }
    
    const result = await pool.query(`
      SELECT 
        qr.*,
        c.first_name AS client_first_name,
        c.last_name AS client_last_name,
        c.email AS client_email,
        (SELECT COUNT(*) FROM quote_results WHERE request_id = qr.id) AS results_count,
        (SELECT COUNT(*) FROM quote_comparisons WHERE request_id = qr.id) AS comparisons_count
      FROM quote_requests qr
      LEFT JOIN clients c ON qr.client_id = c.id
      WHERE qr.id = $1 AND qr.broker_id = $2
    `, [requestId, userId])
    
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'quote_request_not_found' })
    }
    
    return res.json({
      success: true,
      quote_request: result.rows[0]
    })
  } catch (err) {
    console.error('[quotesComparator] GET /quote-request/:id error:', err.message)
    return res.status(500).json({ error: 'quote_request_fetch_failed', details: err.message })
  }
})

/**
 * POST /api/comparator/quote-request/:id/submit
 * Soumettre la demande aux providers (via connectors)
 */
router.post('/quote-request/:id/submit', async (req, res) => {
  try {
    const pool = req.app.locals.pool
    const userId = getUserId(req.user)
    const requestId = parseInt(req.params.id, 10)
    
    if (!userId || !requestId) {
      return res.status(400).json({ error: 'invalid_request' })
    }
    
    // Récupérer la demande
    const requestResult = await pool.query(`
      SELECT * FROM quote_requests 
      WHERE id = $1 AND broker_id = $2
    `, [requestId, userId])
    
    if (!requestResult.rows[0]) {
      return res.status(404).json({ error: 'quote_request_not_found' })
    }
    
    const quoteRequest = requestResult.rows[0]
    
    // Déterminer les providers cibles
    let targetProviders = quoteRequest.target_providers || []
    
    // Si pas de target, utiliser les intégrations actives du courtier
    if (!targetProviders.length) {
      const integrations = await pool.query(`
        SELECT ip.code 
        FROM broker_integrations bi
        JOIN insurance_providers ip ON bi.provider_id = ip.id
        WHERE bi.broker_id = $1 AND bi.status IN ('configured', 'active')
        ORDER BY bi.priority DESC
      `, [userId])
      targetProviders = integrations.rows.map(r => r.code)
    }
    
    if (!targetProviders.length) {
      return res.status(400).json({ 
        error: 'no_target_providers',
        message: 'Aucun provider configuré. Ajoutez des intégrations dans vos paramètres.'
      })
    }
    
    // Récupérer les credentials déchiffrés
    const credentialsByCode = await getDecryptedCredentials(pool, userId, targetProviders)
    
    // Appeler les connectors
    const normalizedData = quoteRequest.normalized_data
    const results = await requestQuotesMulti(targetProviders, normalizedData, credentialsByCode)
    
    // Sauvegarder les résultats
    const savedResults = []
    for (let i = 0; i < results.length; i++) {
      const result = results[i]
      const providerCode = targetProviders[i]
      
      // Récupérer le provider_id
      const providerResult = await pool.query(
        'SELECT id FROM insurance_providers WHERE code = $1',
        [providerCode]
      )
      const providerId = providerResult.rows[0]?.id || null
      
      const savedResult = await pool.query(`
        INSERT INTO quote_results (
          request_id, provider_id, provider_code, 
          premium_annual, coverage_summary, raw_response, 
          source, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [
        requestId,
        providerId,
        providerCode,
        result.premium_annual || null,
        result.coverage_summary ? JSON.stringify(result.coverage_summary) : null,
        JSON.stringify(result),
        result.status === 'manual_only' ? 'connector_stub' : 'api',
        result.status
      ])
      
      savedResults.push(savedResult.rows[0])
    }
    
    // Mettre à jour le status de la demande
    await pool.query(`
      UPDATE quote_requests SET 
        status = 'submitted',
        submitted_at = NOW()
      WHERE id = $1
    `, [requestId])
    
    return res.json({
      success: true,
      message: `Demande soumise à ${targetProviders.length} provider(s)`,
      providers_contacted: targetProviders,
      results: savedResults,
      manual_actions_required: results.filter(r => r.status === 'manual_only').map(r => ({
        provider: r.provider_code,
        message: r.message,
        url: r.manual_url
      }))
    })
  } catch (err) {
    console.error('[quotesComparator] POST /quote-request/:id/submit error:', err.message)
    return res.status(500).json({ error: 'quote_submit_failed', details: err.message })
  }
})

/**
 * POST /api/comparator/quote-request/:id/manual-result
 * Ajouter un devis reçu manuellement
 */
router.post('/quote-request/:id/manual-result', async (req, res) => {
  try {
    const pool = req.app.locals.pool
    const userId = getUserId(req.user)
    const requestId = parseInt(req.params.id, 10)
    
    if (!userId || !requestId) {
      return res.status(400).json({ error: 'invalid_request' })
    }
    
    // Vérifier la demande
    const requestCheck = await pool.query(
      'SELECT id FROM quote_requests WHERE id = $1 AND broker_id = $2',
      [requestId, userId]
    )
    
    if (!requestCheck.rows[0]) {
      return res.status(404).json({ error: 'quote_request_not_found' })
    }
    
    const {
      provider_code,
      provider_id,
      premium_annual,
      premium_monthly,
      coverage_summary,
      raw_data,
      notes
    } = req.body
    
    if (!provider_code && !provider_id) {
      return res.status(400).json({ error: 'provider_code_or_id_required' })
    }
    
    // Résoudre le provider
    let resolvedProviderId = provider_id
    let resolvedProviderCode = provider_code
    
    if (!resolvedProviderId && provider_code) {
      const providerResult = await pool.query(
        'SELECT id, code FROM insurance_providers WHERE code = $1',
        [provider_code]
      )
      if (providerResult.rows[0]) {
        resolvedProviderId = providerResult.rows[0].id
        resolvedProviderCode = providerResult.rows[0].code
      }
    }
    
    // Calculer premium annuel si monthly fourni
    const annualPremium = premium_annual || (premium_monthly ? premium_monthly * 12 : null)
    
    const result = await pool.query(`
      INSERT INTO quote_results (
        request_id, provider_id, provider_code,
        premium_annual, coverage_summary, raw_response,
        source, status
      ) VALUES ($1, $2, $3, $4, $5, $6, 'manual', 'received')
      RETURNING *
    `, [
      requestId,
      resolvedProviderId,
      resolvedProviderCode,
      annualPremium,
      coverage_summary ? JSON.stringify(coverage_summary) : null,
      JSON.stringify({ manual_entry: true, notes, raw_data })
    ])
    
    // Mettre à jour le status si nécessaire
    await pool.query(`
      UPDATE quote_requests SET 
        status = CASE WHEN status = 'draft' THEN 'in_progress' ELSE status END
      WHERE id = $1
    `, [requestId])
    
    return res.status(201).json({
      success: true,
      result: result.rows[0]
    })
  } catch (err) {
    console.error('[quotesComparator] POST manual-result error:', err.message)
    return res.status(500).json({ error: 'manual_result_add_failed', details: err.message })
  }
})

/**
 * GET /api/comparator/quote-request/:id/results
 * Liste tous les résultats d'une demande
 */
router.get('/quote-request/:id/results', async (req, res) => {
  try {
    const pool = req.app.locals.pool
    const userId = getUserId(req.user)
    const requestId = parseInt(req.params.id, 10)
    
    if (!userId || !requestId) {
      return res.status(400).json({ error: 'invalid_request' })
    }
    
    // Vérifier la demande
    const requestCheck = await pool.query(
      'SELECT id FROM quote_requests WHERE id = $1 AND broker_id = $2',
      [requestId, userId]
    )
    
    if (!requestCheck.rows[0]) {
      return res.status(404).json({ error: 'quote_request_not_found' })
    }
    
    const results = await pool.query(`
      SELECT 
        qr.*,
        ip.name AS provider_name,
        ip.type AS provider_type,
        ip.logo_url AS provider_logo
      FROM quote_results qr
      LEFT JOIN insurance_providers ip ON qr.provider_id = ip.id
      WHERE qr.request_id = $1
      ORDER BY qr.premium_annual ASC NULLS LAST, qr.received_at DESC
    `, [requestId])
    
    return res.json({
      success: true,
      count: results.rows.length,
      results: results.rows
    })
  } catch (err) {
    console.error('[quotesComparator] GET results error:', err.message)
    return res.status(500).json({ error: 'results_fetch_failed', details: err.message })
  }
})

/**
 * POST /api/comparator/quote-request/:id/compare
 * Générer une recommandation ARK basée sur les résultats
 */
router.post('/quote-request/:id/compare', async (req, res) => {
  try {
    const pool = req.app.locals.pool
    const userId = getUserId(req.user)
    const requestId = parseInt(req.params.id, 10)
    
    if (!userId || !requestId) {
      return res.status(400).json({ error: 'invalid_request' })
    }
    
    // Récupérer la demande et les résultats
    const requestResult = await pool.query(`
      SELECT qr.*, c.first_name, c.last_name
      FROM quote_requests qr
      LEFT JOIN clients c ON qr.client_id = c.id
      WHERE qr.id = $1 AND qr.broker_id = $2
    `, [requestId, userId])
    
    if (!requestResult.rows[0]) {
      return res.status(404).json({ error: 'quote_request_not_found' })
    }
    
    const quoteRequest = requestResult.rows[0]
    
    // Récupérer les résultats
    const resultsData = await pool.query(`
      SELECT 
        qr.*,
        ip.name AS provider_name,
        ip.type AS provider_type
      FROM quote_results qr
      LEFT JOIN insurance_providers ip ON qr.provider_id = ip.id
      WHERE qr.request_id = $1 AND qr.status IN ('received', 'manual_only')
      ORDER BY qr.premium_annual ASC NULLS LAST
    `, [requestId])
    
    if (resultsData.rows.length === 0) {
      return res.status(400).json({ 
        error: 'no_results_to_compare',
        message: 'Ajoutez des devis avant de lancer la comparaison.'
      })
    }
    
    // Générer la recommandation ARK (simplifié pour V1)
    const results = resultsData.rows
    const recommendation = generateRecommendation(quoteRequest, results)
    
    // Sauvegarder la comparaison
    const comparisonResult = await pool.query(`
      INSERT INTO quote_comparisons (request_id, recommendation)
      VALUES ($1, $2)
      RETURNING *
    `, [requestId, JSON.stringify(recommendation)])
    
    // Mettre à jour le status
    await pool.query(`
      UPDATE quote_requests SET status = 'compared' WHERE id = $1
    `, [requestId])
    
    return res.json({
      success: true,
      comparison: comparisonResult.rows[0],
      recommendation
    })
  } catch (err) {
    console.error('[quotesComparator] POST compare error:', err.message)
    return res.status(500).json({ error: 'comparison_failed', details: err.message })
  }
})

/**
 * Génère une recommandation basée sur les résultats
 * @param {object} quoteRequest 
 * @param {Array} results 
 * @returns {object}
 */
function generateRecommendation(quoteRequest, results) {
  const validResults = results.filter(r => r.premium_annual > 0)
  
  if (validResults.length === 0) {
    return {
      type: 'no_valid_quotes',
      message: 'Aucun devis avec tarif valide. Complétez les devis manuels.',
      results_count: results.length
    }
  }
  
  // Trier par prix
  const sortedByPrice = [...validResults].sort((a, b) => a.premium_annual - b.premium_annual)
  const cheapest = sortedByPrice[0]
  const mostExpensive = sortedByPrice[sortedByPrice.length - 1]
  
  // Calcul d'économie potentielle
  const avgPremium = validResults.reduce((sum, r) => sum + parseFloat(r.premium_annual), 0) / validResults.length
  const savingsVsAvg = avgPremium - parseFloat(cheapest.premium_annual)
  
  // Recommandation
  return {
    type: 'comparison_complete',
    generated_at: new Date().toISOString(),
    summary: {
      total_quotes: results.length,
      valid_quotes: validResults.length,
      price_range: {
        min: parseFloat(cheapest.premium_annual),
        max: parseFloat(mostExpensive.premium_annual),
        avg: Math.round(avgPremium * 100) / 100
      }
    },
    best_price: {
      provider_code: cheapest.provider_code,
      provider_name: cheapest.provider_name,
      premium_annual: parseFloat(cheapest.premium_annual),
      premium_monthly: Math.round(parseFloat(cheapest.premium_annual) / 12 * 100) / 100,
      savings_vs_avg: Math.round(savingsVsAvg * 100) / 100
    },
    ranking: sortedByPrice.map((r, idx) => ({
      rank: idx + 1,
      provider_code: r.provider_code,
      provider_name: r.provider_name,
      premium_annual: parseFloat(r.premium_annual),
      source: r.source
    })),
    ark_insight: generateArkInsight(quoteRequest, sortedByPrice),
    product_type: quoteRequest.product_type
  }
}

/**
 * Génère un insight ARK (texte explicatif)
 */
function generateArkInsight(quoteRequest, sortedResults) {
  const productType = quoteRequest.product_type || 'assurance'
  const cheapest = sortedResults[0]
  const clientName = quoteRequest.first_name 
    ? `${quoteRequest.first_name} ${quoteRequest.last_name || ''}`.trim()
    : 'votre client'
  
  if (sortedResults.length === 1) {
    return `Un seul devis reçu (${cheapest.provider_name}). Je recommande de solliciter d'autres compagnies pour comparer.`
  }
  
  const diff = sortedResults.length > 1 
    ? parseFloat(sortedResults[sortedResults.length - 1].premium_annual) - parseFloat(cheapest.premium_annual)
    : 0
  
  return `Pour ${clientName}, sur ${sortedResults.length} devis ${productType} comparés, ` +
    `${cheapest.provider_name} propose le meilleur tarif à ${cheapest.premium_annual}€/an. ` +
    `Écart de ${Math.round(diff)}€/an avec l'offre la plus chère. ` +
    `Vérifiez les garanties et exclusions avant de finaliser.`
}

/**
 * GET /api/comparator/quote-requests
 * Liste toutes les demandes du courtier
 */
router.get('/quote-requests', async (req, res) => {
  try {
    const pool = req.app.locals.pool
    const userId = getUserId(req.user)
    
    if (!userId) {
      return res.status(401).json({ error: 'unauthorized' })
    }
    
    const { status, client_id, limit = 50, offset = 0 } = req.query
    
    let whereClause = 'WHERE qr.broker_id = $1'
    const params = [userId]
    let paramIndex = 2
    
    if (status) {
      whereClause += ` AND qr.status = $${paramIndex++}`
      params.push(status)
    }
    
    if (client_id) {
      whereClause += ` AND qr.client_id = $${paramIndex++}`
      params.push(parseInt(client_id, 10))
    }
    
    params.push(parseInt(limit, 10))
    params.push(parseInt(offset, 10))
    
    const result = await pool.query(`
      SELECT 
        qr.*,
        c.first_name AS client_first_name,
        c.last_name AS client_last_name,
        (SELECT COUNT(*) FROM quote_results WHERE request_id = qr.id) AS results_count
      FROM quote_requests qr
      LEFT JOIN clients c ON qr.client_id = c.id
      ${whereClause}
      ORDER BY qr.created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `, params)
    
    return res.json({
      success: true,
      count: result.rows.length,
      quote_requests: result.rows
    })
  } catch (err) {
    console.error('[quotesComparator] GET /quote-requests error:', err.message)
    return res.status(500).json({ error: 'quote_requests_fetch_failed', details: err.message })
  }
})

module.exports = router