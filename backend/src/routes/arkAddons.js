const express = require('express')
const router = express.Router()

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

module.exports = router
