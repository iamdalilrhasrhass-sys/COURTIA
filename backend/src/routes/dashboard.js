const express = require('express');
const router = express.Router();
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No authorization header' });
  const jwt = require('jsonwebtoken');
  try { const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key'); req.user = decoded; next(); }
  catch (err) { res.status(401).json({ error: 'Invalid token', details: err.message }); }
};
router.get('/stats', verifyToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const courtierId = req.user.userId;
    const r1 = await pool.query("SELECT COUNT(*) as total, COUNT(CASE WHEN status='actif' THEN 1 END) as actifs FROM clients WHERE courtier_id = $1", [courtierId]);
    const total = parseInt(r1.rows[0].total), actifs = parseInt(r1.rows[0].actifs);
    const r2 = await pool.query("SELECT COALESCE(ROUND(AVG(risk_score)),0) as score FROM clients WHERE courtier_id = $1", [courtierId]);
    const r3 = await pool.query("SELECT status, COUNT(*) as count FROM clients WHERE courtier_id = $1 GROUP BY status", [courtierId]);
    const r4 = await pool.query("SELECT COUNT(*) as actifs, COALESCE(ROUND(SUM(NULLIF(q.quote_data->>'prime_annuelle', '')::decimal*0.15/12),2),0) as commissions, COALESCE(SUM(NULLIF(q.quote_data->>'prime_annuelle', '')::decimal),0) as prime_totale FROM quotes q JOIN clients c ON q.client_id = c.id AND c.courtier_id = $1 WHERE q.status='actif'", [courtierId]);
    const r5 = await pool.query("SELECT COUNT(*) as count FROM quotes q JOIN clients c ON q.client_id = c.id AND c.courtier_id = $1 WHERE NULLIF(q.quote_data->>'date_echeance', '')::date BETWEEN NOW() AND NOW()+INTERVAL '30 days' AND q.status='actif'", [courtierId]);
    const r6 = await pool.query("SELECT TO_CHAR(DATE_TRUNC('month',q.created_at),'Mon') as mois, COALESCE(SUM(NULLIF(q.quote_data->>'prime_annuelle', '')::decimal),0) as revenue FROM quotes q JOIN clients c ON q.client_id = c.id AND c.courtier_id = $1 WHERE q.created_at>=NOW()-INTERVAL '6 months' AND q.status='actif' GROUP BY DATE_TRUNC('month',q.created_at) ORDER BY 1 ASC", [courtierId]);
    const r7 = await pool.query("SELECT c.first_name as nom,c.last_name as prenom,q.quote_data->>'type_contrat' as type_contrat,q.quote_data->>'date_echeance' as date_echeance,EXTRACT(DAY FROM NULLIF(q.quote_data->>'date_echeance', '')::date-NOW())::int as jours_restants FROM quotes q JOIN clients c ON q.client_id=c.id WHERE c.courtier_id = $1 AND NULLIF(q.quote_data->>'date_echeance', '')::date BETWEEN NOW() AND NOW()+INTERVAL '90 days' AND q.status='actif' ORDER BY 1 ASC LIMIT 5", [courtierId]);
    const r8 = await pool.query("SELECT id,first_name as nom,last_name as prenom,status as statut,risk_score as score_risque,created_at FROM clients WHERE courtier_id = $1 ORDER BY created_at DESC LIMIT 5", [courtierId]);
    const r9 = await pool.query("SELECT COALESCE(q.quote_data->>'type_contrat','Autre') as type,COUNT(*) as count,COALESCE(SUM(NULLIF(q.quote_data->>'prime_annuelle', '')::decimal),0) as total_primes FROM quotes q JOIN clients c ON q.client_id = c.id AND c.courtier_id = $1 WHERE q.status='actif' GROUP BY 1 ORDER BY 2 DESC", [courtierId]);
    const r10 = await pool.query("SELECT type as segment,COUNT(*) as count FROM clients WHERE courtier_id = $1 AND type IS NOT NULL GROUP BY type", [courtierId]);
    res.json({ totalClients:total, contratsActifs:parseInt(r4.rows[0].actifs), commissionsMois:parseFloat(r4.rows[0].commissions), primeTotale:parseFloat(r4.rows[0].prime_totale||0), contratsUrgents:parseInt(r5.rows[0].count), tauxConversion:total>0?Math.round((actifs/total)*1000)/10:0, scoreRisqueMoyen:parseInt(r2.rows[0].score), clientsParStatut:r3.rows.reduce((a,r)=>{ if(r.status) a[r.status]=parseInt(r.count); return a; },{}), clientsParSegment:r10.rows.reduce((a,r)=>{ if(r.segment) a[r.segment]=parseInt(r.count); return a; },{}), revenus6Mois:r6.rows, alertes:r7.rows, clientsRecents:r8.rows, typesContrats:r9.rows });
  } catch(err) { console.error('dashboard error:',err.message); res.status(500).json({error:err.message}); }
});
module.exports = router;
