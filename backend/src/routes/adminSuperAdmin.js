/**
 * adminSuperAdmin.js — Routes /api/admin/* — Super Admin uniquement
 *
 * Toutes les routes exigent : verifyToken + superAdminGuard
 *
 * GET  /api/admin/users                   → liste tous les courtiers (filtres)
 * GET  /api/admin/users/:id               → détail d'un courtier
 * POST /api/admin/impersonate/:userId     → démarre impersonation
 * POST /api/admin/impersonate/stop        → arrête impersonation
 * GET  /api/admin/impersonation/logs      → historique paginé
 * GET  /api/admin/analytics               → MRR, churn, signups, ARK usage
 * GET  /api/admin/iobsp/pending           → attestations IOBSP en attente
 * PATCH /api/admin/iobsp/:userId          → approve/reject attestation
 *
 * MRR : mapping hardcodé (plan_limits n'a pas de price_monthly)
 */

const express         = require('express');
const router          = express.Router();
const { verifyToken } = require('../middleware/auth');
const superAdminGuard = require('../middleware/superAdminGuard');
const {
  startImpersonation,
  stopImpersonation,
} = require('../services/impersonationService');
const {
  getPortfolioInsightColumns,
  getPortfolioInsightTimestampColumn,
  getPortfolioTimestampOrder,
  getPortfolioTimestampSelect,
  selectPortfolioColumn,
} = require('../utils/portfolioSchema');
const billingService = require('../services/billingService');
const pool = require('../db');

// Prix mensuels par plan (HT, €) — à synchroniser avec les prix Stripe
const PLAN_PRICES_EUR = { start: 49, pro: 99, elite: 199 };

function adminCompletedFilter(columns, alias = '') {
  const prefix = alias ? `${alias}.` : '';
  return columns.has('status') ? `AND ${prefix}status = 'completed'` : '';
}

// Appliquer verifyToken + superAdminGuard sur tout le routeur
router.use(verifyToken, superAdminGuard);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/super/billing
// Vue abonnements/essais/consentements (super_admin only)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/billing', async (_req, res) => {
  try {
    await billingService.ensureBillingFoundation();

    const result = await pool.query(
      `SELECT
         op.id AS organization_id,
         op.cabinet_name,
         op.siret,
         op.orias,
         u.id AS user_id,
         u.email,
         u.first_name,
         u.last_name,
         COALESCE(bp.code, 'starter') AS plan_code,
         COALESCE(sub.status, 'not_started') AS subscription_status,
         sub.trial_end_at,
         sub.current_period_end,
         sub.cancel_at_period_end,
         cbp.stripe_customer_id,
         la.accepted_at AS last_legal_acceptance_at
       FROM organization_profiles op
       JOIN users u ON u.id = op.owner_user_id
       LEFT JOIN LATERAL (
         SELECT s.* FROM subscriptions s
         WHERE s.organization_id = op.id
         ORDER BY s.updated_at DESC, s.id DESC
         LIMIT 1
       ) sub ON TRUE
       LEFT JOIN billing_plans bp ON bp.id = sub.plan_id
       LEFT JOIN customer_billing_profiles cbp ON cbp.organization_id = op.id
       LEFT JOIN LATERAL (
         SELECT accepted_at FROM legal_acceptances l
         WHERE l.organization_id = op.id
         ORDER BY accepted_at DESC, id DESC
         LIMIT 1
       ) la ON TRUE
       ORDER BY op.created_at DESC`
    );

    const rows = result.rows.map((r) => ({
      ...r,
      stripe_customer_id_masked: r.stripe_customer_id
        ? `${r.stripe_customer_id.slice(0, 6)}***${r.stripe_customer_id.slice(-4)}`
        : null,
    }));

    res.json({ total: rows.length, organizations: rows });
  } catch (err) {
    console.error('GET /admin/super/billing error:', err.message);
    res.status(500).json({ error: 'Impossible de récupérer la vue billing admin.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/super/billing/:organizationId
// Détail billing d'une organisation (super_admin only)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/billing/:organizationId', async (req, res) => {
  try {
    await billingService.ensureBillingFoundation();
    const organizationId = parseInt(req.params.organizationId, 10);
    if (Number.isNaN(organizationId)) {
      return res.status(400).json({ error: 'organizationId invalide' });
    }

    const [orgRes, subRes, legalRes, eventsRes, invoicesRes] = await Promise.all([
      pool.query(
        `SELECT op.*, u.email, u.first_name, u.last_name
         FROM organization_profiles op
         JOIN users u ON u.id = op.owner_user_id
         WHERE op.id = $1
         LIMIT 1`,
        [organizationId]
      ),
      pool.query(
        `SELECT s.*, bp.code AS plan_code, bp.display_name AS plan_name
         FROM subscriptions s
         LEFT JOIN billing_plans bp ON bp.id = s.plan_id
         WHERE s.organization_id = $1
         ORDER BY s.updated_at DESC, s.id DESC
         LIMIT 1`,
        [organizationId]
      ),
      pool.query(
        `SELECT doc_type, doc_version, accepted_at, user_id
         FROM legal_acceptances
         WHERE organization_id = $1
         ORDER BY accepted_at DESC, id DESC
         LIMIT 20`,
        [organizationId]
      ),
      pool.query(
        `SELECT event_id, event_type, processed_at, created_at
         FROM payment_events
         WHERE organization_id = $1
         ORDER BY created_at DESC, id DESC
         LIMIT 20`,
        [organizationId]
      ),
      pool.query(
        `SELECT provider_invoice_id, status, amount_cents, currency, paid_at, due_at, created_at
         FROM invoices
         WHERE organization_id = $1
         ORDER BY created_at DESC, id DESC
         LIMIT 20`,
        [organizationId]
      ),
    ]);

    if (!orgRes.rows[0]) {
      return res.status(404).json({ error: 'Organisation introuvable' });
    }

    res.json({
      organization: orgRes.rows[0],
      subscription: subRes.rows[0] || null,
      legal_acceptances: legalRes.rows,
      payment_events: eventsRes.rows,
      invoices: invoicesRes.rows,
    });
  } catch (err) {
    console.error('GET /admin/super/billing/:organizationId error:', err.message);
    res.status(500).json({ error: 'Impossible de récupérer le détail billing.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/users
// Liste paginée de tous les courtiers avec métriques clés.
// Query params : ?plan=start|pro|elite&status=active&search=email_ou_nom&page=1&limit=20
// ─────────────────────────────────────────────────────────────────────────────
router.get('/users', async (req, res) => {
  try {
    const { plan, status, search, page = 1, limit = 20 } = req.query;

    const conditions = ["u.role != 'super_admin'"];
    const params     = [];

    if (plan) {
      params.push(plan);
      conditions.push(`u.subscription_plan = $${params.length}`);
    }
    if (status) {
      params.push(status);
      conditions.push(`u.subscription_status = $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`);
      const p = params.length;
      conditions.push(`(u.email ILIKE $${p} OR u.first_name ILIKE $${p} OR u.last_name ILIKE $${p})`);
    }

    const offset   = (Math.max(1, parseInt(page)) - 1) * Math.min(100, parseInt(limit));
    const pageSize = Math.min(100, parseInt(limit));
    const where    = 'WHERE ' + conditions.join(' AND ');

    const [usersRes, countRes] = await Promise.all([
      pool.query(
        `SELECT u.id, u.email, u.first_name, u.last_name, u.role,
                u.subscription_plan, u.subscription_status, u.created_at,
                u.iobsp_status, u.suspended_at,
                bp.cabinet, bp.orias,
                (SELECT COUNT(*) FROM clients c WHERE c.courtier_id = u.id) AS clients_count,
                (SELECT COUNT(*) FROM quotes q JOIN clients c ON q.client_id = c.id WHERE c.courtier_id = u.id) AS contracts_count,
                (SELECT MAX(ac.created_at) FROM ark_conversations ac
                   JOIN clients c ON ac.client_id = c.id WHERE c.courtier_id = u.id) AS last_ark_activity
         FROM users u
         LEFT JOIN broker_profiles bp ON bp.user_id = u.id
         ${where}
         ORDER BY u.created_at DESC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, pageSize, offset]
      ),
      pool.query(
        `SELECT COUNT(*) FROM users u ${where}`,
        params
      ),
    ]);

    res.json({
      users:     usersRes.rows,
      total:     parseInt(countRes.rows[0].count),
      page:      parseInt(page),
      page_size: pageSize,
    });

  } catch (err) {
    console.error('GET /admin/users error:', err.message);
    try {
      const { search, page = 1, limit = 20 } = req.query;
      const params = [];
      const conditions = ["u.role != 'super_admin'"];
      if (search) {
        params.push(`%${search}%`);
        const p = params.length;
        conditions.push(`(u.email ILIKE $${p} OR u.first_name ILIKE $${p} OR u.last_name ILIKE $${p})`);
      }

      const offset = (Math.max(1, parseInt(page, 10)) - 1) * Math.min(100, parseInt(limit, 10));
      const pageSize = Math.min(100, parseInt(limit, 10));
      const where = 'WHERE ' + conditions.join(' AND ');

      const [usersRes, countRes] = await Promise.all([
        pool.query(
          `SELECT u.id, u.email, u.first_name, u.last_name, u.role,
                  'start'::text AS subscription_plan,
                  'active'::text AS subscription_status,
                  u.created_at,
                  NULL::text AS iobsp_status,
                  NULL::timestamptz AS suspended_at,
                  bp.cabinet, bp.orias,
                  (SELECT COUNT(*) FROM clients c WHERE c.courtier_id = u.id) AS clients_count,
                  (SELECT COUNT(*) FROM quotes q JOIN clients c ON q.client_id = c.id WHERE c.courtier_id = u.id) AS contracts_count,
                  (SELECT MAX(ac.created_at) FROM ark_conversations ac
                     JOIN clients c ON ac.client_id = c.id WHERE c.courtier_id = u.id) AS last_ark_activity
           FROM users u
           LEFT JOIN broker_profiles bp ON bp.user_id = u.id
           ${where}
           ORDER BY u.created_at DESC
           LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
          [...params, pageSize, offset]
        ),
        pool.query(
          `SELECT COUNT(*) FROM users u ${where}`,
          params
        ),
      ]);

      return res.json({
        users: usersRes.rows,
        total: parseInt(countRes.rows[0].count, 10),
        page: parseInt(page, 10),
        page_size: pageSize,
      });
    } catch (fallbackErr) {
      console.error('GET /admin/users fallback error:', fallbackErr.message);
      res.status(500).json({ error: 'Erreur lors de la récupération des utilisateurs.' });
    }
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/users/:id
// Détail complet d'un courtier : profil, abonnement, usage, dernière activité.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/users/:id', async (req, res) => {
  try {
    const targetId = parseInt(req.params.id);
    if (isNaN(targetId)) {
      return res.status(400).json({ error: 'ID invalide' });
    }
    const insightColumns = await getPortfolioInsightColumns(pool);
    const timestampColumn = await getPortfolioInsightTimestampColumn(pool);
    const timestampSelect = getPortfolioTimestampSelect(timestampColumn);
    const timestampOrder = getPortfolioTimestampOrder(timestampColumn);
    const statusWhere = adminCompletedFilter(insightColumns, 'pi');
    const gradeSelect = insightColumns.has('raw_analysis') ? "pi.raw_analysis->>'grade' AS grade" : 'NULL::text AS grade';

    const [userRes, metricsRes, arkRes, insightRes] = await Promise.all([
      pool.query(
        `SELECT u.id, u.email, u.first_name, u.last_name, u.role,
                u.subscription_plan, u.subscription_status,
                u.grace_period_until, u.suspended_at, u.suspended_reason,
                u.founder_pricing, u.trial_ends_at, u.stripe_customer_id,
                u.iobsp_status, u.iobsp_orias_number, u.iobsp_category,
                u.iobsp_attestation_url, u.iobsp_requested_at,
                u.iobsp_approved_at, u.created_at,
                bp.cabinet, bp.orias, bp.telephone, bp.adresse, bp.ville
         FROM users u
         LEFT JOIN broker_profiles bp ON bp.user_id = u.id
         WHERE u.id = $1`,
        [targetId]
      ),
      pool.query(
        `SELECT
           (SELECT COUNT(*) FROM clients c WHERE c.courtier_id = $1)         AS clients_count,
           (SELECT COUNT(*) FROM quotes q JOIN clients c ON q.client_id = c.id
            WHERE c.courtier_id = $1)                                          AS contracts_count,
           (SELECT COUNT(*) FROM taches t WHERE t.courtier_id = $1
            AND t.status != 'done')                                            AS pending_tasks,
           (SELECT COUNT(*) FROM ark_conversations ac
            JOIN clients c ON ac.client_id = c.id WHERE c.courtier_id = $1)   AS ark_conversations_total,
           (SELECT COUNT(*) FROM ark_conversations ac
            JOIN clients c ON ac.client_id = c.id WHERE c.courtier_id = $1
            AND ac.created_at > NOW() - INTERVAL '30 days')                   AS ark_conversations_30d`,
        [targetId]
      ),
      pool.query(
        `SELECT MAX(ac.created_at) AS last_ark
         FROM ark_conversations ac
         JOIN clients c ON ac.client_id = c.id
         WHERE c.courtier_id = $1`,
        [targetId]
      ),
      pool.query(
        `SELECT ${selectPortfolioColumn(insightColumns, 'health_score', 'NULL::integer')},
                ${gradeSelect},
                ${timestampSelect}
         FROM portfolio_insights pi
         WHERE pi.user_id = $1 ${statusWhere}
         ORDER BY ${timestampOrder} DESC LIMIT 1`,
        [targetId]
      ),
    ]);

    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    const metrics = metricsRes.rows[0] || {};

    // Historique impersonation sur ce user
    const impLogRes = await pool.query(
      `SELECT id, admin_user_id, started_at, ended_at, reason, actions_count
       FROM admin_impersonation_log
       WHERE target_user_id = $1
       ORDER BY started_at DESC LIMIT 10`,
      [targetId]
    );

    res.json({
      user:                 userRes.rows[0],
      metrics: {
        clients_count:           parseInt(metrics.clients_count || 0),
        contracts_count:         parseInt(metrics.contracts_count || 0),
        pending_tasks:           parseInt(metrics.pending_tasks || 0),
        ark_conversations_total: parseInt(metrics.ark_conversations_total || 0),
        ark_conversations_30d:   parseInt(metrics.ark_conversations_30d || 0),
        last_ark_activity:       arkRes.rows[0]?.last_ark || null,
      },
      portfolio:            insightRes.rows[0] || null,
      impersonation_history: impLogRes.rows,
    });

  } catch (err) {
    console.error('GET /admin/users/:id error:', err.message);
    res.status(500).json({ error: 'Erreur lors de la récupération du profil utilisateur.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/impersonate/stop
// ⚠️  Cette route DOIT être définie AVANT /impersonate/:userId
//     sinon Express matche "stop" comme :userId.
// Body : { log_id: "uuid" }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/impersonate/stop', async (req, res) => {
  try {
    const adminId = req.user.id || req.user.userId;

    // Récupérer le log_id depuis le body OU depuis le contexte d'impersonation du JWT
    const logId = req.body.log_id || req.user.impersonation?.log_id;

    if (!logId) {
      return res.status(400).json({ error: 'log_id requis (body ou JWT)' });
    }

    const result = await stopImpersonation(adminId, logId);

    res.json({
      message:       'Impersonation terminée. Session admin restaurée.',
      token:         result.token,
      duration_min:  Math.round(result.durationMs / 60000),
      actions_count: result.actionsCount,
    });

  } catch (err) {
    console.error('POST /admin/impersonate/stop error:', err.message);
    res.status(err.status || 500).json({ error: 'Erreur lors de l\'arrêt de l\'impersonation.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/impersonate/:userId
// Démarre une session d'impersonation.
// Body : { reason: string (obligatoire) }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/impersonate/:userId', async (req, res) => {
  try {
    const adminId    = req.user.id || req.user.userId;
    const targetId   = parseInt(req.params.userId);
    const { reason } = req.body;

    if (isNaN(targetId)) {
      return res.status(400).json({ error: 'userId invalide' });
    }
    if (!reason || reason.trim().length < 5) {
      return res.status(400).json({
        error: 'Raison requise (min 5 caractères) — obligatoire pour la traçabilité légale',
      });
    }
    if (targetId === adminId) {
      return res.status(400).json({ error: 'Impossible de s\'impersonner soi-même' });
    }

    const ip        = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;
    const userAgent = req.headers['user-agent'] || null;

    const result = await startImpersonation(adminId, targetId, {
      reason: reason.trim(),
      ip,
      userAgent,
    });

    res.json({
      message:     `Impersonation démarrée — vous agissez en tant que user ${targetId}`,
      token:       result.token,
      log_id:      result.logId,
      target_user: {
        id:    result.targetUser.id,
        email: result.targetUser.email,
        plan:  result.targetUser.subscription_plan,
      },
    });

  } catch (err) {
    console.error('POST /admin/impersonate/:userId error:', err.message);
    res.status(err.status || 500).json({ error: 'Erreur lors du démarrage de l\'impersonation.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/impersonation/logs?page=1&limit=20&target_id=X
// Historique paginé des impersonations.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/impersonation/logs', async (req, res) => {
  try {
    const { target_id, page = 1, limit = 20 } = req.query;
    const pageSize = Math.min(100, parseInt(limit, 10));
    const tableCheck = await pool.query(`SELECT to_regclass('public.admin_impersonation_log') AS table_name`);
    if (!tableCheck.rows[0]?.table_name) {
      return res.json({
        logs: [],
        total: 0,
        page: parseInt(page, 10),
        page_size: pageSize,
      });
    }

    const conditions = [];
    const params     = [];

    if (target_id) {
      params.push(parseInt(target_id));
      conditions.push(`ail.target_user_id = $${params.length}`);
    }

    const where    = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
    const offset   = (Math.max(1, parseInt(page)) - 1) * pageSize;

    const [logsRes, countRes] = await Promise.all([
      pool.query(
        `SELECT ail.id, ail.admin_user_id, ail.target_user_id,
                ail.ip_address, ail.reason,
                ail.started_at, ail.ended_at, ail.actions_count,
                au.email AS admin_email,
                tu.email AS target_email,
                tu.first_name AS target_first_name,
                tu.last_name  AS target_last_name
         FROM admin_impersonation_log ail
         JOIN users au ON au.id = ail.admin_user_id
         JOIN users tu ON tu.id = ail.target_user_id
         ${where}
         ORDER BY ail.started_at DESC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, pageSize, offset]
      ),
      pool.query(
        `SELECT COUNT(*) FROM admin_impersonation_log ail ${where}`,
        params
      ),
    ]);

    res.json({
      logs:      logsRes.rows,
      total:     parseInt(countRes.rows[0].count),
      page:      parseInt(page),
      page_size: pageSize,
    });

  } catch (err) {
    console.error('GET /admin/impersonation/logs error:', err.message);
    res.status(500).json({ error: 'Erreur lors de la récupération des logs d\'impersonation.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/analytics
// MRR par plan, churn 30j, signups 30j, usage ARK moyen.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/analytics', async (req, res) => {
  try {
    const safeQuery = async (label, sql, fallbackRows = [{}]) => {
      try {
        return await pool.query(sql);
      } catch (error) {
        console.warn(`[admin/analytics] fallback on ${label}: ${error.message}`);
        return { rows: fallbackRows };
      }
    };

    const insightColumns = await getPortfolioInsightColumns(pool);
    const timestampColumn = await getPortfolioInsightTimestampColumn(pool);
    const portfolioWhere = [];
    if (insightColumns.has('status')) portfolioWhere.push("status = 'completed'");
    if (timestampColumn) portfolioWhere.push(`${timestampColumn} > NOW() - INTERVAL '30 days'`);
    const portfolioWhereSql = portfolioWhere.length ? `WHERE ${portfolioWhere.join(' AND ')}` : '';
    const portfolioScoreStats = insightColumns.has('health_score')
      ? `ROUND(AVG(health_score), 1) AS avg_health_score,
         COUNT(*) FILTER (WHERE health_score >= 70) AS portfolios_healthy`
      : `0::numeric AS avg_health_score,
         0::integer AS portfolios_healthy`;

    const [planDist, signups30, churn30, arkUsage, portfolioStats] = await Promise.all([
      // Distribution des plans actifs
      safeQuery(
        'plan distribution',
        `SELECT subscription_plan, COUNT(*) AS count
         FROM users
         WHERE subscription_status IN ('active','trialing')
           AND role != 'super_admin'
         GROUP BY subscription_plan
         ORDER BY subscription_plan`,
        []
      ),
      // Nouveaux inscrits sur 30j
      safeQuery(
        'signups_30d',
        `SELECT COUNT(*) AS count
         FROM users
         WHERE created_at > NOW() - INTERVAL '30 days'
           AND role != 'super_admin'`,
        [{ count: 0 }]
      ),
      // Churns sur 30j (suspended ou cancelled récents)
      safeQuery(
        'churn_30d',
        `SELECT COUNT(*) AS count
         FROM users
         WHERE subscription_status IN ('suspended','cancelled')
           AND suspended_at > NOW() - INTERVAL '30 days'
           AND role != 'super_admin'`,
        [{ count: 0 }]
      ),
      // Usage ARK moyen par user (30j)
      safeQuery(
        'ark_usage_30d',
        `SELECT
           COUNT(DISTINCT ac.client_id) AS total_ark_conversations_30d,
           COUNT(DISTINCT c.courtier_id) AS active_users_ark_30d,
           ROUND(AVG(per_user.cnt), 1) AS avg_ark_per_user_30d
         FROM (
           SELECT c.courtier_id, COUNT(ac.id) AS cnt
           FROM ark_conversations ac
           JOIN clients c ON ac.client_id = c.id
           WHERE ac.created_at > NOW() - INTERVAL '30 days'
           GROUP BY c.courtier_id
         ) per_user
         JOIN clients c ON c.courtier_id = per_user.courtier_id
         JOIN ark_conversations ac ON ac.client_id = c.id
           AND ac.created_at > NOW() - INTERVAL '30 days'`,
        [{ total_ark_conversations_30d: 0, active_users_ark_30d: 0, avg_ark_per_user_30d: 0 }]
      ),
      // Stats portefeuilles
      safeQuery(
        'portfolio_stats_30d',
        `SELECT
           COUNT(*) AS total_analyses,
           ${portfolioScoreStats}
         FROM portfolio_insights
         ${portfolioWhereSql}`,
        [{ total_analyses: 0, avg_health_score: 0, portfolios_healthy: 0 }]
      ),
    ]);

    // Calculer MRR
    const mrrByPlan = {};
    let totalMrr = 0;
    for (const row of planDist.rows) {
      const price = PLAN_PRICES_EUR[row.subscription_plan] || 0;
      const mrr   = parseInt(row.count) * price;
      mrrByPlan[row.subscription_plan] = {
        count: parseInt(row.count),
        price_eur: price,
        mrr_eur: mrr,
      };
      totalMrr += mrr;
    }

    // Total users actifs
    const totalActive = Object.values(mrrByPlan).reduce((s, v) => s + v.count, 0);

    res.json({
      mrr: {
        total_eur: totalMrr,
        by_plan:   mrrByPlan,
        currency:  'EUR',
        note:      'Basé sur prix catalogue HT — exclut réductions Stripe',
      },
      users: {
        total_active:  totalActive,
        signups_30d:   parseInt(signups30.rows[0]?.count || 0),
        churns_30d:    parseInt(churn30.rows[0]?.count || 0),
        churn_rate_30d: totalActive > 0
          ? Math.round(parseInt(churn30.rows[0]?.count || 0) / totalActive * 1000) / 10
          : 0,
      },
      ark: {
        total_conversations_30d: parseInt(arkUsage.rows[0]?.total_ark_conversations_30d || 0),
        active_users_30d:        parseInt(arkUsage.rows[0]?.active_users_ark_30d || 0),
        avg_per_user_30d:        parseFloat(arkUsage.rows[0]?.avg_ark_per_user_30d || 0),
      },
      portfolio: {
        total_analyses_30d:  parseInt(portfolioStats.rows[0]?.total_analyses || 0),
        avg_health_score:    parseFloat(portfolioStats.rows[0]?.avg_health_score || 0),
        healthy_portfolios:  parseInt(portfolioStats.rows[0]?.portfolios_healthy || 0),
      },
      generated_at: new Date().toISOString(),
    });

  } catch (err) {
    console.error('GET /admin/analytics error:', err.message);
    res.status(500).json({ error: 'Erreur lors de la récupération des analyses.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/iobsp/pending
// Courtiers ayant soumis une demande IOBSP en attente de validation.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/iobsp/pending', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.email, u.first_name, u.last_name,
              u.subscription_plan, u.iobsp_status,
              u.iobsp_orias_number, u.iobsp_category,
              u.iobsp_attestation_url, u.iobsp_requested_at,
              bp.cabinet, bp.orias, bp.telephone,
              (SELECT COUNT(*) FROM clients c WHERE c.courtier_id = u.id) AS clients_count
       FROM users u
       LEFT JOIN broker_profiles bp ON bp.user_id = u.id
       WHERE u.iobsp_status = 'pending'
       ORDER BY u.iobsp_requested_at ASC`
    );

    res.json({
      pending:       result.rows,
      total_pending: result.rows.length,
    });

  } catch (err) {
    console.error('GET /admin/iobsp/pending error:', err.message);
    res.status(500).json({ error: 'Erreur lors de la récupération des demandes IOBSP.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/admin/iobsp/:userId
// Approuver ou rejeter une demande IOBSP.
// Body : { action: 'approve' | 'reject', comment?: string }
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/iobsp/:userId', async (req, res) => {
  try {
    const adminId  = req.user.id || req.user.userId;
    const targetId = parseInt(req.params.userId);
    const { action, comment } = req.body;

    if (isNaN(targetId)) {
      return res.status(400).json({ error: 'userId invalide' });
    }
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'action invalide. Valeurs : approve, reject' });
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    const result = await pool.query(
      `UPDATE users
       SET iobsp_status             = $1,
           iobsp_approved_at        = CASE WHEN $1 = 'approved' THEN NOW() ELSE NULL END,
           iobsp_approved_by        = $2,
           -- Active/désactive le module CAPITIA selon la décision admin
           financing_module_active  = CASE WHEN $1 = 'approved' THEN TRUE ELSE FALSE END
       WHERE id = $3 AND iobsp_status = 'pending'
       RETURNING id, email, first_name, iobsp_status, iobsp_approved_at, financing_module_active`,
      [newStatus, adminId, targetId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Utilisateur non trouvé, non en statut pending, ou accès refusé',
      });
    }

    const user = result.rows[0];

    // Log immuable de la décision
    await pool.query(
      `INSERT INTO admin_action_log
         (impersonation_id, admin_user_id, target_user_id,
          action_type, endpoint, http_method, request_body, response_status, performed_at)
       VALUES (NULL, $1, $2, $3, '/api/admin/iobsp/:userId', 'PATCH', $4, 200, NOW())`,
      [
        adminId,
        targetId,
        `iobsp_${newStatus}`,
        JSON.stringify({ action, comment: comment || null }),
      ]
    );

    console.log(`[admin/iobsp] ${newStatus.toUpperCase()} user ${targetId} (${user.email}) par admin ${adminId}${comment ? ' — ' + comment : ''}`);

    res.json({
      message: `Attestation IOBSP ${newStatus === 'approved' ? 'approuvée' : 'rejetée'}.`,
      user: {
        id:                      user.id,
        email:                   user.email,
        first_name:              user.first_name,
        iobsp_status:            user.iobsp_status,
        iobsp_approved_at:       user.iobsp_approved_at,
        financing_module_active: user.financing_module_active,
      },
      capitia_module_enabled: user.financing_module_active === true,
      comment: comment || null,
    });

  } catch (err) {
    console.error('PATCH /admin/iobsp/:userId error:', err.message);
    res.status(500).json({ error: 'Erreur lors de la validation IOBSP.' });
  }
});

module.exports = router;
