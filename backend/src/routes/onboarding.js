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

module.exports = router;
