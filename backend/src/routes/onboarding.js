const express = require('express')
const { verifyToken } = require('../middleware/auth')
const telegramService = require('../services/telegramService')

const router = express.Router()

const ONBOARDING_STEPS = ['cabinet', 'conformite', 'import', 'integrations', 'morning_brief']
let ensureOnboardingSchemaPromise = null

function getUserId(req) {
  return Number(req?.user?.id || req?.user?.userId || 0)
}

function nextStepFor(completed = []) {
  for (const step of ONBOARDING_STEPS) {
    if (!completed.includes(step)) return step
  }
  return 'completed'
}

function normalizeStep(step) {
  const value = String(step || '').trim().toLowerCase()
  return ONBOARDING_STEPS.includes(value) ? value : null
}

async function ensureOnboardingSchema(pool) {
  if (!ensureOnboardingSchemaPromise) {
    ensureOnboardingSchemaPromise = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS onboarding_progress (
          id SERIAL PRIMARY KEY,
          user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          current_step TEXT DEFAULT 'cabinet',
          completed_steps TEXT[] DEFAULT '{}',
          skipped_steps TEXT[] DEFAULT '{}',
          payload JSONB DEFAULT '{}'::jsonb,
          is_completed BOOLEAN DEFAULT false,
          completed_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `)
      await pool.query('CREATE UNIQUE INDEX IF NOT EXISTS idx_onboarding_progress_user ON onboarding_progress(user_id);')
    })()
  }

  return ensureOnboardingSchemaPromise
}

async function getOrCreateState(pool, userId) {
  await ensureOnboardingSchema(pool)

  const existing = await pool.query(
    `SELECT id, user_id, current_step, completed_steps, skipped_steps, payload,
            is_completed, completed_at, created_at, updated_at
     FROM onboarding_progress
     WHERE user_id = $1
     LIMIT 1`,
    [userId]
  )

  if (existing.rowCount) return existing.rows[0]

  const created = await pool.query(
    `INSERT INTO onboarding_progress (user_id, current_step, completed_steps, skipped_steps, payload, is_completed, created_at, updated_at)
     VALUES ($1, 'cabinet', '{}', '{}', '{}'::jsonb, false, NOW(), NOW())
     RETURNING id, user_id, current_step, completed_steps, skipped_steps, payload, is_completed, completed_at, created_at, updated_at`,
    [userId]
  )

  return created.rows[0]
}

function serializeState(row = {}) {
  return {
    current_step: row.current_step || 'cabinet',
    completed_steps: Array.isArray(row.completed_steps) ? row.completed_steps : [],
    skipped_steps: Array.isArray(row.skipped_steps) ? row.skipped_steps : [],
    payload: row.payload || {},
    is_completed: !!row.is_completed,
    completed_at: row.completed_at || null,
    updated_at: row.updated_at || null,
  }
}

router.use(verifyToken)

router.get('/steps', async (_req, res) => {
  return res.json({
    success: true,
    steps: ONBOARDING_STEPS,
  })
})

router.get('/state', async (req, res) => {
  try {
    const pool = req.app.locals.pool
    const userId = getUserId(req)
    if (!userId) return res.status(401).json({ error: 'invalid_session' })

    const state = await getOrCreateState(pool, userId)
    return res.json({ success: true, state: serializeState(state) })
  } catch (error) {
    console.error('[onboarding] GET /state error:', error.message)
    return res.status(500).json({ error: 'onboarding_state_failed' })
  }
})

router.put('/state', async (req, res) => {
  try {
    const pool = req.app.locals.pool
    const userId = getUserId(req)
    if (!userId) return res.status(401).json({ error: 'invalid_session' })

    const state = await getOrCreateState(pool, userId)
    const nextStep = normalizeStep(req.body?.current_step) || state.current_step || 'cabinet'
    const payloadPatch = req.body?.payload && typeof req.body.payload === 'object' ? req.body.payload : {}

    const updated = await pool.query(
      `UPDATE onboarding_progress
       SET current_step = $1,
           payload = COALESCE(payload, '{}'::jsonb) || $2::jsonb,
           updated_at = NOW()
       WHERE id = $3
       RETURNING id, user_id, current_step, completed_steps, skipped_steps, payload, is_completed, completed_at, updated_at`,
      [nextStep, JSON.stringify(payloadPatch), state.id]
    )

    return res.json({ success: true, state: serializeState(updated.rows[0]) })
  } catch (error) {
    console.error('[onboarding] PUT /state error:', error.message)
    return res.status(500).json({ error: 'onboarding_state_update_failed' })
  }
})

router.post('/complete-step', async (req, res) => {
  try {
    const pool = req.app.locals.pool
    const userId = getUserId(req)
    if (!userId) return res.status(401).json({ error: 'invalid_session' })

    const step = normalizeStep(req.body?.step)
    if (!step) {
      return res.status(400).json({ error: 'invalid_step' })
    }

    const state = await getOrCreateState(pool, userId)
    const completed = new Set(Array.isArray(state.completed_steps) ? state.completed_steps : [])
    completed.add(step)
    const skipped = new Set(Array.isArray(state.skipped_steps) ? state.skipped_steps : [])
    skipped.delete(step)

    const completedSteps = Array.from(completed)
    const nextStep = nextStepFor(completedSteps)
    const done = nextStep === 'completed'

    const payloadPatch = req.body?.payload && typeof req.body.payload === 'object' ? req.body.payload : {}

    const updated = await pool.query(
      `UPDATE onboarding_progress
       SET completed_steps = $1,
           skipped_steps = $2,
           current_step = $3,
           payload = COALESCE(payload, '{}'::jsonb) || $4::jsonb,
           is_completed = $5,
           completed_at = CASE WHEN $5 THEN NOW() ELSE completed_at END,
           updated_at = NOW()
       WHERE id = $6
       RETURNING id, user_id, current_step, completed_steps, skipped_steps, payload, is_completed, completed_at, updated_at`,
      [completedSteps, Array.from(skipped), done ? 'completed' : nextStep, JSON.stringify(payloadPatch), done, state.id]
    )

    return res.json({ success: true, state: serializeState(updated.rows[0]) })
  } catch (error) {
    console.error('[onboarding] POST /complete-step error:', error.message)
    return res.status(500).json({ error: 'onboarding_complete_step_failed' })
  }
})

router.post('/skip-step', async (req, res) => {
  try {
    const pool = req.app.locals.pool
    const userId = getUserId(req)
    if (!userId) return res.status(401).json({ error: 'invalid_session' })

    const step = normalizeStep(req.body?.step)
    if (!step) {
      return res.status(400).json({ error: 'invalid_step' })
    }

    const state = await getOrCreateState(pool, userId)
    const skipped = new Set(Array.isArray(state.skipped_steps) ? state.skipped_steps : [])
    skipped.add(step)

    const completedSteps = Array.isArray(state.completed_steps) ? state.completed_steps : []
    const nextStep = nextStepFor(completedSteps)

    const updated = await pool.query(
      `UPDATE onboarding_progress
       SET skipped_steps = $1,
           current_step = $2,
           updated_at = NOW()
       WHERE id = $3
       RETURNING id, user_id, current_step, completed_steps, skipped_steps, payload, is_completed, completed_at, updated_at`,
      [Array.from(skipped), nextStep === 'completed' ? 'completed' : nextStep, state.id]
    )

    return res.json({ success: true, state: serializeState(updated.rows[0]) })
  } catch (error) {
    console.error('[onboarding] POST /skip-step error:', error.message)
    return res.status(500).json({ error: 'onboarding_skip_step_failed' })
  }
})

router.post('/finish', async (req, res) => {
  try {
    const pool = req.app.locals.pool
    const userId = getUserId(req)
    if (!userId) return res.status(401).json({ error: 'invalid_session' })

    const state = await getOrCreateState(pool, userId)
    const updated = await pool.query(
      `UPDATE onboarding_progress
       SET completed_steps = $1,
           current_step = 'completed',
           is_completed = true,
           completed_at = NOW(),
           payload = COALESCE(payload, '{}'::jsonb) || $2::jsonb,
           updated_at = NOW()
       WHERE id = $3
       RETURNING id, user_id, current_step, completed_steps, skipped_steps, payload, is_completed, completed_at, updated_at`,
      [ONBOARDING_STEPS, JSON.stringify(req.body?.payload && typeof req.body.payload === 'object' ? req.body.payload : {}), state.id]
    )

    return res.json({ success: true, state: serializeState(updated.rows[0]) })
  } catch (error) {
    console.error('[onboarding] POST /finish error:', error.message)
    return res.status(500).json({ error: 'onboarding_finish_failed' })
  }
})

// Legacy flows kept for backward compatibility
router.post('/:clientId/start', async (req, res) => {
  try {
    const { clientId } = req.params
    const { telegram_chat_id, first_name, last_name } = req.body

    if (!telegram_chat_id) {
      return res.status(400).json({ error: 'telegram_chat_id required' })
    }

    const result = await telegramService.sendOnboardingQuestionnaire(
      telegram_chat_id,
      `${first_name} ${last_name}`,
      clientId
    )

    res.json({
      success: true,
      message: 'Onboarding questionnaire sent',
      questionnaire_sent: result.questionnaire_sent,
    })
  } catch (error) {
    console.error('Onboarding legacy start error:', error)
    res.status(500).json({ error: 'Failed to send questionnaire' })
  }
})

router.post('/:clientId/responses', async (req, res) => {
  try {
    const responses = req.body || {}

    const personalProfile = {
      has_children: responses.children?.yes || false,
      children_count: responses.children?.count || 0,
      sports: responses.sports || '',
      housing_type: responses.housing || '',
      pets: responses.pets || '',
      profession: responses.profession || '',
      completed_at: new Date(),
    }

    res.json({
      success: true,
      message: 'Onboarding responses saved',
      profile: personalProfile,
    })
  } catch (error) {
    console.error('Save responses error:', error)
    res.status(500).json({ error: 'Failed to save responses' })
  }
})

module.exports = router
module.exports.__internals = {
  ONBOARDING_STEPS,
  nextStepFor,
  normalizeStep,
}
