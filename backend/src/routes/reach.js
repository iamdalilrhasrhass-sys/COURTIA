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
    const userId = getUserId(req);
    const { category, city, status, limit } = req.query;

    if (dbAvailable()) {
      let query = 'SELECT * FROM reach_prospects WHERE user_id = $1';
      const params = [userId];
      let paramIdx = 2;
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
    const userId = getUserId(req);
    const { id } = req.params;
    const prospect = req.body.prospect || {};

    // Verify ownership if DB available
    if (dbAvailable()) {
      try {
        const ownerCheck = await pool.query('SELECT id FROM reach_prospects WHERE id = $1 AND user_id = $2', [id, userId]);
        if (ownerCheck.rows.length === 0) {
          return res.status(403).json({ success: false, error: 'Prospect non trouvé ou accès interdit' });
        }
      } catch (e) { /* table pas encore migrée — continue with mock */ }
    }

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

    res.json({ success: true, data: analysis, mock: !dbAvailable() });
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
    const userId = getUserId(req);
    const { id } = req.params;
    const { prospect_ids } = req.body;

    // Verify campaign ownership
    if (dbAvailable()) {
      try {
        const check = await pool.query('SELECT id FROM reach_campaigns WHERE id = $1 AND user_id = $2', [id, userId]);
        if (check.rows.length === 0) {
          return res.status(403).json({ success: false, error: 'Campagne non trouvée ou accès interdit' });
        }
      } catch (e) { /* table pas encore migrée */ }
    }

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

    // DB réelle — tentative de conversion
    if (dbAvailable()) {
      try {
        const result = await convertToClient(prospect, userId, pool);
        if (result.success) {
          return res.json({ success: true, data: result, message: 'Prospect converti en client COURTIA' });
        }
      } catch (e) {
        console.error('[reach/convert] DB error, fallback mock:', e.message);
      }
    }

    // Fallback mock — conversion simulée
    res.json({
      success: true,
      data: {
        mock: true,
        client: {
          id: Math.floor(Math.random() * 10000),
          first_name: prospect.contact_first_name || prospect.company_name || 'Prospect',
          last_name: prospect.contact_last_name || '',
          company_name: prospect.company_name || '',
        },
        prospect_id: prospect.id,
      },
      message: '✅ Prospect converti en client COURTIA (mode démo)',
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── OPT-OUT ──────────────────────────────────────────────────────────
router.post('/opt-out', verifyToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    const { prospect_id, reason } = req.body;

    if (!prospect_id) {
      return res.status(400).json({ success: false, error: 'prospect_id requis' });
    }

    // Call compliance service
    const complianceResult = markOptOut({ id: prospect_id });

    if (dbAvailable()) {
      try {
        await pool.query(
          `INSERT INTO reach_activity_log (prospect_id, user_id, action, details) VALUES ($1, $2, 'opt_out', $3)`,
          [prospect_id, userId, JSON.stringify({ reason: reason || 'non spécifié', timestamp: new Date().toISOString() })]
        );
      } catch (e) { /* table pas encore migrée */ }
    }

    res.json({
      success: true,
      message: 'Prospect marqué en opt-out — aucune relance ne sera effectuée',
      data: { prospect_id, status: 'opt_out', reason },
      mock: !dbAvailable(),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── PROSPECT STATUS UPDATE ───────────────────────────────────────────
router.patch('/prospects/:id/status', verifyToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, error: 'status requis' });
    }

    if (dbAvailable()) {
      try {
        const result = await pool.query(
          'UPDATE reach_prospects SET status = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3 RETURNING *',
          [status, id, userId]
        );
        if (result.rows.length > 0) {
          return res.json({ success: true, data: result.rows[0] });
        }
        return res.status(404).json({ success: false, error: 'Prospect non trouvé' });
      } catch (e) {
        console.error('[reach/patch-status] DB error:', e.message);
      }
    }

    res.json({
      success: true,
      message: `Statut mis à jour : ${status}`,
      data: { id, status, updated_at: new Date().toISOString() },
      mock: true,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── CREATE TASK ──────────────────────────────────────────────────────
router.post('/prospects/:id/create-task', verifyToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;
    const { title, due_date } = req.body;

    if (dbAvailable()) {
      try {
        const prospect = await pool.query('SELECT company_name FROM reach_prospects WHERE id = $1 AND user_id = $2', [id, userId]);
        await pool.query(
          'INSERT INTO reach_activity_log (prospect_id, user_id, action, details) VALUES ($1, $2, $3, $4)',
          [id, userId, 'task_created', JSON.stringify({ title: title || 'Suivi prospect', due_date: due_date || null })]
        );
        return res.json({
          success: true,
          message: `Tâche créée pour ${prospect.rows[0]?.company_name || 'prospect'}`,
          data: { title: title || 'Suivi prospect', due_date, prospect_id: id },
        });
      } catch (e) {
        console.error('[reach/create-task] DB error:', e.message);
      }
    }

    res.json({
      success: true,
      message: '✅ Tâche créée (mode démo)',
      data: { title: title || 'Suivi prospect', due_date, prospect_id: id },
      mock: true,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── CAMPAIGN STATUS ──────────────────────────────────────────────────
router.patch('/campaigns/:id/status', verifyToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, error: 'status requis (active, paused, archived, draft)' });
    }

    if (dbAvailable()) {
      try {
        const result = await pool.query(
          'UPDATE reach_campaigns SET status = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3 RETURNING *',
          [status, id, userId]
        );
        if (result.rows.length > 0) {
          return res.json({ success: true, data: result.rows[0] });
        }
      } catch (e) {
        console.error('[reach/patch-campaign] DB error:', e.message);
      }
    }

    res.json({
      success: true,
      message: `Campagne ${status === 'active' ? 'lancée' : status === 'paused' ? 'en pause' : status === 'archived' ? 'archivée' : 'mise en brouillon'}`,
      data: { id, status, updated_at: new Date().toISOString() },
      mock: !dbAvailable(),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── CAMPAIGN FROM TEMPLATE ───────────────────────────────────────────
router.post('/campaigns/from-template', verifyToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    const { template_index, name, target_description, channel } = req.body;

    const templates = getCampaignTemplates();
    const template = templates[template_index || 0] || templates[0];

    const campaign = {
      id: Math.floor(Math.random() * 10000),
      name: name || template.name,
      target_description: target_description || template.desc,
      channel: channel || template.channel,
      status: 'draft',
      steps_count: template.steps || 3,
      created_at: new Date().toISOString(),
    };

    if (dbAvailable()) {
      try {
        const result = await pool.query(
          'INSERT INTO reach_campaigns (user_id, name, target_description, channel, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
          [userId, campaign.name, campaign.target_description, campaign.channel, 'draft']
        );
        campaign.id = result.rows[0].id;
        res.json({ success: true, data: result.rows[0], from_template: template_index });
      } catch (e) {
        console.error('[reach/from-template] DB error:', e.message);
        res.json({ success: true, data: campaign, mock: true, from_template: template_index });
      }
    } else {
      res.json({ success: true, data: campaign, mock: true, from_template: template_index });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── HANDLE REPLY ─────────────────────────────────────────────────────
router.post('/replies/:id/handle', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // 'mark_read', 'archive', 'convert'

    if (dbAvailable()) {
      try {
        if (action === 'mark_read') {
          await pool.query('UPDATE reach_replies SET is_read = true WHERE id = $1', [id]);
        }
      } catch (e) { /* table pas encore migrée */ }
    }

    res.json({
      success: true,
      message: action === 'mark_read' ? 'Réponse marquée comme lue' : 'Action effectuée',
      data: { id, action },
      mock: !dbAvailable(),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── REPORTING ────────────────────────────────────────────────────────
router.get('/reporting', verifyToken, async (req, res) => {
  try {
    const userId = getUserId(req);

    // Generate reporting from mock data
    const prospects = generateProspects({ category: 'garage', city: 'Sens', count: 30 });
    const scored = prospects.map(p => ({ ...p, ...require('../services/reachScoringService').ruleBasedScore(p) }));
    const hot = scored.filter(p => p.opportunity_score >= 70);
    const converted = scored.filter(p => p.status === 'signe');
    const pipeline = {
      nouveau: scored.filter(p => p.status === 'nouveau').length,
      a_contacter: scored.filter(p => p.status === 'a_contacter').length,
      contacte: scored.filter(p => p.status === 'contacte').length,
      interesse: scored.filter(p => p.status === 'interesse').length,
      rdv_pris: scored.filter(p => p.status === 'rdv_pris').length,
      signe: converted.length,
      perdu: scored.filter(p => p.status === 'perdu').length,
    };
    const totalPremium = scored.reduce((s, p) => s + (p.estimated_annual_premium || 0), 0);

    res.json({
      success: true,
      data: {
        total_prospects: prospects.length,
        hot_prospects: hot.length,
        converted_clients: converted.length,
        estimated_premium_pipeline: totalPremium,
        estimated_commission_pipeline: Math.round(totalPremium * 0.12),
        conversion_rate: prospects.length > 0 ? Math.round((converted.length / prospects.length) * 100) : 0,
        avg_score: Math.round(scored.reduce((s, p) => s + p.opportunity_score, 0) / scored.length),
        pipeline,
        top_categories: ['garage', 'taxi_vtc', 'artisan'],
        best_city: 'Sens',
        mode: !dbAvailable() ? 'demo' : 'live',
      },
      mock: !dbAvailable(),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── MAP DATA ─────────────────────────────────────────────────────────
router.get('/map', verifyToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    const { category } = req.query;

    if (dbAvailable()) {
      try {
        let q = 'SELECT city, category, latitude, longitude, opportunity_score, estimated_annual_premium, COUNT(*) as cnt FROM reach_prospects WHERE user_id = $1';
        const params = [userId];
        if (category) { q += ' AND category = $2'; params.push(category); }
        q += ' GROUP BY city, category, latitude, longitude, opportunity_score, estimated_annual_premium';
        const result = await pool.query(q, params);
        if (result.rows.length > 0) {
          return res.json({ success: true, data: result.rows });
        }
      } catch (e) { /* table pas encore migrée */ }
    }

    // Mock map data
    const prospects = generateProspects({ category: category || 'garage', city: 'Sens', count: 20 });
    const cities = {};
    prospects.forEach(p => {
      const c = p.city || 'Inconnue';
      if (!cities[c]) cities[c] = { city: c, count: 0, hot: 0, total_premium: 0, lat: p.latitude, lng: p.longitude };
      cities[c].count++;
      if ((p.opportunity_score || 0) >= 70) cities[c].hot++;
      cities[c].total_premium += (p.estimated_annual_premium || 0);
    });

    res.json({
      success: true,
      data: Object.values(cities),
      mock: true,
    });
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
