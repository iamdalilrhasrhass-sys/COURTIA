/**
 * ARK Routes - Assistant avec gestion des coûts
 * POST /api/ark/ask - Poser une question (avec routing Haiku/Opus)
 * GET /api/ark/my-usage - Voir son utilisation personnelle
 */

const express = require('express');
const router = express.Router();
const aiCostManager = require('../services/aiCostManager');

// Middleware: Authentication requise
const requireAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

// ==================== CHAT ENDPOINT (Frontend) ====================

router.post('/chat', requireAuth, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const userId = req.user.id;
    const { message, clientData, conversationHistory } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    // Utiliser le manager d'IA
    const result = await aiCostManager.callAiWithQuotaManagement(
      pool,
      userId,
      message,
      'courtier_assistant',
      null
    );
    
    if (!result.success) {
      return res.status(result.statusCode || 400).json({
        error: result.error,
        reason: result.reason || null
      });
    }
    
    res.json({
      reply: result.response,
      model: result.model,
      cost: parseFloat(result.cost.toFixed(4))
    });
    
  } catch (err) {
    console.error('[ARK CHAT ERROR]', err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== ASK QUESTION WITH QUOTA MANAGEMENT ====================

router.post('/ask', requireAuth, async (req, res) => {
  try {
    const pool = req.app.get('pool');
    const userId = req.user.id;
    const { question, requestType = 'general', systemPrompt = null } = req.body;
    
    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }
    
    // Appeler le manager avec gestion des quotas
    const result = await aiCostManager.callAiWithQuotaManagement(
      pool,
      userId,
      question,
      requestType,
      systemPrompt
    );
    
    if (!result.success) {
      return res.status(result.statusCode || 400).json({
        error: result.error,
        reason: result.reason || null
      });
    }
    
    // Succès
    res.json({
      response: result.response,
      model: result.model,
      fallbackUsed: result.fallbackUsed || false,
      tokens: result.tokens,
      costUsd: parseFloat(result.cost.toFixed(4)),
      timestamp: new Date().toISOString()
    });
    
  } catch (err) {
    console.error('[ARK ASK ERROR]', err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== PERSONAL USAGE ====================

router.get('/my-usage', requireAuth, async (req, res) => {
  try {
    const pool = req.app.get('pool');
    const userId = req.user.id;
    
    // Récupérer les stats personnelles du mois en cours
    const stats = await pool.query(`
      SELECT 
        u.pricing_tier,
        pc.haiku_quota_monthly,
        pc.opus_quota_monthly,
        pc.monthly_price_eur,
        COUNT(*) as total_requests,
        SUM(CASE WHEN arl.model_used = 'claude-3-5-haiku-20241022' THEN 1 ELSE 0 END) as haiku_used,
        SUM(CASE WHEN arl.model_used = 'claude-3-5-opus-20241022' THEN 1 ELSE 0 END) as opus_used,
        ROUND(SUM(arl.cost_usd)::numeric, 4) as total_cost_usd
      FROM users u
      LEFT JOIN pricing_config pc ON u.pricing_tier = pc.tier_name
      LEFT JOIN api_request_logs arl ON u.id = arl.user_id
        AND DATE_TRUNC('month', arl.created_at) = DATE_TRUNC('month', CURRENT_TIMESTAMP)
      WHERE u.id = $1
      GROUP BY u.id, u.pricing_tier, pc.haiku_quota_monthly, pc.opus_quota_monthly, pc.monthly_price_eur
    `, [userId]);
    
    if (stats.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const data = stats.rows[0];
    
    const haikuPercent = Math.round((data.haiku_used / data.haiku_quota_monthly) * 100);
    const opusPercent = data.opus_quota_monthly > 0 
      ? Math.round((data.opus_used / data.opus_quota_monthly) * 100)
      : 0;
    
    // Récupérer dernières requêtes
    const recentRequests = await pool.query(`
      SELECT 
        model_used,
        request_type,
        ROUND(cost_usd::numeric, 4) as cost_usd,
        created_at,
        status
      FROM api_request_logs
      WHERE user_id = $1
      AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_TIMESTAMP)
      ORDER BY created_at DESC
      LIMIT 20
    `, [userId]);
    
    res.json({
      tier: data.pricing_tier,
      monthlyPrice: parseFloat(data.monthly_price_eur),
      haiku: {
        quota: data.haiku_quota_monthly,
        used: data.haiku_used || 0,
        remaining: Math.max(0, data.haiku_quota_monthly - (data.haiku_used || 0)),
        percentUsed: haikuPercent
      },
      opus: {
        quota: data.opus_quota_monthly,
        used: data.opus_used || 0,
        remaining: Math.max(0, data.opus_quota_monthly - (data.opus_used || 0)),
        percentUsed: opusPercent
      },
      totalCostThisMonth: parseFloat(data.total_cost_usd),
      totalRequests: data.total_requests,
      recentRequests: recentRequests.rows,
      month: new Date().toLocaleString('fr-FR', { month: 'long', year: 'numeric' }),
      timestamp: new Date().toISOString()
    });
    
  } catch (err) {
    console.error('[ARK USAGE ERROR]', err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== UPGRADE TIER ====================

router.post('/upgrade-tier', requireAuth, async (req, res) => {
  try {
    const pool = req.app.get('pool');
    const userId = req.user.id;
    const { newTier } = req.body;
    
    // Valider tier
    const validTiers = ['Starter', 'Pro', 'Premium'];
    if (!validTiers.includes(newTier)) {
      return res.status(400).json({ error: 'Invalid tier' });
    }
    
    // Mettre à jour
    const result = await pool.query(
      'UPDATE users SET pricing_tier = $1, api_quota_reset_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [newTier, userId]
    );
    
    res.json({
      message: `Tier upgraded to ${newTier}`,
      user: result.rows[0],
      timestamp: new Date().toISOString()
    });
    
  } catch (err) {
    console.error('[UPGRADE TIER ERROR]', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
