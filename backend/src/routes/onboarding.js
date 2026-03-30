const express = require('express');
const { verifyToken } = require('../middleware/auth');
const telegramService = require('../services/telegramService');

const router = express.Router();

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
    console.error('Onboarding error:', error);
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
    console.error('Save responses error:', error);
    res.status(500).json({ error: 'Failed to save responses' });
  }
});

module.exports = router;
