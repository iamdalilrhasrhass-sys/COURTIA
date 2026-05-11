const express = require('express');
const router = express.Router();
const { getJwtSecret } = require('../utils/jwtSecret');

const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token manquant' });
  const jwt = require('jsonwebtoken');
  try { const decoded = jwt.verify(token, getJwtSecret()); req.user = decoded; next(); }
  catch (err) { res.status(401).json({ error: 'Token invalide' }); }
};

const safeQuery = async (pool, sql, params, fallback) => {
  try { const r = await pool.query(sql, params); return r.rows; }
  catch (e) { console.warn('[dashboard] query failed:', e.message); return fallback; }
};

// ─── /api/dashboard/stats — Legacy KPIs (compatibilité Dashboard) ───────────
router.get('/stats', verifyToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const userId = req.user.id || req.user.userId;
    const r1 = await pool.query("SELECT COUNT(*) as total, COUNT(CASE WHEN status='actif' THEN 1 END) as actifs FROM clients WHERE courtier_id=$1", [userId]);
    const total = parseInt(r1.rows[0].total), actifs = parseInt(r1.rows[0].actifs);
    const r2 = await pool.query("SELECT COALESCE(ROUND(AVG(risk_score)),0) as score FROM clients WHERE courtier_id=$1", [userId]);
    const r3 = await pool.query("SELECT status, COUNT(*) as count FROM clients WHERE courtier_id=$1 GROUP BY status", [userId]);
    const clientsParStatut = r3.rows.reduce((a,r)=>{ if(r.status) a[r.status]=parseInt(r.count); return a; },{});
    const r4 = await pool.query("SELECT COUNT(*) as actifs, COALESCE(ROUND(SUM(NULLIF(quote_data->>'prime_annuelle', '')::decimal*0.15/12),2),0) as commissions, COALESCE(SUM(NULLIF(quote_data->>'prime_annuelle', '')::decimal),0) as prime_totale FROM quotes q JOIN clients c ON q.client_id=c.id WHERE q.status='actif' AND c.courtier_id=$1", [userId]);
    const r5 = await pool.query("SELECT COUNT(*) as count FROM quotes q JOIN clients c ON q.client_id=c.id WHERE NULLIF(quote_data->>'date_echeance', '')::date BETWEEN NOW() AND NOW()+INTERVAL '30 days' AND q.status='actif' AND c.courtier_id=$1", [userId]);
    const r6 = await pool.query("SELECT TO_CHAR(DATE_TRUNC('month',q.created_at),'Mon') as mois, COALESCE(SUM(NULLIF(quote_data->>'prime_annuelle', '')::decimal),0) as revenue FROM quotes q JOIN clients c ON q.client_id=c.id WHERE q.created_at>=NOW()-INTERVAL '6 months' AND q.status='actif' AND c.courtier_id=$1 GROUP BY DATE_TRUNC('month',q.created_at) ORDER BY 1 ASC", [userId]);
    const r7 = await pool.query("SELECT c.first_name as nom,c.last_name as prenom,q.quote_data->>'type_contrat' as type_contrat,q.quote_data->>'date_echeance' as date_echeance,EXTRACT(DAY FROM NULLIF(q.quote_data->>'date_echeance', '')::date-NOW())::int as jours_restants FROM quotes q JOIN clients c ON q.client_id=c.id WHERE NULLIF(q.quote_data->>'date_echeance', '')::date BETWEEN NOW() AND NOW()+INTERVAL '90 days' AND q.status='actif' AND c.courtier_id=$1 ORDER BY 1 ASC LIMIT 5", [userId]);
    const r8 = await pool.query("SELECT id,first_name as nom,last_name as prenom,status as statut,risk_score as score_risque,created_at FROM clients WHERE courtier_id=$1 ORDER BY created_at DESC LIMIT 5", [userId]);
    const r9 = await pool.query("SELECT COALESCE(quote_data->>'type_contrat','Autre') as type,COUNT(*) as count,COALESCE(SUM(NULLIF(quote_data->>'prime_annuelle', '')::decimal),0) as total_primes FROM quotes q JOIN clients c ON q.client_id=c.id WHERE q.status='actif' AND c.courtier_id=$1 GROUP BY 1 ORDER BY 2 DESC", [userId]);
    const r10 = await pool.query("SELECT type as segment,COUNT(*) as count FROM clients WHERE type IS NOT NULL AND courtier_id=$1 GROUP BY type", [userId]);
    const clientsParSegment = r10.rows.reduce((a,r)=>{ if(r.segment) a[r.segment]=parseInt(r.count); return a; },{});
    res.json({ totalClients:total, contratsActifs:parseInt(r4.rows[0].actifs), commissionsMois:parseFloat(r4.rows[0].commissions), primeTotale:parseFloat(r4.rows[0].prime_totale||0), contratsUrgents:parseInt(r5.rows[0].count), tauxConversion:total>0?Math.round((actifs/total)*1000)/10:0, scoreRisqueMoyen:parseInt(r2.rows[0].score), clientsParStatut, clientsParSegment, revenus6Mois:r6.rows, alertes:r7.rows, clientsRecents:r8.rows, typesContrats:r9.rows });
  } catch(err) {
    console.error('dashboard error:', err.message);
    res.status(500).json({ error: 'dashboard_unavailable', message: 'Les statistiques sont temporairement indisponibles.' });
  }
});

// ─── /api/dashboard/summary — Cockpit KPIs synthétiques ──────────────────
router.get('/summary', verifyToken, async (req, res) => {
  const pool = req.app.locals.pool;
  const userId = req.user.id || req.user.userId;
  const clientsAgg = await safeQuery(pool,
    `SELECT
       COUNT(*)::int AS total_clients,
       COUNT(*) FILTER (WHERE status='actif')::int AS clients_actifs,
       COUNT(*) FILTER (WHERE status='actif' AND created_at >= NOW() - INTERVAL '30 days')::int AS nouveaux_30j,
       COUNT(*) FILTER (WHERE silent_alert IS TRUE)::int AS clients_silencieux,
       COALESCE(ROUND(AVG(NULLIF(loyalty_score,0))::numeric, 0), 0)::int AS loyalty_avg
     FROM clients WHERE courtier_id=$1`, [userId],
    [{ total_clients:0, clients_actifs:0, nouveaux_30j:0, clients_silencieux:0, loyalty_avg:0 }]);
  const c = clientsAgg[0] || {};

  const quotesAgg = await safeQuery(pool,
    `SELECT
       COUNT(*) FILTER (WHERE q.status='actif')::int AS contrats_actifs,
       COALESCE(SUM(NULLIF(q.quote_data->>'prime_annuelle','')::numeric) FILTER (WHERE q.status='actif'),0)::numeric AS prime_totale,
       COUNT(*) FILTER (WHERE q.status='actif' AND NULLIF(q.quote_data->>'date_echeance','')::date BETWEEN NOW() AND NOW()+INTERVAL '30 days')::int AS echeances_30j,
       COUNT(*) FILTER (WHERE q.status='envoye')::int AS devis_en_attente
     FROM quotes q JOIN clients cl ON q.client_id=cl.id WHERE cl.courtier_id=$1`, [userId],
    [{ contrats_actifs:0, prime_totale:0, echeances_30j:0, devis_en_attente:0 }]);
  const q = quotesAgg[0] || {};

  // Score portefeuille basé sur rétention + diversification + activité récente
  const total = Number(c.total_clients||0);
  const actifs = Number(c.clients_actifs||0);
  const retention = total>0 ? Math.min(100, Math.round((actifs/total)*100)) : 0;
  const silencieuxRatio = total>0 ? (Number(c.clients_silencieux||0)/total) : 0;
  const healthScore = Math.max(0, Math.min(100, Math.round(retention*0.6 + (100-silencieuxRatio*100)*0.4)));

  res.json({
    generated_at: new Date().toISOString(),
    kpi: {
      clients_actifs: actifs || 0,
      clients_total: total || 0,
      contrats_actifs: Number(q.contrats_actifs||0),
      prime_totale: Number(q.prime_totale||0),
      echeances_30j: Number(q.echeances_30j||0),
      devis_en_attente: Number(q.devis_en_attente||0),
      health_score: healthScore,
      delta_clients_30j: Number(c.nouveaux_30j||0),
    },
    flags: {
      silencieux: Number(c.clients_silencieux||0),
      loyalty_avg: Number(c.loyalty_avg||0),
      retention_pct: retention,
    },
  });
});

// ─── /api/dashboard/activity — Timeline événements récents ────────────────
router.get('/activity', verifyToken, async (req, res) => {
  const pool = req.app.locals.pool;
  const userId = req.user.id || req.user.userId;
  const limit = Math.min(parseInt(req.query.limit || '12', 10), 50);

  const events = [];

  const interactions = await safeQuery(pool,
    `SELECT ci.id, ci.provider AS kind, ci.subject AS label, ci.occurred_at AS at,
            ci.client_id, c.first_name, c.last_name
     FROM client_interactions ci
     LEFT JOIN clients c ON c.id = ci.client_id
     WHERE ci.user_id=$1 AND ci.occurred_at IS NOT NULL
     ORDER BY ci.occurred_at DESC LIMIT $2`, [userId, limit], []);
  for (const r of interactions) {
    events.push({
      id: `int-${r.id}`,
      kind: r.kind || 'interaction',
      label: r.label || `Interaction ${r.kind || ''}`,
      at: r.at,
      client_id: r.client_id,
      client_name: [r.first_name, r.last_name].filter(Boolean).join(' ') || null,
    });
  }

  const newClients = await safeQuery(pool,
    `SELECT id, first_name, last_name, created_at FROM clients
     WHERE courtier_id=$1 ORDER BY created_at DESC LIMIT $2`, [userId, Math.min(limit, 6)], []);
  for (const r of newClients) {
    events.push({
      id: `cli-${r.id}`,
      kind: 'client_created',
      label: `Nouveau client : ${[r.first_name, r.last_name].filter(Boolean).join(' ') || 'sans nom'}`,
      at: r.created_at,
      client_id: r.id,
      client_name: [r.first_name, r.last_name].filter(Boolean).join(' ') || null,
    });
  }

  const recos = await safeQuery(pool,
    `SELECT id, title, created_at FROM ark_recommendations
     WHERE user_id=$1 ORDER BY created_at DESC LIMIT $2`, [userId, Math.min(limit, 6)], []);
  for (const r of recos) {
    events.push({
      id: `ark-${r.id}`,
      kind: 'ark',
      label: r.title,
      at: r.created_at,
      client_id: null,
      client_name: null,
    });
  }

  events.sort((a,b) => new Date(b.at||0) - new Date(a.at||0));
  res.json({ events: events.slice(0, limit) });
});

module.exports = router;
