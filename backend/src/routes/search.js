const express = require('express')
const { requireCabinetFeature } = require('../middleware/cabinetAccess')
const { searchCourtia } = require('../services/searchService')

const router = express.Router()

router.use(requireCabinetFeature('v1_notifications_search_reporting'))

router.get('/', async (req, res) => {
  try {
    const userId = Number(req.user?.userId || req.user?.id || 0)
    if (!userId) return res.status(401).json({ error: 'auth_required' })
    const q = String(req.query.q || '').trim()
    if (q.length < 2) return res.json({ success: true, rows: [], total: 0 })
    const rows = await searchCourtia(req.app.locals.pool, userId, q, { limit: Number(req.query.limit || 10) })
    res.json({ success: true, rows, total: rows.length })
  } catch (err) {
    res.status(500).json({ error: 'search_unavailable', message: 'Recherche COURTIA indisponible.' })
  }
})

module.exports = router
