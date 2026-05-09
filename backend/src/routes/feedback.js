const express = require('express');
const feedbackService = require('../services/feedbackService');
const { trackEvent } = require('../services/analyticsService');

const router = express.Router();

function getUserId(req) {
  return req.user?.id || req.user?.userId || null;
}

router.post('/', async (req, res) => {
  try {
    const userId = getUserId(req);
    const feedback = await feedbackService.createFeedback({
      userId,
      type: req.body?.type,
      page: req.body?.page,
      message: req.body?.message,
      metadata: req.body?.metadata || {},
    });

    await trackEvent({
      userId,
      event: 'feedback_sent',
      properties: { type: feedback.type, page: feedback.page },
    }).catch(() => {});

    return res.status(201).json({
      success: true,
      feedback,
      message: 'Merci, votre retour est bien transmis.',
    });
  } catch (err) {
    return res.status(err.status || 500).json({
      success: false,
      error: err.code || 'feedback_failed',
      message: err.message || 'Feedback indisponible.',
    });
  }
});

module.exports = router;
