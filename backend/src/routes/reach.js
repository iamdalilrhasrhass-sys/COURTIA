// ARK REACH V2 — Routes API complètes
// 14 tables DB : audiences, campaigns, campaign_steps, campaign_prospects,
// prospects, messages, replies, activity_log, analyses, notes, opt_outs, settings, sources
// Frontend store attend { success: true, data: ... }

const express = require('express');
const pool = require('../db');
const { verifyToken } = require('../middleware/auth');
const OpenAI = require('openai');
const { searchProspects: searchExternalProspects } = require('../services/reachSearchService');
const router = express.Router();

// DeepSeek client for AI features
const openai = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY || 'dummy_key',
  baseURL: 'https://api.deepseek.com/v1'
});

// ───────────────────────── HELPERS ─────────────────────────

function wrap(data) {
  return { success: true, data };
}

function err(msg, code = 400) {
  return { success: false, error: msg };
}

function scopedQuery(req, baseQuery, params = [], orderBy = 'created_at DESC') {
  return pool.query(
    `${baseQuery} WHERE user_id = $${params.length + 1} ORDER BY ${orderBy}`,
    [...params, req.user.id]
  );
}

// ─────────────────── DASHBOARD ───────────────────

// GET /api/reach/dashboard — Stats globales
router.get('/dashboard', verifyToken, async (req, res) => {
  try {
    const [prospects, audiences, campaigns, messages, replies, analyses] = await Promise.all([
      pool.query('SELECT COUNT(*) as total, status FROM reach_prospects WHERE user_id = $1 GROUP BY status', [req.user.id]),
      pool.query('SELECT COUNT(*) as total FROM reach_audiences WHERE user_id = $1', [req.user.id]),
      pool.query("SELECT COUNT(*) as total, status FROM reach_campaigns WHERE user_id = $1 GROUP BY status", [req.user.id]),
      pool.query("SELECT COUNT(*) as total, status FROM reach_messages WHERE prospect_id IN (SELECT id FROM reach_prospects WHERE user_id = $1) GROUP BY status", [req.user.id]),
      pool.query('SELECT COUNT(*) as total, is_read FROM reach_replies WHERE user_id = $1 GROUP BY is_read', [req.user.id]),
      pool.query('SELECT COUNT(*) as total FROM reach_analyses WHERE prospect_id IN (SELECT id FROM reach_prospects WHERE user_id = $1)', [req.user.id])
    ]);

    const totalProspects = prospects.rows.reduce((s, r) => s + parseInt(r.total), 0);
    const prospectStatus = {};
    prospects.rows.forEach(r => { prospectStatus[r.status] = parseInt(r.total); });

    const totalMessages = messages.rows.reduce((s, r) => s + parseInt(r.total), 0);
    const messagesByStatus = {};
    messages.rows.forEach(r => { messagesByStatus[r.status] = parseInt(r.total); });

    const unreadReplies = replies.rows.find(r => r.is_read === false)?.total || 0;

    res.json(wrap({
      total_prospects: totalProspects,
      prospects_by_status: prospectStatus,
      total_audiences: parseInt(audiences.rows[0]?.total || 0),
      total_campaigns: campaigns.rows.reduce((s, r) => s + parseInt(r.total), 0),
      campaigns_by_status: campaigns.rows.reduce((a, r) => { a[r.status] = parseInt(r.total); return a; }, {}),
      total_messages: totalMessages,
      messages_by_status: messagesByStatus,
      unread_replies: parseInt(unreadReplies),
      total_analyses: parseInt(analyses.rows[0]?.total || 0),
      sent_messages: parseInt(messagesByStatus['sent'] || 0),
      converted_prospects: parseInt(prospectStatus['converted'] || 0)
    }));
  } catch (e) {
    console.error('[reach] dashboard:', e.message);
    res.status(500).json(err('dashboard_failed'));
  }
});

// ─────────────────── AUDIENCES (legacy support) ───────────────────

router.get('/audiences', verifyToken, async (req, res) => {
  try {
    const r = await scopedQuery(req, 'SELECT * FROM reach_audiences');
    res.json(wrap(r.rows));
  } catch (e) {
    console.error('[reach] audiences:', e.message);
    res.status(500).json(err('list_failed'));
  }
});

router.post('/audiences', verifyToken, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json(err('name_required'));
    const r = await pool.query(
      'INSERT INTO reach_audiences (user_id, name) VALUES ($1, $2) RETURNING *',
      [req.user.id, name]
    );
    res.status(201).json(wrap(r.rows[0]));
  } catch (e) {
    console.error('[reach] create audience:', e.message);
    res.status(500).json(err('create_failed'));
  }
});

// ─────────────────── PROSPECTS ───────────────────

// GET /api/reach/prospects — Liste avec filtres
router.get('/prospects', verifyToken, async (req, res) => {
  try {
    const { status, category, city, search, limit = 50, offset = 0 } = req.query;
    let query = 'SELECT p.*, s.name as source_name FROM reach_prospects p LEFT JOIN reach_sources s ON p.source_id = s.id';
    const params = [];
    const conditions = ['p.user_id = $' + (params.length + 1)];
    params.push(req.user.id);

    if (status) { conditions.push('p.status = $' + (params.length + 1)); params.push(status); }
    if (category) { conditions.push('p.category = $' + (params.length + 1)); params.push(category); }
    if (city) { conditions.push('p.city ILIKE $' + (params.length + 1)); params.push('%' + city + '%'); }
    if (search) {
      conditions.push('(p.contact_first_name ILIKE $' + (params.length + 1) + ' OR p.contact_last_name ILIKE $' + (params.length + 1) + ' OR p.company_name ILIKE $' + (params.length + 1) + ' OR p.email ILIKE $' + (params.length + 1) + ')');
      params.push('%' + search + '%');
    }

    query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY p.opportunity_score DESC NULLS LAST, p.created_at DESC';
    query += ' LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(parseInt(limit), parseInt(offset));

    const r = await pool.query(query, params);
    res.json(wrap(r.rows));
  } catch (e) {
    console.error('[reach] list prospects:', e.message);
    res.status(500).json(err('list_failed'));
  }
});

// GET /api/reach/prospects/:id — Détail prospect
router.get('/prospects/:id', verifyToken, async (req, res) => {
  try {
    const r = await pool.query(
      'SELECT p.*, s.name as source_name FROM reach_prospects p LEFT JOIN reach_sources s ON p.source_id = s.id WHERE p.id = $1 AND p.user_id = $2',
      [req.params.id, req.user.id]
    );
    if (!r.rows.length) return res.status(404).json(err('prospect_not_found'));
    res.json(wrap(r.rows[0]));
  } catch (e) {
    console.error('[reach] prospect detail:', e.message);
    res.status(500).json(err('detail_failed'));
  }
});

// POST /api/reach/prospects — Créer un prospect
router.post('/prospects', verifyToken, async (req, res) => {
  try {
    const { email, first_name, last_name, phone, company_name, city, category, niche } = req.body;
    if (!email) return res.status(400).json(err('email_required'));
    const r = await pool.query(
      `INSERT INTO reach_prospects (user_id, email, contact_first_name, contact_last_name, phone, company_name, city, category, niche, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'nouveau') RETURNING *`,
      [req.user.id, email, first_name, last_name, phone, company_name, city, category, niche]
    );
    res.status(201).json(wrap(r.rows[0]));
  } catch (e) {
    console.error('[reach] create prospect:', e.message);
    res.status(500).json(err('create_failed'));
  }
});

// PATCH /api/reach/prospects/:id/status — Mettre à jour le statut
router.patch('/prospects/:id/status', verifyToken, async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json(err('status_required'));
    const r = await pool.query(
      'UPDATE reach_prospects SET status = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3 RETURNING *',
      [status, req.params.id, req.user.id]
    );
    if (!r.rows.length) return res.status(404).json(err('prospect_not_found'));
    
    // Log activity
    await pool.query(
      'INSERT INTO reach_activity_log (prospect_id, user_id, action, details) VALUES ($1, $2, $3, $4)',
      [req.params.id, req.user.id, 'status_change', JSON.stringify({ from: null, to: status })]
    );
    
    res.json(wrap(r.rows[0]));
  } catch (e) {
    console.error('[reach] update status:', e.message);
    res.status(500).json(err('update_failed'));
  }
});

// POST /api/reach/prospects/:id/analyze — Analyse IA
router.post('/prospects/:id/analyze', verifyToken, async (req, res) => {
  try {
    if (!process.env.DEEPSEEK_API_KEY) {
      return res.status(503).json({
        success: false,
        error: 'configuration_required',
        provider: 'deepseek',
        message: 'Configuration ARK requise pour analyser un prospect REACH.',
      });
    }
    const prospect = await pool.query(
      'SELECT * FROM reach_prospects WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (!prospect.rows.length) return res.status(404).json(err('prospect_not_found'));

    const p = prospect.rows[0];

    // Vérifier si une analyse existe déjà (moins de 24h)
    const existingAnalysis = await pool.query(
      'SELECT * FROM reach_analyses WHERE prospect_id = $1 AND created_at > NOW() - INTERVAL \'24 hours\' ORDER BY created_at DESC LIMIT 1',
      [req.params.id]
    );
    if (existingAnalysis.rows.length) {
      return res.json(wrap(existingAnalysis.rows[0]));
    }

    // Analyse AI via DeepSeek
    const systemPrompt = `Tu es ARK REACH, expert en prospection assurance pour courtiers français.
Analyse ce prospect et retourne UNIQUEMENT du JSON valide avec ce format exact :
{
  "problems_detected": ["problème 1", "problème 2"],
  "opportunities": ["opportunité 1", "opportunité 2"],
  "call_script": "script d'appel de 3-4 phrases",
  "email_template": "email de prospection personnalisé de 5-8 phrases",
  "sms_template": "SMS court de 2-3 phrases",
  "linkedin_message": "message LinkedIn de 3-4 phrases",
  "next_best_action": "meilleure action à faire",
  "score_details": {
    "opportunity": nombre 1-100,
    "urgency": nombre 1-100,
    "ease": nombre 1-100
  }
}`;

    const userPrompt = `Entreprise: ${p.company_name || 'N/A'}
Nom: ${p.contact_first_name || ''} ${p.contact_last_name || ''}
Email: ${p.email || 'N/A'}
Téléphone: ${p.phone || 'N/A'}
Ville: ${p.city || 'N/A'}
Catégorie: ${p.category || 'N/A'}
Niche: ${p.niche || 'N/A'}
Notes: ${p.approach_angle || 'Aucune'}
Note actuelle: ${p.opportunity_score || 'N/A'}/100`;

    let analysisResult;
    try {
      const response = await openai.chat.completions.create({
        model: 'deepseek-chat',
        max_tokens: 1000,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      });
      analysisResult = JSON.parse(response.choices[0].message.content);
    } catch (aiErr) {
      return res.status(503).json({
        success: false,
        error: 'provider_unavailable',
        provider: 'deepseek',
        message: 'Analyse ARK temporairement indisponible.',
      });
    }

    // Save analysis
    const saved = await pool.query(
      `INSERT INTO reach_analyses (prospect_id, problems_detected, opportunities, call_script, linkedin_message, email_template, sms_template, next_best_action, score_details)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        req.params.id,
        JSON.stringify(analysisResult.problems_detected || []),
        JSON.stringify(analysisResult.opportunities || []),
        analysisResult.call_script || '',
        analysisResult.linkedin_message || '',
        analysisResult.email_template || '',
        analysisResult.sms_template || '',
        analysisResult.next_best_action || '',
        JSON.stringify(analysisResult.score_details || {})
      ]
    );

    // Update prospect scores
    if (analysisResult.score_details) {
      await pool.query(
        'UPDATE reach_prospects SET opportunity_score = $1, urgency_score = $2, ease_score = $3, updated_at = NOW() WHERE id = $4',
        [analysisResult.score_details.opportunity || 0, analysisResult.score_details.urgency || 0, analysisResult.score_details.ease || 0, req.params.id]
      );
    }

    // Log activity
    await pool.query(
      'INSERT INTO reach_activity_log (prospect_id, user_id, action, details) VALUES ($1, $2, $3, $4)',
      [req.params.id, req.user.id, 'ai_analysis', JSON.stringify({ score: analysisResult.score_details })]
    );

    res.json(wrap(saved.rows[0]));
  } catch (e) {
    console.error('[reach] analyze:', e.message);
    res.status(500).json(err('analyze_failed'));
  }
});

// POST /api/reach/prospects/:id/create-task — Créer une tâche liée à un prospect
router.post('/prospects/:id/create-task', verifyToken, async (req, res) => {
  try {
    const { title, description, due_date, priority } = req.body;
    if (!title) return res.status(400).json(err('title_required'));

    // Créer la tâche dans le système existant
    const task = await pool.query(
      `INSERT INTO taches (courtier_id, titre, description, priorite, echeance, statut, source)
       VALUES ($1, $2, $3, $4, $5, 'a_faire', 'reach') RETURNING *`,
      [req.user.id, title, description || '', priority || 'moyenne', due_date || null]
    );

    // Log activity
    await pool.query(
      'INSERT INTO reach_activity_log (prospect_id, user_id, action, details) VALUES ($1, $2, $3, $4)',
      [req.params.id, req.user.id, 'task_created', JSON.stringify({ task_id: task.rows[0].id, title })]
    );

    res.status(201).json(wrap(task.rows[0]));
  } catch (e) {
    console.error('[reach] create task:', e.message);
    res.status(500).json(err('create_task_failed'));
  }
});

// POST /api/reach/convert-to-client — Convertir prospect en client
router.post('/convert-to-client', verifyToken, async (req, res) => {
  try {
    const { prospect } = req.body;
    if (!prospect || !prospect.id) return res.status(400).json(err('prospect_required'));

    const p = await pool.query(
      'SELECT * FROM reach_prospects WHERE id = $1 AND user_id = $2',
      [prospect.id, req.user.id]
    );
    if (!p.rows.length) return res.status(404).json(err('prospect_not_found'));

    const pp = p.rows[0];

    // Créer le client dans la table clients
    const client = await pool.query(
      `INSERT INTO clients (courtier_id, first_name, last_name, email, phone, company_name, city, status, type, notes, source)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'nouveau', 'prospect', $8, 'ARK REACH')
       ON CONFLICT DO NOTHING RETURNING *`,
      [req.user.id, pp.contact_first_name, pp.contact_last_name, pp.email, pp.phone, pp.company_name, pp.city, pp.approach_angle || '']
    );

    let clientRecord;
    if (client.rows.length > 0) {
      clientRecord = client.rows[0];
      // Si conflit (email déjà existant), on récupère le client existant
    } else {
      const existingClient = await pool.query(
        'SELECT * FROM clients WHERE email = $1 AND courtier_id = $2',
        [pp.email, req.user.id]
      );
      clientRecord = existingClient.rows[0];
    }

    // Marquer le prospect comme converti
    await pool.query(
      'UPDATE reach_prospects SET status = $1, converted_client_id = $2, converted_at = NOW(), updated_at = NOW() WHERE id = $3',
      ['converted', clientRecord.id, req.params.id || prospect.id]
    );

    // Log activity
    await pool.query(
      'INSERT INTO reach_activity_log (prospect_id, user_id, action, details) VALUES ($1, $2, $3, $4)',
      [prospect.id, req.user.id, 'converted', JSON.stringify({ client_id: clientRecord.id })]
    );

    res.status(201).json(wrap({ client: clientRecord, prospect_id: prospect.id }));
  } catch (e) {
    console.error('[reach] convert:', e.message);
    res.status(500).json(err('convert_failed'));
  }
});

// ─────────────────── CAMPAIGNS ───────────────────

// GET /api/reach/campaigns — Lister les campagnes
router.get('/campaigns', verifyToken, async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT c.*,
        (SELECT COUNT(*) FROM reach_campaign_prospects cp WHERE cp.campaign_id = c.id) as prospect_count,
        (SELECT COUNT(*) FROM reach_messages m WHERE m.campaign_id = c.id AND m.status = 'sent') as sent_count
       FROM reach_campaigns c WHERE c.user_id = $1
       ORDER BY c.created_at DESC`,
      [req.user.id]
    );
    res.json(wrap(r.rows));
  } catch (e) {
    console.error('[reach] list campaigns:', e.message);
    res.status(500).json(err('list_failed'));
  }
});

// POST /api/reach/campaigns — Créer une campagne
router.post('/campaigns', verifyToken, async (req, res) => {
  try {
    const { name, target_description, channel, target_category, tone } = req.body;
    if (!name) return res.status(400).json(err('name_required'));

    const r = await pool.query(
      `INSERT INTO reach_campaigns (user_id, name, target_description, channel, target_category, tone, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'draft') RETURNING *`,
      [req.user.id, name, target_description || '', channel || 'email', target_category || '', tone || 'professionnel']
    );
    res.status(201).json(wrap(r.rows[0]));
  } catch (e) {
    console.error('[reach] create campaign:', e.message);
    res.status(500).json(err('create_failed'));
  }
});

// POST /api/reach/campaigns/from-template — Créer campagne depuis template
router.post('/campaigns/from-template', verifyToken, async (req, res) => {
  try {
    const { name, target_description, channel, target_category, steps } = req.body;
    if (!name) return res.status(400).json(err('name_required'));

    // Créer la campagne
    const campaign = await pool.query(
      `INSERT INTO reach_campaigns (user_id, name, target_description, channel, target_category, status)
       VALUES ($1, $2, $3, $4, $5, 'draft') RETURNING *`,
      [req.user.id, name, target_description || '', channel || 'email', target_category || '']
    );

    // Créer les steps si fournis
    if (Array.isArray(steps) && steps.length > 0) {
      // Use parameterized query for safety
      for (let i = 0; i < steps.length; i++) {
        const s = steps[i];
        await pool.query(
          'INSERT INTO reach_campaign_steps (campaign_id, step_order, delay_days, channel, subject_template, body_template) VALUES ($1, $2, $3, $4, $5, $6)',
          [campaign.rows[0].id, i + 1, s.delay_days || 0, s.channel || 'email', s.subject_template || '', s.body_template || '']
        );
      }
    }

    res.status(201).json(wrap(campaign.rows[0]));
  } catch (e) {
    console.error('[reach] create from template:', e.message);
    res.status(500).json(err('template_failed'));
  }
});

// GET /api/reach/campaigns/:id — Détail campagne
router.get('/campaigns/:id', verifyToken, async (req, res) => {
  try {
    const campaign = await pool.query(
      'SELECT * FROM reach_campaigns WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (!campaign.rows.length) return res.status(404).json(err('campaign_not_found'));

    const steps = await pool.query(
      'SELECT * FROM reach_campaign_steps WHERE campaign_id = $1 ORDER BY step_order',
      [req.params.id]
    );

    const prospects = await pool.query(
      `SELECT cp.*, p.contact_first_name, p.contact_last_name, p.email, p.company_name, p.city, p.opportunity_score
       FROM reach_campaign_prospects cp
       JOIN reach_prospects p ON p.id = cp.prospect_id
       WHERE cp.campaign_id = $1 ORDER BY cp.added_at DESC`,
      [req.params.id]
    );

    res.json(wrap({
      ...campaign.rows[0],
      steps: steps.rows,
      prospects: prospects.rows
    }));
  } catch (e) {
    console.error('[reach] campaign detail:', e.message);
    res.status(500).json(err('detail_failed'));
  }
});

// PATCH /api/reach/campaigns/:id/status — Mettre à jour statut campagne
router.patch('/campaigns/:id/status', verifyToken, async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json(err('status_required'));

    const validStatuses = ['draft', 'running', 'paused', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) return res.status(400).json(err('invalid_status'));

    const r = await pool.query(
      'UPDATE reach_campaigns SET status = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3 RETURNING *',
      [status, req.params.id, req.user.id]
    );
    if (!r.rows.length) return res.status(404).json(err('campaign_not_found'));

    res.json(wrap(r.rows[0]));
  } catch (e) {
    console.error('[reach] update campaign status:', e.message);
    res.status(500).json(err('update_failed'));
  }
});

// POST /api/reach/campaigns/:id/prospects — Ajouter des prospects à une campagne
router.post('/campaigns/:id/prospects', verifyToken, async (req, res) => {
  try {
    const { prospect_ids } = req.body;
    if (!Array.isArray(prospect_ids) || prospect_ids.length === 0) {
      return res.status(400).json(err('prospect_ids_required'));
    }

    const campaign = await pool.query(
      'SELECT * FROM reach_campaigns WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (!campaign.rows.length) return res.status(404).json(err('campaign_not_found'));

    let added = 0;
    for (const pid of prospect_ids) {
      try {
        await pool.query(
          'INSERT INTO reach_campaign_prospects (campaign_id, prospect_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [req.params.id, pid]
        );
        added++;
      } catch (e) { /* skip */ }
    }

    res.json(wrap({ added, total: prospect_ids.length }));
  } catch (e) {
    console.error('[reach] add prospects to campaign:', e.message);
    res.status(500).json(err('add_failed'));
  }
});

// ─────────────────── MESSAGES ───────────────────

// POST /api/reach/messages/generate — Générer un message personnalisé via AI
router.post('/messages/generate', verifyToken, async (req, res) => {
  try {
    if (!process.env.DEEPSEEK_API_KEY) {
      return res.status(503).json({
        success: false,
        error: 'configuration_required',
        provider: 'deepseek',
        message: 'Configuration ARK requise pour generer un message.',
      });
    }
    const { prospect, analysis, channel } = req.body;
    if (!prospect) return res.status(400).json(err('prospect_required'));

    const c = channel || 'email';

    // Construire le prompt
    const systemPrompt = `Tu es ARK REACH, assistant IA pour courtiers en assurance.
Génère un message de prospection personnalisé en ${c === 'sms' ? 'SMS (max 160 caractères)' : c === 'linkedin' ? 'message LinkedIn professionnel' : 'email professionnel'}.
Le ton doit être : professionnel, court, orienté valeur.
Réponds UNIQUEMENT avec le contenu du message, sans guillemets, sans préfixe.`;

    const userPrompt = `Prospect :
Nom: ${prospect.first_name || prospect.contact_first_name || ''}
Entreprise: ${prospect.company_name || ''}
Ville: ${prospect.city || ''}
Catégorie: ${prospect.category || ''}
Niche: ${prospect.niche || ''}
${analysis ? 'Analyse: ' + JSON.stringify(analysis) : ''}

Génère un message de prospession ${c} personnalisé pour ce courtier.`;

    let message;
    try {
      const response = await openai.chat.completions.create({
        model: 'deepseek-chat',
        max_tokens: 500,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      });
      message = response.choices[0].message.content.trim();
    } catch (aiErr) {
      return res.status(503).json({
        success: false,
        error: 'provider_unavailable',
        provider: 'deepseek',
        message: 'Generation ARK temporairement indisponible.',
      });
    }

    res.json(wrap({ message, channel: c }));
  } catch (e) {
    console.error('[reach] generate message:', e.message);
    res.status(500).json(err('generate_failed'));
  }
});

// GET /api/reach/messages — Messages envoyés/reçus
router.get('/messages', verifyToken, async (req, res) => {
  try {
    const { prospect_id, campaign_id, limit = 50, offset = 0 } = req.query;
    let query = `SELECT m.*, p.contact_first_name, p.contact_last_name, p.email as prospect_email 
                 FROM reach_messages m 
                 JOIN reach_prospects p ON p.id = m.prospect_id 
                 WHERE p.user_id = $1`;
    const params = [req.user.id];

    if (prospect_id) { params.push(prospect_id); query += ' AND m.prospect_id = $' + params.length; }
    if (campaign_id) { params.push(campaign_id); query += ' AND m.campaign_id = $' + params.length; }

    query += ' ORDER BY m.created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(parseInt(limit), parseInt(offset));

    const r = await pool.query(query, params);
    res.json(wrap(r.rows));
  } catch (e) {
    console.error('[reach] list messages:', e.message);
    res.status(500).json(err('list_failed'));
  }
});

// ─────────────────── REPLIES ───────────────────

// GET /api/reach/replies — Réponses reçues
router.get('/replies', verifyToken, async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT r.*, p.contact_first_name, p.contact_last_name, p.email as prospect_email, p.company_name
       FROM reach_replies r
       JOIN reach_prospects p ON p.id = r.prospect_id
       WHERE r.user_id = $1
       ORDER BY r.received_at DESC LIMIT 100`,
      [req.user.id]
    );
    res.json(wrap(r.rows));
  } catch (e) {
    console.error('[reach] list replies:', e.message);
    res.status(500).json(err('list_failed'));
  }
});

// POST /api/reach/replies/:id/handle — Traiter une réponse
router.post('/replies/:id/handle', verifyToken, async (req, res) => {
  try {
    const { action } = req.body;
    if (!action || !['mark_read', 'archive', 'convert_client', 'create_task'].includes(action)) {
      return res.status(400).json(err('invalid_action'));
    }

    const reply = await pool.query(
      'SELECT * FROM reach_replies WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (!reply.rows.length) return res.status(404).json(err('reply_not_found'));

    let result = {};

    if (action === 'mark_read') {
      await pool.query('UPDATE reach_replies SET is_read = true WHERE id = $1', [req.params.id]);
      result = { status: 'read' };
    } else if (action === 'archive') {
      await pool.query('UPDATE reach_replies SET is_read = true WHERE id = $1', [req.params.id]);
      result = { status: 'archived' };
    } else if (action === 'convert_client') {
      // Auto-convert the prospect
      const rr = reply.rows[0];
      const prospect = await pool.query('SELECT * FROM reach_prospects WHERE id = $1', [rr.prospect_id]);
      if (prospect.rows.length) {
        const p = prospect.rows[0];
        const client = await pool.query(
          `INSERT INTO clients (courtier_id, first_name, last_name, email, phone, company_name, city, status, type)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'nouveau', 'prospect') RETURNING *`,
          [req.user.id, p.contact_first_name, p.contact_last_name, p.email, p.phone, p.company_name, p.city]
        );
        await pool.query("UPDATE reach_prospects SET status = 'converted', converted_client_id = $1, converted_at = NOW() WHERE id = $2", [client.rows[0].id, rr.prospect_id]);
        await pool.query('UPDATE reach_replies SET is_read = true, client_created = true WHERE id = $1', [req.params.id]);
        result = { status: 'converted', client_id: client.rows[0].id };
      }
    } else if (action === 'create_task') {
      const rr = reply.rows[0];
      const prospect = await pool.query('SELECT * FROM reach_prospects WHERE id = $1', [rr.prospect_id]);
      if (prospect.rows.length) {
        const p = prospect.rows[0];
        const task = await pool.query(
          `INSERT INTO taches (courtier_id, titre, description, priorite, statut, source)
           VALUES ($1, $2, $3, $4, 'a_faire', 'reach_reply') RETURNING *`,
          [req.user.id, `Répondre à ${p.contact_first_name || ''} ${p.contact_last_name || ''} (${p.company_name || ''})`, rr.body?.substring(0, 200) || '', 'haute']
        );
        result = { status: 'task_created', task_id: task.rows[0].id };
      }
    }

    res.json(wrap(result));
  } catch (e) {
    console.error('[reach] handle reply:', e.message);
    res.status(500).json(err('handle_failed'));
  }
});

// ─────────────────── SEARCH ───────────────────

// POST /api/reach/search — Rechercher des prospects (Google Places style)
router.post('/search', verifyToken, async (req, res) => {
  try {
    const { category, city, radius, niche, limit = 15 } = req.body;

    // Pour l'instant, chercher dans la base locale + suggestions AI
    // Version simplifiée : retourne les prospects existants correspondant aux critères
    let query = 'SELECT * FROM reach_prospects WHERE user_id = $1';
    const params = [req.user.id];
    
    if (category) { params.push('%' + category + '%'); query += ' AND category ILIKE $' + params.length; }
    if (city) { params.push('%' + city + '%'); query += ' AND (city ILIKE $' + params.length + " OR address ILIKE $" + params.length + ')'; }
    if (niche) { params.push('%' + niche + '%'); query += ' AND niche ILIKE $' + params.length; }

    query += ' ORDER BY opportunity_score DESC NULLS LAST LIMIT $' + (params.length + 1);
    params.push(parseInt(limit));

    const r = await pool.query(query, params);

    let suggestions = [];
    if (r.rows.length === 0 && city) {
      suggestions = await searchExternalProspects({ category, city, radius, niche, limit });
    }

    res.json(wrap({
      items: r.rows,
      suggestions,
      configuration_required: !process.env.GOOGLE_PLACES_API_KEY && process.env.REACH_DEMO_MODE !== 'true',
      provider: process.env.GOOGLE_PLACES_API_KEY ? 'google_places' : process.env.REACH_DEMO_MODE === 'true' ? 'local_demo' : 'none',
      message: (!process.env.GOOGLE_PLACES_API_KEY && process.env.REACH_DEMO_MODE !== 'true')
        ? 'Configuration Google Places requise pour enrichir la recherche externe.'
        : undefined,
    }));
  } catch (e) {
    console.error('[reach] search:', e.message);
    res.status(500).json(err('search_failed'));
  }
});

// ─────────────────── REPORTING ───────────────────

// GET /api/reach/reporting — Rapports de performance
router.get('/reporting', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const [totalProspects, totalCampaigns, totalMessages, converted, replies, activity] = await Promise.all([
      pool.query('SELECT COUNT(*) as t FROM reach_prospects WHERE user_id = $1', [userId]),
      pool.query('SELECT COUNT(*) as t FROM reach_campaigns WHERE user_id = $1', [userId]),
      pool.query("SELECT COUNT(*) as t FROM reach_messages m JOIN reach_prospects p ON m.prospect_id = p.id WHERE p.user_id = $1 AND m.status = 'sent'", [userId]),
      pool.query("SELECT COUNT(*) as t FROM reach_prospects WHERE user_id = $1 AND status = 'converted'", [userId]),
      pool.query('SELECT COUNT(*) as t FROM reach_replies WHERE user_id = $1', [userId]),
      pool.query('SELECT DATE(created_at) as day, COUNT(*) as count FROM reach_activity_log WHERE user_id = $1 AND created_at > NOW() - INTERVAL \'30 days\' GROUP BY day ORDER BY day', [userId])
    ]);

    const tp = parseInt(totalProspects.rows[0].t);
    const conv = parseInt(converted.rows[0].t);

    res.json(wrap({
      total_prospects: tp,
      total_campaigns: parseInt(totalCampaigns.rows[0].t),
      total_messages_sent: parseInt(totalMessages.rows[0].t),
      converted: conv,
      conversion_rate: tp > 0 ? Math.round((conv / tp) * 100) : 0,
      total_replies: parseInt(replies.rows[0].t),
      activity: activity.rows
    }));
  } catch (e) {
    console.error('[reach] reporting:', e.message);
    res.status(500).json(err('reporting_failed'));
  }
});

// ─────────────────── MAP ───────────────────

// GET /api/reach/map — Données pour la carte
router.get('/map', verifyToken, async (req, res) => {
  try {
    const { category } = req.query;
    let query = 'SELECT id, contact_first_name, contact_last_name, company_name, city, latitude, longitude, opportunity_score, status, category, estimated_annual_premium FROM reach_prospects WHERE user_id = $1';
    const params = [req.user.id];

    if (category) { params.push(category); query += ' AND category = $' + params.length; }

    query += ' AND latitude IS NOT NULL AND longitude IS NOT NULL ORDER BY opportunity_score DESC NULLS LAST';

    const r = await pool.query(query, params);
    res.json(wrap(r.rows));
  } catch (e) {
    console.error('[reach] map:', e.message);
    res.status(500).json(err('map_failed'));
  }
});

// ─────────────────── ACTIVITY LOG ───────────────────

// GET /api/reach/activity — Journal d'activité
router.get('/activity', verifyToken, async (req, res) => {
  try {
    const { prospect_id, limit = 50, offset = 0 } = req.query;
    let query = `SELECT a.*, p.contact_first_name, p.contact_last_name, p.company_name 
                 FROM reach_activity_log a 
                 JOIN reach_prospects p ON p.id = a.prospect_id 
                 WHERE a.user_id = $1`;
    const params = [req.user.id];

    if (prospect_id) { params.push(prospect_id); query += ' AND a.prospect_id = $' + params.length; }

    query += ' ORDER BY a.created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(parseInt(limit), parseInt(offset));

    const r = await pool.query(query, params);
    res.json(wrap(r.rows));
  } catch (e) {
    console.error('[reach] activity:', e.message);
    res.status(500).json(err('activity_failed'));
  }
});

// ─────────────────── NOTES ───────────────────

// GET /api/reach/prospects/:id/notes
router.get('/prospects/:id/notes', verifyToken, async (req, res) => {
  try {
    const r = await pool.query(
      'SELECT * FROM reach_notes WHERE prospect_id = $1 AND user_id = $2 ORDER BY created_at DESC',
      [req.params.id, req.user.id]
    );
    res.json(wrap(r.rows));
  } catch (e) {
    console.error('[reach] notes:', e.message);
    res.status(500).json(err('notes_failed'));
  }
});

// POST /api/reach/prospects/:id/notes
router.post('/prospects/:id/notes', verifyToken, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json(err('content_required'));
    const r = await pool.query(
      'INSERT INTO reach_notes (prospect_id, user_id, content) VALUES ($1, $2, $3) RETURNING *',
      [req.params.id, req.user.id, content]
    );
    res.status(201).json(wrap(r.rows[0]));
  } catch (e) {
    console.error('[reach] create note:', e.message);
    res.status(500).json(err('note_create_failed'));
  }
});

// ─────────────────── SETTINGS ───────────────────

// GET /api/reach/settings
router.get('/settings', verifyToken, async (req, res) => {
  try {
    const integrationStatus = {
      google_places_configured: Boolean(process.env.GOOGLE_PLACES_API_KEY),
      anthropic_configured: Boolean(process.env.ANTHROPIC_API_KEY || process.env.DEEPSEEK_API_KEY),
      mode: process.env.GOOGLE_PLACES_API_KEY ? 'live' : 'configuration_required',
      status_note: process.env.GOOGLE_PLACES_API_KEY
        ? 'REACH peut utiliser Google Places pour la recherche externe.'
        : 'Configuration requise : ajoutez GOOGLE_PLACES_API_KEY pour activer la recherche externe.',
    };
    const r = await pool.query(
      'SELECT * FROM reach_settings WHERE user_id = $1',
      [req.user.id]
    );
    if (!r.rows.length) {
      // Create default settings
      const created = await pool.query(
        'INSERT INTO reach_settings (user_id) VALUES ($1) RETURNING *',
        [req.user.id]
      );
      return res.json(wrap({ ...created.rows[0], ...integrationStatus }));
    }
    res.json(wrap({ ...r.rows[0], ...integrationStatus }));
  } catch (e) {
    console.error('[reach] settings:', e.message);
    res.status(500).json(err('settings_failed'));
  }
});

// PATCH /api/reach/settings
router.patch('/settings', verifyToken, async (req, res) => {
  try {
    const allowedFields = ['google_places_enabled', 'ai_enabled', 'default_city', 'default_category', 'auto_validate_messages'];
    const updates = [];
    const params = [req.user.id];
    let idx = 2;

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = $${idx}`);
        params.push(req.body[field]);
        idx++;
      }
    }
    updates.push('updated_at = NOW()');

    if (updates.length === 0) return res.status(400).json(err('no_fields'));

    const r = await pool.query(
      `UPDATE reach_settings SET ${updates.join(', ')} WHERE user_id = $1 RETURNING *`,
      params
    );
    res.json(wrap(r.rows[0]));
  } catch (e) {
    console.error('[reach] update settings:', e.message);
    res.status(500).json(err('settings_update_failed'));
  }
});

// ─────────────────── SOURCES ───────────────────

// GET /api/reach/sources
router.get('/sources', verifyToken, async (req, res) => {
  try {
    const r = await scopedQuery(req, 'SELECT * FROM reach_sources', [], 'name ASC');
    res.json(wrap(r.rows));
  } catch (e) {
    console.error('[reach] sources:', e.message);
    res.status(500).json(err('sources_failed'));
  }
});

// ─────────────────── OPT-OUTS ───────────────────

// GET /api/reach/opt-outs
router.get('/opt-outs', verifyToken, async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT o.*, p.contact_first_name, p.contact_last_name, p.company_name, p.email as prospect_email
       FROM reach_opt_outs o
       LEFT JOIN reach_prospects p ON p.id = o.prospect_id
       WHERE o.user_id = $1 ORDER BY o.created_at DESC`,
      [req.user.id]
    );
    res.json(wrap(r.rows));
  } catch (e) {
    console.error('[reach] opt-outs:', e.message);
    res.status(500).json(err('optouts_failed'));
  }
});

// ─────────────────── LEGACY SUPPORT ───────────────────

// Legacy routes for backward compatibility with existing reach.js
router.get('/sequences', verifyToken, async (req, res) => {
  try {
    const { audience_id } = req.query;
    let query = 'SELECT * FROM reach_sequences WHERE user_id = $1';
    const params = [req.user.id];
    if (audience_id) { params.push(audience_id); query += ' AND audience_id = $' + params.length; }
    query += ' ORDER BY created_at DESC';
    const r = await pool.query(query, params);
    res.json(wrap(r.rows));
  } catch (e) {
    console.error('[reach] sequences:', e.message);
    res.status(500).json(err('list_failed'));
  }
});

router.post('/sequences', verifyToken, async (req, res) => {
  try {
    const { audience_id, name, channel, template } = req.body;
    if (!audience_id || !name) return res.status(400).json(err('missing_fields'));
    const r = await pool.query(
      'INSERT INTO reach_sequences (user_id, audience_id, name, channel, template) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [req.user.id, audience_id, name, channel || 'email', template || '']
    );
    res.status(201).json(wrap(r.rows[0]));
  } catch (e) {
    console.error('[reach] create sequence:', e.message);
    res.status(500).json(err('create_failed'));
  }
});

router.post('/audiences/:id/import', verifyToken, async (req, res) => {
  try {
    const { prospects } = req.body;
    if (!Array.isArray(prospects) || prospects.length === 0) {
      return res.status(400).json(err('prospects_array_required'));
    }
    const audience = await pool.query('SELECT * FROM reach_audiences WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    if (!audience.rows.length) return res.status(404).json(err('audience_not_found'));

    let imported = 0;
    for (const p of prospects) {
      if (!p.email) continue;
      try {
        await pool.query(
          `INSERT INTO reach_prospects (user_id, email, contact_first_name, contact_last_name, phone, company_name, city, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'nouveau') ON CONFLICT DO NOTHING`,
          [req.user.id, p.email, p.first_name, p.last_name, p.phone, p.company_name, p.city]
        );
        imported++;
      } catch (e) { /* skip duplicates */ }
    }
    res.status(201).json(wrap({ imported, total: prospects.length }));
  } catch (e) {
    console.error('[reach] import:', e.message);
    res.status(500).json(err('import_failed'));
  }
});

// Legacy messages/preview with AI personalization (backward compat)
router.post('/messages/preview', verifyToken, async (req, res) => {
  try {
    const { template, prospects_ids } = req.body;
    if (!template || !Array.isArray(prospects_ids)) {
      return res.status(400).json(err('template_and_prospects_required'));
    }

    const results = await pool.query(
      'SELECT * FROM reach_prospects WHERE id = ANY($1) AND user_id = $2 LIMIT 3',
      [prospects_ids, req.user.id]
    );

    const previews = results.rows.map(p => ({
      prospect_id: p.id,
      email: p.email,
      first_name: p.contact_first_name,
      personalized: template
        .replace(/{first_name}/g, p.contact_first_name || '')
        .replace(/{last_name}/g, p.contact_last_name || '')
        .replace(/{company}/g, p.company_name || '')
        .replace(/{city}/g, p.city || '')
    }));

    res.json(wrap(previews));
  } catch (e) {
    console.error('[reach] preview:', e.message);
    res.status(500).json(err('preview_failed'));
  }
});

// ━━━━━━━━━━━ PLAYBOOKS (modèles de campagnes) ━━━━━━━━━━━

// GET /playbooks — liste des playbooks disponibles
router.get('/playbooks', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM reach_playbooks
       WHERE user_id = $1 OR is_public = true
       ORDER BY is_default DESC, usage_count DESC, name ASC`,
      [req.user.id]
    );
    res.json(wrap(result.rows));
  } catch (e) {
    console.error('[reach] playbooks list:', e.message);
    res.status(500).json(err('playbooks_list_failed'));
  }
});

// GET /playbooks/:id — détail d'un playbook
router.get('/playbooks/:id', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM reach_playbooks
       WHERE id = $1 AND (user_id = $2 OR is_public = true)`,
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json(err('playbook_not_found'));
    res.json(wrap(result.rows[0]));
  } catch (e) {
    console.error('[reach] playbook detail:', e.message);
    res.status(500).json(err('playbook_detail_failed'));
  }
});

// POST /playbooks — créer un playbook
router.post('/playbooks', verifyToken, async (req, res) => {
  try {
    const { name, description, channel, steps, category } = req.body;
    if (!name || !steps) return res.status(400).json(err('name_and_steps_required'));
    const result = await pool.query(
      `INSERT INTO reach_playbooks (user_id, name, description, channel, steps, category)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.user.id, name, description, channel || 'email', JSON.stringify(steps), category || 'general']
    );
    res.status(201).json(wrap(result.rows[0]));
  } catch (e) {
    console.error('[reach] playbook create:', e.message);
    res.status(500).json(err('playbook_create_failed'));
  }
});

// DELETE /playbooks/:id — supprimer un playbook (propriétaire seulement)
router.delete('/playbooks/:id', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM reach_playbooks WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json(err('playbook_not_found_or_not_owner'));
    res.json(wrap({ deleted: true }));
  } catch (e) {
    console.error('[reach] playbook delete:', e.message);
    res.status(500).json(err('playbook_delete_failed'));
  }
});

// POST /playbooks/:id/use — incrémenter compteur d'utilisation
router.post('/playbooks/:id/use', verifyToken, async (req, res) => {
  try {
    await pool.query(
      'UPDATE reach_playbooks SET usage_count = usage_count + 1 WHERE id = $1',
      [req.params.id]
    );
    res.json(wrap({ ok: true }));
  } catch (e) {
    console.error('[reach] playbook use:', e.message);
    res.status(500).json(err('playbook_use_failed'));
  }
});

// POST /campaigns/from-playbook/:id — créer une campagne depuis un playbook
router.post('/campaigns/from-playbook/:id', verifyToken, async (req, res) => {
  try {
    const playbook = await pool.query(
      `SELECT * FROM reach_playbooks WHERE id = $1 AND (user_id = $2 OR is_public = true)`,
      [req.params.id, req.user.id]
    );
    if (playbook.rows.length === 0) return res.status(404).json(err('playbook_not_found'));

    const pb = playbook.rows[0];
    const steps = typeof pb.steps === 'string' ? JSON.parse(pb.steps) : pb.steps;
    const { audience_id } = req.body;

    // Créer la campagne
    const campaign = await pool.query(
      `INSERT INTO reach_campaigns (user_id, name, description, channel, status)
       VALUES ($1, $2, $3, $4, 'draft') RETURNING *`,
      [req.user.id, pb.name, pb.description, pb.channel]
    );

    // Créer les steps à partir du playbook
    for (const step of steps) {
      await pool.query(
        `INSERT INTO reach_campaign_steps (campaign_id, step_order, delay_days, subject_template, body_template)
         VALUES ($1, $2, $3, $4, $5)`,
        [campaign.rows[0].id, step.step_order, step.delay_days, step.subject_template, step.body_template]
      );
    }

    // Incrémenter compteur
    await pool.query('UPDATE reach_playbooks SET usage_count = usage_count + 1 WHERE id = $1', [pb.id]);

    res.status(201).json(wrap(campaign.rows[0]));
  } catch (e) {
    console.error('[reach] from-playbook:', e.message);
    res.status(500).json(err('from_playbook_failed'));
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// F8 — Reach Outbound : sequences builder + AI writer + KPIs
// ═══════════════════════════════════════════════════════════════════════════

const SEQUENCE_TEMPLATES = {
  courtier_independant_croissance: {
    name: 'Courtier indépendant qui veut grossir',
    description: '5 touches sur 21 j — éveil, valeur, preuve sociale, urgence, dernier mot.',
    steps: [
      { day_offset: 0, channel: 'email',
        subject: 'Doubler son book sans embaucher — c\'est possible ?',
        template: 'Bonjour {{firstName}},\n\nJe suis tombé sur {{company}} et je me suis dit : combien de devis perdez-vous chaque semaine faute de temps de relance ?\n\nLes courtiers indépendants qu\'on accompagne automatisent leurs relances avec ARK et signent 30 % de devis en plus.\n\nÇa vous intéresse d\'en parler 15 min ?\n\n— Dalil' },
      { day_offset: 3, channel: 'email',
        subject: 'Re: relances automatiques',
        template: 'Bonjour {{firstName}},\n\nQuestion rapide : sur 100 devis envoyés en 2025, combien sont restés sans réponse ?\n\nLa réponse moyenne du marché : 35 %.\nAvec ARK : 12 %.\n\nUn rapide call cette semaine ?' },
      { day_offset: 7, channel: 'task',
        title: 'Appel à froid {{company}}',
        template: 'Suite à 2 emails — ouvrir avec angle "relances perdues = CA perdu".' },
      { day_offset: 14, channel: 'email',
        subject: '{{firstName}}, un dernier message',
        template: 'Bonjour {{firstName}},\n\nJe respecte votre temps — donc dernier message.\n\nSi un jour vous voulez tester ARK 30 jours sans engagement, mon agenda : https://calendly.com/courtiark/15min\n\nBelle continuation,\n— Dalil' },
      { day_offset: 21, channel: 'email',
        subject: 'Étude de cas — Cabinet Moreau (Lyon)',
        template: '{{firstName}}, dernière chose : voici comment Moreau a passé de 12 à 28 contrats/mois en 60 j avec ARK.\n\nPDF : https://courtiark.fr/cases/moreau\n\nBonne lecture !' },
    ],
  },
  cabinet_petite_equipe_croissance: {
    name: 'Cabinet 2-5 personnes en croissance',
    description: 'Séquence focus organisation : pas le CA, mais le chaos opérationnel.',
    steps: [
      { day_offset: 0, channel: 'email',
        subject: 'Question pour {{company}} (2-5 personnes)',
        template: 'Bonjour {{firstName}},\n\nQuand on est entre 2 et 5 dans un cabinet, le chaos est partout : 3 outils différents, des relances qui partent en double, des devis perdus.\n\nARK unifie tout dans une seule interface, IA native.\n\n15 min pour voir si ça matche ?' },
      { day_offset: 3, channel: 'email',
        subject: 'Coût du chaos chez {{company}} ?',
        template: '{{firstName}}, calcul rapide : 2 collaborateurs × 4 h/sem en saisie = 32 h/mois.\n\nÀ 25 €/h = 800 €. ARK = 99 €/mois.\n\nRetour sur investissement immédiat. On en parle ?' },
      { day_offset: 7, channel: 'task',
        title: 'Suivi téléphonique {{company}}',
        template: 'Angle : libérer 30 h/mois d\'équipe.' },
      { day_offset: 14, channel: 'email',
        subject: 'Démo ARK 12 min — pour {{company}}',
        template: 'Bonjour {{firstName}},\n\nJe vous propose une démo enregistrée de 12 min, sans rendez-vous : https://courtiark.fr/demo\n\nSi ça résonne, on parle. Sinon, no stress.' },
      { day_offset: 21, channel: 'email',
        subject: 'Dernier message {{firstName}}',
        template: 'Pas envie de relancer indéfiniment. Si jamais vous voulez tester un mois — répondez "GO" à ce mail. Belle journée !' },
    ],
  },
  courtier_perd_temps_relances: {
    name: 'Courtier qui perd du temps en relances',
    description: 'Angle 100 % opérationnel : relances auto J+3 / J+7 / J+14.',
    steps: [
      { day_offset: 0, channel: 'email',
        subject: 'Vos relances tournent toutes seules — ou pas ?',
        template: 'Bonjour {{firstName}},\n\nCombien de relances avez-vous faites cette semaine ?\nSi la réponse est "trop", on a un truc pour vous.\n\nARK fait J+3, J+7, J+14 automatiquement, avec ton humain.\n\n15 min pour voir ?' },
      { day_offset: 3, channel: 'email',
        subject: 'Re: relances qui tournent seules',
        template: 'Hier j\'ai parlé à un courtier qui faisait 40 relances/sem manuellement.\nDepuis ARK : 0 relance manuelle. Et + 30 % de signatures.\n\nVous voulez le même résultat ?' },
      { day_offset: 7, channel: 'sms',
        template: '{{firstName}}, mes mails passent dans vos spams ? On en parle 2 min ?' },
      { day_offset: 14, channel: 'email',
        subject: '{{firstName}}, j\'arrête là',
        template: 'Dernier message — si un jour vous voulez tester, mon agenda : https://calendly.com/courtiark/15min' },
      { day_offset: 21, channel: 'task',
        title: 'Appel final {{company}}',
        template: 'Dernière chance — laisser un message vocal court.' },
    ],
  },
}

// GET /api/reach/templates — liste des templates de séquences
router.get('/templates', verifyToken, async (req, res) => {
  const items = Object.entries(SEQUENCE_TEMPLATES).map(([key, tpl]) => ({
    key,
    name: tpl.name,
    description: tpl.description,
    steps_count: tpl.steps.length,
    duration_days: Math.max(...tpl.steps.map(s => s.day_offset || 0)),
  }))
  res.json(wrap(items))
})

router.get('/templates/:key', verifyToken, async (req, res) => {
  const tpl = SEQUENCE_TEMPLATES[req.params.key]
  if (!tpl) return res.status(404).json(err('template_not_found'))
  res.json(wrap({ key: req.params.key, ...tpl }))
})

// POST /api/reach/sequences/from-template — crée séquence à partir template
router.post('/sequences/from-template', verifyToken, async (req, res) => {
  try {
    const { template_key, name, audience_id = null } = req.body
    const tpl = SEQUENCE_TEMPLATES[template_key]
    if (!tpl) return res.status(404).json(err('template_not_found'))
    const r = await pool.query(`
      INSERT INTO reach_sequences (user_id, audience_id, name, channel, template, steps_json, template_key, status)
      VALUES ($1, $2, $3, 'multi', $4, $5::jsonb, $6, 'draft')
      RETURNING *
    `, [
      req.user.id, audience_id, name || tpl.name, tpl.name,
      JSON.stringify(tpl.steps), template_key,
    ])
    res.status(201).json(wrap(r.rows[0]))
  } catch (e) {
    console.error('[reach] sequence from-template', e.message)
    res.status(500).json(err('create_failed'))
  }
})

// POST /api/reach/sequences/:id/launch — lance une séquence sur prospects
router.post('/sequences/:id/launch', verifyToken, async (req, res) => {
  try {
    const seqId = parseInt(req.params.id, 10)
    const { prospect_ids = [] } = req.body
    if (!Array.isArray(prospect_ids) || prospect_ids.length === 0) {
      return res.status(400).json(err('no_prospects'))
    }
    const { rows: seqRows } = await pool.query(
      `SELECT id, steps_json FROM reach_sequences WHERE id = $1 AND user_id = $2`,
      [seqId, req.user.id]
    )
    if (!seqRows[0]) return res.status(404).json(err('sequence_not_found'))
    const steps = Array.isArray(seqRows[0].steps_json) ? seqRows[0].steps_json : []
    if (steps.length === 0) return res.status(400).json(err('sequence_has_no_steps'))

    let created = 0
    for (const pid of prospect_ids) {
      try {
        await pool.query(`
          INSERT INTO reach_sequence_runs (sequence_id, prospect_id, current_step, status, next_run_at)
          VALUES ($1, $2, 0, 'active', NOW())
          ON CONFLICT (sequence_id, prospect_id) DO NOTHING
        `, [seqId, pid])
        created++
      } catch (_) {}
    }
    await pool.query(`UPDATE reach_sequences SET status='active', updated_at=NOW() WHERE id=$1`, [seqId])
    res.json(wrap({ launched: created, total: prospect_ids.length }))
  } catch (e) {
    console.error('[reach] launch sequence', e.message)
    res.status(500).json(err('launch_failed'))
  }
})

// GET /api/reach/kpis — KPIs outbound (calcul à la volée + sparkline 30 j)
router.get('/kpis', verifyToken, async (req, res) => {
  try {
    const u = req.user.id
    const { rows: msgStats } = await pool.query(`
      SELECT COUNT(*) FILTER (WHERE sent_at IS NOT NULL) AS sent,
             COUNT(*) FILTER (WHERE opened_at IS NOT NULL) AS opens,
             COUNT(*) FILTER (WHERE clicked_at IS NOT NULL) AS clicks,
             COUNT(*) FILTER (WHERE replied_at IS NOT NULL) AS replies
      FROM reach_messages
      WHERE prospect_id IN (SELECT id FROM reach_prospects WHERE user_id = $1)
        AND sent_at >= NOW() - INTERVAL '30 days'
    `, [u]).catch(() => ({ rows: [{ sent: 0, opens: 0, clicks: 0, replies: 0 }] }))

    const { rows: rdv } = await pool.query(`
      SELECT COUNT(*)::int AS total FROM reach_prospects
      WHERE user_id = $1 AND status IN ('rdv_pris', 'interesse')
    `, [u]).catch(() => ({ rows: [{ total: 0 }] }))

    const { rows: converted } = await pool.query(`
      SELECT COUNT(*)::int AS total FROM reach_prospects
      WHERE user_id = $1 AND status = 'signe'
    `, [u]).catch(() => ({ rows: [{ total: 0 }] }))

    const sent = parseInt(msgStats[0]?.sent || 0)
    const opens = parseInt(msgStats[0]?.opens || 0)
    const clicks = parseInt(msgStats[0]?.clicks || 0)
    const replies = parseInt(msgStats[0]?.replies || 0)
    const pct = (n, d) => d > 0 ? Math.round((n / d) * 10000) / 100 : 0

    // Sparkline 30 j (par jour)
    const { rows: spark } = await pool.query(`
      SELECT to_char(date_trunc('day', sent_at), 'YYYY-MM-DD') AS d,
             COUNT(*)::int AS sent,
             COUNT(*) FILTER (WHERE opened_at IS NOT NULL)::int AS opens,
             COUNT(*) FILTER (WHERE replied_at IS NOT NULL)::int AS replies
      FROM reach_messages
      WHERE prospect_id IN (SELECT id FROM reach_prospects WHERE user_id = $1)
        AND sent_at >= NOW() - INTERVAL '30 days'
      GROUP BY 1 ORDER BY 1 ASC
    `, [u]).catch(() => ({ rows: [] }))

    // Heatmap day×hour
    const { rows: heatmap } = await pool.query(`
      SELECT EXTRACT(DOW FROM sent_at)::int AS dow,
             EXTRACT(HOUR FROM sent_at)::int AS hour,
             COUNT(*) FILTER (WHERE opened_at IS NOT NULL)::int AS opens,
             COUNT(*)::int AS sent
      FROM reach_messages
      WHERE prospect_id IN (SELECT id FROM reach_prospects WHERE user_id = $1)
        AND sent_at >= NOW() - INTERVAL '90 days'
      GROUP BY 1, 2
    `, [u]).catch(() => ({ rows: [] }))

    res.json(wrap({
      sent, opens, clicks, replies,
      open_rate: pct(opens, sent),
      click_rate: pct(clicks, sent),
      reply_rate: pct(replies, sent),
      meeting_rate: pct(parseInt(rdv[0]?.total || 0), sent),
      meetings: parseInt(rdv[0]?.total || 0),
      converted: parseInt(converted[0]?.total || 0),
      sparkline: spark,
      heatmap,
    }))
  } catch (e) {
    console.error('[reach] kpis', e.message)
    res.status(500).json(err('kpis_failed'))
  }
})

// POST /api/reach/ai-write — génère un email IA pour un prospect/contexte
router.post('/ai-write', verifyToken, async (req, res) => {
  try {
    const { prompt, channel = 'email', tone = 'pro_chaleureux', prospect_id = null } = req.body
    if (!prompt || prompt.trim().length < 5) return res.status(400).json(err('prompt_too_short'))

    let prospectInfo = ''
    if (prospect_id) {
      const { rows } = await pool.query('SELECT * FROM reach_prospects WHERE id = $1 AND user_id = $2', [prospect_id, req.user.id])
      if (rows[0]) {
        const p = rows[0]
        prospectInfo = `\nPROSPECT: ${p.company_name || ''} — ${p.contact_first_name || ''} ${p.contact_last_name || ''} — ${p.role || ''} — ${p.city || ''} — secteur ${p.category || ''} — score ${p.opportunity_score}.`
      }
    }

    const systemMsg = `Tu es ARK Writer, copywriter senior spécialisé courtage assurance.
Tu écris des emails ${channel === 'sms' ? 'SMS courts' : 'cold email B2B'} ${tone}, sans buzzword, sans "je me permets".
Format de sortie : JSON strict { subject, body }. Body en français, sans HTML.${prospectInfo}`

    let draft = null
    try {
      // Tentative Anthropic d'abord
      const Anthropic = require('@anthropic-ai/sdk')
      if (process.env.ANTHROPIC_API_KEY) {
        const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
        const resp = await client.messages.create({
          model: 'claude-haiku-4-5',
          max_tokens: 600,
          system: systemMsg,
          messages: [{ role: 'user', content: prompt }],
        })
        const raw = resp.content?.[0]?.text || ''
        try { draft = JSON.parse(raw.replace(/```json/g, '').replace(/```/g, '').trim()) }
        catch { draft = { subject: 'Une question rapide', body: raw } }
      }
    } catch (e) {
      // Fallback DeepSeek/OpenAI
    }

    if (!draft) {
      try {
        const resp = await openai.chat.completions.create({
          model: 'deepseek-chat',
          messages: [{ role: 'system', content: systemMsg }, { role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
          max_tokens: 600,
        })
        const raw = resp.choices?.[0]?.message?.content || '{}'
        draft = JSON.parse(raw)
      } catch (_) {
        // Fallback déterministe
        draft = {
          subject: prompt.split('\n')[0].slice(0, 60) || 'Une question rapide',
          body: `Bonjour {{firstName}},\n\n${prompt}\n\nUn créneau pour échanger 15 min ?\n\n— Dalil`
        }
      }
    }

    // Trace
    await pool.query(`
      INSERT INTO reach_ai_drafts (user_id, prompt, channel, draft, variant)
      VALUES ($1, $2, $3, $4, 'v1')
    `, [req.user.id, prompt, channel, JSON.stringify(draft)]).catch(() => {})

    res.json(wrap(draft))
  } catch (e) {
    console.error('[reach] ai-write', e.message)
    res.status(500).json(err('ai_write_failed'))
  }
})

// POST /api/reach/prospects/import — import CSV (texte brut) → bulk create
router.post('/prospects/import', verifyToken, async (req, res) => {
  try {
    const { csv = '', delimiter = ',' } = req.body
    if (!csv || csv.trim().length < 5) return res.status(400).json(err('empty_csv'))
    const lines = csv.split(/\r?\n/).filter(Boolean)
    if (lines.length < 2) return res.status(400).json(err('csv_no_data'))
    const headers = lines[0].split(delimiter).map(h => h.trim().toLowerCase())
    const findIdx = (...keys) => {
      for (const k of keys) {
        const idx = headers.indexOf(k)
        if (idx !== -1) return idx
      }
      return -1
    }
    const idxCompany = findIdx('company', 'entreprise', 'societe')
    const idxFirst = findIdx('first_name', 'prenom', 'firstname')
    const idxLast = findIdx('last_name', 'nom', 'lastname')
    const idxEmail = findIdx('email', 'mail')
    const idxPhone = findIdx('phone', 'telephone', 'tel')
    const idxCity = findIdx('city', 'ville')
    const idxRole = findIdx('role', 'poste')

    let inserted = 0
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(delimiter).map(c => c.trim())
      const row = {
        company_name: idxCompany >= 0 ? cols[idxCompany] : '',
        contact_first_name: idxFirst >= 0 ? cols[idxFirst] : '',
        contact_last_name: idxLast >= 0 ? cols[idxLast] : '',
        email: idxEmail >= 0 ? cols[idxEmail] : '',
        phone: idxPhone >= 0 ? cols[idxPhone] : '',
        city: idxCity >= 0 ? cols[idxCity] : '',
        role: idxRole >= 0 ? cols[idxRole] : '',
      }
      if (!row.email && !row.phone && !row.company_name) continue
      try {
        await pool.query(`
          INSERT INTO reach_prospects
            (user_id, company_name, contact_first_name, contact_last_name, email, phone, city, role, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'nouveau')
        `, [req.user.id, row.company_name, row.contact_first_name, row.contact_last_name, row.email, row.phone, row.city, row.role])
        inserted++
      } catch (_) {}
    }
    res.json(wrap({ inserted, total: lines.length - 1 }))
  } catch (e) {
    console.error('[reach] import csv', e.message)
    res.status(500).json(err('import_failed'))
  }
})

module.exports = router;
