const express = require('express');
const pool = require('../db');
const router = express.Router();

// Middleware pour vérifier le token
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'No authorization header' });
  }
  
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
 * GET /api/dashboard/stats — Statistiques dashboard
 */
router.get('/stats', verifyToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;

    // Total clients et taux conversion
    const clientsResult = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN statut = 'actif' THEN 1 END) as actifs
      FROM clients
    `);

    const total = parseInt(clientsResult.rows[0].total);
    const actifs = parseInt(clientsResult.rows[0].actifs);
    const tauxConversion = total > 0 ? Math.round((actifs / total) * 100 * 10) / 10 : 0;

    // Contrats actifs et commissions
    const contratsResult = await pool.query(`
      SELECT 
        COUNT(*) as actifs,
        COALESCE(ROUND(SUM((quote_data->>'prime_annuelle')::decimal * 0.15 / 12), 2), 0) as commissions,
        COALESCE(SUM((quote_data->>'prime_annuelle')::decimal), 0) as prime_totale
      FROM quotes 
      WHERE statut = 'actif'
    `);

    const contratsActifs = parseInt(contratsResult.rows[0].actifs);
    const commissionsMois = parseFloat(contratsResult.rows[0].commissions);
    const primeTotale = parseFloat(contratsResult.rows[0].prime_totale || 0);

    // Contrats urgents (< 30 jours)
    const urgentsResult = await pool.query(`
      SELECT COUNT(*) as count FROM quotes
      WHERE (quote_data->>'date_echeance')::date BETWEEN NOW() AND NOW() + INTERVAL '30 days'
      AND statut = 'actif'
    `);
    const contratsUrgents = parseInt(urgentsResult.rows[0].count);

    // Revenus 6 derniers mois
    const revenusResult = await pool.query(`
      SELECT 
        TO_CHAR(DATE_TRUNC('month', created_at), 'Mon') as mois,
        COALESCE(SUM((quote_data->>'prime_annuelle')::decimal), 0) as revenue
      FROM quotes
      WHERE created_at >= NOW() - INTERVAL '6 months'
      AND statut = 'actif'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY DATE_TRUNC('month', created_at) ASC
    `);

    // Alertes échéances réelles (< 90 jours)
    const alertesResult = await pool.query(`
      SELECT 
        c.nom as nom, c.prenom as prenom,
        q.quote_data->>'type_contrat' as type_contrat,
        q.quote_data->>'date_echeance' as date_echeance,
        EXTRACT(DAY FROM (q.quote_data->>'date_echeance')::date - NOW())::int as jours_restants
      FROM quotes q
      JOIN clients c ON q.client_id = c.id
      WHERE (q.quote_data->>'date_echeance')::date BETWEEN NOW() AND NOW() + INTERVAL '90 days'
      AND q.statut = 'actif'
      ORDER BY (q.quote_data->>'date_echeance')::date ASC
      LIMIT 5
    `);

    // Clients récents (avec scores variés pour montrer la diversité)
    // Prendre 1 client par tier de risque
    const recentsResult = await pool.query(`
      WITH ranked AS (
        SELECT *, 
          CASE 
            WHEN risk_score >= 70 THEN 1
            WHEN risk_score >= 50 THEN 2
            WHEN risk_score >= 30 THEN 3
            ELSE 4
          END as risk_tier,
          ROW_NUMBER() OVER (PARTITION BY CASE 
            WHEN risk_score >= 70 THEN 1
            WHEN risk_score >= 50 THEN 2
            WHEN risk_score >= 30 THEN 3
            ELSE 4
          END ORDER BY created_at DESC) as rn
        FROM clients
      )
      SELECT DISTINCT ON (risk_tier) id, nom, prenom, 
        email, statut, risk_score as score_risque
      FROM ranked
      WHERE rn = 1
      ORDER BY risk_tier, risk_score DESC
      LIMIT 5
    `);

    // Types de contrats
    const typesResult = await pool.query(`
      SELECT
        COALESCE(quote_data->>'type_contrat', 'Autre') as type,
        COUNT(*) as count,
        COALESCE(SUM((quote_data->>'prime_annuelle')::decimal), 0) as total_primes
      FROM quotes
      WHERE statut = 'actif'
      GROUP BY quote_data->>'type_contrat'
      ORDER BY count DESC
    `);

    res.json({
      totalClients: total,
      contratsActifs,
      commissionsMois,
      primeTotale,
      contratsUrgents,
      tauxConversion,
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
