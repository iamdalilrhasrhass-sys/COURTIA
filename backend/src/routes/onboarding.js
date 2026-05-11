const express = require('express');
const { verifyToken } = require('../middleware/auth');
const pool = require('../db');
const cabinetMembershipService = require('../services/cabinetMembershipService');
const { logAudit } = require('../lib/audit');
const { isFeatureEnabled } = require('../lib/featureFlags');
const logger = require('../lib/logger');
const telegramService = require('../services/telegramService');

const router = express.Router();

const STEP_DETAILS = [
  {
    key: 'profile',
    title: 'Profil cabinet',
    description: 'Posez le socle de votre cockpit : nom du cabinet, ville et spécialités.',
  },
  {
    key: 'import',
    title: 'Import clients',
    description: 'Préparez votre portefeuille avec un CSV ou passez cette étape pour démarrer vite.',
  },
  {
    key: 'google',
    title: 'Google Agenda / Gmail',
    description: 'Connecteurs prêts à activer. L’étape peut être validée même sans secrets OAuth.',
  },
  {
    key: 'first_client',
    title: 'Première fiche client',
    description: 'Créez ou ouvrez une fiche pour voir COURTIA en contexte métier.',
  },
  {
    key: 'first_brief',
    title: 'Premier Morning Brief',
    description: 'Générez vos premières priorités ARK.',
  },
];

function progressToApi(progress) {
  const completed = STEP_DETAILS.filter((step) => progress[`step_${step.key}_done`]).length;
  return {
    ...progress,
    steps: STEP_DETAILS.map((step) => ({
      ...step,
      done: Boolean(progress[`step_${step.key}_done`]),
    })),
    completed_count: completed,
    total_count: STEP_DETAILS.length,
    completion_percent: Math.round((completed / STEP_DETAILS.length) * 100),
  };
}

async function getCabinetContext(req) {
  const membership = await cabinetMembershipService.ensureUserCabinet(pool, req.user);
  return { membership, cabinetId: membership.cabinet_id };
}

async function ensureOnboardingFeature(req, cabinetId) {
  if (req.user?.role === 'super_admin') return true;
  return isFeatureEnabled({
    userId: cabinetMembershipService.getSafeUserId(req.user),
    cabinetId: String(cabinetId || ''),
    key: 'v1_members_onboarding',
  });
}

router.get('/', async (req, res) => {
  try {
    const { membership, cabinetId } = await getCabinetContext(req);
    if (!(await ensureOnboardingFeature(req, cabinetId))) {
      return res.status(403).json({
        error: 'feature_disabled',
        message: 'L’onboarding cabinet V1 est désactivé pour ce cabinet.',
        feature_flag: 'v1_members_onboarding',
      });
    }
    const progress = await cabinetMembershipService.getOnboardingProgress(pool, cabinetId);
    res.json({
      cabinet: {
        id: cabinetId,
        name: membership.cabinet_name || 'Cabinet COURTIA',
        role: membership.role,
        orias_number: membership.orias_number || '',
      },
      progress: progressToApi(progress),
    });
  } catch (error) {
    res.status(error.status || 500).json({
      error: error.code || 'onboarding_unavailable',
      message: 'Onboarding indisponible pour le moment.',
    });
  }
});

router.post('/step', async (req, res) => {
  try {
    const { step, payload = {} } = req.body || {};
    const { membership, cabinetId } = await getCabinetContext(req);
    if (!(await ensureOnboardingFeature(req, cabinetId))) {
      return res.status(403).json({
        error: 'feature_disabled',
        message: 'L’onboarding cabinet V1 est désactivé pour ce cabinet.',
        feature_flag: 'v1_members_onboarding',
      });
    }

    if (step === 'profile') {
      await pool.query(
        `UPDATE cabinets
         SET name = COALESCE(NULLIF($1, ''), name),
             orias_number = NULLIF($2, ''),
             city = NULLIF($3, ''),
             updated_at = NOW()
         WHERE id = $4`,
        [
          String(payload.cabinet_name || payload.cabinet || '').trim(),
          String(payload.orias_number || payload.orias || '').trim(),
          String(payload.city || payload.ville || '').trim(),
          cabinetId,
        ]
      );
    }

    const progress = await cabinetMembershipService.markOnboardingStep(pool, cabinetId, step);
    await logAudit({
      cabinetId,
      userId: cabinetMembershipService.getSafeUserId(req.user),
      entityType: 'onboarding_progress',
      entityId: cabinetId,
      action: `step_${step}_completed`,
      metadata: { step, role: membership.role },
      req,
    }).catch(() => {});

    res.json({ success: true, progress: progressToApi(progress) });
  } catch (error) {
    res.status(error.status || 500).json({
      error: error.code || 'onboarding_step_failed',
      message: error.message || 'Étape onboarding impossible.',
    });
  }
});

// Déclencher le questionnaire onboarding pour un client
router.post('/:clientId/start', verifyToken, async (req, res) => {
  try {
    const { clientId } = req.params;
    const { telegram_chat_id, first_name, last_name } = req.body;

    if (!telegram_chat_id) {
      return res.status(400).json({ error: 'telegram_chat_id required' });
    }

    // Send questionnaire via Telegram
    const result = await telegramService.sendOnboardingQuestionnaire(
      telegram_chat_id,
      `${first_name} ${last_name}`,
      clientId
    );

    res.json({ 
      success: true,
      message: 'Onboarding questionnaire sent',
      questionnaire_sent: result.questionnaire_sent
    });
  } catch (error) {
    logger.error({ err: error, clientId: req.params.clientId }, 'Onboarding Telegram questionnaire failed');
    res.status(500).json({ error: 'Failed to send questionnaire' });
  }
});

// Save onboarding responses
router.post('/:clientId/responses', verifyToken, async (req, res) => {
  try {
    const { clientId } = req.params;
    const responses = req.body;

    // Save to client's personal_profile
    const personalProfile = {
      has_children: responses.children?.yes || false,
      children_count: responses.children?.count || 0,
      sports: responses.sports || '',
      housing_type: responses.housing || '',
      pets: responses.pets || '',
      profession: responses.profession || '',
      completed_at: new Date()
    };

    // TODO: Update client record in DB with personal_profile

    res.json({
      success: true,
      message: 'Onboarding responses saved',
      profile: personalProfile
    });
  } catch (error) {
    logger.error({ err: error, clientId: req.params.clientId }, 'Onboarding responses save failed');
    res.status(500).json({ error: 'Failed to save responses' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// LOT 20 — ONBOARDING GAMIFIÉ : Badges et progression individuelle
// ═══════════════════════════════════════════════════════════════════════════════

const GAMIFIED_STEPS = [
  {
    key: 'create_client',
    title: 'Créez votre premier client',
    description: 'Ajoutez une fiche client pour commencer à utiliser COURTIA',
    badge: 'courtier_connecte',
    badgeName: 'Courtier Connecté',
    badgeIcon: '🤝',
  },
  {
    key: 'analyze_portfolio',
    title: 'Analysez votre portefeuille avec ARK',
    description: 'Lancez une analyse ARK pour découvrir les insights de votre portefeuille',
    badge: 'analyste_ark',
    badgeName: 'Analyste ARK',
    badgeIcon: '📊',
  },
  {
    key: 'generate_document',
    title: 'Générez votre premier document',
    description: 'Utilisez ARK Compose pour créer un document DDA, IPID ou Devoir de Conseil',
    badge: 'maitre_docs',
    badgeName: 'Maître des Docs',
    badgeIcon: '📄',
  },
  {
    key: 'activate_ark_watch',
    title: 'Activez ARK Watch',
    description: 'Configurez la surveillance proactive de votre portefeuille',
    badge: 'sentinelle',
    badgeName: 'Sentinelle',
    badgeIcon: '🛡️',
  },
  {
    key: 'invite_colleague',
    title: 'Invitez un collègue',
    description: 'Partagez COURTIA avec un membre de votre équipe',
    badge: 'ambassadeur',
    badgeName: 'Ambassadeur',
    badgeIcon: '🌟',
  },
];

// GET /api/onboarding/gamified/progress — Récupère la progression gamifiée
router.get('/gamified/progress', async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId;

    const progressRes = await pool.query(
      `SELECT * FROM onboarding_progress WHERE user_id = $1`,
      [userId]
    );

    let progress = progressRes.rows[0];

    // Créer l'entrée si elle n'existe pas
    if (!progress) {
      const insertRes = await pool.query(
        `INSERT INTO onboarding_progress (user_id) VALUES ($1) RETURNING *`,
        [userId]
      );
      progress = insertRes.rows[0];
    }

    const steps = GAMIFIED_STEPS.map(step => ({
      ...step,
      completed: progress[`step_${step.key}`] || false,
      badgeEarned: progress[`badge_${step.badge}`] || false,
    }));

    const completedCount = steps.filter(s => s.completed).length;
    const badgesEarned = steps.filter(s => s.badgeEarned).length;

    res.json({
      steps,
      summary: {
        totalSteps: GAMIFIED_STEPS.length,
        completedSteps: completedCount,
        totalBadges: GAMIFIED_STEPS.length,
        badgesEarned,
        progressPercent: Math.round((completedCount / GAMIFIED_STEPS.length) * 100),
        allCompleted: progress.completed_at !== null,
        completedAt: progress.completed_at,
      },
    });
  } catch (err) {
    logger.error({ err }, 'Gamified progress error');
    res.status(500).json({ error: err.message });
  }
});

// POST /api/onboarding/gamified/step/:step/complete — Marque une étape comme complète
router.post('/gamified/step/:step/complete', async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    const { step } = req.params;

    const stepConfig = GAMIFIED_STEPS.find(s => s.key === step);
    if (!stepConfig) {
      return res.status(400).json({ error: 'Étape inconnue' });
    }

    // Mise à jour de la progression
    const updateRes = await pool.query(
      `UPDATE onboarding_progress
       SET step_${step} = true,
           badge_${stepConfig.badge} = true,
           updated_at = NOW()
       WHERE user_id = $1
       RETURNING *`,
      [userId]
    );

    let progress = updateRes.rows[0];

    // Si pas de ligne, créer puis mettre à jour
    if (!progress) {
      await pool.query(
        `INSERT INTO onboarding_progress (user_id, step_${step}, badge_${stepConfig.badge})
         VALUES ($1, true, true)
         ON CONFLICT (user_id) DO UPDATE
         SET step_${step} = true, badge_${stepConfig.badge} = true, updated_at = NOW()
         RETURNING *`,
        [userId]
      );
      const refetch = await pool.query('SELECT * FROM onboarding_progress WHERE user_id = $1', [userId]);
      progress = refetch.rows[0];
    }

    res.json({
      success: true,
      step: step,
      badgeEarned: {
        key: stepConfig.badge,
        name: stepConfig.badgeName,
        icon: stepConfig.badgeIcon,
      },
      progress: {
        totalBadges: progress.total_badges || 0,
        allCompleted: progress.completed_at !== null,
      },
    });
  } catch (err) {
    logger.error({ err }, 'Gamified step complete error');
    res.status(500).json({ error: err.message });
  }
});

// GET /api/onboarding/gamified/badges — Liste tous les badges
router.get('/gamified/badges', async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId;

    const progressRes = await pool.query(
      `SELECT * FROM onboarding_progress WHERE user_id = $1`,
      [userId]
    );

    const progress = progressRes.rows[0] || {};

    const badges = GAMIFIED_STEPS.map(step => ({
      key: step.badge,
      name: step.badgeName,
      icon: step.badgeIcon,
      description: step.description,
      earned: progress[`badge_${step.badge}`] || false,
      earnedAt: progress[`badge_${step.badge}`] ? progress.updated_at : null,
    }));

    res.json({
      badges,
      totalEarned: badges.filter(b => b.earned).length,
      totalAvailable: badges.length,
    });
  } catch (err) {
    logger.error({ err }, 'Badges list error');
    res.status(500).json({ error: err.message });
  }
});

// POST /api/onboarding/gamified/auto-check — Vérifie automatiquement les conditions
router.post('/gamified/auto-check', async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    const earnedBadges = [];

    // Vérifier si l'utilisateur a des clients
    const clientsRes = await pool.query('SELECT COUNT(*) as count FROM clients WHERE user_id = $1', [userId]);
    if (parseInt(clientsRes.rows[0].count) > 0) {
      const upd = await pool.query(
        `UPDATE onboarding_progress SET step_create_client = true, badge_courtier_connecte = true WHERE user_id = $1 AND NOT step_create_client RETURNING *`,
        [userId]
      );
      if (upd.rowCount > 0) earnedBadges.push({ key: 'courtier_connecte', name: 'Courtier Connecté', icon: '🤝' });
    }

    // Vérifier si l'utilisateur a des documents générés
    const docsRes = await pool.query('SELECT COUNT(*) as count FROM documents WHERE user_id = $1 AND source = $2', [userId, 'ark_compose']);
    if (parseInt(docsRes.rows[0].count) > 0) {
      const upd = await pool.query(
        `UPDATE onboarding_progress SET step_generate_document = true, badge_maitre_docs = true WHERE user_id = $1 AND NOT step_generate_document RETURNING *`,
        [userId]
      );
      if (upd.rowCount > 0) earnedBadges.push({ key: 'maitre_docs', name: 'Maître des Docs', icon: '📄' });
    }

    // Vérifier ARK Watch activé
    const arkWatchRes = await pool.query(
      `SELECT COUNT(*) as count FROM ark_signals WHERE user_id = $1`,
      [userId]
    );
    if (parseInt(arkWatchRes.rows[0].count) > 0) {
      const upd = await pool.query(
        `UPDATE onboarding_progress SET step_activate_ark_watch = true, badge_sentinelle = true WHERE user_id = $1 AND NOT step_activate_ark_watch RETURNING *`,
        [userId]
      );
      if (upd.rowCount > 0) earnedBadges.push({ key: 'sentinelle', name: 'Sentinelle', icon: '🛡️' });
    }

    // Vérifier invitations envoyées
    const invitesRes = await pool.query(
      `SELECT COUNT(*) as count FROM cabinet_invitations WHERE invited_by_user_id = $1`,
      [userId]
    );
    if (parseInt(invitesRes.rows[0].count) > 0) {
      const upd = await pool.query(
        `UPDATE onboarding_progress SET step_invite_colleague = true, badge_ambassadeur = true WHERE user_id = $1 AND NOT step_invite_colleague RETURNING *`,
        [userId]
      );
      if (upd.rowCount > 0) earnedBadges.push({ key: 'ambassadeur', name: 'Ambassadeur', icon: '🌟' });
    }

    res.json({
      checked: true,
      newBadgesEarned: earnedBadges,
      count: earnedBadges.length,
    });
  } catch (err) {
    logger.error({ err }, 'Gamified auto-check error');
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
