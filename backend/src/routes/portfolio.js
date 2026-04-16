/**
 * portfolio.js — Routes /api/portfolio/*
 *
 * GET  /morning-brief      → actions du jour (bridage Start : 3 max, score fourchette)
 * GET  /actions            → liste paginée avec filtres status/priority
 * PATCH /actions/:id       → marquer done ou dismissed
 * GET  /health-score       → score (exact Pro/Elite, fourchette Start)
 * POST /regenerate         → forcer une nouvelle analyse manuelle
 * GET  /preferences        → récupérer les préférences Morning Brief
 * PUT  /preferences        → mettre à jour les préférences
 * GET  /insights/history   → historique des analyses nocturnes
 *
 * Bridage Start :
 *   - morning-brief : actions.length cap 3, score en fourchette "60-70",
 *     upgrade_required: true, hidden_actions: N
 *   - health-score  : score en fourchette, breakdown masqué
 */

const express  = require('express');
const router   = express.Router();
const { verifyToken }     = require('../middleware/auth');
const { getUserPlanInfo } = require('../services/planService');
const { calculateHealthScore, analyzePortfolio, scoreToRange } = require('../services/portfolioAnalyzer');
const pool = require('../db');

// ─── HELPER : plan de l'utilisateur ────────────────────────────────────────

async function getUserPlan(userId) {
  const info = await getUserPlanInfo(userId);
  return info ? (info.plan || 'start') : 'start';
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/portfolio/morning-brief
// Dernier insight + actions associées.
// Bridage Start : 3 actions max, score en fourchette, upgrade_required + hidden_actions.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/morning-brief', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const plan   = await getUserPlan(userId);
    const isStart = plan === 'start';

    // Récupérer le dernier insight complété
    const insightRes = await pool.query(
      `SELECT id, generated_at, total_clients, total_contracts, total_premium,
              health_score, health_breakdown, raw_analysis, status
       FROM portfolio_insights
       WHERE user_id = $1 AND status = 'completed'
       ORDER BY generated_at DESC
       LIMIT 1`,
      [userId]
    );

    if (insightRes.rows.length === 0) {
      return res.json({
        insight: null,
        actions: [],
        message: "Aucune analyse disponible — la première analyse aura lieu cette nuit à 3h.",
        plan,
      });
    }

    const insight = insightRes.rows[0];

    // Récupérer les actions pending, triées par priorité
    const PRIORITY_ORDER = "CASE priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END";
    const actionsRes = await pool.query(
      `SELECT pa.id, pa.client_id, pa.action_type, pa.priority,
              pa.title, pa.description, pa.suggested_action,
              pa.estimated_impact, pa.status, pa.created_at,
              c.first_name || ' ' || c.last_name AS client_name
       FROM portfolio_actions pa
       LEFT JOIN clients c ON pa.client_id = c.id
       WHERE pa.insight_id = $1 AND pa.status = 'pending'
       ORDER BY ${PRIORITY_ORDER}, pa.estimated_impact DESC NULLS LAST`,
      [insight.id]
    );

    const allActions = actionsRes.rows;
    let actions = allActions;
    let hiddenActions = 0;

    // Bridage Start
    if (isStart && allActions.length > 3) {
      hiddenActions = allActions.length - 3;
      actions = allActions.slice(0, 3);
    }

    // Construire la réponse
    const response = {
      insight: {
        id:               insight.id,
        generated_at:     insight.generated_at,
        total_clients:    insight.total_clients,
        total_contracts:  insight.total_contracts,
        total_premium:    parseFloat(insight.total_premium || 0),
        health_score:     isStart ? scoreToRange(insight.health_score) : insight.health_score,
        grade:            isStart ? null : (insight.raw_analysis?.grade || null),
        status:           insight.status,
      },
      actions,
      plan,
    };

    if (isStart) {
      response.upgrade_required = true;
      response.hidden_actions   = hiddenActions;
      response.upgrade_message  = `${hiddenActions} actions supplémentaires disponibles avec le plan Pro ou Elite.`;
    } else {
      response.insight.health_breakdown = insight.health_breakdown;
      response.insight.benchmark        = insight.raw_analysis?.benchmark || null;
      response.insight.confidence       = insight.raw_analysis?.confidence || null;
    }

    res.json(response);

  } catch (err) {
    console.error('GET /portfolio/morning-brief error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/portfolio/actions?status=pending&priority=critical&page=1&limit=20
// Liste paginée avec filtres.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/actions', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { status, priority, page = 1, limit = 20 } = req.query;

    const conditions = ['pa.user_id = $1'];
    const params     = [userId];

    if (status)   { params.push(status);   conditions.push(`pa.status = $${params.length}`); }
    if (priority) { params.push(priority); conditions.push(`pa.priority = $${params.length}`); }

    const offset   = (Math.max(1, parseInt(page)) - 1) * Math.min(100, parseInt(limit));
    const pageSize = Math.min(100, parseInt(limit));

    const PRIORITY_ORDER = "CASE pa.priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END";

    const [actionsRes, countRes] = await Promise.all([
      pool.query(
        `SELECT pa.id, pa.insight_id, pa.client_id, pa.action_type, pa.priority,
                pa.title, pa.description, pa.suggested_action, pa.ai_reasoning,
                pa.estimated_impact, pa.status, pa.done_at, pa.dismissed_reason, pa.created_at,
                c.first_name || ' ' || c.last_name AS client_name
         FROM portfolio_actions pa
         LEFT JOIN clients c ON pa.client_id = c.id
         WHERE ${conditions.join(' AND ')}
         ORDER BY ${PRIORITY_ORDER}, pa.estimated_impact DESC NULLS LAST, pa.created_at DESC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, pageSize, offset]
      ),
      pool.query(
        `SELECT COUNT(*) FROM portfolio_actions pa WHERE ${conditions.join(' AND ')}`,
        params
      ),
    ]);

    res.json({
      actions:    actionsRes.rows,
      total:      parseInt(countRes.rows[0].count),
      page:       parseInt(page),
      page_size:  pageSize,
    });

  } catch (err) {
    console.error('GET /portfolio/actions error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/portfolio/actions/:id
// Marquer une action comme done ou dismissed.
// Body : { status: 'done' | 'dismissed', dismissed_reason?: string }
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/actions/:id', verifyToken, async (req, res) => {
  try {
    const userId   = req.user.userId || req.user.id;
    const actionId = req.params.id;
    const { status, dismissed_reason } = req.body;

    if (!['done', 'dismissed'].includes(status)) {
      return res.status(400).json({
        error: 'Statut invalide. Valeurs acceptées : done, dismissed',
      });
    }

    const result = await pool.query(
      `UPDATE portfolio_actions
       SET status           = $1,
           done_at          = CASE WHEN $1 = 'done' THEN NOW() ELSE NULL END,
           dismissed_reason = $2
       WHERE id = $3 AND user_id = $4
       RETURNING *`,
      [status, dismissed_reason || null, actionId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Action non trouvée ou accès refusé' });
    }

    res.json({ action: result.rows[0] });

  } catch (err) {
    console.error('PATCH /portfolio/actions/:id error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/portfolio/health-score
// Exact pour Pro/Elite. Fourchette + breakdown masqué pour Start.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/health-score', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const plan   = await getUserPlan(userId);
    const isStart = plan === 'start';

    // D'abord tenter le dernier insight sauvegardé (rapide)
    const savedRes = await pool.query(
      `SELECT health_score, health_breakdown, raw_analysis, generated_at
       FROM portfolio_insights
       WHERE user_id = $1 AND status = 'completed'
       ORDER BY generated_at DESC LIMIT 1`,
      [userId]
    );

    let scoreData;
    let fromCache = false;

    if (savedRes.rows.length > 0) {
      const row = savedRes.rows[0];
      scoreData = {
        health_score:     row.health_score,
        health_breakdown: row.health_breakdown,
        grade:            row.raw_analysis?.grade || null,
        confidence_level: row.raw_analysis?.confidence || null,
        sector_benchmark: row.raw_analysis?.benchmark || null,
        flags:            row.raw_analysis?.flags || null,
        generated_at:     row.generated_at,
      };
      fromCache = true;
    } else {
      // Calcul à la volée si aucun insight sauvegardé
      const result = await calculateHealthScore(userId);
      const { data, score_range, ...rest } = result;
      scoreData = { ...rest, generated_at: new Date() };
    }

    if (isStart) {
      return res.json({
        health_score:    scoreToRange(scoreData.health_score),
        grade:           null,
        confidence_level: null,
        sector_benchmark: null,
        health_breakdown: null,
        generated_at:    scoreData.generated_at,
        from_cache:      fromCache,
        plan,
        upgrade_required: true,
        upgrade_message:  'Le score exact et le détail par dimension sont disponibles avec le plan Pro ou Elite.',
      });
    }

    res.json({
      ...scoreData,
      from_cache: fromCache,
      plan,
    });

  } catch (err) {
    console.error('GET /portfolio/health-score error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/portfolio/regenerate
// Force une nouvelle analyse manuelle (indépendamment du cron 3h).
// Protection : si analyse < 1h, refuse (éviter spam).
// ─────────────────────────────────────────────────────────────────────────────
router.post('/regenerate', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;

    // Vérifier si une analyse récente existe (< 1h)
    const recentRes = await pool.query(
      `SELECT generated_at FROM portfolio_insights
       WHERE user_id = $1 AND status IN ('completed','processing')
       ORDER BY generated_at DESC LIMIT 1`,
      [userId]
    );

    if (recentRes.rows.length > 0) {
      const ageMs = Date.now() - new Date(recentRes.rows[0].generated_at).getTime();
      if (ageMs < 60 * 60 * 1000) {
        const waitMin = Math.ceil((60 * 60 * 1000 - ageMs) / 60000);
        return res.status(429).json({
          error: 'Analyse récente déjà disponible',
          details: `Réessayez dans ${waitMin} minute(s).`,
          last_analysis: recentRes.rows[0].generated_at,
        });
      }
    }

    // Lancer l'analyse en asynchrone
    res.json({
      message: 'Analyse en cours de génération. Revenez dans 30-60 secondes.',
      started_at: new Date().toISOString(),
    });

    // Exécuter après la réponse (non-bloquant)
    analyzePortfolio(userId).catch(err => {
      console.error(`[portfolio/regenerate] Erreur analyse user ${userId}:`, err.message);
    });

  } catch (err) {
    console.error('POST /portfolio/regenerate error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/portfolio/preferences
// Retourne les préférences Morning Brief de l'utilisateur.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/preferences', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;

    const result = await pool.query(
      `SELECT user_id, morning_brief_time, email_notifications,
              push_notifications, min_priority, updated_at
       FROM portfolio_preferences WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      // Retourner les valeurs par défaut
      return res.json({
        user_id:              userId,
        morning_brief_time:   '08:00:00',
        email_notifications:  true,
        push_notifications:   true,
        min_priority:         'medium',
        updated_at:           null,
      });
    }

    res.json(result.rows[0]);

  } catch (err) {
    console.error('GET /portfolio/preferences error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/portfolio/preferences
// Crée ou met à jour les préférences Morning Brief.
// Body : { morning_brief_time?, email_notifications?, push_notifications?, min_priority? }
// ─────────────────────────────────────────────────────────────────────────────
router.put('/preferences', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const {
      morning_brief_time,
      email_notifications,
      push_notifications,
      min_priority,
    } = req.body;

    // Validation min_priority
    if (min_priority && !['critical', 'high', 'medium', 'low'].includes(min_priority)) {
      return res.status(400).json({
        error: 'min_priority invalide. Valeurs acceptées : critical, high, medium, low',
      });
    }

    const result = await pool.query(
      `INSERT INTO portfolio_preferences
         (user_id, morning_brief_time, email_notifications, push_notifications, min_priority, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (user_id) DO UPDATE
         SET morning_brief_time  = COALESCE($2, portfolio_preferences.morning_brief_time),
             email_notifications = COALESCE($3, portfolio_preferences.email_notifications),
             push_notifications  = COALESCE($4, portfolio_preferences.push_notifications),
             min_priority        = COALESCE($5, portfolio_preferences.min_priority),
             updated_at          = NOW()
       RETURNING *`,
      [
        userId,
        morning_brief_time  || null,
        email_notifications != null ? email_notifications : null,
        push_notifications  != null ? push_notifications  : null,
        min_priority        || null,
      ]
    );

    res.json(result.rows[0]);

  } catch (err) {
    console.error('PUT /portfolio/preferences error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/portfolio/insights/history?page=1&limit=10
// Historique des analyses nocturnes (pour graphiques d'évolution).
// ─────────────────────────────────────────────────────────────────────────────
router.get('/insights/history', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const plan   = await getUserPlan(userId);
    const isStart = plan === 'start';

    const { page = 1, limit = 30 } = req.query;
    const offset   = (Math.max(1, parseInt(page)) - 1) * Math.min(90, parseInt(limit));
    const pageSize = Math.min(90, parseInt(limit));

    const [histRes, countRes] = await Promise.all([
      pool.query(
        `SELECT id, generated_at, total_clients, total_contracts, total_premium,
                health_score, status,
                CASE WHEN $2 THEN NULL ELSE health_breakdown END AS health_breakdown,
                CASE WHEN $2 THEN NULL ELSE raw_analysis      END AS raw_analysis
         FROM portfolio_insights
         WHERE user_id = $1 AND status = 'completed'
         ORDER BY generated_at DESC
         LIMIT $3 OFFSET $4`,
        [userId, isStart, pageSize, offset]
      ),
      pool.query(
        `SELECT COUNT(*) FROM portfolio_insights WHERE user_id = $1 AND status = 'completed'`,
        [userId]
      ),
    ]);

    const history = histRes.rows.map(row => ({
      ...row,
      health_score:    isStart ? scoreToRange(row.health_score) : row.health_score,
      total_premium:   parseFloat(row.total_premium || 0),
    }));

    res.json({
      history,
      total:     parseInt(countRes.rows[0].count),
      page:      parseInt(page),
      page_size: pageSize,
      plan,
      upgrade_required: isStart,
    });

  } catch (err) {
    console.error('GET /portfolio/insights/history error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
