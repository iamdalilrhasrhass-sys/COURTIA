/**
 * Module Opportunités — LOT 6
 * Détection IA de cross-sell, renouvellements et reconquête clients
 * 
 * Routes:
 * - GET    /api/opportunites                  Liste des opportunités
 * - GET    /api/opportunites/stats            Statistiques et KPIs
 * - GET    /api/opportunites/:id              Détail d'une opportunité
 * - PUT    /api/opportunites/:id              Modifier statut
 * - DELETE /api/opportunites/:id              Supprimer
 * - POST   /api/opportunites/detect           ARK scanne et détecte
 * - POST   /api/opportunites/:id/ai-pitch     ARK génère argumentaire
 */

const express = require('express')
const router = express.Router()
const pool = require('../db')
const { callArkStructured } = require('../services/arkEngine')
const logger = require('../lib/logger')

// =============================================================================
// SCHEMAS JSON pour les réponses ARK
// =============================================================================

const SCHEMA_DETECT = {
  type: 'object',
  properties: {
    opportunites: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          client_id: { type: 'number' },
          client_name: { type: 'string' },
          type: { type: 'string', enum: ['cross_sell', 'upsell', 'renouvellement', 'reconquete', 'mono_produit'] },
          product_current: { type: 'string' },
          product_target: { type: 'string' },
          score: { type: 'number', minimum: 0, maximum: 100 },
          estimated_revenue: { type: 'number' },
          reasoning: { type: 'string' },
          suggested_action: { type: 'string' }
        },
        required: ['client_id', 'type', 'product_target', 'score', 'reasoning']
      }
    },
    potentiel_total: { type: 'number' },
    analyse_portefeuille: { type: 'string' },
    tendances: { type: 'array', items: { type: 'string' } }
  },
  required: ['opportunites']
}

const SCHEMA_PITCH = {
  type: 'object',
  properties: {
    accroche: { type: 'string' },
    contexte_client: { type: 'string' },
    besoin_identifie: { type: 'string' },
    solution_proposee: { type: 'string' },
    arguments_cles: { type: 'array', items: { type: 'string' } },
    objections_anticipees: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          objection: { type: 'string' },
          reponse: { type: 'string' }
        }
      }
    },
    questions_decouverte: { type: 'array', items: { type: 'string' } },
    closing: { type: 'string' },
    next_steps: { type: 'array', items: { type: 'string' } }
  },
  required: ['accroche', 'arguments_cles', 'closing']
}

// =============================================================================
// GET /api/opportunites — Liste des opportunités
// =============================================================================

router.get('/', async (req, res) => {
  try {
    const brokerId = req.user.id
    const { status, type, score_min, limit = 50, offset = 0 } = req.query

    let sql = `
      SELECT 
        o.*,
        c.first_name AS client_first_name, c.last_name AS client_last_name,
        c.company_name AS client_company, c.email AS client_email, c.type AS client_type
      FROM opportunites o
      LEFT JOIN clients c ON o.client_id = c.id
      WHERE o.broker_id = $1
    `
    const params = [brokerId]
    let paramIndex = 2

    if (status) {
      sql += ` AND o.status = $${paramIndex++}`
      params.push(status)
    }
    if (type) {
      sql += ` AND o.type = $${paramIndex++}`
      params.push(type)
    }
    if (score_min) {
      sql += ` AND o.score >= $${paramIndex++}`
      params.push(parseInt(score_min, 10))
    }

    sql += ` ORDER BY o.score DESC, o.estimated_revenue DESC, o.detected_at DESC
    LIMIT $${paramIndex++} OFFSET $${paramIndex++}`
    params.push(parseInt(limit, 10), parseInt(offset, 10))

    const result = await pool.query(sql, params)

    res.json({
      opportunites: result.rows.map(row => ({
        id: row.id,
        client_id: row.client_id,
        client_name: row.client_company || `${row.client_first_name || ''} ${row.client_last_name || ''}`.trim(),
        client_email: row.client_email,
        client_type: row.client_type,
        type: row.type,
        product_current: row.product_current,
        product_target: row.product_target,
        score: row.score,
        estimated_revenue: row.estimated_revenue ? parseFloat(row.estimated_revenue) : 0,
        status: row.status,
        reasoning: row.reasoning,
        suggested_action: row.suggested_action,
        detected_at: row.detected_at,
        contacted_at: row.contacted_at,
        converted_at: row.converted_at,
        metadata: row.metadata || {}
      })),
      pagination: { limit: parseInt(limit, 10), offset: parseInt(offset, 10) }
    })
  } catch (err) {
    logger.error({ error: err.message }, 'GET /api/opportunites error')
    res.status(500).json({ error: 'Erreur serveur', details: err.message })
  }
})

// =============================================================================
// GET /api/opportunites/stats — Statistiques
// =============================================================================

router.get('/stats', async (req, res) => {
  try {
    const brokerId = req.user.id

    const statsResult = await pool.query(`
      SELECT 
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status = 'detected') AS detected,
        COUNT(*) FILTER (WHERE status = 'contacted') AS contacted,
        COUNT(*) FILTER (WHERE status = 'converted') AS converted,
        COUNT(*) FILTER (WHERE status = 'abandoned') AS abandoned,
        SUM(estimated_revenue) FILTER (WHERE status = 'detected') AS potentiel_detecte,
        SUM(estimated_revenue) FILTER (WHERE status = 'converted') AS revenus_convertis,
        AVG(score) FILTER (WHERE status = 'detected') AS score_moyen,
        COUNT(*) FILTER (WHERE score >= 70 AND status = 'detected') AS high_score_count
      FROM opportunites WHERE broker_id = $1
    `, [brokerId])

    // Par type
    const byTypeResult = await pool.query(`
      SELECT type, COUNT(*) AS count, SUM(estimated_revenue) AS potentiel,
             AVG(score)::INTEGER AS score_moyen
      FROM opportunites WHERE broker_id = $1 AND status = 'detected'
      GROUP BY type ORDER BY count DESC
    `, [brokerId])

    // Par produit cible
    const byProductResult = await pool.query(`
      SELECT product_target, COUNT(*) AS count, SUM(estimated_revenue) AS potentiel
      FROM opportunites WHERE broker_id = $1 AND status = 'detected'
      GROUP BY product_target ORDER BY potentiel DESC NULLS LAST
      LIMIT 10
    `, [brokerId])

    // Taux de conversion
    const stats = statsResult.rows[0]
    const contacted = parseInt(stats.contacted, 10) + parseInt(stats.converted, 10) + parseInt(stats.abandoned, 10)
    const tauxConversion = contacted > 0
      ? Math.round((parseInt(stats.converted, 10) / contacted) * 100)
      : 0

    res.json({
      totals: {
        total: parseInt(stats.total, 10),
        detected: parseInt(stats.detected, 10),
        contacted: parseInt(stats.contacted, 10),
        converted: parseInt(stats.converted, 10),
        abandoned: parseInt(stats.abandoned, 10),
        high_score: parseInt(stats.high_score_count, 10)
      },
      financials: {
        potentiel_detecte: parseFloat(stats.potentiel_detecte) || 0,
        revenus_convertis: parseFloat(stats.revenus_convertis) || 0,
        score_moyen: Math.round(parseFloat(stats.score_moyen) || 0)
      },
      taux_conversion: tauxConversion,
      by_type: byTypeResult.rows.map(r => ({
        type: r.type,
        count: parseInt(r.count, 10),
        potentiel: parseFloat(r.potentiel) || 0,
        score_moyen: r.score_moyen
      })),
      by_product: byProductResult.rows.map(r => ({
        product: r.product_target,
        count: parseInt(r.count, 10),
        potentiel: parseFloat(r.potentiel) || 0
      }))
    })
  } catch (err) {
    logger.error({ error: err.message }, 'GET /api/opportunites/stats error')
    res.status(500).json({ error: 'Erreur serveur', details: err.message })
  }
})

// =============================================================================
// GET /api/opportunites/:id — Détail d'une opportunité
// =============================================================================

router.get('/:id', async (req, res) => {
  try {
    const brokerId = req.user.id
    const oppoId = parseInt(req.params.id, 10)

    const result = await pool.query(`
      SELECT 
        o.*,
        c.first_name AS client_first_name, c.last_name AS client_last_name,
        c.company_name AS client_company, c.email AS client_email, c.phone AS client_phone,
        c.type AS client_type, c.lifetime_value
      FROM opportunites o
      LEFT JOIN clients c ON o.client_id = c.id
      WHERE o.id = $1 AND o.broker_id = $2
    `, [oppoId, brokerId])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Opportunité non trouvée' })
    }

    const row = result.rows[0]

    // Récupérer les contrats actuels du client
    const contratsRes = await pool.query(`
      SELECT id, product_type, premium, status, start_date, end_date
      FROM quotes WHERE client_id = $1 AND broker_id = $2
      ORDER BY start_date DESC
    `, [row.client_id, brokerId])

    res.json({
      opportunite: {
        id: row.id,
        client_id: row.client_id,
        client: {
          name: row.client_company || `${row.client_first_name || ''} ${row.client_last_name || ''}`.trim(),
          email: row.client_email,
          phone: row.client_phone,
          type: row.client_type,
          lifetime_value: parseFloat(row.lifetime_value) || 0
        },
        type: row.type,
        product_current: row.product_current,
        product_target: row.product_target,
        score: row.score,
        estimated_revenue: parseFloat(row.estimated_revenue) || 0,
        status: row.status,
        reasoning: row.reasoning,
        suggested_action: row.suggested_action,
        detected_at: row.detected_at,
        contacted_at: row.contacted_at,
        converted_at: row.converted_at,
        metadata: row.metadata || {}
      },
      contrats_actuels: contratsRes.rows.map(c => ({
        id: c.id,
        product_type: c.product_type,
        premium: parseFloat(c.premium) || 0,
        status: c.status,
        start_date: c.start_date,
        end_date: c.end_date
      }))
    })
  } catch (err) {
    logger.error({ error: err.message }, 'GET /api/opportunites/:id error')
    res.status(500).json({ error: 'Erreur serveur', details: err.message })
  }
})

// =============================================================================
// PUT /api/opportunites/:id — Modifier statut
// =============================================================================

router.put('/:id', async (req, res) => {
  try {
    const brokerId = req.user.id
    const oppoId = parseInt(req.params.id, 10)
    const { status, metadata, quote_request_id } = req.body

    // Vérifier appartenance
    const check = await pool.query('SELECT id, status FROM opportunites WHERE id = $1 AND broker_id = $2', [oppoId, brokerId])
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Opportunité non trouvée' })
    }

    const updates = []
    const params = []
    let paramIndex = 1

    if (status !== undefined) {
      updates.push(`status = $${paramIndex++}`)
      params.push(status)
      
      // Mettre à jour les timestamps selon le nouveau statut
      if (status === 'contacted' && check.rows[0].status === 'detected') {
        updates.push('contacted_at = NOW()')
      } else if (status === 'converted') {
        updates.push('converted_at = NOW()')
      }
    }
    if (quote_request_id !== undefined) {
      updates.push(`quote_request_id = $${paramIndex++}`)
      params.push(quote_request_id)
    }
    if (metadata !== undefined) {
      updates.push(`metadata = COALESCE(metadata, '{}') || $${paramIndex++}`)
      params.push(metadata)
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Aucune modification fournie' })
    }

    params.push(oppoId, brokerId)
    const result = await pool.query(`
      UPDATE opportunites SET ${updates.join(', ')}
      WHERE id = $${paramIndex++} AND broker_id = $${paramIndex}
      RETURNING *
    `, params)

    res.json({ success: true, opportunite: result.rows[0] })
  } catch (err) {
    logger.error({ error: err.message }, 'PUT /api/opportunites/:id error')
    res.status(500).json({ error: 'Erreur serveur', details: err.message })
  }
})

// =============================================================================
// DELETE /api/opportunites/:id — Supprimer
// =============================================================================

router.delete('/:id', async (req, res) => {
  try {
    const brokerId = req.user.id
    const oppoId = parseInt(req.params.id, 10)

    const result = await pool.query(
      'DELETE FROM opportunites WHERE id = $1 AND broker_id = $2 RETURNING id',
      [oppoId, brokerId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Opportunité non trouvée' })
    }

    res.json({ success: true, deleted_id: oppoId })
  } catch (err) {
    logger.error({ error: err.message }, 'DELETE /api/opportunites/:id error')
    res.status(500).json({ error: 'Erreur serveur', details: err.message })
  }
})

// =============================================================================
// POST /api/opportunites/detect — ARK scanne et détecte opportunités
// =============================================================================

router.post('/detect', async (req, res) => {
  try {
    const brokerId = req.user.id
    const { max_opportunites = 20, force_rescan = false } = req.body

    // Récupérer le portefeuille complet
    // 1. Clients avec leurs contrats actuels
    const clientsRes = await pool.query(`
      SELECT c.id, c.first_name, c.last_name, c.company_name, c.type,
             c.lifetime_value, c.risk_score, c.silent_alert,
             ARRAY_AGG(DISTINCT q.product_type) FILTER (WHERE q.product_type IS NOT NULL) AS products,
             SUM(q.premium) AS total_premium,
             COUNT(q.id) AS contracts_count,
             MAX(q.end_date) AS next_renewal
      FROM clients c
      LEFT JOIN quotes q ON q.client_id = c.id AND q.status = 'active' AND q.broker_id = $1
      WHERE c.id IN (SELECT DISTINCT client_id FROM quotes WHERE broker_id = $1)
      GROUP BY c.id
      ORDER BY c.lifetime_value DESC NULLS LAST
      LIMIT 100
    `, [brokerId])

    // 2. Clients mono-produit (opportunité cross-sell évidente)
    const monoProduitRes = await pool.query(`
      SELECT c.id, c.first_name, c.last_name, c.company_name, c.type,
             q.product_type, q.premium
      FROM clients c
      JOIN quotes q ON q.client_id = c.id AND q.broker_id = $1 AND q.status = 'active'
      GROUP BY c.id, q.product_type, q.premium
      HAVING COUNT(DISTINCT q.product_type) = 1
      LIMIT 50
    `, [brokerId])

    // 3. Opportunités déjà détectées (pour éviter doublons)
    const existingRes = await pool.query(`
      SELECT client_id, product_target FROM opportunites
      WHERE broker_id = $1 AND status = 'detected'
    `, [brokerId])
    const existingSet = new Set(existingRes.rows.map(r => `${r.client_id}_${r.product_target}`))

    // Appel ARK pour analyse
    const arkResponse = await callArkStructured({
      system: `Tu es ARK, assistant IA expert en assurance pour courtiers.
Tu dois analyser le portefeuille et détecter les opportunités commerciales:
- Cross-sell: Vendre un produit complémentaire
- Upsell: Améliorer une couverture existante
- Renouvellement: Renouveler un contrat arrivant à échéance
- Reconquête: Réactiver un client silencieux ou à risque
- Mono-produit: Client avec un seul contrat = fort potentiel multi-équipement

Score chaque opportunité de 0 à 100 (confiance).
Estime le revenu potentiel annuel en euros.
Suggère l'action concrète à mener.`,
      user: `Analyse ce portefeuille et détecte jusqu'à ${max_opportunites} opportunités:

CLIENTS ET LEURS CONTRATS (${clientsRes.rows.length}):
${clientsRes.rows.slice(0, 50).map(c => 
  `- ID ${c.id}: ${c.company_name || `${c.first_name} ${c.last_name}`} (${c.type || 'particulier'})
   Produits: ${(c.products || []).join(', ') || 'aucun actif'}
   Primes: ${c.total_premium || 0}€ | LTV: ${c.lifetime_value || 0}€
   Proch. renouvellement: ${c.next_renewal || 'N/A'}
   ${c.silent_alert ? '⚠️ Alerte silence' : ''} | Risque: ${c.risk_score || 50}`
).join('\n')}

CLIENTS MONO-PRODUIT (${monoProduitRes.rows.length}):
${monoProduitRes.rows.slice(0, 30).map(c =>
  `- ID ${c.id}: ${c.company_name || `${c.first_name} ${c.last_name}`} - Seul produit: ${c.product_type} (${c.premium}€)`
).join('\n')}

Détecte les meilleures opportunités commerciales.`,
      schema: SCHEMA_DETECT,
      context: {
        clients_count: clientsRes.rows.length,
        mono_produit_count: monoProduitRes.rows.length
      },
      userId: brokerId,
      route: 'opportunites-detect'
    })

    // Insérer les opportunités détectées
    const insertedOppos = []
    const oppos = arkResponse.structured?.opportunites || []

    for (const opp of oppos.slice(0, max_opportunites)) {
      // Vérifier doublon
      const key = `${opp.client_id}_${opp.product_target}`
      if (!force_rescan && existingSet.has(key)) continue

      // Vérifier que le client appartient au courtier
      const clientCheck = await pool.query(`
        SELECT c.id FROM clients c
        JOIN quotes q ON q.client_id = c.id
        WHERE c.id = $1 AND q.broker_id = $2
        LIMIT 1
      `, [opp.client_id, brokerId])

      if (clientCheck.rows.length === 0) continue

      // Supprimer l'ancienne opportunité si force_rescan
      if (force_rescan) {
        await pool.query(`
          DELETE FROM opportunites WHERE broker_id = $1 AND client_id = $2 
            AND product_target = $3 AND status = 'detected'
        `, [brokerId, opp.client_id, opp.product_target])
      }

      const insertRes = await pool.query(`
        INSERT INTO opportunites (
          broker_id, client_id, type, product_current, product_target,
          score, estimated_revenue, reasoning, suggested_action, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `, [
        brokerId,
        opp.client_id,
        opp.type,
        opp.product_current || null,
        opp.product_target,
        opp.score || 50,
        opp.estimated_revenue || 0,
        opp.reasoning,
        opp.suggested_action || null,
        { ark_detected: true, detected_version: new Date().toISOString() }
      ])

      insertedOppos.push(insertRes.rows[0])
    }

    logger.info({ brokerId, detected: insertedOppos.length }, 'Opportunites detected')

    res.json({
      success: true,
      detected: insertedOppos.length,
      opportunites: insertedOppos,
      potentiel_total: arkResponse.structured?.potentiel_total || insertedOppos.reduce((s, o) => s + parseFloat(o.estimated_revenue || 0), 0),
      analyse: arkResponse.structured?.analyse_portefeuille || null,
      tendances: arkResponse.structured?.tendances || [],
      usage: arkResponse.usage,
      model: arkResponse.model
    })
  } catch (err) {
    logger.error({ error: err.message }, 'POST /api/opportunites/detect error')
    res.status(500).json({ error: 'Erreur ARK', details: err.message })
  }
})

// =============================================================================
// POST /api/opportunites/:id/ai-pitch — ARK génère argumentaire
// =============================================================================

router.post('/:id/ai-pitch', async (req, res) => {
  try {
    const brokerId = req.user.id
    const oppoId = parseInt(req.params.id, 10)

    // Récupérer l'opportunité avec infos complètes
    const oppoRes = await pool.query(`
      SELECT o.*, c.first_name, c.last_name, c.company_name, c.type AS client_type,
             c.city, c.siret, c.lifetime_value
      FROM opportunites o
      LEFT JOIN clients c ON o.client_id = c.id
      WHERE o.id = $1 AND o.broker_id = $2
    `, [oppoId, brokerId])

    if (oppoRes.rows.length === 0) {
      return res.status(404).json({ error: 'Opportunité non trouvée' })
    }

    const opp = oppoRes.rows[0]
    const clientName = opp.company_name || `${opp.first_name || ''} ${opp.last_name || ''}`.trim()

    // Récupérer contrats actuels
    const contratsRes = await pool.query(`
      SELECT product_type, premium, start_date FROM quotes
      WHERE client_id = $1 AND broker_id = $2 AND status = 'active'
    `, [opp.client_id, brokerId])

    const arkResponse = await callArkStructured({
      system: `Tu es ARK, assistant IA expert en assurance pour courtiers.
Tu dois générer un argumentaire de vente personnalisé et complet.
L'argumentaire doit être persuasif, adapté au profil du client, et anticiper les objections.
Fournis des questions de découverte pour engager la conversation.`,
      user: `Génère un argumentaire commercial pour cette opportunité:

CLIENT: ${clientName}
Type: ${opp.client_type || 'particulier'}
${opp.city ? `Ville: ${opp.city}` : ''}
${opp.siret ? `SIRET: ${opp.siret} (professionnel)` : ''}
Valeur client: ${opp.lifetime_value || 0}€

OPPORTUNITÉ:
Type: ${opp.type}
Produit actuel: ${opp.product_current || 'N/A'}
Produit cible: ${opp.product_target}
Score confiance: ${opp.score}%
Potentiel: ${opp.estimated_revenue}€/an
Analyse: ${opp.reasoning}
Action suggérée: ${opp.suggested_action || 'Contacter'}

CONTRATS ACTUELS:
${contratsRes.rows.map(c => `- ${c.product_type}: ${c.premium}€ (depuis ${c.start_date})`).join('\n') || 'Aucun contrat actif'}

Génère un argumentaire complet avec objections anticipées.`,
      schema: SCHEMA_PITCH,
      context: {
        opportunite_type: opp.type,
        product_target: opp.product_target,
        client_type: opp.client_type,
        score: opp.score
      },
      userId: brokerId,
      clientId: opp.client_id,
      route: 'opportunites-ai-pitch'
    })

    // Sauvegarder dans metadata
    await pool.query(`
      UPDATE opportunites 
      SET metadata = COALESCE(metadata, '{}') || $1
      WHERE id = $2
    `, [{ ai_pitch: arkResponse.structured, ai_pitch_at: new Date().toISOString() }, oppoId])

    res.json({
      success: true,
      pitch: arkResponse.structured,
      opportunite: {
        id: opp.id,
        client_name: clientName,
        product_target: opp.product_target,
        score: opp.score,
        estimated_revenue: parseFloat(opp.estimated_revenue) || 0
      },
      usage: arkResponse.usage,
      model: arkResponse.model
    })
  } catch (err) {
    logger.error({ error: err.message }, 'POST /api/opportunites/:id/ai-pitch error')
    res.status(500).json({ error: 'Erreur ARK', details: err.message })
  }
})

module.exports = router
