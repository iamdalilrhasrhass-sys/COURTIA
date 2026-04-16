/**
 * analytics.js — Routes Analytics avancées
 * GET /executive    → requireFeature('executive_dashboard')
 * GET /compliance   → requireFeature('compliance_dashboard')
 * GET /lead-scoring → requireFeature('lead_scoring')
 * GET /benchmarks   → requireFeature('benchmarks')
 */

const express = require('express')
const router = express.Router()
const pool = require('../db')
const { verifyToken } = require('../middleware/auth')
const { requireFeature } = require('../middleware/planGuard')

router.use(verifyToken)

// GET /api/analytics/executive — KPIs exécutifs
router.get('/executive', requireFeature('executive_dashboard'), async (req, res) => {
  try {
    const courtier_id = req.user.userId

    // CA estimé (somme des primes annuelles des devis actifs / contrats en cours)
    const caResult = await pool.query(
      `SELECT COALESCE(SUM(annual_premium), 0) AS ca_estimated
       FROM quotes
       WHERE courtier_id = $1 AND status = 'active'`,
      [courtier_id]
    )

    // Nombre de clients
    const clientsResult = await pool.query(
      'SELECT COUNT(*) AS clients_count FROM clients WHERE courtier_id = $1',
      [courtier_id]
    )

    // Nombre de contrats (via quotes JOIN clients)
    const contratsResult = await pool.query(
      `SELECT COUNT(*) AS contracts_count
       FROM quotes q
       JOIN clients c ON q.client_id = c.id
       WHERE c.courtier_id = $1`,
      [courtier_id]
    )

    // Nouveaux clients sur 30 jours
    const newClients30dResult = await pool.query(
      `SELECT COUNT(*) AS new_clients_30d
       FROM clients
       WHERE courtier_id = $1 AND created_at >= NOW() - INTERVAL '30 days'`,
      [courtier_id]
    )

    // Nouveaux contrats sur 30 jours (via quotes JOIN clients)
    const newContracts30dResult = await pool.query(
      `SELECT COUNT(*) AS new_contracts_30d
       FROM quotes q
       JOIN clients c ON q.client_id = c.id
       WHERE c.courtier_id = $1 AND q.created_at >= NOW() - INTERVAL '30 days'`,
      [courtier_id]
    )

    // Portfolio health score (dernier depuis portfolio_insights)
    const portfolioResult = await pool.query(
      `SELECT health_score, created_at
       FROM portfolio_insights
       WHERE courtier_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [courtier_id]
    )

    // Taux de croissance 30 jours (clients)
    const prevClients30dResult = await pool.query(
      `SELECT COUNT(*) AS prev_clients_30d
       FROM clients
       WHERE courtier_id = $1
         AND created_at >= NOW() - INTERVAL '60 days'
         AND created_at < NOW() - INTERVAL '30 days'`,
      [courtier_id]
    )

    const clients_count = parseInt(clientsResult.rows[0].clients_count, 10)
    const new_clients_30d = parseInt(newClients30dResult.rows[0].new_clients_30d, 10)
    const prev_clients_30d = parseInt(prevClients30dResult.rows[0].prev_clients_30d, 10)

    let growth_rate_30d = null
    if (prev_clients_30d > 0) {
      growth_rate_30d = Math.round(((new_clients_30d - prev_clients_30d) / prev_clients_30d) * 100)
    }

    return res.json({
      success: true,
      data: {
        ca_estimated: parseFloat(caResult.rows[0].ca_estimated) || 0,
        clients_count,
        contracts_count: parseInt(contratsResult.rows[0].contracts_count, 10),
        new_clients_30d,
        new_contracts_30d: parseInt(newContracts30dResult.rows[0].new_contracts_30d, 10),
        portfolio_health_score: portfolioResult.rows.length > 0
          ? portfolioResult.rows[0].health_score
          : null,
        growth_rate_30d
      }
    })
  } catch (err) {
    console.error('[GET /api/analytics/executive]', err.message)
    return res.status(500).json({ error: 'server_error', message: err.message })
  }
})

// GET /api/analytics/compliance — tableau de bord conformité
router.get('/compliance', requireFeature('compliance_dashboard'), async (req, res) => {
  try {
    const courtier_id = req.user.userId

    // DDA Quiz : dernière tentative réussie
    const ddaResult = await pool.query(
      `SELECT passed, completed_at
       FROM dda_quiz_attempts
       WHERE user_id = $1 AND passed = TRUE
       ORDER BY completed_at DESC
       LIMIT 1`,
      [courtier_id]
    )

    const dda_quiz_completed = ddaResult.rows.length > 0
    const dda_last_pass = ddaResult.rows.length > 0 ? ddaResult.rows[0].completed_at : null
    // Certificat expire 1 an après la réussite
    const dda_certificate_expires_at = dda_last_pass
      ? new Date(new Date(dda_last_pass).getTime() + 365 * 24 * 60 * 60 * 1000).toISOString()
      : null

    // % clients avec fiche complète (email + phone + adresse)
    const clientsTotal = await pool.query(
      'SELECT COUNT(*) AS total FROM clients WHERE courtier_id = $1',
      [courtier_id]
    )
    const clientsComplete = await pool.query(
      `SELECT COUNT(*) AS complete
       FROM clients
       WHERE courtier_id = $1
         AND email IS NOT NULL AND email != ''
         AND phone IS NOT NULL AND phone != ''`,
      [courtier_id]
    )

    const total = parseInt(clientsTotal.rows[0].total, 10)
    const complete = parseInt(clientsComplete.rows[0].complete, 10)
    const clients_complete_fiches_pct = total > 0 ? Math.round((complete / total) * 100) : 0

    // % clients contactés récemment (activité dans les 90 jours)
    const clientsRecent = await pool.query(
      `SELECT COUNT(DISTINCT t.client_id) AS recent
       FROM taches t
       JOIN clients c ON t.client_id = c.id
       WHERE c.courtier_id = $1
         AND t.created_at >= NOW() - INTERVAL '90 days'`,
      [courtier_id]
    )
    const recent = parseInt(clientsRecent.rows[0].recent, 10)
    const clients_with_recent_contact_pct = total > 0 ? Math.round((recent / total) * 100) : 0

    // Score de risque (simple : 100 - moyenne des %s de conformité)
    const risk_score = Math.max(
      0,
      100 - Math.round((clients_complete_fiches_pct + clients_with_recent_contact_pct) / 2)
    )

    return res.json({
      success: true,
      data: {
        dda_quiz_completed,
        dda_certificate_expires_at,
        clients_complete_fiches_pct,
        clients_with_recent_contact_pct,
        risk_score
      }
    })
  } catch (err) {
    console.error('[GET /api/analytics/compliance]', err.message)
    return res.status(500).json({ error: 'server_error', message: err.message })
  }
})

// GET /api/analytics/lead-scoring — clients triés par score
router.get('/lead-scoring', requireFeature('lead_scoring'), async (req, res) => {
  try {
    const courtier_id = req.user.userId

    const result = await pool.query(
      `SELECT c.id, c.first_name, c.last_name, c.lead_score
       FROM clients c
       WHERE c.courtier_id = $1
       ORDER BY c.lead_score DESC NULLS LAST
       LIMIT 100`,
      [courtier_id]
    )

    return res.json({ success: true, data: result.rows })
  } catch (err) {
    console.error('[GET /api/analytics/lead-scoring]', err.message)
    return res.status(500).json({ error: 'server_error', message: err.message })
  }
})

// GET /api/analytics/benchmarks — comparaison sectorielle
router.get('/benchmarks', requireFeature('benchmarks'), async (req, res) => {
  try {
    const courtier_id = req.user.userId

    // Récupérer le score du courtier depuis portfolio_insights
    const myInsights = await pool.query(
      `SELECT health_score, created_at
       FROM portfolio_insights
       WHERE courtier_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [courtier_id]
    )

    // Récupérer les benchmarks depuis benchmarks_cache (colonnes réelles)
    const benchmarksResult = await pool.query(
      'SELECT metric_key, label, percentile_25, percentile_50, percentile_75 FROM benchmarks_cache ORDER BY metric_key'
    )

    const my_health_score = myInsights.rows.length > 0 ? myInsights.rows[0].health_score : null

    // Construire les données de benchmark
    const benchmarks = benchmarksResult.rows.map(b => {
      let my_value = null
      let my_percentile = null
      let comparison = null

      // Pour la métrique health_score, utiliser la valeur du courtier
      if (b.metric_key === 'health_score' && my_health_score !== null) {
        my_value = my_health_score
        if (b.percentile_50 !== null) {
          if (my_value >= (b.percentile_75 || Infinity)) comparison = 'top_tier'
          else if (my_value >= b.percentile_50) comparison = 'above_median'
          else if (my_value >= (b.percentile_25 || -Infinity)) comparison = 'at_median'
          else comparison = 'below_median'

          const range = (b.percentile_75 || b.percentile_50) - (b.percentile_25 || 0)
          my_percentile = range > 0
            ? Math.min(100, Math.round(((my_value - (b.percentile_25 || 0)) / range) * 100))
            : 50
        }
      }

      return {
        metric: b.metric_key,
        my_value,
        p25: b.percentile_25,
        p50: b.percentile_50,
        p75: b.percentile_75,
        my_percentile,
        comparison
      }
    })

    return res.json({
      success: true,
      data: {
        my_health_score,
        benchmarks,
        last_updated: myInsights.rows.length > 0 ? myInsights.rows[0].created_at : null
      }
    })
  } catch (err) {
    console.error('[GET /api/analytics/benchmarks]', err.message)
    return res.status(500).json({ error: 'server_error', message: err.message })
  }
})

module.exports = router
