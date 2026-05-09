const express = require('express');
const superAdminGuard = require('../middleware/superAdminGuard');
const feedbackService = require('../services/feedbackService');

const router = express.Router();

router.use(superAdminGuard);

router.get('/', async (req, res) => {
  try {
    const rows = await feedbackService.listFeedback({
      status: req.query.status || null,
      limit: req.query.limit || 100,
    });
    return res.json({ success: true, rows });
  } catch (_err) {
    return res.status(500).json({ success: false, error: 'feedback_admin_unavailable' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const row = await feedbackService.updateFeedbackStatus({
      id: Number(req.params.id),
      status: req.body?.status,
    });
    if (!row) return res.status(404).json({ success: false, error: 'feedback_not_found' });
    return res.json({ success: true, feedback: row });
  } catch (_err) {
    return res.status(500).json({ success: false, error: 'feedback_update_failed' });
  }
});

module.exports = router;
