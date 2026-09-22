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
const {
  motDePasseInitialDepuisCabinet,
  longueurSuffisante,
} = require('../lib/motDePasseInitial');
const { buildAccessTemplate, LOGIN_URL } = require('../emails/templates/accessTemplates');
const pool = require('../db');
const crypto = require('crypto');
const { messagePublic } = require('../lib/erreursPubliques')
const User = require('../models/User');
const logger = require('../lib/logger');

// Prix mensuels (HT, €) : SOURCE UNIQUE = services/planService (mêmes valeurs que
// la grille publique et Stripe). La table précédente (start 49 / pro 99 / elite 199)
// était une grille périmée : elle affichait un MRR faux dans l'administration.
// « cabinet » est sur devis : prix null, donc 0 € de MRR calculé (jamais inventé).
const { PLANS } = require('../services/planService');
const PLAN_PRICES_EUR = Object.entries(PLANS).reduce((acc, [code, plan]) => {
  acc[code] = typeof plan.price === 'number' ? plan.price : 0;
  return acc;
}, {});

function adminCompletedFilter(columns, alias = '') {
  const prefix = alias ? `${alias}.` : '';
  return columns.has('status') ? `AND ${prefix}status = 'completed'` : '';
}

// Appliquer verifyToken + superAdminGuard sur tout le routeur
router.use(verifyToken, superAdminGuard);

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/super/trials/invite
// Crée un VRAI cabinet en essai AVEC des identifiants utilisables tout de suite.
//
// RÈGLE (décision du 20/09/2026) : plus d'activation obligatoire. L'exploitant
// reçoit l'identifiant (l'e-mail du cabinet) et un MOT DE PASSE INITIAL
// TEMPORAIRE — par défaut le nom du cabinet, première lettre en majuscule, sans
// espace (« Century Finance » → « CenturyFinance »). Le compte est connectable
// immédiatement ; l'essai de 7 jours court dès la création, puisqu'il n'y a plus
// d'activation à attendre.
//
// Le mot de passe n'est jamais stocké en clair (bcrypt, 10 tours, même mécanisme
// que l'inscription) et il est marqué temporaire (`must_change_password`) : le
// cabinet est invité à le remplacer depuis Paramètres > Sécurité.
//
// Aucun envoi automatique : l'e-mail prêt à transmettre est renvoyé à
// l'administrateur (le garde-fou outbound reste en place).
// ─────────────────────────────────────────────────────────────────────────────
router.post('/trials/invite', async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const cabinet = String(req.body?.cabinet_name || '').trim();
    const firstName = String(req.body?.first_name || '').trim();
    const lastName = String(req.body?.last_name || '').trim();
    const joursDemandes = Number(req.body?.duree_essai_jours);
    const jours = Number.isFinite(joursDemandes)
      ? Math.min(90, Math.max(1, Math.trunc(joursDemandes)))
      : billingService.TRIAL_DAYS;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, error: 'email_invalide' });
    }
    if (!cabinet) {
      return res.status(400).json({ success: false, error: 'cabinet_requis', message: 'Le nom du cabinet est requis.' });
    }

    // Jamais d'écrasement silencieux d'un compte existant : on adapte le compte
    // existant sur demande explicite (meme_acces: true), sinon on refuse.
    const existant = await User.findByEmail(email);
    if (existant && req.body?.meme_acces !== true) {
      return res.status(409).json({
        success: false,
        error: 'compte_existant',
        user_id: existant.id,
        plan: existant.plan,
        subscription_status: existant.subscription_status,
        message: 'Un compte existe déjà avec cette adresse. Aucun compte en double n’a été créé.',
      });
    }

    // Mot de passe initial : imposé par l'appelant s'il est fourni, sinon dérivé
    // du nom du cabinet selon la convention (« Century Finance » → « CenturyFinance »).
    const motDePasseImpose = typeof req.body?.mot_de_passe_initial === 'string'
      ? req.body.mot_de_passe_initial.trim()
      : '';
    const motDePasseInitial = motDePasseImpose || motDePasseInitialDepuisCabinet(cabinet);
    if (!motDePasseInitial) {
      return res.status(400).json({
        success: false,
        error: 'mot_de_passe_initial_impossible',
        message: 'Impossible de dériver un mot de passe depuis ce nom de cabinet : fournissez-le explicitement.',
      });
    }

    let user = existant;
    if (!user) {
      const motDePasseScelle = crypto.randomBytes(32).toString('hex');
      user = await User.create(email, motDePasseScelle, firstName || cabinet, lastName || '', 'broker');
    }

    // Accès direct : mot de passe posé, essai ouvert maintenant, essai de N jours.
    const acces = await User.definirAccesDirect(user.id, motDePasseInitial, { jours });
    if (cabinet) {
      await pool.query('UPDATE users SET cabinet_name = $1 WHERE id = $2', [cabinet, user.id]);
    }

    const { rows } = await pool.query(
      'SELECT subscription_status, trial_days, invited_at, trial_started_at, trial_ends_at FROM users WHERE id = $1',
      [user.id]
    );
    const etat = rows[0] || {};

    const emailAcces = buildAccessTemplate({
      email,
      motDePasse: motDePasseInitial,
      cabinet,
      contact: firstName,
      joursEssai: Number(etat.trial_days || jours),
      finEssai: etat.trial_ends_at,
    });

    return res.status(existant ? 200 : 201).json({
      success: true,
      invitation: {
        user_id: user.id,
        email,
        cabinet,
        identifiant: email,
        mot_de_passe_initial: motDePasseInitial,
        mot_de_passe_temporaire: true,
        must_change_password: true,
        mot_de_passe_sous_la_regle_produit: longueurSuffisante(motDePasseInitial),
        url_connexion: LOGIN_URL,
        // L'essai court dès maintenant : il n'y a plus d'activation à attendre.
        essai_debute_le: etat.trial_started_at || null,
        essai_finit_le: etat.trial_ends_at || null,
        essai_demarre_a_lactivation: false,
        statut_compte: etat.subscription_status || 'trialing',
        duree_essai_jours: Number(etat.trial_days || jours),
        compte_cree_le: etat.invited_at || null,
        compte_existant_reutilise: Boolean(existant),
        // Aucun envoi ici, et on ne prétend pas le contraire.
        email_envoye: false,
        raison_absence_envoi: 'aucun_envoi_automatique',
        canal: 'identifiants et e-mail à transmettre par votre canal habituel',
        email_acces: {
          subject: emailAcces.subject,
          html: emailAcces.html,
          text: emailAcces.text,
        },
      },
    });
  } catch (err) {
    logger.error({ err: messagePublic(err) }, '[adminSuperAdmin] POST /trials/invite');
    return res.status(500).json({ success: false, error: 'invitation_failed', message: 'Création du cabinet en essai impossible.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/super/trials
// Suivi des essais : une ligne par cabinet en essai ou sorti d'essai, avec des
// mesures RÉELLES. Aucun score, aucune estimation : un champ sans source est
// laissé à null plutôt que rempli d'une valeur plausible.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/trials', async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        u.id                                        AS user_id,
        u.email,
        COALESCE(NULLIF(u.cabinet_name, ''), NULLIF(TRIM(CONCAT_WS(' ', u.first_name, u.last_name)), ''), u.email) AS cabinet,
        u.plan,
        u.subscription_status,
        u.trial_ends_at,
        u.trial_started_at,
        u.trial_days,
        u.invited_at,
        u.created_at                                AS compte_cree_le,
        CASE
          WHEN u.subscription_status = 'pending_activation' THEN 'TRIAL_PENDING'
          WHEN u.subscription_status = 'trialing' AND u.trial_ends_at > NOW() THEN 'TRIAL_ACTIVE'
          WHEN u.subscription_status = 'trialing' THEN 'TRIAL_EXPIRED'
          WHEN u.subscription_status IN ('active', 'past_due') THEN 'SUBSCRIPTION_ACTIVE'
          ELSE 'NOT_STARTED'
        END                                          AS trial_status,
        CASE
          WHEN u.subscription_status = 'trialing' AND u.trial_ends_at > NOW()
            THEN GREATEST(0, CEIL(EXTRACT(EPOCH FROM (u.trial_ends_at - NOW())) / 86400.0))::int
          ELSE 0
        END                                          AS jours_restants,
        (SELECT COUNT(*) FROM clients c WHERE c.courtier_id = u.id)                    AS clients_crees,
        (SELECT COUNT(*) FROM document_uploads d WHERE d.user_id = u.id)               AS documents_deposes,
        (SELECT COUNT(*) FROM ark_conversations a WHERE a.user_id = u.id)              AS conversations_ark,
        (SELECT COUNT(*) FROM kanban_cards kc JOIN kanban_boards kb ON kc.board_id = kb.id
          WHERE kb.courtier_id = u.id)                                                 AS cartes_pipeline,
        op.completed_at                              AS onboarding_termine_le,
        (CASE WHEN op.step_create_client      THEN 1 ELSE 0 END +
         CASE WHEN op.step_generate_document  THEN 1 ELSE 0 END +
         CASE WHEN op.step_analyze_portfolio THEN 1 ELSE 0 END +
         CASE WHEN op.step_activate_ark_watch THEN 1 ELSE 0 END +
         CASE WHEN op.step_invite_colleague   THEN 1 ELSE 0 END)                       AS etapes_validees,
        GREATEST(
          u.updated_at,
          COALESCE((SELECT MAX(a.created_at) FROM audit_log a WHERE a.user_id = u.id), u.updated_at),
          COALESCE((SELECT MAX(k.updated_at) FROM ark_conversations k WHERE k.user_id = u.id), u.updated_at),
          COALESCE((SELECT MAX(d2.created_at) FROM document_uploads d2 WHERE d2.user_id = u.id), u.updated_at)
        )                                            AS derniere_activite
      FROM users u
      LEFT JOIN onboarding_progress op ON op.user_id = u.id
      WHERE u.subscription_status = 'trialing'
         OR u.plan = 'trial'
         OR u.subscription_status IN ('active', 'past_due')
      ORDER BY u.trial_ends_at DESC NULLS LAST, u.id DESC
      LIMIT 200
    `);

    const essais = rows.map((r) => ({
      ...r,
      // pg renvoie COUNT(*) en chaîne : un compteur d'écran doit être un nombre.
      clients_crees: Number(r.clients_crees) || 0,
      documents_deposes: Number(r.documents_deposes) || 0,
      conversations_ark: Number(r.conversations_ark) || 0,
      cartes_pipeline: Number(r.cartes_pipeline) || 0,
      etapes_validees: Number(r.etapes_validees) || 0,
      jours_restants: Number(r.jours_restants) || 0,
      // Un champ sans mesure reste null : l'écran affiche « — ».
      jours_restants: r.trial_status === 'TRIAL_ACTIVE' ? r.jours_restants : 0,
      // Date de début RÉELLE : posée à l'activation (trial_started_at). Pour un
      // compte invité, aucune date d'essai n'existe encore : null, pas une
      // date fabriquée.
      essai_debute_le: r.trial_started_at
        ? new Date(r.trial_started_at).toISOString()
        : (r.trial_ends_at
          ? new Date(new Date(r.trial_ends_at).getTime() - billingService.TRIAL_DAYS * 86400000).toISOString()
          : null),
      invitation_emise_le: r.invited_at ? new Date(r.invited_at).toISOString() : null,
      duree_essai_jours: Number(r.trial_days || billingService.TRIAL_DAYS),
    }));

    return res.json({
      success: true,
      duree_essai_jours: billingService.TRIAL_DAYS,
      total: essais.length,
      essais,
    });
  } catch (err) {
    logger.error({ err: err.message }, '[adminSuperAdmin] GET /trials');
    return res.status(500).json({ success: false, error: 'trials_unavailable', details: messagePublic(err, { statut: 500 }) });
  }
});

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

    const [planDist, signups30, churn30, arkUsage, portfolioStats, productEvents, activeCabinets, feedbackStats] = await Promise.all([
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
      safeQuery(
        'product_events_recent',
        `SELECT event_name, COUNT(*) AS count
         FROM product_events
         WHERE created_at > NOW() - INTERVAL '30 days'
         GROUP BY event_name
         ORDER BY count DESC
         LIMIT 12`,
        []
      ),
      safeQuery(
        'active_cabinets_30d',
        `SELECT COUNT(DISTINCT COALESCE(organization_id, user_id)) AS count
         FROM product_events
         WHERE created_at > NOW() - INTERVAL '30 days'`,
        [{ count: 0 }]
      ),
      safeQuery(
        'feedback_stats',
        `SELECT status, COUNT(*) AS count
         FROM feedback_items
         GROUP BY status`,
        []
      ),
    ]);

    // Calculer MRR
    const mrrByPlan = {};
    let totalMrr = 0;
    for (const row of planDist.rows) {
      // Un plan inconnu (ex. 'trial') ne produit pas de MRR : on ne lui prête
      // pas un prix par défaut.
      const price = PLAN_PRICES_EUR[row.subscription_plan] ?? 0;
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
      product: {
        active_cabinets_30d: parseInt(activeCabinets.rows[0]?.count || 0),
        events_30d: productEvents.rows,
        feedback_by_status: feedbackStats.rows,
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

    logger.info({ status: newStatus, target_user_id: targetId, admin_user_id: adminId, has_comment: Boolean(comment) }, 'admin iobsp status updated');

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

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/admin/super/users/:id — EFFACEMENT D'UN COMPTE
//
// POURQUOI CETTE ROUTE EXISTE (Red Team RT4-12, mesure du 21/09/2026)
// L'API n'exposait AUCUN chemin d'effacement : cinq formes d'appel ont été
// essayées avec le jeton super_admin (`DELETE /users/:id`, `/trials/:id`,
// `POST /users/:id/delete`, …) et toutes répondaient 404. Deux conséquences
// réelles : le droit à l'effacement du cabinet dépendait d'une intervention
// manuelle en base, et l'état « compte supprimé » n'était même pas
// représentable — donc invérifiable.
//
// CE QUE FAIT « EFFACER », EXACTEMENT (et pourquoi pas un DELETE de ligne)
// Un `DELETE FROM users` casserait le référentiel : des dizaines de tables
// portent `user_id` (documents, commissions, journal d'audit…). Le compte est
// donc EFFACÉ et BLOQUÉ, pas arraché :
//   * identité et coordonnées supprimées (e-mail remplacé par une adresse
//     technique non routable, noms et téléphone vidés) ;
//   * mot de passe rendu inutilisable (hachage aléatoire, jamais communiqué) ;
//   * jetons de réinitialisation et jetons OAuth (Google) supprimés ;
//   * rattachement au cabinet retiré (`cabinet_members.removed_at`) ;
//   * sessions révoquées (`sessions_revoked_at`) : les jetons déjà émis cessent
//     d'être acceptés, y compris ceux qui n'expirent pas tout de suite ;
//   * statut `supprime` : la connexion ne peut plus aboutir (l'e-mail saisi
//     n'existe plus).
// Les lignes métier restent attachées à l'identifiant (traçabilité comptable
// et audit), ce qui est la seule façon de ne pas rendre les documents
// orphelins — c'est dit explicitement dans la réponse.
//
// GARDE-FOUS
//   * super_admin uniquement (le routeur entier est derrière verifyToken +
//     superAdminGuard) ;
//   * `confirmation` DOIT valoir l'e-mail EXACT du compte : une suppression
//     déclenchée par un identifiant seul est une erreur de frappe qui coûte un
//     client ;
//   * auto-suppression refusée ;
//   * dernier super_admin protégé (sinon la plateforme n'a plus d'exploitant).
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/users/:id', async (req, res) => {
  const cible = Number.parseInt(req.params.id, 10);
  const demandeur = Number.parseInt(req.user?.id ?? req.user?.userId, 10);
  const confirmation = String((req.body && req.body.confirmation) || '').trim();

  if (!Number.isFinite(cible) || cible <= 0 || String(cible) !== String(req.params.id).trim()) {
    return res.status(400).json({ error: 'identifiant_invalide', message: "L'identifiant du compte doit être un nombre." });
  }
  if (cible === demandeur) {
    return res.status(409).json({
      error: 'auto_suppression_refusee',
      message: 'Un compte ne peut pas s’effacer lui-même : demandez à un autre administrateur.',
    });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const cibleRes = await client.query(
      'SELECT id, email, role FROM users WHERE id = $1 FOR UPDATE',
      [cible]
    );
    if (cibleRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'not_found', message: 'Compte introuvable.' });
    }
    const compte = cibleRes.rows[0];

    if (confirmation !== compte.email) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: 'confirmation_invalide',
        message: 'Indiquez dans « confirmation » l’adresse e-mail exacte du compte à effacer. Aucun changement n’a été appliqué.',
      });
    }

    if (compte.role === 'super_admin') {
      const autres = await client.query(
        "SELECT COUNT(*)::int AS nombre FROM users WHERE role = 'super_admin' AND id <> $1 AND COALESCE(status, 'active') <> 'supprime'",
        [cible]
      );
      if (autres.rows[0].nombre === 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          error: 'dernier_super_admin',
          message: 'Ce compte est le dernier super administrateur actif : il ne peut pas être effacé.',
        });
      }
    }

    const emailTechnique = `supprime+${cible}@courtia.invalid`;
    // Hachage inutilisable : chaîne aléatoire qui n'est le hachage d'aucun mot de
    // passe. Elle n'est jamais communiquée ni journalisée.
    const hachageInutilisable = `efface:${crypto.randomBytes(32).toString('hex')}`;

    await client.query(
      `UPDATE users
          SET email = $2,
              password_hash = $3,
              first_name = '',
              last_name = '',
              name = NULL,
              full_name = NULL,
              phone = NULL,
              status = 'supprime',
              suspended_at = COALESCE(suspended_at, NOW()),
              suspended_reason = 'effacement_demande',
              sessions_revoked_at = NOW(),
              password_reset_token = NULL,
              password_reset_expires = NULL,
              google_access_token = NULL,
              google_refresh_token = NULL,
              stripe_customer_id = NULL,
              stripe_subscription_id = NULL,
              updated_at = NOW()
        WHERE id = $1`,
      [cible, emailTechnique, hachageInutilisable]
    );

    const adhesion = await client.query(
      'UPDATE cabinet_members SET removed_at = COALESCE(removed_at, NOW()) WHERE user_id = $1 RETURNING cabinet_id',
      [cible]
    );

    const journal = await client.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, changes, ip_address, user_agent)
       VALUES ($1, 'compte_efface', 'user', $2, $3, $4, $5)
       RETURNING id`,
      [
        demandeur,
        cible,
        JSON.stringify({
          cabinets_detaches: adhesion.rows.map((l) => l.cabinet_id),
          champs_effaces: ['email', 'password_hash', 'first_name', 'last_name', 'name', 'full_name', 'phone',
            'password_reset_token', 'google_access_token', 'google_refresh_token',
            'stripe_customer_id', 'stripe_subscription_id'],
          statut: 'supprime',
        }),
        req.ip || null,
        String(req.headers['user-agent'] || '').slice(0, 200),
      ]
    );

    await client.query('COMMIT');

    return res.json({
      success: true,
      compte_efface: {
        id: cible,
        statut: 'supprime',
        sessions_revoquees: true,
        cabinets_detaches: adhesion.rows.length,
        journal_id: journal.rows[0].id,
      },
      // Ce qui RESTE, dit sans ambiguïté : les lignes métier rattachées à
      // l'identifiant (documents, commissions, journal) ne sont pas supprimées —
      // les effacer rendrait les documents du cabinet orphelins et romprait la
      // traçabilité comptable. Aucune donnée personnelle n'y subsiste côté compte.
      reste: 'Les documents et écritures du cabinet rattachés à cet identifiant sont conservés (traçabilité) ; le compte, lui, ne peut plus se connecter ni écrire.',
    });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) { /* la transaction est déjà terminée */ }
    logger.error({ err, cible }, 'effacement de compte en échec');
    return res.status(500).json({ error: 'effacement_echoue', message: messagePublic(err, { statut: 500 }) });
  } finally {
    client.release();
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// RÉCONCILIATION STRIPE -> BASE (audit Stripe du 22/09/2026)
//
// POURQUOI : le webhook était le SEUL chemin d'écriture de l'état d'abonnement.
// Un webhook perdu laissait un cabinet payant sans droits (ou résilié avec
// droits) sans que rien ne le signale. Cette route compare l'état Stripe réel à
// la base et corrige la base — jamais l'inverse.
//
// GARANTIES : Stripe est lu seul (aucune écriture chez Stripe), la base n'est
// jamais purgée (un abonnement absent de Stripe est SIGNALÉ, pas supprimé), un
// abonnement dont le plan n'est pas identifiable n'est jamais deviné, et le
// rapport est conservé (billing_reconciliation_runs) pour être relu.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/billing/reconciliation', async (_req, res) => {
  try {
    const stripeService = require('../services/stripeService');
    if (!stripeService.isConfigured()) {
      return res.status(503).json({
        success: false,
        error: 'stripe_configuration_required',
        message: 'Réconciliation impossible : la clé secrète Stripe n\'est pas configurée sur ce serveur.',
        stripe_configuration: stripeService.getConfigurationStatus(),
      });
    }
    const reconciliation = require('../services/billingReconciliationService');
    const rapport = await reconciliation.reconcilierTous({
      stripe: stripeService.getStripeClient(),
      query: (sql, params) => pool.query(sql, params),
      getPlanId: (code) => billingService.getPlanId(code),
      prixVersPlan: stripeService.getPrixVersPlan(),
      journaliser: (resume, message) => logger.info(resume, message),
    });
    return res.json({ success: true, mode: stripeService.getBillingMode(), rapport });
  } catch (err) {
    logger.error({ err: err.message }, '[admin] réconciliation Stripe en échec');
    return res.status(500).json({ success: false, error: 'reconciliation_echouee', message: messagePublic(err, { statut: 500 }) });
  }
});

router.get('/billing/reconciliation/runs', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, started_at, finished_at, mode, clients_examines, abonnements_examines, corrections, erreurs
         FROM billing_reconciliation_runs
        ORDER BY started_at DESC
        LIMIT 20`
    );
    return res.json({ success: true, runs: rows });
  } catch (err) {
    if (err?.code === '42P01') return res.json({ success: true, runs: [], note: 'aucune réconciliation enregistrée (table absente)' });
    return res.status(500).json({ success: false, error: 'runs_indisponibles', message: messagePublic(err, { statut: 500 }) });
  }
});

module.exports = router;
