const express = require('express')
const router = express.Router()
const { verifyToken } = require('../middleware/auth')
// Montants : cast tolérant, une valeur fautive est IGNORÉE par l'agrégat au lieu
// de faire tomber l'écran (« invalid input syntax for type numeric »).
const { montantSur } = require('../lib/montants')
const { messagePublic } = require('../lib/erreursPubliques')
const porteeCabinet = require('../lib/porteeCabinet')

/**
 * GET /api/stats/portfolio
 * Données analytiques du portefeuille : répartition contrats, top 10 clients, fenêtres renouvellement, activité ARK
 *
 * PORTÉE = CABINET (et non « mes lignes »).
 * POURQUOI : le portefeuille est un objet du CABINET. Tant que ces trois
 * requêtes filtraient `c.courtier_id = $1`, un collaborateur (rôle `broker`)
 * voyait un portefeuille VIDE — répartition de contrats à zéro, top 10 vide,
 * fenêtres de renouvellement vides — là où le CRM lui montre tout le cabinet.
 * L'ancre du tenant est `clients` (migration 113) : `quotes` n'a pas de
 * `cabinet_id`, son cabinet est celui de son client, et `clients` en porte un.
 * Le fragment SQL est décidé par `lib/porteeCabinet`, seule autorité de portée
 * (repli `courtier_id = $n` inchangé pour un compte sans cabinet).
 */
router.get('/portfolio', verifyToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool
    const portee = await porteeCabinet.resoudrePortee(pool, req)
    const f = porteeCabinet.fragment(portee, {
      cabinet: 'c.cabinet_id',
      proprietaire: 'c.courtier_id',
      depart: 1,
    })

    // Contrats actifs par type avec prime totale
    const byTypeResult = await pool.query(`
      SELECT
        COALESCE(quote_data->>'type_contrat', 'Autre') AS type,
        COUNT(*)::int AS count,
        COALESCE(SUM(${montantSur('q')}), 0) AS prime_total
      FROM quotes q
      JOIN clients c ON q.client_id = c.id AND ${f.sql}
      WHERE q.status = 'actif'
      GROUP BY quote_data->>'type_contrat'
      ORDER BY count DESC
    `, [...f.params])

    // Top 10 clients par loyalty_score
    const top10Result = await pool.query(`
      SELECT
        c.id,
        c.first_name AS prenom,
        c.last_name AS nom,
        c.email,
        c.loyalty_score,
        c.lifetime_value,
        COUNT(q.id)::int AS nb_contrats
      FROM clients c
      LEFT JOIN quotes q ON q.client_id = c.id AND q.status = 'actif'
      WHERE ${f.sql}
      GROUP BY c.id
      ORDER BY c.loyalty_score DESC NULLS LAST
      LIMIT 10
    `, [...f.params])

    // Contrats expirant dans les 90 prochains jours
    const renewalResult = await pool.query(`
      SELECT
        q.id,
        q.quote_data->>'type_contrat' AS type_contrat,
        q.quote_data->>'date_echeance' AS date_echeance,
        ${montantSur('q')} AS prime_annuelle,
        c.first_name AS prenom,
        c.last_name AS nom,
        c.id AS client_id,
        CEIL(EXTRACT(EPOCH FROM (NULLIF(q.quote_data->>'date_echeance', '')::date - NOW())) / 86400)::int AS jours_restants
      FROM quotes q
      JOIN clients c ON c.id = q.client_id AND ${f.sql}
      WHERE q.status = 'actif'
        AND NULLIF(q.quote_data->>'date_echeance', '')::date BETWEEN NOW() AND NOW() + INTERVAL '90 days'
      ORDER BY NULLIF(q.quote_data->>'date_echeance', '')::date ASC
      LIMIT 50
    `, [...f.params])

    // Activité ARK ce mois — RESTE par utilisateur : `ark_conversations` est la
    // conversation personnelle du courtier avec ARK, pas une donnée du cabinet.
    let arkActivity = { conversationsMois: 0, clientsAnalyses: 0, recommandations: '—' }
    try {
      const arkResult = await pool.query(`
        SELECT
          COUNT(*)::int AS total_conversations,
          COUNT(DISTINCT client_id)::int AS clients_analyses
        FROM ark_conversations
        WHERE user_id = $1 AND updated_at >= NOW() - INTERVAL '30 days'
      `, [portee.userId])
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
    res.status(500).json({ error: messagePublic(err, { statut: 500 }) })
  }
})

module.exports = router
