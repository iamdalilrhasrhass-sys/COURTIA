/**
 * analytics.js — Routes Analytics avancées
 * GET /executive    → requireFeature('executive_dashboard')
 * GET /compliance   → requireFeature('compliance_dashboard')
 * GET /lead-scoring → requireFeature('lead_scoring')
 * GET /benchmarks   → requireFeature('benchmarks')
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LES CHIFFRES DE CET ÉCRAN VIENNENT DU MÊME BLOC QUE LES AUTRES
 *
 * POURQUOI : /api/analytics/executive comptait TOUTES les lignes de `quotes`
 * (dont les devis de l'époque) et annonçait donc 3 « contrats » là où
 * /api/dashboard/stats en annonçait 2 et /api/reporting/overview 0 (il lisait la
 * table `contracts`, jamais écrite). Les requêtes viennent désormais du bloc
 * unique de définitions de `dashboard.js` (`require('./dashboard').kpi`) :
 * contrat = `quotes` au statut 'actif', devis = `devis_wizard`, prime définie
 * une seule fois. Aucun écran ne peut plus répondre autre chose.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const express = require('express')
const router = express.Router()
const pool = require('../db')
const { verifyToken } = require('../middleware/auth')
const { requireFeature } = require('../middleware/planGuard')
const porteeCabinet = require('../lib/porteeCabinet')
const { kpi } = require('./dashboard')

router.use(verifyToken)

// GET /api/analytics/executive — KPIs exécutifs
router.get('/executive', requireFeature('executive_dashboard'), async (req, res) => {
  try {
    const portee = await porteeCabinet.resoudrePortee(pool, req)

    const qClients = kpi.requeteClients(portee, { jours: 30 })
    const qContrats = kpi.requeteContratsActifs(portee, { jours: 30 })
    const qDevis = kpi.requeteDevis(portee, { jours: 30 })

    const [clientsRes, contratsRes, devisRes, portfolioResult] = await Promise.all([
      pool.query(qClients.sql, qClients.params),
      pool.query(qContrats.sql, qContrats.params),
      pool.query(qDevis.sql, qDevis.params),
      pool.query(
        `SELECT health_score, created_at
         FROM portfolio_insights
         WHERE courtier_id = $1
         ORDER BY created_at DESC
         LIMIT 1`,
        [portee.userId]
      )
    ])

    const clients = clientsRes.rows[0] || {}
    const contrats = contratsRes.rows[0] || {}
    const devis = devisRes.rows[0] || {}

    const clients_count = parseInt(clients.total, 10) || 0
    const new_clients_30d = parseInt(clients.nouveaux, 10) || 0
    // Clients du portefeuille (hors prospects) : base du taux de croissance.
    const clients_actifs = parseInt(clients.actifs, 10) || 0
    const contrats_count = parseInt(contrats.total, 10) || 0

    // Taux de croissance 30 jours : nouveaux clients de la période rapportés aux
    // clients présents AVANT la période. Sans historique, aucune mesure possible
    // ⇒ null (l'ancien code comparait 30 j à 30 j et renvoyait parfois -100 %).
    const base = clients_count - new_clients_30d
    const growth_rate_30d = base > 0 ? Math.round((new_clients_30d / base) * 100) : null

    return res.json({
      success: true,
      definitions: {
        clients_count: 'toutes les lignes de `clients` du cabinet (prospects compris)',
        contracts_count: "lignes de `quotes` au statut 'actif' (la table `contracts` n'est jamais écrite)",
        devis_count: 'lignes de `devis_wizard` du cabinet (un devis n’est pas un contrat)',
        ca_estimated: 'somme des primes annuelles des contrats actifs (colonne prime_annuelle, sinon quote_data)',
      },
      data: {
        ca_estimated: parseFloat(contrats.prime_totale) || 0,
        // Champ dédié : contrats qui portaient réellement une prime.
        ca_contrats_avec_prime: parseInt(contrats.contrats_avec_prime, 10) || 0,
        clients_count,
        clients_actifs,
        clients_prospects: parseInt(clients.prospects, 10) || 0,
        contracts_count: contrats_count,
        new_clients_30d,
        new_contracts_30d: parseInt(contrats.nouveaux, 10) || 0,
        // Devis : mêmes chiffres que /api/dashboard/stats et /api/reporting/overview.
        devis_count: parseInt(devis.total, 10) || 0,
        devis_signes: parseInt(devis.signes, 10) || 0,
        devis_en_attente: parseInt(devis.envoyes, 10) || 0,
        devis_prime_totale: kpi.centsVersMontant(devis.prime_cents),
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
    const portee = await porteeCabinet.resoudrePortee(pool, req)
    const fCl = kpi.porteeClients(portee, { alias: 'c' })

    // DDA Quiz : dernière tentative réussie
    const ddaResult = await pool.query(
      `SELECT passed, completed_at
       FROM dda_quiz_attempts
       WHERE user_id = $1 AND passed = TRUE
       ORDER BY completed_at DESC
       LIMIT 1`,
      [portee.userId]
    )

    const dda_quiz_completed = ddaResult.rows.length > 0
    const dda_last_pass = ddaResult.rows.length > 0 ? ddaResult.rows[0].completed_at : null
    // Certificat expire 1 an après la réussite
    const dda_certificate_expires_at = dda_last_pass
      ? new Date(new Date(dda_last_pass).getTime() + 365 * 24 * 60 * 60 * 1000).toISOString()
      : null

    // % clients avec fiche complète (email + phone) — portée CABINET.
    const [clientsTotal, clientsComplete] = await Promise.all([
      pool.query(`SELECT COUNT(*)::int AS total FROM clients c WHERE ${fCl.sql}`, fCl.params),
      pool.query(
        `SELECT COUNT(*)::int AS complete
         FROM clients c
         WHERE ${fCl.sql}
           AND c.email IS NOT NULL AND c.email <> ''
           AND c.phone IS NOT NULL AND c.phone <> ''`,
        fCl.params
      ),
    ])

    const total = parseInt(clientsTotal.rows[0].total, 10) || 0
    const complete = parseInt(clientsComplete.rows[0].complete, 10) || 0

    // % clients avec une tâche créée dans les 90 jours.
    // CORRECTION 2026-09-20 : la requête lisait la table `taches`, que
    // l'application n'écrit JAMAIS (les tâches vivent dans `appointments`) :
    // l'indicateur valait donc toujours 0 % — un client « non contacté » pour
    // l'éternité, et un score de risque de conformité faussement bon.
    const clientsRecent = await pool.query(
      `SELECT COUNT(DISTINCT a.client_id)::int AS recent
       FROM appointments a
       JOIN clients c ON c.id = a.client_id
       WHERE ${fCl.sql}
         AND a.created_at >= NOW() - INTERVAL '90 days'`,
      fCl.params
    )
    const recent = parseInt(clientsRecent.rows[0].recent, 10) || 0

    // Taux sans dénominateur = pas de mesure ⇒ null (0 % afficherait « conforme »).
    const clients_complete_fiches_pct = total > 0 ? Math.round((complete / total) * 100) : null
    const clients_with_recent_contact_pct = total > 0 ? Math.round((recent / total) * 100) : null

    // Score de risque (100 - moyenne des deux taux). Sans clients, il n'y a rien
    // à auditer : null plutôt qu'un « 100 » rassurant et faux.
    const risk_score = (clients_complete_fiches_pct === null || clients_with_recent_contact_pct === null)
      ? null
      : Math.max(0, 100 - Math.round((clients_complete_fiches_pct + clients_with_recent_contact_pct) / 2))

    return res.json({
      success: true,
      data: {
        dda_quiz_completed,
        dda_certificate_expires_at,
        clients_total: total,
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
    const portee = await porteeCabinet.resoudrePortee(pool, req)
    const fCl = kpi.porteeClients(portee, { alias: 'c' })

    // Portée cabinet : le classement d'un cabinet à plusieurs commerciaux est
    // celui du CABINET (même règle que GET /api/clients), pas celui du seul
    // utilisateur connecté.
    const result = await pool.query(
      `SELECT c.id, c.first_name, c.last_name, c.lead_score
       FROM clients c
       WHERE ${fCl.sql}
       ORDER BY c.lead_score DESC NULLS LAST
       LIMIT 100`,
      fCl.params
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
    const portee = await porteeCabinet.resoudrePortee(pool, req)

    // Récupérer le score du courtier depuis portfolio_insights
    const myInsights = await pool.query(
      `SELECT health_score, created_at
       FROM portfolio_insights
       WHERE courtier_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [portee.userId]
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
