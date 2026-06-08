const express = require('express')
const router = express.Router()

const { scoreAgainst } = require('../modules/ark/scoring')
const { listVerticals, getProductRequirements } = require('../modules/ark/verticals')
const { advanceDossier } = require('../modules/ark/stateMachine')
const { getTimeline, getRecentEvents } = require('../modules/ark/events')
const { scoreDossier, getDossierDetail } = require('../modules/ark/dossierScoreService')
const { listPendingActions, approveAction, rejectAction, executeAction } = require('../modules/ark/actionService')
const { runHandoff, getFlywheel } = require('../modules/ark/handoffService')
const { generateAdviceNote, validateAdviceNote, listAdviceNotes } = require('../modules/ark/adviceNoteService')
const { buildDispatch } = require('../modules/ark/actionDispatch')
const { listAgents } = require('../modules/ark/agentRegistry')
const { runAgent } = require('../modules/ark/agentService')
const {
  approveMessages,
  importProspects,
  listProspectMessages,
  listProspects,
  markOptedOut,
  parseCsv,
  queueCampaign,
  sendApproved,
} = require('../modules/ark/prospectService')

function userId(req) {
  return req.user?.userId || req.user?.id || req.user?.sub
}

function tenantId(req) {
  return String(req.user?.tenant_id || req.user?.organization_id || userId(req))
}

router.get('/verticals', (req, res) => {
  res.json({ verticals: listVerticals() })
})

router.post('/score', (req, res) => {
  const requirements = getProductRequirements(req.body.vertical_key || 'assurance', req.body.product_type)
  const score = scoreAgainst(requirements, {
    presentFields: req.body.present_fields || req.body.presentFields || [],
    presentDocuments: req.body.present_documents || req.body.presentDocuments || [],
  })
  res.json(score)
})

router.get('/agents', (req, res) => {
  res.json(listAgents())
})

router.post('/agents/:cle/run', async (req, res) => {
  try {
    const { consigne, contexte, clientId, materialiser } = req.body || {}
    const result = await runAgent(tenantId(req), req.params.cle, {
      consigne,
      contexte: contexte || {},
      clientId,
      materialiser,
      actorId: userId(req),
    })
    res.json(result)
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message, code: err.code })
  }
})

router.post('/prospects/import', async (req, res) => {
  try {
    const rows = req.body?.rows || (req.body?.csv ? parseCsv(req.body.csv) : [])
    if (!rows.length) return res.status(422).json({ error: 'Aucune ligne exploitable (email requis).' })
    res.json(await importProspects(tenantId(req), rows, { source: req.body?.source || 'import_csv' }))
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message, code: err.code })
  }
})

router.get('/prospects', async (req, res) => {
  try {
    res.json(await listProspects(tenantId(req), {
      status: req.query.status,
      sector: req.query.sector,
      limit: Number(req.query.limit || 200),
    }))
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message, code: err.code })
  }
})

router.get('/prospects/messages', async (req, res) => {
  try {
    res.json(await listProspectMessages(tenantId(req), {
      status: req.query.status ?? 'draft',
      limit: Number(req.query.limit || 200),
    }))
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message, code: err.code })
  }
})

router.post('/prospects/campaign', async (req, res) => {
  try {
    const { prospectIds, sector, valueProp, subject } = req.body || {}
    res.json(await queueCampaign(tenantId(req), {
      prospectIds,
      sector,
      valueProp,
      subject,
      actorId: userId(req),
    }))
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message, code: err.code })
  }
})

router.post('/prospects/messages/approve', async (req, res) => {
  try {
    res.json(await approveMessages(tenantId(req), req.body?.messageIds || []))
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message, code: err.code })
  }
})

router.post('/prospects/send', async (req, res) => {
  try {
    res.json(await sendApproved(tenantId(req), { limit: req.body?.limit, actorId: userId(req) }))
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message, code: err.code })
  }
})

router.post('/prospects/:id/opt-out', async (req, res) => {
  try {
    res.json(await markOptedOut(tenantId(req), req.params.id))
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message, code: err.code })
  }
})

router.get('/command-center', async (req, res) => {
  try {
    const pool = req.app.locals.pool
    const tenant = tenantId(req)
    const currentUserId = userId(req)
    const [brief, actions, recentEvents] = await Promise.all([
      pool.query(
        'SELECT * FROM ark_daily_briefs WHERE tenant_id = $1 AND user_id = $2 AND brief_date = CURRENT_DATE LIMIT 1',
        [tenant, String(currentUserId)],
      ),
      listPendingActions(tenant, 20),
      getRecentEvents(tenant, 25).catch(() => []),
    ])

    res.json({
      brief: brief.rows[0] || null,
      pending_actions: actions,
      recent_events: recentEvents,
      generated_at: brief.rows[0]?.generated_at || null,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/dossiers/:id', async (req, res) => {
  try {
    res.json(await getDossierDetail(tenantId(req), req.params.id))
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message })
  }
})

router.post('/dossiers/:id/score', async (req, res) => {
  try {
    res.json(await scoreDossier(req.params.id))
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message })
  }
})

router.post('/dossiers/:id/advance', async (req, res) => {
  try {
    const dossier = await advanceDossier(req.params.id, req.body.to_state, {
      actorType: 'human',
      actorId: userId(req),
      context: req.body.context || {},
    })
    res.json({ dossier })
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message })
  }
})

router.post('/dossiers/:id/handoff', async (req, res) => {
  try {
    const result = await runHandoff(req.params.id, {
      tenantId: tenantId(req),
      actorId: userId(req),
    })
    res.json(result)
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message })
  }
})

router.post('/dossiers/:id/advice-note', async (req, res) => {
  try {
    const note = await generateAdviceNote(tenantId(req), req.params.id, {
      actorId: userId(req),
    })
    res.status(201).json(note)
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message, code: err.code })
  }
})

router.get('/dossiers/:id/advice-notes', async (req, res) => {
  try {
    res.json(await listAdviceNotes(tenantId(req), req.params.id))
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message, code: err.code })
  }
})

router.post('/advice-notes/:id/validate', async (req, res) => {
  try {
    const note = await validateAdviceNote(tenantId(req), req.params.id, userId(req), req.body || {})
    res.json(note)
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message, code: err.code })
  }
})

router.get('/clients/:id/flywheel', async (req, res) => {
  try {
    res.json(await getFlywheel(tenantId(req), req.params.id))
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message })
  }
})

router.get('/events/:aggregateType/:aggregateId', async (req, res) => {
  try {
    const timeline = await getTimeline(tenantId(req), req.params.aggregateType, req.params.aggregateId)
    res.json({ timeline })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/actions/pending', async (req, res) => {
  try {
    res.json({ actions: await listPendingActions(tenantId(req), Number(req.query.limit || 20)) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/actions/:id/approve', async (req, res) => {
  try {
    const action = await approveAction(tenantId(req), req.params.id, userId(req))
    if (!action) return res.status(404).json({ error: 'Action introuvable ou deja traitee.' })
    res.json({ action })
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message })
  }
})

router.post('/actions/:id/reject', async (req, res) => {
  try {
    const action = await rejectAction(tenantId(req), req.params.id, userId(req), req.body.reason || null)
    if (!action) return res.status(404).json({ error: 'Action introuvable ou deja traitee.' })
    res.json({ action })
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message })
  }
})

router.post('/actions/:id/execute', async (req, res) => {
  try {
    const action = await executeAction(tenantId(req), req.params.id, userId(req), buildDispatch(tenantId(req)))
    if (!action) return res.status(404).json({ error: 'Action introuvable.' })
    res.json({ action })
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message, code: err.code })
  }
})

module.exports = router
