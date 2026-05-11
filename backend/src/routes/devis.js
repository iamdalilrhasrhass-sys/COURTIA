/**
 * Module Devis — LOT 6
 * Gestion des devis (quote_requests) avec intelligence artificielle ARK
 * 
 * Routes:
 * - GET    /api/devis                        Liste des devis du courtier
 * - GET    /api/devis/:id                    Détails d'un devis + résultats
 * - POST   /api/devis                        Créer un nouveau devis
 * - PUT    /api/devis/:id                    Modifier un devis
 * - DELETE /api/devis/:id                    Supprimer un devis
 * - POST   /api/devis/:id/ai-prepare         ARK prépare checklist + questions
 * - POST   /api/devis/:id/ai-recommendation  ARK compare et recommande
 * - POST   /api/devis/:id/generate-proposal  ARK génère proposition client
 */

const express = require('express')
const router = express.Router()
const pool = require('../db')
const { callArkStructured } = require('../services/arkEngine')
const logger = require('../lib/logger')

// =============================================================================
// SCHEMAS JSON pour les réponses ARK
// =============================================================================

const SCHEMA_PREPARE = {
  type: 'object',
  properties: {
    checklist_documents: {
      type: 'array',
      items: { type: 'object', properties: { document: { type: 'string' }, obligatoire: { type: 'boolean' }, raison: { type: 'string' } } }
    },
    questions_client: {
      type: 'array',
      items: { type: 'object', properties: { question: { type: 'string' }, importance: { type: 'string' }, contexte: { type: 'string' } } }
    },
    points_attention: { type: 'array', items: { type: 'string' } },
    estimation_delai_jours: { type: 'number' },
    conseil_approche: { type: 'string' }
  },
  required: ['checklist_documents', 'questions_client']
}

const SCHEMA_RECOMMENDATION = {
  type: 'object',
  properties: {
    recommandation_principale: {
      type: 'object',
      properties: {
        provider_code: { type: 'string' },
        provider_name: { type: 'string' },
        prime_annuelle: { type: 'number' },
        score_global: { type: 'number' },
        raisons: { type: 'array', items: { type: 'string' } }
      }
    },
    alternatives: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          provider_code: { type: 'string' },
          provider_name: { type: 'string' },
          prime_annuelle: { type: 'number' },
          avantage: { type: 'string' },
          inconvenient: { type: 'string' }
        }
      }
    },
    analyse_comparative: { type: 'string' },
    argumentaire_client: { type: 'string' },
    risques_non_couverts: { type: 'array', items: { type: 'string' } }
  },
  required: ['recommandation_principale', 'argumentaire_client']
}

const SCHEMA_PROPOSAL = {
  type: 'object',
  properties: {
    titre: { type: 'string' },
    introduction_personnalisee: { type: 'string' },
    resume_besoins: { type: 'string' },
    solution_proposee: {
      type: 'object',
      properties: {
        compagnie: { type: 'string' },
        produit: { type: 'string' },
        garanties_principales: { type: 'array', items: { type: 'string' } },
        prime_mensuelle: { type: 'number' },
        prime_annuelle: { type: 'number' }
      }
    },
    avantages_cles: { type: 'array', items: { type: 'string' } },
    prochaines_etapes: { type: 'array', items: { type: 'string' } },
    conclusion: { type: 'string' },
    validite_jours: { type: 'number' }
  },
  required: ['titre', 'solution_proposee', 'conclusion']
}

// =============================================================================
// GET /api/devis — Liste des devis
// =============================================================================

router.get('/', async (req, res) => {
  try {
    const brokerId = req.user.id
    const { status, client_id, product_type, limit = 50, offset = 0 } = req.query

    let sql = `
      SELECT 
        qr.id, qr.client_id, qr.product_type, qr.normalized_data,
        qr.target_providers, qr.status, qr.created_at, qr.submitted_at,
        qr.metadata,
        c.first_name AS client_first_name, c.last_name AS client_last_name,
        c.company_name AS client_company,
        (SELECT COUNT(*) FROM quote_results WHERE request_id = qr.id) AS results_count,
        (SELECT MIN(premium_annual) FROM quote_results WHERE request_id = qr.id AND status = 'received') AS best_price
      FROM quote_requests qr
      LEFT JOIN clients c ON qr.client_id = c.id
      WHERE qr.broker_id = $1
    `
    const params = [brokerId]
    let paramIndex = 2

    if (status) {
      sql += ` AND qr.status = $${paramIndex++}`
      params.push(status)
    }
    if (client_id) {
      sql += ` AND qr.client_id = $${paramIndex++}`
      params.push(parseInt(client_id, 10))
    }
    if (product_type) {
      sql += ` AND qr.product_type = $${paramIndex++}`
      params.push(product_type)
    }

    sql += ` ORDER BY qr.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`
    params.push(parseInt(limit, 10), parseInt(offset, 10))

    const result = await pool.query(sql, params)

    // Stats globales
    const statsResult = await pool.query(`
      SELECT 
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status = 'draft') AS drafts,
        COUNT(*) FILTER (WHERE status = 'submitted') AS submitted,
        COUNT(*) FILTER (WHERE status = 'completed') AS completed,
        COUNT(*) FILTER (WHERE status = 'accepted') AS accepted
      FROM quote_requests WHERE broker_id = $1
    `, [brokerId])

    res.json({
      devis: result.rows.map(row => ({
        id: row.id,
        client_id: row.client_id,
        client_name: row.client_company || `${row.client_first_name || ''} ${row.client_last_name || ''}`.trim(),
        product_type: row.product_type,
        status: row.status,
        created_at: row.created_at,
        submitted_at: row.submitted_at,
        results_count: parseInt(row.results_count, 10) || 0,
        best_price: row.best_price ? parseFloat(row.best_price) : null,
        normalized_data: row.normalized_data,
        metadata: row.metadata || {}
      })),
      stats: statsResult.rows[0],
      pagination: { limit: parseInt(limit, 10), offset: parseInt(offset, 10) }
    })
  } catch (err) {
    logger.error({ error: err.message }, 'GET /api/devis error')
    res.status(500).json({ error: 'Erreur serveur', details: err.message })
  }
})

// =============================================================================
// GET /api/devis/:id — Détails d'un devis
// =============================================================================

router.get('/:id', async (req, res) => {
  try {
    const brokerId = req.user.id
    const devisId = parseInt(req.params.id, 10)

    const result = await pool.query(`
      SELECT 
        qr.*,
        c.first_name AS client_first_name, c.last_name AS client_last_name,
        c.email AS client_email, c.phone AS client_phone,
        c.company_name AS client_company, c.type AS client_type
      FROM quote_requests qr
      LEFT JOIN clients c ON qr.client_id = c.id
      WHERE qr.id = $1 AND qr.broker_id = $2
    `, [devisId, brokerId])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Devis non trouvé' })
    }

    const devis = result.rows[0]

    // Récupérer les résultats des fournisseurs
    const resultsRes = await pool.query(`
      SELECT 
        qrs.*, ip.name AS provider_name, ip.logo_url
      FROM quote_results qrs
      LEFT JOIN insurance_providers ip ON qrs.provider_id = ip.id
      WHERE qrs.request_id = $1
      ORDER BY qrs.premium_annual ASC NULLS LAST
    `, [devisId])

    res.json({
      devis: {
        id: devis.id,
        client_id: devis.client_id,
        client: {
          name: devis.client_company || `${devis.client_first_name || ''} ${devis.client_last_name || ''}`.trim(),
          email: devis.client_email,
          phone: devis.client_phone,
          type: devis.client_type
        },
        product_type: devis.product_type,
        normalized_data: devis.normalized_data,
        target_providers: devis.target_providers,
        status: devis.status,
        metadata: devis.metadata || {},
        created_at: devis.created_at,
        submitted_at: devis.submitted_at
      },
      results: resultsRes.rows.map(r => ({
        id: r.id,
        provider_code: r.provider_code,
        provider_name: r.provider_name,
        logo_url: r.logo_url,
        premium_annual: r.premium_annual ? parseFloat(r.premium_annual) : null,
        coverage_summary: r.coverage_summary,
        status: r.status,
        source: r.source,
        received_at: r.received_at
      }))
    })
  } catch (err) {
    logger.error({ error: err.message }, 'GET /api/devis/:id error')
    res.status(500).json({ error: 'Erreur serveur', details: err.message })
  }
})

// =============================================================================
// POST /api/devis — Créer un devis
// =============================================================================

router.post('/', async (req, res) => {
  try {
    const brokerId = req.user.id
    const { client_id, product_type, criteria, target_providers } = req.body

    if (!product_type) {
      return res.status(400).json({ error: 'product_type requis' })
    }

    const result = await pool.query(`
      INSERT INTO quote_requests (broker_id, client_id, product_type, normalized_data, target_providers, status)
      VALUES ($1, $2, $3, $4, $5, 'draft')
      RETURNING *
    `, [brokerId, client_id || null, product_type, criteria || {}, target_providers || null])

    logger.info({ brokerId, devisId: result.rows[0].id }, 'Devis created')

    res.status(201).json({
      success: true,
      devis: result.rows[0]
    })
  } catch (err) {
    logger.error({ error: err.message }, 'POST /api/devis error')
    res.status(500).json({ error: 'Erreur serveur', details: err.message })
  }
})

// =============================================================================
// PUT /api/devis/:id — Modifier un devis
// =============================================================================

router.put('/:id', async (req, res) => {
  try {
    const brokerId = req.user.id
    const devisId = parseInt(req.params.id, 10)
    const { status, criteria, target_providers, metadata } = req.body

    // Vérifier que le devis appartient au courtier
    const check = await pool.query('SELECT id FROM quote_requests WHERE id = $1 AND broker_id = $2', [devisId, brokerId])
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Devis non trouvé' })
    }

    const updates = []
    const params = []
    let paramIndex = 1

    if (status !== undefined) {
      updates.push(`status = $${paramIndex++}`)
      params.push(status)
      if (status === 'submitted') {
        updates.push(`submitted_at = NOW()`)
      }
    }
    if (criteria !== undefined) {
      updates.push(`normalized_data = $${paramIndex++}`)
      params.push(criteria)
    }
    if (target_providers !== undefined) {
      updates.push(`target_providers = $${paramIndex++}`)
      params.push(target_providers)
    }
    if (metadata !== undefined) {
      updates.push(`metadata = COALESCE(metadata, '{}') || $${paramIndex++}`)
      params.push(metadata)
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Aucune modification fournie' })
    }

    params.push(devisId, brokerId)
    const result = await pool.query(`
      UPDATE quote_requests SET ${updates.join(', ')}
      WHERE id = $${paramIndex++} AND broker_id = $${paramIndex}
      RETURNING *
    `, params)

    res.json({ success: true, devis: result.rows[0] })
  } catch (err) {
    logger.error({ error: err.message }, 'PUT /api/devis/:id error')
    res.status(500).json({ error: 'Erreur serveur', details: err.message })
  }
})

// =============================================================================
// DELETE /api/devis/:id — Supprimer un devis
// =============================================================================

router.delete('/:id', async (req, res) => {
  try {
    const brokerId = req.user.id
    const devisId = parseInt(req.params.id, 10)

    const result = await pool.query(
      'DELETE FROM quote_requests WHERE id = $1 AND broker_id = $2 RETURNING id',
      [devisId, brokerId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Devis non trouvé' })
    }

    res.json({ success: true, deleted_id: devisId })
  } catch (err) {
    logger.error({ error: err.message }, 'DELETE /api/devis/:id error')
    res.status(500).json({ error: 'Erreur serveur', details: err.message })
  }
})

// =============================================================================
// POST /api/devis/:id/ai-prepare — ARK prépare le dossier
// =============================================================================

router.post('/:id/ai-prepare', async (req, res) => {
  try {
    const brokerId = req.user.id
    const devisId = parseInt(req.params.id, 10)

    // Récupérer le devis avec infos client
    const devisRes = await pool.query(`
      SELECT qr.*, c.first_name, c.last_name, c.company_name, c.type AS client_type,
             c.siret, c.city
      FROM quote_requests qr
      LEFT JOIN clients c ON qr.client_id = c.id
      WHERE qr.id = $1 AND qr.broker_id = $2
    `, [devisId, brokerId])

    if (devisRes.rows.length === 0) {
      return res.status(404).json({ error: 'Devis non trouvé' })
    }

    const devis = devisRes.rows[0]
    const clientName = devis.company_name || `${devis.first_name || ''} ${devis.last_name || ''}`.trim()

    const arkResponse = await callArkStructured({
      system: `Tu es ARK, assistant IA expert en assurance pour courtiers.
Tu dois préparer un dossier de souscription pour un devis.
Fournis une checklist de documents nécessaires et les questions pertinentes à poser au client.
Sois précis et adapté au type de produit demandé.`,
      user: `Prépare le dossier pour ce devis:
- Client: ${clientName} (${devis.client_type || 'particulier'})
- Produit: ${devis.product_type}
- Critères: ${JSON.stringify(devis.normalized_data)}
${devis.siret ? `- SIRET: ${devis.siret}` : ''}
${devis.city ? `- Ville: ${devis.city}` : ''}

Génère la checklist documents et les questions client.`,
      schema: SCHEMA_PREPARE,
      context: { product_type: devis.product_type, client_type: devis.client_type },
      userId: brokerId,
      clientId: devis.client_id,
      route: 'devis-ai-prepare'
    })

    // Sauvegarder dans metadata
    await pool.query(`
      UPDATE quote_requests 
      SET metadata = COALESCE(metadata, '{}') || $1
      WHERE id = $2
    `, [{ ai_preparation: arkResponse.structured, ai_prepared_at: new Date().toISOString() }, devisId])

    res.json({
      success: true,
      preparation: arkResponse.structured,
      usage: arkResponse.usage,
      model: arkResponse.model
    })
  } catch (err) {
    logger.error({ error: err.message }, 'POST /api/devis/:id/ai-prepare error')
    res.status(500).json({ error: 'Erreur ARK', details: err.message })
  }
})

// =============================================================================
// POST /api/devis/:id/ai-recommendation — ARK recommande un fournisseur
// =============================================================================

router.post('/:id/ai-recommendation', async (req, res) => {
  try {
    const brokerId = req.user.id
    const devisId = parseInt(req.params.id, 10)

    // Récupérer le devis + résultats
    const devisRes = await pool.query(`
      SELECT qr.*, c.first_name, c.last_name, c.company_name, c.type AS client_type
      FROM quote_requests qr
      LEFT JOIN clients c ON qr.client_id = c.id
      WHERE qr.id = $1 AND qr.broker_id = $2
    `, [devisId, brokerId])

    if (devisRes.rows.length === 0) {
      return res.status(404).json({ error: 'Devis non trouvé' })
    }

    const devis = devisRes.rows[0]

    // Résultats des fournisseurs
    const resultsRes = await pool.query(`
      SELECT qrs.*, ip.name AS provider_name
      FROM quote_results qrs
      LEFT JOIN insurance_providers ip ON qrs.provider_id = ip.id
      WHERE qrs.request_id = $1 AND qrs.status = 'received'
    `, [devisId])

    if (resultsRes.rows.length === 0) {
      return res.status(400).json({ error: 'Aucun résultat de fournisseur disponible pour la comparaison' })
    }

    const clientName = devis.company_name || `${devis.first_name || ''} ${devis.last_name || ''}`.trim()

    const arkResponse = await callArkStructured({
      system: `Tu es ARK, assistant IA expert en assurance pour courtiers.
Tu dois comparer les offres reçues et recommander la meilleure solution au courtier.
Prends en compte le rapport qualité/prix, les garanties et le profil du client.
Fournis un argumentaire de vente clair.`,
      user: `Compare ces offres pour le devis ${devis.product_type}:
Client: ${clientName} (${devis.client_type || 'particulier'})
Critères: ${JSON.stringify(devis.normalized_data)}

Offres reçues:
${resultsRes.rows.map((r, i) => `${i + 1}. ${r.provider_name || r.provider_code}: ${r.premium_annual}€/an
   Garanties: ${JSON.stringify(r.coverage_summary || {})}`).join('\n')}

Recommande la meilleure offre avec argumentaire.`,
      schema: SCHEMA_RECOMMENDATION,
      context: { product_type: devis.product_type, offers_count: resultsRes.rows.length },
      userId: brokerId,
      clientId: devis.client_id,
      route: 'devis-ai-recommendation'
    })

    // Sauvegarder dans metadata
    await pool.query(`
      UPDATE quote_requests 
      SET metadata = COALESCE(metadata, '{}') || $1
      WHERE id = $2
    `, [{ ai_recommendation: arkResponse.structured, ai_recommended_at: new Date().toISOString() }, devisId])

    res.json({
      success: true,
      recommendation: arkResponse.structured,
      offers_analyzed: resultsRes.rows.length,
      usage: arkResponse.usage,
      model: arkResponse.model
    })
  } catch (err) {
    logger.error({ error: err.message }, 'POST /api/devis/:id/ai-recommendation error')
    res.status(500).json({ error: 'Erreur ARK', details: err.message })
  }
})

// =============================================================================
// POST /api/devis/:id/generate-proposal — ARK génère proposition client
// =============================================================================

router.post('/:id/generate-proposal', async (req, res) => {
  try {
    const brokerId = req.user.id
    const devisId = parseInt(req.params.id, 10)
    const { provider_code } = req.body // Optionnel: forcer un provider

    // Récupérer le devis avec client
    const devisRes = await pool.query(`
      SELECT qr.*, c.first_name, c.last_name, c.company_name, c.type AS client_type,
             c.email, c.city
      FROM quote_requests qr
      LEFT JOIN clients c ON qr.client_id = c.id
      WHERE qr.id = $1 AND qr.broker_id = $2
    `, [devisId, brokerId])

    if (devisRes.rows.length === 0) {
      return res.status(404).json({ error: 'Devis non trouvé' })
    }

    const devis = devisRes.rows[0]

    // Récupérer le meilleur résultat ou le provider spécifié
    let resultQuery = `
      SELECT qrs.*, ip.name AS provider_name
      FROM quote_results qrs
      LEFT JOIN insurance_providers ip ON qrs.provider_id = ip.id
      WHERE qrs.request_id = $1 AND qrs.status = 'received'
    `
    const resultParams = [devisId]

    if (provider_code) {
      resultQuery += ' AND qrs.provider_code = $2'
      resultParams.push(provider_code)
    } else {
      resultQuery += ' ORDER BY qrs.premium_annual ASC LIMIT 1'
    }

    const resultRes = await pool.query(resultQuery, resultParams)

    if (resultRes.rows.length === 0) {
      return res.status(400).json({ error: 'Aucune offre disponible pour générer la proposition' })
    }

    const bestOffer = resultRes.rows[0]
    const clientName = devis.company_name || `${devis.first_name || ''} ${devis.last_name || ''}`.trim()

    const arkResponse = await callArkStructured({
      system: `Tu es ARK, assistant IA expert en assurance pour courtiers.
Tu dois générer une proposition commerciale professionnelle et personnalisée pour le client.
Le document doit être clair, convaincant et prêt à être envoyé.
Utilise un ton professionnel mais chaleureux.`,
      user: `Génère une proposition commerciale pour:
Client: ${clientName}
${devis.email ? `Email: ${devis.email}` : ''}
${devis.city ? `Ville: ${devis.city}` : ''}
Type: ${devis.client_type || 'particulier'}
Produit: ${devis.product_type}
Besoins: ${JSON.stringify(devis.normalized_data)}

Offre sélectionnée:
- Compagnie: ${bestOffer.provider_name || bestOffer.provider_code}
- Prime annuelle: ${bestOffer.premium_annual}€
- Garanties: ${JSON.stringify(bestOffer.coverage_summary || {})}`,
      schema: SCHEMA_PROPOSAL,
      context: { product_type: devis.product_type, provider: bestOffer.provider_name },
      userId: brokerId,
      clientId: devis.client_id,
      route: 'devis-generate-proposal'
    })

    // Sauvegarder dans metadata
    await pool.query(`
      UPDATE quote_requests 
      SET metadata = COALESCE(metadata, '{}') || $1
      WHERE id = $2
    `, [{ ai_proposal: arkResponse.structured, ai_proposal_at: new Date().toISOString(), selected_provider: bestOffer.provider_code }, devisId])

    res.json({
      success: true,
      proposal: arkResponse.structured,
      selected_offer: {
        provider_code: bestOffer.provider_code,
        provider_name: bestOffer.provider_name,
        premium_annual: parseFloat(bestOffer.premium_annual)
      },
      usage: arkResponse.usage,
      model: arkResponse.model
    })
  } catch (err) {
    logger.error({ error: err.message }, 'POST /api/devis/:id/generate-proposal error')
    res.status(500).json({ error: 'Erreur ARK', details: err.message })
  }
})

module.exports = router
