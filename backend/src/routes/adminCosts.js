/**
 * Admin Routes - Cost Management Dashboard
 * Mounted at /api/admin
 *
 * GET /api/admin/costs
 * GET /api/admin/costs/by-user
 * GET /api/admin/costs/export
 * GET /api/admin/quota-status/:userId
 */

const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');

// Middleware admin
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// ==================== DASHBOARD OVERVIEW ====================

router.get('/costs', verifyToken, requireAdmin, async (req, res) => {
  try {
    const pool = req.app.locals.pool;

    const globalStats = await pool.query(`
      SELECT
        COUNT(DISTINCT user_id) as total_users,
        COUNT(*) as total_requests,
        SUM(CASE WHEN model_used = 'claude-opus-4-6' THEN 1 ELSE 0 END) as opus_requests,
        SUM(CASE WHEN model_used = 'claude-haiku-4-5-20251001' THEN 1 ELSE 0 END) as haiku_requests,
        COALESCE(SUM(cost_usd), 0) as total_cost_usd,
        COALESCE(AVG(cost_usd), 0) as avg_cost_per_request
      FROM api_request_logs
      WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_TIMESTAMP)
    `);

    const topUsers = await pool.query(`
      SELECT
        u.id, u.first_name, u.last_name, u.email, u.pricing_tier,
        COUNT(arl.id) as request_count,
        COALESCE(ROUND(SUM(arl.cost_usd)::numeric, 4), 0) as total_cost_usd
      FROM users u
      LEFT JOIN api_request_logs arl ON u.id = arl.user_id
        AND DATE_TRUNC('month', arl.created_at) = DATE_TRUNC('month', CURRENT_TIMESTAMP)
      WHERE u.role != 'admin'
      GROUP BY u.id, u.first_name, u.last_name, u.email, u.pricing_tier
      ORDER BY total_cost_usd DESC NULLS LAST
      LIMIT 10
    `);

    const requestsTrend = await pool.query(`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as request_count,
        COALESCE(ROUND(SUM(cost_usd)::numeric, 4), 0) as daily_cost
      FROM api_request_logs
      WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_TIMESTAMP)
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `);

    const requestsByType = await pool.query(`
      SELECT
        COALESCE(request_type, 'unknown') as request_type,
        COUNT(*) as count,
        COALESCE(ROUND(SUM(cost_usd)::numeric, 4), 0) as total_cost
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

// ==================== USER COSTS DETAIL ====================

router.get('/costs/by-user', verifyToken, requireAdmin, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { userId, month } = req.query;

    let query = `
      SELECT
        u.id,
        u.first_name || ' ' || u.last_name as full_name,
        u.email, u.pricing_tier,
        pc.monthly_price_eur,
        COALESCE(pc.haiku_quota_monthly, 100) as haiku_quota_monthly,
        COALESCE(pc.opus_quota_monthly, 10) as opus_quota_monthly,
        COUNT(DISTINCT arl.id) as total_requests,
        COALESCE(ROUND(SUM(arl.cost_usd)::numeric, 4), 0) as total_cost_usd
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
      query += ` AND (arl.created_at IS NULL OR DATE_TRUNC('month', arl.created_at) = DATE_TRUNC('month', CURRENT_TIMESTAMP))`;
    } else {
      query += ` AND TO_CHAR(arl.created_at, 'YYYY-MM') = $${params.length + 1}`;
      params.push(month);
    }
    query += ` GROUP BY u.id, u.first_name, u.last_name, u.email, u.pricing_tier, pc.monthly_price_eur, pc.haiku_quota_monthly, pc.opus_quota_monthly ORDER BY total_cost_usd DESC NULLS LAST`;

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

router.get('/costs/export', verifyToken, requireAdmin, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { format = 'csv' } = req.query;

    const data = await pool.query(`
      SELECT
        u.id as user_id,
        u.first_name || ' ' || u.last_name as courtier,
        u.email, u.pricing_tier,
        arl.model_used, arl.request_type,
        arl.tokens_input, arl.tokens_output,
        COALESCE(ROUND(arl.cost_usd::numeric, 4), 0) as cost_usd,
        arl.created_at, arl.status
      FROM api_request_logs arl
      LEFT JOIN users u ON arl.user_id = u.id
      WHERE DATE_TRUNC('month', arl.created_at) = DATE_TRUNC('month', CURRENT_TIMESTAMP)
      ORDER BY arl.created_at DESC
    `);

    if (format === 'csv') {
      let csv = 'User ID,Courtier,Email,Tier,Modèle,Type,Input Tokens,Output Tokens,Coût USD,Timestamp,Status\n';
      data.rows.forEach(row => {
        csv += `${row.user_id},"${row.courtier}","${row.email}","${row.pricing_tier}","${row.model_used}","${row.request_type}",${row.tokens_input},${row.tokens_output},${row.cost_usd},"${row.created_at}","${row.status}"\n`;
      });
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=api-costs-' + new Date().toISOString().slice(0, 10) + '.csv');
      return res.send(csv);
    }
    res.json(data.rows);
  } catch (err) {
    console.error('[ADMIN EXPORT ERROR]', err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== QUOTA STATUS ====================

router.get('/quota-status/:userId', verifyToken, requireAdmin, async (req, res) => {
  try {
    const pool = req.app.locals.pool;

    const result = await pool.query(`
      SELECT
        u.id, u.first_name || ' ' || u.last_name as name, u.pricing_tier,
        COALESCE(pc.haiku_quota_monthly, 100) as haiku_quota_monthly,
        COALESCE(pc.opus_quota_monthly, 10) as opus_quota_monthly,
        COALESCE(SUM(CASE WHEN arl.model_used ILIKE '%haiku%' THEN 1 ELSE 0 END), 0) as haiku_used,
        COALESCE(SUM(CASE WHEN arl.model_used ILIKE '%opus%' THEN 1 ELSE 0 END), 0) as opus_used
      FROM users u
      LEFT JOIN pricing_config pc ON u.pricing_tier = pc.tier_name
      LEFT JOIN api_request_logs arl ON u.id = arl.user_id
        AND DATE_TRUNC('month', arl.created_at) = DATE_TRUNC('month', CURRENT_TIMESTAMP)
      WHERE u.id = $1
      GROUP BY u.id, u.first_name, u.last_name, u.pricing_tier, pc.haiku_quota_monthly, pc.opus_quota_monthly
    `, [req.params.userId]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });

    const u = result.rows[0];
    res.json({
      user: u.name,
      tier: u.pricing_tier,
      haiku: {
        quota: u.haiku_quota_monthly,
        used: parseInt(u.haiku_used) || 0,
        remaining: Math.max(0, u.haiku_quota_monthly - (parseInt(u.haiku_used) || 0)),
        percent: Math.round(((parseInt(u.haiku_used) || 0) / u.haiku_quota_monthly) * 100)
      },
      opus: {
        quota: u.opus_quota_monthly,
        used: parseInt(u.opus_used) || 0,
        remaining: Math.max(0, u.opus_quota_monthly - (parseInt(u.opus_used) || 0)),
        percent: Math.round(((parseInt(u.opus_used) || 0) / u.opus_quota_monthly) * 100)
      }
    });
  } catch (err) {
    console.error('[QUOTA STATUS ERROR]', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
