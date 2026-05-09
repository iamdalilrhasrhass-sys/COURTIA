const express = require('express')
const { getFeatureFlagsForUser } = require('../lib/featureFlags')

const router = express.Router()

router.get('/', async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId
    const flags = await getFeatureFlagsForUser({ userId })
    res.json({ flags })
  } catch (err) {
    res.status(503).json({
      flags: {},
      error: 'feature_flags_unavailable',
      message: 'Les feature flags sont indisponibles pour le moment.',
    })
  }
})

module.exports = router
