const express = require('express')
const router = express.Router()
const { verifyToken } = require('../middleware/auth')

/**
 * GET /api/stats/portfolio
 * Données analytiques du portefeuille : répartition contrats, top 10 clients, fenêtres renouvellement, activité ARK
 */
router.get('/portfolio', verifyToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool

    // Contrats actifs par type avec prime totale
    const byTypeResult = await pool.query(`
      SELECT
        COALESCE(quote_data->>'type_contrat', 'Autre') AS type,
        COUNT(*)::int AS count,
        COALESCE(SUM(NULLIF(quote_data->>'prime_annuelle', '')::decimal), 0) AS prime_total
      FROM quotes
      WHERE status = 'actif'
      GROUP BY quote_data->>'type_contrat'
      ORDER BY count DESC
    `)

    // Top 10 clients par loyalty_score
    const top10Result = await pool.query(`
      SELECT
        c.id,
        c.first_name AS nom,
        c.last_name AS prenom,
        c.email,
        c.loyalty_score,
        c.lifetime_value,
        COUNT(q.id)::int AS nb_contrats
      FROM clients c
      LEFT JOIN quotes q ON q.client_id = c.id AND q.status = 'actif'
      GROUP BY c.id
      ORDER BY c.loyalty_score DESC NULLS LAST
      LIMIT 10
    `)

    // Contrats expirant dans les 90 prochains jours
    const renewalResult = await pool.query(`
      SELECT
        q.id,
        q.quote_data->>'type_contrat' AS type_contrat,
        q.quote_data->>'date_echeance' AS date_echeance,
        NULLIF(q.quote_data->>'prime_annuelle', '')::decimal AS prime_annuelle,
        c.first_name AS nom,
        c.last_name AS prenom,
        c.id AS client_id,
        CEIL(EXTRACT(EPOCH FROM (NULLIF(q.quote_data->>'date_echeance', '')::date - NOW())) / 86400)::int AS jours_restants
      FROM quotes q
      JOIN clients c ON c.id = q.client_id
      WHERE q.status = 'actif'
        AND NULLIF(q.quote_data->>'date_echeance', '')::date BETWEEN NOW() AND NOW() + INTERVAL '90 days'
      ORDER BY NULLIF(q.quote_data->>'date_echeance', '')::date ASC
      LIMIT 50
    `)

    // Activité ARK ce mois
    let arkActivity = { conversationsMois: 0, clientsAnalyses: 0, recommandations: '—' }
    try {
      const arkResult = await pool.query(`
        SELECT
          COUNT(*)::int AS total_conversations,
          COUNT(DISTINCT client_id)::int AS clients_analyses
        FROM ark_conversations
        WHERE updated_at >= NOW() - INTERVAL '30 days'
      `)
      if (arkResult.rows.length > 0) {
        arkActivity = {
          conversationsMois: arkResult.rows[0].total_conversations || 0,
          clientsAnalyses: arkResult.rows[0].clients_analyses || 0,
          recommandations: '—'
        }
      }
    } catch {
      // ark_conversations peut ne pas exister — ne pas bloquer
    }

    res.json({
      contratsByType: byTypeResult.rows,
      top10Loyalty: top10Result.rows,
      renewalWindows: renewalResult.rows,
      arkActivity
    })
  } catch (err) {
    console.error('GET /api/stats/portfolio error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
