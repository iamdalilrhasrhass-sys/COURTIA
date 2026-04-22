const express = require('express');
const router = express.Router();
const { getUserPlanInfo } = require('../services/planService');

router.get('/info', async (req, res) => {
  try {
    const courtierId = req.user.id || req.user.userId;
    const planInfo = await getUserPlanInfo(courtierId);
    
    if (!planInfo) {
      // Default to starter plan if no info found, to avoid breaking frontend
      return res.json({
        plan: 'starter',
        limits: {
          clients: 100,
          features: {
            client_score_breakdown: false,
            client_ark_action_plan: false
          }
        }
      });
    }
    res.json(planInfo);
  } catch (err) {
    console.error('GET /api/plans/info error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve plan information', details: err.message });
  }
});

module.exports = router;
