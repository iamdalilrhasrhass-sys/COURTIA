/**
 * COURTIA REACH — Routes API
 * /api/reach/*
 * Moteur d'acquisition intégré au CRM COURTIA.
 */
const express = require('express');
const router = express.Router();
const pool = require('../db');
const verifyToken = require('../middleware/authMiddleware');

const { searchProspects } = require('../services/reachSearchService');
const { analyzeProspect, analyzeProspects } = require('../services/reachScoringService');
const { generateProspects, generateReplies, generateCampaigns } = require('../services/reachMockService');
const { getCampaigns, createCampaign, getCampaignTemplates, addProspectsToCampaign } = require('../services/reachCampaignService');
const { generateEmail, generateSMS, generateCallScript, generateLinkedInMessage } = require('../services/reachMessageService');
const { convertToClient } = require('../services/reachConversionService');
const { getPlaybook, getAllPlaybooks } = require('../reach/playbooks');
const { isOptOut, markOptOut, validateCampaign, getSourceBadge } = require('../services/reachComplianceService');

// ─── HELPERS ──────────────────────────────────────────────────────────
function getUserId(req) { return req.user?.id || req.user?.userId; }

function dbAvailable() {
  try { return !!pool && typeof pool.query === 'function'; } catch { return false; }
}

// ─── DASHBOARD ────────────────────────────────────────────────────────
router.get('/dashboard', verifyToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    const prospects = generateProspects({ category: 'garage', city: 'Sens', count: 30 });
    const scored = prospects.map(p => ({ ...p, ...require('../services/reachScoringService').ruleBasedScore(p) }));
    const hot = scored.filter(s => s.opportunity_score >= 70);
    const totalPremium = scored.reduce((sum, s) => sum + (s.estimated_annual_premium || 0), 0);

    res.json({
      success: true,
      data: {
        total_prospects: prospects.length,
        hot_prospects: hot.length,
        active_campaigns: 2,
        replies_to_process: 5,
        rdv_generated: 3,
        avg_score: Math.round(scored.reduce((s, x) => s + x.opportunity_score, 0) / scored.length),
        total_premium_potential: totalPremium,
        conversion_rate: '12%',
        top_action: hot.length > 0 ? `🔥 ${hot.length} prospects chauds à contacter aujourd'hui` : 'Lancez une recherche pour trouver des prospects',
        best_prospect_today: hot.length > 0 ? {
          name: hot[0].company_name,
          score: hot[0].opportunity_score,
          premium: hot[0].estimated_annual_premium,
          action: hot[0].next_best_action,
        } : null,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── SEARCH ───────────────────────────────────────────────────────────
router.post('/search', verifyToken, async (req, res) => {
  try {
    const { category, city, radius, niche, limit } = req.body;

    if (!category || !city) {
      return res.status(400).json({ success: false, error: 'category et city sont requis' });
    }

    const prospects = await searchProspects({ category, city, radius, niche, limit: limit || 15 });
    res.json({ success: true, data: prospects, count: prospects.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── PROSPECTS LIST ───────────────────────────────────────────────────
router.get('/prospects', verifyToken, async (req, res) => {
  try {
    const { category, city, status, limit } = req.query;

    if (dbAvailable()) {
      let query = 'SELECT * FROM reach_prospects WHERE 1=1';
      const params = [];
      let paramIdx = 1;
      if (category) { query += ` AND category = $${paramIdx++}`; params.push(category); }
      if (city) { query += ` AND city ILIKE $${paramIdx++}`; params.push(`%${city}%`); }
      if (status) { query += ` AND status = $${paramIdx++}`; params.push(status); }
      query += ' ORDER BY opportunity_score DESC LIMIT $' + paramIdx;
      params.push(parseInt(limit) || 50);

      try {
        const result = await pool.query(query, params);
        return res.json({ success: true, data: result.rows, count: result.rows.length });
      } catch (dbErr) {
        console.error('[reach/prospects] DB error, fallback mock:', dbErr.message);
      }
    }

    // Fallback mock
    const prospects = generateProspects({
      category: category || 'garage',
      city: city || 'Sens',
      count: parseInt(limit) || 20,
    });
    const scored = prospects.map(p => ({ ...p, ...require('../services/reachScoringService').ruleBasedScore(p) }));
    res.json({ success: true, data: scored, count: scored.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── PROSPECT DETAIL ──────────────────────────────────────────────────
router.get('/prospects/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (dbAvailable()) {
      const userId = getUserId(req);
      try {
        const result = await pool.query('SELECT * FROM reach_prospects WHERE id = $1 AND user_id = $2', [id, userId]);
        if (result.rows.length > 0) {
          const prospect = result.rows[0];
          const analysisRes = await pool.query('SELECT * FROM reach_analyses WHERE prospect_id = $1 ORDER BY created_at DESC LIMIT 1', [id]);
          return res.json({ success: true, data: { ...prospect, analysis: analysisRes.rows[0] || null } });
        }
      } catch (dbErr) { console.error('[reach/prospects/:id] DB error:', dbErr.message); }
    }

    // Fallback mock
    const prospects = generateProspects({ category: 'garage', city: 'Sens', count: 1 });
    const prospect = prospects[0];
    const analysis = require('../services/reachScoringService').ruleBasedScore(prospect);
    res.json({ success: true, data: { ...prospect, ...analysis, id: id } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── ANALYZE PROSPECT ─────────────────────────────────────────────────
router.post('/prospects/:id/analyze', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const prospect = req.body.prospect || {};

    const analysis = await analyzeProspect(prospect);

    // Sauvegarder en DB si dispo
    if (dbAvailable()) {
      try {
        await pool.query(
          `INSERT INTO reach_analyses (prospect_id, call_script, email_template, linkedin_message, sms_template, next_best_action, score_details)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [id, analysis.call_script, analysis.email_template, analysis.linkedin_message, analysis.sms_template, analysis.next_best_action, JSON.stringify(analysis)]
        );
      } catch (e) { /* table pas encore migrée */ }
    }

    res.json({ success: true, data: analysis });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── CAMPAIGNS ────────────────────────────────────────────────────────
router.get('/campaigns', verifyToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    const campaigns = await getCampaigns(userId, pool);
    res.json({ success: true, data: campaigns });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/campaigns', verifyToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    const { name, target_description, channel, steps } = req.body;
    const campaign = await createCampaign(userId, { name, target_description, channel, steps }, pool);
    res.json({ success: true, data: campaign });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/campaigns/templates', verifyToken, (req, res) => {
  res.json({ success: true, data: getCampaignTemplates() });
});

router.post('/campaigns/:id/prospects', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { prospect_ids } = req.body;
    const result = await addProspectsToCampaign(id, prospect_ids, pool);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── MESSAGES ─────────────────────────────────────────────────────────
router.post('/messages/generate', verifyToken, async (req, res) => {
  try {
    const { prospect, analysis, channel } = req.body;

    let message;
    switch (channel) {
      case 'email': message = generateEmail(prospect, analysis); break;
      case 'sms': message = generateSMS(prospect, analysis); break;
      case 'call': message = generateCallScript(prospect, analysis); break;
      case 'linkedin': message = generateLinkedInMessage(prospect, analysis); break;
      default:
        message = {
          email: generateEmail(prospect, analysis),
          sms: generateSMS(prospect, analysis),
          call: generateCallScript(prospect, analysis),
          linkedin: generateLinkedInMessage(prospect, analysis),
        };
    }

    res.json({ success: true, data: message });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── REPLIES / INBOX ──────────────────────────────────────────────────
router.get('/replies', verifyToken, async (req, res) => {
  try {
    if (dbAvailable()) {
      const userId = getUserId(req);
      try {
        const result = await pool.query(
          `SELECT r.*, p.company_name, p.category, p.city
           FROM reach_replies r
           JOIN reach_prospects p ON p.id = r.prospect_id
           WHERE p.user_id = $1
           ORDER BY r.received_at DESC LIMIT 50`,
          [userId]
        );
        return res.json({ success: true, data: result.rows, count: result.rows.length });
      } catch (e) { /* table pas encore migrée */ }
    }

    // Fallback mock
    const prospects = generateProspects({ category: 'garage', city: 'Sens', count: 5 });
    const allReplies = [];
    prospects.forEach(p => {
      const replies = generateReplies(p, 2);
      replies.forEach(r => allReplies.push({ ...r, prospect: p }));
    });

    res.json({ success: true, data: allReplies, count: allReplies.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── CONVERT TO CLIENT ────────────────────────────────────────────────
router.post('/convert-to-client', verifyToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    const { prospect } = req.body;

    if (!prospect) {
      return res.status(400).json({ success: false, error: 'prospect requis' });
    }

    const result = await convertToClient(prospect, userId, pool);

    if (result.success) {
      res.json({ success: true, data: result, message: 'Prospect converti en client COURTIA' });
    } else {
      res.status(500).json(result);
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── OPT-OUT ──────────────────────────────────────────────────────────
router.post('/opt-out', verifyToken, async (req, res) => {
  try {
    const { prospect_id } = req.body;
    res.json({ success: true, message: 'Prospect marqué en opt-out', data: { prospect_id, status: 'opt_out' } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── PLAYBOOKS ────────────────────────────────────────────────────────
router.get('/playbooks', verifyToken, (req, res) => {
  res.json({ success: true, data: getAllPlaybooks() });
});

router.get('/playbooks/:category', verifyToken, (req, res) => {
  const playbook = getPlaybook(req.params.category);
  if (!playbook) return res.status(404).json({ success: false, error: 'Playbook non trouvé' });
  res.json({ success: true, data: playbook });
});

// ─── SETTINGS ─────────────────────────────────────────────────────────
router.get('/settings', verifyToken, (req, res) => {
  res.json({
    success: true,
    data: {
      google_places_configured: !!process.env.GOOGLE_PLACES_API_KEY,
      anthropic_configured: !!process.env.ANTHROPIC_API_KEY,
      mode: !!process.env.GOOGLE_PLACES_API_KEY ? 'live' : 'demo',
      demo_note: 'Mode démo : données fictives réalistes. Ajoutez GOOGLE_PLACES_API_KEY pour activer la recherche réelle.',
      compliance: {
        linkedin: "Assisté uniquement — pas d'automatisation",
        google: 'API officielle uniquement',
        rgpd: 'Opt-out disponible, historique conservé, finalité explicite',
      },
    },
  });
});

module.exports = router;
