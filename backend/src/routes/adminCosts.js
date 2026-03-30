/**
 * Admin Routes - Cost Management Dashboard
 * 
 * GET /api/admin/costs - Dashboard overview
 * GET /api/admin/costs/by-user - Détails par courtier
 * GET /api/admin/costs/export - Export CSV
 */

const express = require('express');
const router = express.Router();
const { aiCostManager } = require('../services/aiCostManager');

// Middleware: Vérifier que l'user est admin
const requireAdmin = async (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// ==================== DASHBOARD OVERVIEW ====================

router.get('/api/admin/costs', requireAdmin, async (req, res) => {
  try {
    const pool = req.app.get('pool');
    
    // Stats globales du mois
    const globalStats = await pool.query(`
      SELECT 
        COUNT(DISTINCT user_id) as total_users,
        COUNT(*) as total_requests,
        SUM(CASE WHEN model_used = 'claude-3-5-opus-20241022' THEN 1 ELSE 0 END) as opus_requests,
        SUM(CASE WHEN model_used = 'claude-3-5-haiku-20241022' THEN 1 ELSE 0 END) as haiku_requests,
        SUM(cost_usd) as total_cost_usd,
        AVG(cost_usd) as avg_cost_per_request,
        ROUND(AVG(CASE WHEN model_used = 'claude-3-5-opus-20241022' THEN cost_usd END)::numeric, 4) as avg_opus_cost,
        ROUND(AVG(CASE WHEN model_used = 'claude-3-5-haiku-20241022' THEN cost_usd END)::numeric, 4) as avg_haiku_cost
      FROM api_request_logs
      WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_TIMESTAMP)
    `);
    
    // Top 10 courtiers par coût
    const topUsers = await pool.query(`
      SELECT 
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        u.pricing_tier,
        COUNT(*) as request_count,
        SUM(CASE WHEN arl.model_used = 'claude-3-5-opus-20241022' THEN 1 ELSE 0 END) as opus_count,
        SUM(CASE WHEN arl.model_used = 'claude-3-5-haiku-20241022' THEN 1 ELSE 0 END) as haiku_count,
        ROUND(SUM(arl.cost_usd)::numeric, 4) as total_cost_usd
      FROM users u
      LEFT JOIN api_request_logs arl ON u.id = arl.user_id 
        AND DATE_TRUNC('month', arl.created_at) = DATE_TRUNC('month', CURRENT_TIMESTAMP)
      WHERE u.role != 'admin'
      GROUP BY u.id, u.first_name, u.last_name, u.email, u.pricing_tier
      ORDER BY total_cost_usd DESC NULLS LAST
      LIMIT 10
    `);
    
    // Requêtes par jour (graphique)
    const requestsTrend = await pool.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as request_count,
        SUM(CASE WHEN model_used = 'claude-3-5-opus-20241022' THEN 1 ELSE 0 END) as opus_count,
        SUM(CASE WHEN model_used = 'claude-3-5-haiku-20241022' THEN 1 ELSE 0 END) as haiku_count,
        ROUND(SUM(cost_usd)::numeric, 4) as daily_cost
      FROM api_request_logs
      WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_TIMESTAMP)
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `);
    
    // Répartition par type de requête
    const requestsByType = await pool.query(`
      SELECT 
        request_type,
        COUNT(*) as count,
        ROUND(SUM(cost_usd)::numeric, 4) as total_cost,
        ROUND(AVG(cost_usd)::numeric, 4) as avg_cost
      FROM api_request_logs
      WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_TIMESTAMP)
      GROUP BY request_type
      ORDER BY count DESC
    `);
    
    res.json({
      period: new Date().toLocaleString('fr-FR', { month: 'long', year: 'numeric' }),
      globalStats: globalStats.rows[0],
      topUsers: topUsers.rows,
      requestsTrend: requestsTrend.rows,
      requestsByType: requestsByType.rows,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('[ADMIN COSTS ERROR]', err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== DETAILED USER COSTS ====================

router.get('/api/admin/costs/by-user', requireAdmin, async (req, res) => {
  try {
    const pool = req.app.get('pool');
    const { userId, month } = req.query;
    
    let query = `
      SELECT 
        u.id,
        u.first_name || ' ' || u.last_name as full_name,
        u.email,
        u.pricing_tier,
        pc.monthly_price_eur,
        pc.haiku_quota_monthly,
        pc.opus_quota_monthly,
        COUNT(DISTINCT arl.id) as total_requests,
        SUM(CASE WHEN arl.model_used = 'claude-3-5-opus-20241022' THEN 1 ELSE 0 END) as opus_used,
        SUM(CASE WHEN arl.model_used = 'claude-3-5-haiku-20241022' THEN 1 ELSE 0 END) as haiku_used,
        ROUND(SUM(arl.cost_usd)::numeric, 4) as total_cost_usd,
        ROUND((SUM(CASE WHEN arl.model_used = 'claude-3-5-opus-20241022' THEN 1 ELSE 0 END)::float / pc.opus_quota_monthly * 100)::numeric, 1) as opus_quota_percent,
        ROUND((SUM(CASE WHEN arl.model_used = 'claude-3-5-haiku-20241022' THEN 1 ELSE 0 END)::float / pc.haiku_quota_monthly * 100)::numeric, 1) as haiku_quota_percent
      FROM users u
      LEFT JOIN api_request_logs arl ON u.id = arl.user_id 
      LEFT JOIN pricing_config pc ON u.pricing_tier = pc.tier_name
      WHERE u.role != 'admin'
    `;
    
    const params = [];
    
    if (userId) {
      query += ` AND u.id = $${params.length + 1}`;
      params.push(userId);
    }
    
    if (!month) {
      query += ` AND DATE_TRUNC('month', arl.created_at) = DATE_TRUNC('month', CURRENT_TIMESTAMP)`;
    } else {
      query += ` AND TO_CHAR(arl.created_at, 'YYYY-MM') = $${params.length + 1}`;
      params.push(month);
    }
    
    query += ` GROUP BY u.id, u.first_name, u.last_name, u.email, u.pricing_tier, pc.monthly_price_eur, pc.haiku_quota_monthly, pc.opus_quota_monthly
      ORDER BY total_cost_usd DESC NULLS LAST`;
    
    const result = await pool.query(query, params);
    
    res.json({
      users: result.rows,
      month: month || new Date().toISOString().slice(0, 7),
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('[ADMIN COSTS BY USER ERROR]', err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== EXPORT CSV ====================

router.get('/api/admin/costs/export', requireAdmin, async (req, res) => {
  try {
    const pool = req.app.get('pool');
    const { format = 'csv' } = req.query;
    
    const data = await pool.query(`
      SELECT 
        u.id as user_id,
        u.first_name || ' ' || u.last_name as courtier,
        u.email,
        u.pricing_tier,
        arl.model_used,
        arl.request_type,
        arl.tokens_input,
        arl.tokens_output,
        ROUND(arl.cost_usd::numeric, 4) as cost_usd,
        arl.created_at,
        arl.status
      FROM api_request_logs arl
      LEFT JOIN users u ON arl.user_id = u.id
      WHERE DATE_TRUNC('month', arl.created_at) = DATE_TRUNC('month', CURRENT_TIMESTAMP)
      ORDER BY arl.created_at DESC
    `);
    
    if (format === 'csv') {
      // Générer CSV
      let csv = 'User ID,Courtier,Email,Tier,Modèle,Type,Input Tokens,Output Tokens,Coût USD,Timestamp,Status\n';
      
      data.rows.forEach(row => {
        csv += `${row.user_id},"${row.courtier}","${row.email}","${row.pricing_tier}","${row.model_used}","${row.request_type}",${row.tokens_input},${row.tokens_output},${row.cost_usd},"${row.created_at}","${row.status}"\n`;
      });
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=api-costs-' + new Date().toISOString().slice(0, 10) + '.csv');
      res.send(csv);
    } else {
      res.json(data.rows);
    }
  } catch (err) {
    console.error('[ADMIN EXPORT ERROR]', err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== QUOTA STATUS ====================

router.get('/api/admin/quota-status/:userId', requireAdmin, async (req, res) => {
  try {
    const pool = req.app.get('pool');
    const { userId } = req.params;
    
    const result = await pool.query(`
      SELECT 
        u.id,
        u.first_name || ' ' || u.last_name as name,
        u.pricing_tier,
        pc.haiku_quota_monthly,
        pc.opus_quota_monthly,
        SUM(CASE WHEN arl.model_used = 'claude-3-5-haiku-20241022' THEN 1 ELSE 0 END) as haiku_used,
        SUM(CASE WHEN arl.model_used = 'claude-3-5-opus-20241022' THEN 1 ELSE 0 END) as opus_used
      FROM users u
      LEFT JOIN pricing_config pc ON u.pricing_tier = pc.tier_name
      LEFT JOIN api_request_logs arl ON u.id = arl.user_id
        AND DATE_TRUNC('month', arl.created_at) = DATE_TRUNC('month', CURRENT_TIMESTAMP)
      WHERE u.id = $1
      GROUP BY u.id, u.first_name, u.last_name, u.pricing_tier, pc.haiku_quota_monthly, pc.opus_quota_monthly
    `, [userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = result.rows[0];
    const haikuPercent = Math.round((user.haiku_used / user.haiku_quota_monthly) * 100);
    const opusPercent = Math.round((user.opus_used / user.opus_quota_monthly) * 100);
    
    res.json({
      user: user.name,
      tier: user.pricing_tier,
      haiku: {
        quota: user.haiku_quota_monthly,
        used: user.haiku_used || 0,
        remaining: Math.max(0, user.haiku_quota_monthly - (user.haiku_used || 0)),
        percent: haikuPercent
      },
      opus: {
        quota: user.opus_quota_monthly,
        used: user.opus_used || 0,
        remaining: Math.max(0, user.opus_quota_monthly - (user.opus_used || 0)),
        percent: opusPercent
      }
    });
  } catch (err) {
    console.error('[QUOTA STATUS ERROR]', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
