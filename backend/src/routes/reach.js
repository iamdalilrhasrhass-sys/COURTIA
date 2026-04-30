// ARK REACH V2 — Routes API complètes
// 14 tables DB : audiences, campaigns, campaign_steps, campaign_prospects,
// prospects, messages, replies, activity_log, analyses, notes, opt_outs, settings, sources
// Frontend store attend { success: true, data: ... }

const express = require('express');
const pool = require('../db');
const { verifyToken } = require('../middleware/auth');
const OpenAI = require('openai');
const router = express.Router();

// DeepSeek client for AI features
const openai = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
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
      console.error('[reach] AI analysis error:', aiErr.message);
      analysisResult = {
        problems_detected: [],
        opportunities: [],
        call_script: "Bonjour, je suis courtier en assurance...",
        email_template: `Bonjour ${p.contact_first_name || ''},\n\nJe me permets de vous contacter...`,
        sms_template: `Bonjour ${p.contact_first_name || ''}, je vous propose un audit...`,
        linkedin_message: `Bonjour ${p.contact_first_name || ''}, je suis...`,
        next_best_action: "Contacter le prospect par téléphone",
        score_details: { opportunity: 50, urgency: 50, ease: 50 }
      };
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
      console.error('[reach] AI generate error:', aiErr.message);
      message = c === 'sms'
        ? `Bonjour ${prospect.first_name || prospect.contact_first_name || ''}, je suis courtier en assurance. Puis-je vous proposer un audit gratuit ?`
        : `Bonjour ${prospect.first_name || prospect.contact_first_name || ''},\n\nJe me permets de vous contacter car nous accompagnons les entreprises comme ${prospect.company_name || 'la vôtre'} dans l'optimisation de leurs contrats d'assurance.\n\nSouhaitez-vous échanger 10 minutes ?\n\nCordialement`;
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

    // Si pas de résultats, générer des suggestions AI
    if (r.rows.length === 0 && city) {
      try {
        const aiResponse = await openai.chat.completions.create({
          model: 'deepseek-chat',
          max_tokens: 500,
          messages: [{
            role: 'system',
            content: 'Tu es un assistant de prospection. Tu génères une liste de types d\'entreprises/professionnels à prospecter dans une ville donnée pour un courtier en assurance. Réponds UNIQUEMENT en JSON valide : [{"company_name": "...", "category": "...", "niche": "...", "city": "..."}]'
          }, {
            role: 'user',
            content: `Je cherche des prospects ${category ? 'dans la catégorie ' + category : ''} à ${city}${niche ? ', niche: ' + niche : ''}. Propose 5 suggestions.`
          }]
        });
        const suggestions = JSON.parse(aiResponse.choices[0].message.content);
        res.json(wrap({ items: r.rows, suggestions }));
      } catch (aiErr) {
        res.json(wrap({ items: r.rows, suggestions: [] }));
      }
    } else {
      res.json(wrap({ items: r.rows, suggestions: [] }));
    }
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
      return res.json(wrap(created.rows[0]));
    }
    res.json(wrap(r.rows[0]));
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

module.exports = router;
