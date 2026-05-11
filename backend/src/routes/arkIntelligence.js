/**
 * ARK Predictive Intelligence — Routes
 *  POST /api/ark/churn-predict     → scan churn complet
 *  GET  /api/ark/cross-sell/matrix → matrice opportunités
 *  GET  /api/ark/renewals/optimize → optimiseur renouvellement
 */
const express = require('express')
const router = express.Router()
const { verifyToken } = require('../middleware/auth')
const intel = require('../services/arkIntelligenceService')
const logger = require('../lib/logger')

router.use(verifyToken)

function uid(req) { return Number(req.user?.userId || req.user?.id || 0) }

router.post('/churn-predict', async (req, res) => {
  try {
    const userId = uid(req)
    if (!userId) return res.status(401).json({ error: 'auth_required' })
    const data = await intel.computeChurnForUser(userId)
    res.json({ ok: true, ...data })
  } catch (err) {
    logger?.error?.('[ark/churn-predict]', err)
    res.status(500).json({ error: 'churn_predict_failed', message: err.message })
  }
})

router.get('/cross-sell/matrix', async (req, res) => {
  try {
    const userId = uid(req)
    if (!userId) return res.status(401).json({ error: 'auth_required' })
    const data = await intel.computeCrossSellMatrix(userId)
    res.json({ ok: true, ...data })
  } catch (err) {
    logger?.error?.('[ark/cross-sell]', err)
    res.status(500).json({ error: 'cross_sell_failed', message: err.message })
  }
})

router.get('/renewals/optimize', async (req, res) => {
  try {
    const userId = uid(req)
    if (!userId) return res.status(401).json({ error: 'auth_required' })
    const data = await intel.computeRenewalOptimizations(userId)
    res.json({ ok: true, ...data })
  } catch (err) {
    logger?.error?.('[ark/renewals]', err)
    res.status(500).json({ error: 'renewals_failed', message: err.message })
  }
})

// Quick read-only fetch (latest cached)
router.get('/churn-predict/latest', async (req, res) => {
  try {
    const userId = uid(req)
    const pool = require('../db')
    const { rows } = await pool.query(`
      SELECT s.*, c.first_name, c.last_name, c.city
      FROM ark_churn_scores s
      JOIN clients c ON c.id = s.client_id
      WHERE s.user_id = $1 AND s.expires_at > NOW()
      ORDER BY s.score DESC LIMIT 20
    `, [userId])
    res.json({ ok: true, top_risks: rows })
  } catch (err) {
    res.status(500).json({ error: 'fetch_failed' })
  }
})

module.exports = router
