const express = require('express');
const router = express.Router();

// Middleware pour vérifier le token
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No authorization header' });
  const jwt = require('jsonwebtoken');
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token', details: err.message });
  }
};

/**
 * GET /api/dashboard/stats
 */
router.get('/stats', verifyToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const courtierId = req.user.id;

    // Total clients + actifs
    const clientsResult = await pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'actif' THEN 1 END) as actifs
      FROM clients
      WHERE courtier_id = $1
    `, [courtierId]);
    const total = parseInt(clientsResult.rows[0].total);
    const actifs = parseInt(clientsResult.rows[0].actifs);
    const tauxConversion = total > 0 ? Math.round((actifs / total) * 100 * 10) / 10 : 0;

    // Score Risque Moyen
    const scoreMoyenResult = await pool.query(`
      SELECT COALESCE(ROUND(AVG(risk_score)), 0) as score
      FROM clients
      WHERE courtier_id = $1
    `, [courtierId]);
    const scoreRisqueMoyen = parseInt(scoreMoyenResult.rows[0].score);
    
    // Répartition par statut
    const statutResult = await pool.query(`
      SELECT status, COUNT(*) as count
      FROM clients
      WHERE courtier_id = $1
      GROUP BY status
    `, [courtierId]);
    const clientsParStatut = statutResult.rows.reduce((acc, row) => {
      if (row.status) acc[row.status] = parseInt(row.count);
      return acc;
    }, {});
    
    // Répartition par Segment (type de client)
    const segmentResult = await pool.query(`
      SELECT type as segment, COUNT(*) as count
      FROM clients
      WHERE courtier_id = $1
      GROUP BY type
    `, [courtierId]);
    const clientsParSegment = segmentResult.rows.reduce((acc, row) => {
      if (row.segment) acc[row.segment] = parseInt(row.count);
      return acc;
    }, {});

    // Contrats actifs + commissions + prime totale
    const contratsResult = await pool.query(`
      SELECT
        COUNT(q.*) as actifs,
        COALESCE(ROUND(SUM((q.quote_data->>'prime_annuelle')::decimal * 0.15 / 12), 2), 0) as commissions,
        COALESCE(SUM((q.quote_data->>'prime_annuelle')::decimal), 0) as prime_totale
      FROM quotes q JOIN clients c ON q.client_id = c.id
      WHERE q.status = 'actif' AND c.courtier_id = $1
    `, [courtierId]);
    const contratsActifs = parseInt(contratsResult.rows[0].actifs);
    const commissionsMois = parseFloat(contratsResult.rows[0].commissions);
    const primeTotale = parseFloat(contratsResult.rows[0].prime_totale || 0);

    // Contrats urgents (< 30 jours)
    const urgentsResult = await pool.query(`
      SELECT COUNT(q.*) as count FROM quotes q JOIN clients c ON q.client_id = c.id
      WHERE (q.quote_data->>'date_echeance')::date BETWEEN NOW() AND NOW() + INTERVAL '30 days'
      AND q.status = 'actif' AND c.courtier_id = $1
    `, [courtierId]);
    const contratsUrgents = parseInt(urgentsResult.rows[0].count);

    // Revenus 6 derniers mois
    const revenusResult = await pool.query(`
      SELECT
        TO_CHAR(DATE_TRUNC('month', q.created_at), 'Mon') as mois,
        COALESCE(SUM((q.quote_data->>'prime_annuelle')::decimal), 0) as revenue
      FROM quotes q JOIN clients c ON q.client_id = c.id
      WHERE q.created_at >= NOW() - INTERVAL '6 months'
      AND q.status = 'actif' AND c.courtier_id = $1
      GROUP BY DATE_TRUNC('month', q.created_at)
      ORDER BY DATE_TRUNC('month', q.created_at) ASC
    `, [courtierId]);

    // Alertes échéances (< 90 jours)
    const alertesResult = await pool.query(`
      SELECT
        c.first_name as nom, c.last_name as prenom,
        q.quote_data->>'type_contrat' as type_contrat,
        q.quote_data->>'date_echeance' as date_echeance,
        EXTRACT(DAY FROM (q.quote_data->>'date_echeance')::date - NOW())::int as jours_restants
      FROM quotes q
      JOIN clients c ON q.client_id = c.id
      WHERE (q.quote_data->>'date_echeance')::date BETWEEN NOW() AND NOW() + INTERVAL '90 days'
      AND q.status = 'actif' AND c.courtier_id = $1
      ORDER BY (q.quote_data->>'date_echeance')::date ASC
      LIMIT 5
    `, [courtierId]);

    // Clients récents — 1 par tier de score
    const recentsResult = await pool.query(`
      SELECT DISTINCT ON (tier) id, first_name as nom, last_name as prenom,
        status as statut, risk_score as score_risque, created_at, tier
      FROM (
        SELECT *,
          CASE
            WHEN risk_score >= 80 THEN 'A'
            WHEN risk_score >= 60 THEN 'B'
            WHEN risk_score >= 40 THEN 'C'
            WHEN risk_score >= 20 THEN 'D'
            ELSE 'E'
          END as tier
        FROM clients
        WHERE courtier_id = $1
      ) ranked
      ORDER BY tier ASC, created_at DESC
      LIMIT 5
    `, [courtierId]);

    // Types de contrats
    const typesResult = await pool.query(`
      SELECT
        COALESCE(q.quote_data->>'type_contrat', 'Autre') as type,
        COUNT(*) as count,
        COALESCE(SUM((q.quote_data->>'prime_annuelle')::decimal), 0) as total_primes
      FROM quotes q JOIN clients c ON q.client_id = c.id
      WHERE q.status = 'actif' AND c.courtier_id = $1
      GROUP BY q.quote_data->>'type_contrat'
      ORDER BY count DESC
    `, [courtierId]);

    res.json({
      totalClients: total,
      contratsActifs,
      commissionsMois,
      primeTotale,
      contratsUrgents,
      tauxConversion,
      scoreRisqueMoyen,
      clientsParStatut,
      clientsParSegment,
      revenus6Mois: revenusResult.rows,
      alertes: alertesResult.rows,
      clientsRecents: recentsResult.rows,
      typesContrats: typesResult.rows
    });
  } catch (err) {
    console.error('GET /api/dashboard/stats error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
