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
const porteeCabinet = require('../lib/porteeCabinet')

// ─────────────────────────────────────────────────────────────────────────────
// PORTÉE DES OPPORTUNITÉS : LE CABINET
//
// POURQUOI : `opportunites.broker_id` était comparé à l'utilisateur connecté —
// un collaborateur invité ne voyait donc AUCUNE opportunité du cabinet, ni la
// détection, ni les statistiques. La portée passe par `opportunites.cabinet_id`
// (migration 113) ; `broker_id` reste le courtier en charge de l'opportunité
// (affectation commerciale), et la détection continue de lui être attribuée.
// ─────────────────────────────────────────────────────────────────────────────

/** Portée SQL sur `opportunites` (propriétaire = broker_id). */
function filtreOpportunites(portee, { depart = 1, ecriture = false, alias = 'opportunites' } = {}) {
  return porteeCabinet.fragment(portee, {
    cabinet: `${alias}.cabinet_id`,
    proprietaire: `${alias}.broker_id`,
    depart,
    ecriture,
  })
}
const router = express.Router()
const pool = require('../db')
const { callArkStructured } = require('../services/arkEngine')
const logger = require('../lib/logger')
const {
  resultatIaVide,
  estErreurIa,
  repondreIaNonConfiguree,
  repondreIaIndisponible,
} = require('../services/iaErreurs')
const { potentielDepuisDonneesReelles } = require('../lib/donneesReelles')

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
          // AUCUN montant demandé au modèle : un « revenu potentiel » estimé par
          // un LLM est une invention, pas une donnée (IA-011).
          reasoning: { type: 'string' },
          suggested_action: { type: 'string' }
        },
        required: ['client_id', 'type', 'product_target', 'score', 'reasoning']
      }
    },
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
    const portee = await porteeCabinet.resoudrePortee(pool, req)
    const { status, type, score_min, limit = 50, offset = 0 } = req.query

    const f = filtreOpportunites(portee, { depart: 1, alias: 'o' })
    let sql = `
      SELECT 
        o.*,
        c.first_name AS client_first_name, c.last_name AS client_last_name,
        c.company_name AS client_company, c.email AS client_email, c.type AS client_type
      FROM opportunites o
      LEFT JOIN clients c ON o.client_id = c.id
      WHERE ${f.sql}
    `
    const params = [...f.params]
    let paramIndex = f.suivant

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

    sql += ` ORDER BY o.score DESC NULLS LAST, o.estimated_revenue DESC NULLS LAST, o.detected_at DESC
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
        // Aucun montant : les 'estimated_revenue' historiques ont été produits
        // par un modèle de langage (invention) et aucun calcul sur données
        // réelles ne les remplace encore. On renvoie null — l'écran affiche
        // « — » — plutôt qu'un revenu présenté comme réel.
        estimated_revenue: null,
        estimated_revenue_disponible: false,
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
    const portee = await porteeCabinet.resoudrePortee(pool, req)
    const fStats = filtreOpportunites(portee, { depart: 1 })

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
      FROM opportunites WHERE ${fStats.sql}
    `, [...fStats.params])

    // Par type
    const byTypeResult = await pool.query(`
      SELECT type, COUNT(*) AS count, SUM(estimated_revenue) AS potentiel,
             AVG(score)::INTEGER AS score_moyen
      FROM opportunites WHERE ${fStats.sql} AND status = 'detected'
      GROUP BY type ORDER BY count DESC
    `, [...fStats.params])

    // Par produit cible
    const byProductResult = await pool.query(`
      SELECT product_target, COUNT(*) AS count, SUM(estimated_revenue) AS potentiel
      FROM opportunites WHERE ${fStats.sql} AND status = 'detected'
      GROUP BY product_target ORDER BY potentiel DESC NULLS LAST
      LIMIT 10
    `, [...fStats.params])

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
        // Un « potentiel » monétaire ne peut pas être sommé tant qu'il provient
        // d'estimations de modèle : on renvoie null (affiché « — »), jamais un
        // total inventé présenté comme un revenu.
        potentiel_detecte: null,
        revenus_convertis: null,
        estimation_monetaire: 'non_disponible',
        score_moyen: Math.round(parseFloat(stats.score_moyen) || 0)
      },
      taux_conversion: tauxConversion,
      by_type: byTypeResult.rows.map(r => ({
        type: r.type,
        count: parseInt(r.count, 10),
        potentiel: null,
        score_moyen: r.score_moyen
      })),
      by_product: byProductResult.rows.map(r => ({
        product: r.product_target,
        count: parseInt(r.count, 10),
        potentiel: null
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
    const portee = await porteeCabinet.resoudrePortee(pool, req)
    const oppoId = parseInt(req.params.id, 10)
    const f = filtreOpportunites(portee, { depart: 2, alias: 'o' })

    const result = await pool.query(`
      SELECT 
        o.*,
        c.first_name AS client_first_name, c.last_name AS client_last_name,
        c.company_name AS client_company, c.email AS client_email, c.phone AS client_phone,
        c.type AS client_type, c.lifetime_value
      FROM opportunites o
      LEFT JOIN clients c ON o.client_id = c.id
      WHERE o.id = $1 AND ${f.sql}
    `, [oppoId, ...f.params])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Opportunité non trouvée' })
    }

    const row = result.rows[0]

    // Récupérer les contrats actuels du client (portée cabinet sur le client)
    const fClient = porteeCabinet.fragment(portee, {
      cabinet: 'clients.cabinet_id',
      proprietaire: 'clients.courtier_id',
      depart: 2,
    })
    const contratsRes = await pool.query(`
      SELECT q.id, q.product_type, q.premium, q.status, q.start_date, q.end_date
      FROM quotes q
      JOIN clients c ON c.id = q.client_id AND ${fClient.sql}
      WHERE q.client_id = $1
      ORDER BY q.start_date DESC
    `, [row.client_id, ...fClient.params])

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
        // Aucun montant inventé : voir GET /api/opportunites.
        estimated_revenue: null,
        estimated_revenue_disponible: false,
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
    const portee = await porteeCabinet.resoudrePortee(pool, req)
    if (porteeCabinet.refuserEcriture(portee, res, 'modifier une opportunité')) return
    const oppoId = parseInt(req.params.id, 10)
    const { status, metadata, quote_request_id } = req.body

    // Vérifier appartenance (portée CABINET)
    const fCheck = filtreOpportunites(portee, { depart: 2, ecriture: true })
    const check = await pool.query(
      `SELECT id, status FROM opportunites WHERE id = $1 AND ${fCheck.sql}`,
      [oppoId, ...fCheck.params]
    )
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

    const fEcriture = filtreOpportunites(portee, { depart: paramIndex + 1, ecriture: true })
    const indexId = paramIndex
    params.push(oppoId, ...fEcriture.params)
    const result = await pool.query(`
      UPDATE opportunites SET ${updates.join(', ')}
      WHERE id = $${indexId} AND ${fEcriture.sql}
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
    const portee = await porteeCabinet.resoudrePortee(pool, req)
    if (porteeCabinet.refuserSuppression(portee, res)) return
    const oppoId = parseInt(req.params.id, 10)
    const f = filtreOpportunites(portee, { depart: 2, ecriture: true })

    const result = await pool.query(
      `DELETE FROM opportunites WHERE id = $1 AND ${f.sql} RETURNING id`,
      [oppoId, ...f.params]
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
    const portee = await porteeCabinet.resoudrePortee(pool, req)
    if (porteeCabinet.refuserEcriture(portee, res, 'détecter des opportunités')) return
    const brokerId = portee.userId || req.user.id
    const { max_opportunites = 20, force_rescan = false } = req.body
    // Portée CABINET sur les clients analysés (les contrats suivent leur client).
    const fClients = porteeCabinet.fragment(portee, {
      cabinet: 'c.cabinet_id',
      proprietaire: 'c.courtier_id',
      depart: 1,
      ecriture: true,
    })

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
      LEFT JOIN quotes q ON q.client_id = c.id AND q.status = 'active'
      WHERE ${fClients.sql}
      GROUP BY c.id
      ORDER BY c.lifetime_value DESC NULLS LAST
      LIMIT 100
    `, [...fClients.params])

    // 2. Clients mono-produit (opportunité cross-sell évidente)
    const monoProduitRes = await pool.query(`
      SELECT c.id, c.first_name, c.last_name, c.company_name, c.type,
             q.product_type, q.premium
      FROM clients c
      JOIN quotes q ON q.client_id = c.id AND q.status = 'active'
      WHERE ${fClients.sql}
      GROUP BY c.id, q.product_type, q.premium
      HAVING COUNT(DISTINCT q.product_type) = 1
      LIMIT 50
    `, [...fClients.params])

    // 3. Opportunités déjà détectées (pour éviter doublons) — portée CABINET
    const fOppo = filtreOpportunites(portee, { depart: 1 })
    const existingRes = await pool.query(`
      SELECT client_id, product_target FROM opportunites
      WHERE ${fOppo.sql} AND status = 'detected'
    `, [...fOppo.params])
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
N'ESTIME AUCUN MONTANT en euros : aucun revenu, aucune prime, aucune valeur
potentielle. Ces chiffres seraient inventés et présentés comme réels.
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

    // IA absente ou réponse vide : la route ne doit pas répondre `success: true`
    // avec « 0 opportunité détectée », ce qui se lisait comme un portefeuille
    // sans opportunité. Motif de ark.js : 503 configuration_required.
    if (resultatIaVide(arkResponse) || !Array.isArray(arkResponse.structured?.opportunites)) {
      return repondreIaNonConfiguree(
        res,
        { route: 'opportunites-detect' },
        "La détection d'opportunités par l'IA est indisponible : aucun moteur IA n'a répondu. Rien n'a été analysé."
      )
    }

    // Insérer les opportunités détectées
    const insertedOppos = []
    const oppos = arkResponse.structured?.opportunites || []

    for (const opp of oppos.slice(0, max_opportunites)) {
      // Vérifier doublon
      const key = `${opp.client_id}_${opp.product_target}`
      if (!force_rescan && existingSet.has(key)) continue

      // Vérifier que le client appartient AU CABINET
      const fClient = porteeCabinet.fragment(portee, {
        cabinet: 'clients.cabinet_id',
        proprietaire: 'clients.courtier_id',
        depart: 2,
        ecriture: true,
      })
      const clientCheck = await pool.query(`
        SELECT id FROM clients WHERE id = $1 AND ${fClient.sql}
        LIMIT 1
      `, [opp.client_id, ...fClient.params])

      if (clientCheck.rows.length === 0) continue

      // Supprimer l'ancienne opportunité si force_rescan (portée cabinet)
      if (force_rescan) {
        const fAncienne = filtreOpportunites(portee, { depart: 3, ecriture: true })
        await pool.query(`
          DELETE FROM opportunites WHERE client_id = $1
            AND product_target = $2 AND status = 'detected' AND ${fAncienne.sql}
        `, [opp.client_id, opp.product_target, ...fAncienne.params])
      }

      const insertRes = await pool.query(`
        INSERT INTO opportunites (
          broker_id, client_id, type, product_current, product_target,
          score, estimated_revenue, reasoning, suggested_action, metadata, cabinet_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `, [
        brokerId,
        opp.client_id,
        opp.type,
        opp.product_current || null,
        opp.product_target,
        Number.isFinite(Number(opp.score)) ? Number(opp.score) : null,
        // Aucune estimation monétaire n'est acceptée d'un modèle de langage :
        // le potentiel reste NULL tant qu'il n'est pas recalculable depuis des
        // enregistrements réels (quotes / quote_results). L'écran affiche
        // alors « — » au lieu d'un revenu inventé, et les KPI ne somment rien.
        potentielDepuisDonneesReelles(null),
        opp.reasoning,
        opp.suggested_action || null,
        { ark_detected: true, detected_version: new Date().toISOString(), estimation_monetaire: 'non_disponible' },
        porteeCabinet.cabinetPourCreation(portee)
      ])

      insertedOppos.push(insertRes.rows[0])
    }

    logger.info({ brokerId, detected: insertedOppos.length }, 'Opportunites detected')

    res.json({
      success: true,
      detected: insertedOppos.length,
      opportunites: insertedOppos,
      // Aucun « potentiel total » : il faudrait additionner des montants
      // inventés. Tant qu'aucune donnée réelle ne l'alimente, on renvoie null.
      potentiel_total: null,
      estimation_monetaire: 'non_disponible',
      analyse: arkResponse.structured?.analyse_portefeuille || null,
      tendances: arkResponse.structured?.tendances || [],
      usage: arkResponse.usage,
      model: arkResponse.model
    })
  } catch (err) {
    logger.error({ error: err.message }, 'POST /api/opportunites/detect error')
    if (estErreurIa(err)) {
      return repondreIaIndisponible(res, err, { route: 'opportunites-detect' })
    }
    res.status(500).json({ error: 'Erreur ARK', details: err.message })
  }
})

// =============================================================================
// POST /api/opportunites/:id/ai-pitch — ARK génère argumentaire
// =============================================================================

router.post('/:id/ai-pitch', async (req, res) => {
  try {
    const portee = await porteeCabinet.resoudrePortee(pool, req)
    const brokerId = portee.userId || req.user.id
    const oppoId = parseInt(req.params.id, 10)
    const fOppo = filtreOpportunites(portee, { depart: 2, alias: 'o' })

    // Récupérer l'opportunité avec infos complètes
    const oppoRes = await pool.query(`
      SELECT o.*, c.first_name, c.last_name, c.company_name, c.type AS client_type,
             c.city, c.siret, c.lifetime_value
      FROM opportunites o
      LEFT JOIN clients c ON o.client_id = c.id
      WHERE o.id = $1 AND ${fOppo.sql}
    `, [oppoId, ...fOppo.params])

    if (oppoRes.rows.length === 0) {
      return res.status(404).json({ error: 'Opportunité non trouvée' })
    }

    const opp = oppoRes.rows[0]
    const clientName = opp.company_name || `${opp.first_name || ''} ${opp.last_name || ''}`.trim()

    // Récupérer contrats actuels (portée cabinet sur le client)
    const fClient = porteeCabinet.fragment(portee, {
      cabinet: 'clients.cabinet_id',
      proprietaire: 'clients.courtier_id',
      depart: 2,
    })
    const contratsRes = await pool.query(`
      SELECT q.product_type, q.premium, q.start_date FROM quotes q
      JOIN clients c ON c.id = q.client_id AND ${fClient.sql}
      WHERE q.client_id = $1 AND q.status = 'active'
    `, [opp.client_id, ...fClient.params])

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
${opp.estimated_revenue ? `Potentiel: ${opp.estimated_revenue}€/an` : 'Potentiel monétaire: non calculé (ne pas en inventer)'}
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

    // IA absente ou argumentaire vide : ne pas enregistrer de pitch vide ni
    // répondre `success: true` sans contenu.
    if (resultatIaVide(arkResponse) || !arkResponse.structured?.accroche) {
      return repondreIaNonConfiguree(
        res,
        { route: 'opportunites-ai-pitch' },
        "La génération d'argumentaire par l'IA est indisponible : aucun moteur IA n'a répondu."
      )
    }

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
        estimated_revenue: null
      },
      usage: arkResponse.usage,
      model: arkResponse.model
    })
  } catch (err) {
    logger.error({ error: err.message }, 'POST /api/opportunites/:id/ai-pitch error')
    if (estErreurIa(err)) {
      return repondreIaIndisponible(res, err, { route: 'opportunites-ai-pitch' })
    }
    res.status(500).json({ error: 'Erreur ARK', details: err.message })
  }
})

module.exports = router
