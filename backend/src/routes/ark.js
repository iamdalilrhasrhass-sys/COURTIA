const express = require('express')
const router = express.Router()
const OpenAI = require('openai')
const { verifyToken } = require('../middleware/auth')
const { requireUnderLimit } = require('../middleware/planGuard')
const { incrementUsage } = require('../services/planService')
const { trackEvent } = require('../services/analyticsService')
const logger = require('../lib/logger')
const pool = require('../db')
const { requireCabinetFeature } = require('../middleware/cabinetAccess')
const {
  buildAndStoreMorningBrief,
  chargeArkRun,
  computeAndStoreRiskScores,
  ensureArkBudget,
  rewriteFallback,
} = require('../services/arkProactiveService')

// Initialisation client DeepSeek (compatible OpenAI SDK)
const openai = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY || 'dummy_key_to_prevent_startup_crash',
  baseURL: 'https://api.deepseek.com/v1'
})

function arkConfigurationRequired(res) {
  return res.status(503).json({
    error: 'configuration_required',
    provider: 'deepseek',
    message: 'Configuration ARK requise. Ajoutez DEEPSEEK_API_KEY pour activer le chat IA.',
  })
}

function getCurrentUserId(req) {
  return Number(req.user?.userId || req.user?.id || 0)
}

function normalizeRecommendation(row = {}) {
  return {
    ...row,
    suggested_action: typeof row.suggested_action === 'string'
      ? JSON.parse(row.suggested_action || '{}')
      : (row.suggested_action || {}),
  }
}

const proactiveGuard = requireCabinetFeature('v1_ark_proactive')

router.get('/budget', proactiveGuard, async (req, res) => {
  try {
    const userId = getCurrentUserId(req)
    if (!userId) return res.status(401).json({ error: 'auth_required' })
    const budget = await ensureArkBudget(req.app.locals.pool || pool, userId)
    res.json({
      ...budget,
      mode: process.env.ANTHROPIC_API_KEY ? 'llm_ready' : 'local_fallback',
      configuration_required: !process.env.ANTHROPIC_API_KEY,
    })
  } catch (err) {
    res.status(500).json({ error: 'ark_budget_unavailable', message: 'Budget ARK indisponible.' })
  }
})

router.post('/score-clients', proactiveGuard, async (req, res) => {
  try {
    const userId = getCurrentUserId(req)
    if (!userId) return res.status(401).json({ error: 'auth_required' })
    const rows = await computeAndStoreRiskScores(req.app.locals.pool || pool, userId)
    res.json({ data: rows, total: rows.length })
  } catch (err) {
    res.status(500).json({ error: 'ark_score_failed', message: 'Calcul des scores ARK impossible.' })
  }
})

router.post('/morning-brief', proactiveGuard, async (req, res) => {
  try {
    const userId = getCurrentUserId(req)
    if (!userId) return res.status(401).json({ error: 'auth_required' })
    const result = await buildAndStoreMorningBrief(req.app.locals.pool || pool, userId)
    await trackEvent({
      userId,
      event: 'ark_morning_brief_opened',
      properties: { source: result.source || 'unknown' },
    }).catch(() => {})
    res.json({
      ...result,
      mode: result.source === 'deterministic_fallback' ? 'local_fallback' : 'llm_ready',
      configuration_required: !process.env.ANTHROPIC_API_KEY,
    })
  } catch (err) {
    if (err.status === 402) {
      return res.status(402).json({
        error: 'ark_budget_exceeded',
        message: 'ARK est temporairement suspendu pour ce cabinet car le plafond mensuel est atteint.',
      })
    }
    res.status(500).json({ error: 'ark_morning_brief_failed', message: 'Morning Brief ARK indisponible.' })
  }
})

router.get('/recommendations', proactiveGuard, async (req, res) => {
  try {
    const userId = getCurrentUserId(req)
    if (!userId) return res.status(401).json({ error: 'auth_required' })
    const result = await (req.app.locals.pool || pool).query(
      `SELECT ar.*, CONCAT(c.first_name, ' ', c.last_name) AS client_name
       FROM ark_recommendations ar
       LEFT JOIN clients c ON c.id = ar.client_id
       WHERE ar.user_id = $1
         AND ar.dismissed_at IS NULL
         AND (ar.expires_at IS NULL OR ar.expires_at > NOW())
       ORDER BY ar.priority DESC, ar.created_at DESC
       LIMIT 50`,
      [userId]
    )
    res.json({ data: result.rows.map(normalizeRecommendation), total: result.rows.length })
  } catch (err) {
    res.status(500).json({ error: 'ark_recommendations_unavailable', message: 'Recommandations ARK indisponibles.' })
  }
})

router.post('/recommendations/:id/act', proactiveGuard, async (req, res) => {
  try {
    const userId = getCurrentUserId(req)
    const id = Number(req.params.id)
    if (!userId) return res.status(401).json({ error: 'auth_required' })
    const result = await (req.app.locals.pool || pool).query(
      `UPDATE ark_recommendations
       SET acted_on_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, userId]
    )
    if (!result.rows[0]) return res.status(404).json({ error: 'recommendation_not_found' })
    res.json(normalizeRecommendation(result.rows[0]))
  } catch (err) {
    res.status(500).json({ error: 'ark_recommendation_action_failed', message: 'Action ARK impossible.' })
  }
})

router.post('/recommendations/:id/dismiss', proactiveGuard, async (req, res) => {
  try {
    const userId = getCurrentUserId(req)
    const id = Number(req.params.id)
    if (!userId) return res.status(401).json({ error: 'auth_required' })
    const result = await (req.app.locals.pool || pool).query(
      `UPDATE ark_recommendations
       SET dismissed_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, userId]
    )
    if (!result.rows[0]) return res.status(404).json({ error: 'recommendation_not_found' })
    res.json(normalizeRecommendation(result.rows[0]))
  } catch (err) {
    res.status(500).json({ error: 'ark_recommendation_dismiss_failed', message: 'Masquage ARK impossible.' })
  }
})

router.post('/rewrite', proactiveGuard, async (req, res) => {
  try {
    const userId = getCurrentUserId(req)
    if (!userId) return res.status(401).json({ error: 'auth_required' })
    const text = String(req.body?.text || '').trim()
    const mode = String(req.body?.mode || 'rephrase')
    if (!text) return res.status(400).json({ error: 'text_required', message: 'Texte requis.' })
    const rewritten = rewriteFallback(text, mode)
    await chargeArkRun(req.app.locals.pool || pool, {
      userId,
      feature: `rewrite.${mode}`,
      model: process.env.ARK_LIGHT_MODEL || 'local-fallback',
      inputTokens: Math.ceil(text.length / 4),
      outputTokens: Math.ceil(rewritten.length / 4),
      status: process.env.ANTHROPIC_API_KEY ? 'llm_ready_fallback_text' : 'local_fallback',
    })
    res.json({
      text: rewritten,
      mode,
      source: process.env.ANTHROPIC_API_KEY ? 'llm_ready_with_local_fallback' : 'local_fallback',
      configuration_required: !process.env.ANTHROPIC_API_KEY,
    })
  } catch (err) {
    if (err.status === 402) return res.status(402).json({ error: 'ark_budget_exceeded' })
    res.status(500).json({ error: 'ark_rewrite_failed', message: 'Réécriture ARK indisponible.' })
  }
})

/**
 * POST /api/ark/chat
 * Chat avec ARK — utilisable depuis la fiche client ET le drawer global
 */
router.post('/chat', verifyToken, requireUnderLimit('ark_messages'), async (req, res) => {
  try {
    // Accepter plusieurs formats de payload
    const message = req.body.message || req.body.userMessage || req.body.question || ''
    const clientData = req.body.clientData || null
    const conversationHistory = Array.isArray(req.body.conversationHistory) ? req.body.conversationHistory : []

    if (!message || message.trim() === '') {
      return res.status(400).json({ error: 'Message vide ou manquant' })
    }

    // Auto-fetch contrats et tâches si clientData est présent
    if (clientData && clientData.id) {
      const pool = require('../db')
      if (!Array.isArray(clientData.contrats)) {
        try {
          const contratsRes = await pool.query(
            `SELECT quote_data->>'type_contrat' as type, quote_data->>'compagnie' as compagnie, (quote_data->>'prime_annuelle')::numeric as prime_annuelle, status as statut, (quote_data->>'date_echeance')::date as date_echeance FROM quotes WHERE client_id = $1`,
            [clientData.id]
          )
          clientData.contrats = contratsRes.rows || []
        } catch (e) {
          logger.warn({ error: e.message }, 'ark autofetch contracts failed')
          clientData.contrats = []
        }
      }
      if (!Array.isArray(clientData.taches)) {
        try {
          const tachesRes = await pool.query(
            `SELECT titre, statut, priorite, echeance FROM taches WHERE client_id = $1 AND statut != 'terminee' ORDER BY echeance ASC NULLS LAST LIMIT 5`,
            [clientData.id]
          )
          clientData.taches = tachesRes.rows || []
        } catch (e) {
          logger.warn({ error: e.message }, 'ark autofetch tasks failed')
          clientData.taches = []
        }
      }
    }

    if (!process.env.DEEPSEEK_API_KEY) {
      return arkConfigurationRequired(res)
    }

    // Construire le prompt système selon le contexte
    const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    let systemPrompt
    if (clientData && (clientData.id || clientData.nom)) {
      // Fetch auto contrats + tâches si pas déjà fournis
      if (clientData.id && !clientData.contrats) {
        try {
          const pool = req.app.locals.pool
          const contratsResult = await pool.query(
            `SELECT 
              q.status,
              q.quote_data->>'type_contrat' as type_contrat,
              q.quote_data->>'compagnie' as compagnie,
              (q.quote_data->>'prime_annuelle')::decimal as prime_annuelle,
              q.quote_data->>'date_echeance' as date_echeance
            FROM quotes q 
            WHERE q.client_id = $1`,
            [clientData.id]
          )
          clientData.contrats = contratsResult.rows
          
          const tachesResult = await pool.query(
            "SELECT titre as title, priorite as priority, statut as status, echeance as due_date FROM taches WHERE client_id = $1 AND statut != 'terminee' ORDER BY echeance ASC LIMIT 5",
            [clientData.id]
          )
          clientData.taches_actives = tachesResult.rows
        } catch (fetchErr) {
          logger.warn({ error: fetchErr.message }, 'ark client context fetch failed')
        }
      }

      // Lister les contrats actifs du client si disponibles
      const contratsActifs = Array.isArray(clientData.contrats)
        ? clientData.contrats.filter(c => (c.status || c.statut || '').toLowerCase() === 'actif')
        : []
      const contratsStr = contratsActifs.length > 0
        ? contratsActifs.map(c => `  • ${c.type_contrat || c.type} chez ${c.compagnie || 'N/A'} — prime ${c.prime_annuelle ? c.prime_annuelle + '€' : 'N/A'} — échéance ${c.date_echeance ? new Date(c.date_echeance).toLocaleDateString('fr-FR') : 'N/A'}`).join('\\n')
        : '  Aucun contrat actif renseigné'

      const tachesStr = Array.isArray(clientData.taches_actives) && clientData.taches_actives.length > 0
        ? clientData.taches_actives.map(t => `  • ${t.title} (${t.priority}) — ${t.due_date ? new Date(t.due_date).toLocaleDateString('fr-FR') : 'sans échéance'}`).join('\\n')
        : '  Aucune tâche active'

      const scoreRisque = clientData.risk_score || clientData.score_risque || 'NC'
      
      systemPrompt = `Tu es ARK, conseiller IA COURTIA, expert en courtage d'assurance français (DDA, ORIAS, Loi Hamon, Loi Châtel). Date : ${today}

═══ FICHE CLIENT ═══
Nom : ${clientData.prenom || clientData.first_name || ''} ${clientData.nom || clientData.last_name || ''}
Email : ${clientData.email || 'NC'}
Téléphone : ${clientData.phone || clientData.telephone || 'NC'}
Statut : ${clientData.statut || clientData.status || 'NC'}
Segment : ${clientData.segment || 'NC'}
Score de risque : ${scoreRisque}/100
Profession : ${clientData.profession || 'NC'}
Adresse : ${clientData.address || clientData.adresse || 'NC'}

═══ CONTRATS ACTIFS ═══
${contratsStr}

═══ TÂCHES EN COURS ═══
${tachesStr}

RÈGLE ABSOLUE : Si le message contient une instruction JSON, tu dois répondre UNIQUEMENT en JSON valide avec ce schéma exact et rien d'autre :
{"resume":"string ≤200 chars","points":["string ≤100","string ≤100","string ≤100"],"actions":[{"label":"string","priorite":"haute|moyenne|basse","impact":"string"}]}
Maximum 3 points, maximum 3 actions. Pas de markdown, pas de texte hors JSON.

Si le message ne demande pas de JSON : réponds en français, ton expert et direct, 150 mots max, orienté action concrète avec chiffres/références réglementaires quand pertinent. Utilise des listes courtes avec tirets si utile.`
    } else {
      systemPrompt = `Tu es ARK, conseiller IA COURTIA, expert assurance française. Date : ${today}
Expertise : portefeuille, cross-sell, fidélisation, réglementation DDA/ORIAS/Loi Hamon.

RÈGLE ABSOLUE : Si le message contient une instruction JSON, réponds UNIQUEMENT en JSON valide :
{"resume":"...","points":["...","...","..."],"actions":[{"label":"...","priorite":"haute|moyenne|basse","impact":"..."}]}
Sinon : réponds en français, ton expert et direct, 150 mots max, orienté action concrète avec chiffres/références réglementaires quand pertinent. Utilise des listes courtes avec tirets si utile.`
    }

    // Construire l'historique pour l'API DeepSeek
    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory
        .filter(m => m && m.role && m.content && typeof m.content === 'string')
        .slice(-10)
        .map(m => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content
        })),
      {
        role: 'user',
        content: message.trim()
      }
    ]

    // Appel API DeepSeek via OpenAI SDK
    const response = await openai.chat.completions.create({
      model: 'deepseek-chat',
      max_tokens: 600,
      messages: messages
    })

    const reply = response.choices && response.choices[0] 
      ? response.choices[0].message.content 
      : 'Aucune réponse générée'

    // Sauvegarder dans ark_conversations si client présent
    if (clientData && clientData.id) {
      try {
        const pool = require('../db')
        const existing = await pool.query(
          'SELECT id, messages FROM ark_conversations WHERE client_id = $1 ORDER BY created_at DESC LIMIT 1',
          [clientData.id]
        )

        const timestamp = new Date().toISOString()
        const newMsg = [
          { role: 'user', content: message, timestamp },
          { role: 'assistant', content: reply, timestamp }
        ]

        if (existing.rows.length > 0) {
          const currentMessages = existing.rows[0].messages || []
          const updatedMessages = [...currentMessages, ...newMsg].slice(-50)
          await pool.query(
            'UPDATE ark_conversations SET messages = $1, updated_at = NOW() WHERE id = $2',
            [JSON.stringify(updatedMessages), existing.rows[0].id]
          )
        } else {
          await pool.query(
            'INSERT INTO ark_conversations (client_id, messages, created_at, updated_at) VALUES ($1, $2, NOW(), NOW())',
            [clientData.id, JSON.stringify(newMsg)]
          )
        }
      } catch (saveErr) {
        logger.warn({ error: saveErr.message }, 'ark conversation save failed')
      }
    }

    // Répondre au frontend
    res.json({ reply })

    // Incrémenter usage APRÈS réponse réussie
    try {
      const userId = req.user.userId || req.user.id
      await incrementUsage(userId, 'ark_messages')
    } catch (err) {
      logger.warn({ error: err.message }, 'ark usage increment failed')
    }

  } catch (err) {
    logger.error({ err }, 'ark chat failed')

    // Gérer les erreurs DeepSeek spécifiques
    if (err.status === 401 || (err.message && err.message.includes('api_key'))) {
      return res.status(503).json({
        error: 'configuration_required',
        provider: 'deepseek',
        message: 'Clé API DeepSeek invalide ou expirée.'
      })
    }

    if (err.status === 429 || (err.message && err.message.includes('rate_limit'))) {
      return res.status(429).json({
        error: 'Limite d\'utilisation ARK atteinte',
        details: 'Réessayez dans quelques instants'
      })
    }

    if (err.status === 404 || (err.message && err.message.includes('model'))) {
      return res.status(503).json({
        error: 'provider_unavailable',
        provider: 'deepseek',
        message: 'Modèle ARK indisponible. Contactez le support COURTIA.'
      })
    }

    res.status(503).json({
      error: 'provider_unavailable',
      provider: 'deepseek',
      message: 'ARK temporairement indisponible.'
    })
  }
})

/**
 * GET /api/ark/conversations/:clientId
 * GET /api/ark/history/:clientId
 */
const getConversationHistory = async (req, res) => {
  try {
    const pool = require('../db')
    const result = await pool.query(
      'SELECT messages FROM ark_conversations WHERE client_id = $1 ORDER BY updated_at DESC LIMIT 1',
      [req.params.clientId]
    )
    res.json(result.rows[0]?.messages || [])
  } catch (err) {
    logger.warn({ error: err.message }, 'ark conversations unavailable')
    res.json([])
  }
}
router.get('/conversations/:clientId', verifyToken, getConversationHistory)
router.get('/history/:clientId', verifyToken, getConversationHistory)

router.get('/history/:clientId', verifyToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool
    const result = await pool.query(
      'SELECT messages FROM ark_conversations WHERE client_id = $1 ORDER BY updated_at DESC LIMIT 1',
      [req.params.clientId]
    )
    res.json({ messages: result.rows[0]?.messages || [] })
  } catch (err) {
    logger.warn({ error: err.message }, 'ark history unavailable')
    res.json({ messages: [] })
  }
})

// ── Extension Chrome: analyser une page web ────────────────────────
router.post('/extension/analyze', verifyToken, async (req, res) => {
  try {
    if (!process.env.DEEPSEEK_API_KEY) return arkConfigurationRequired(res)
    const { url, title, text, forms } = req.body.pageData || req.body;
    if (!text && (!forms || forms.length === 0)) {
      return res.status(400).json({ error: 'Donnees de page requises' });
    }

    const pageContext = `URL: ${url || 'inconnue'}
Titre: ${title || ''}

Contenu de la page:
${(text || '').substring(0, 3000)}

Formulaires detectes:
${(forms || []).map((f, i) =>
  `Formulaire #${i + 1}: ${f.title || f.action || 'sans titre'}
  ${(f.fields || []).map(fd =>
    `  - ${fd.label || fd.name || '?'} (${fd.type || 'text'})${fd.required ? ' *requis' : ''}`
  ).join('\n')}`
).join('\n\n')}`;

    const systemPrompt = `Tu es ARK, l'assistant intelligent de COURTIA, un logiciel pour courtiers en assurances.
Analyse le contenu de la page web et les formulaires detectes.

Reponds UNIQUEMENT avec un objet JSON valide :
{
  "analysis": "analyse concise de la page en 2-3 phrases (en francais)",
  "suggestions": [
    {
      "field_name": "nom du champ",
      "field_label": "label du champ",
      "suggested_value": "valeur suggeree",
      "selector": "selecteur CSS du champ si disponible",
      "confidence": 0.0 a 1.0,
      "reason": "pourquoi cette valeur"
    }
  ]
}

Regles de securite ABSOLUES :
- NE JAMAIS suggerer de mots de passe
- NE JAMAIS suggerer d'informations bancaires
- NE JAMAIS suggerer de donnees personnelles reelles
- Les suggestions doivent etre des valeurs par defaut ou des aides (ex: type d'assurance, civilité)
- Si le formulaire est inconnu ou sans rapport avec l'assurance, reponds {"analysis": "Aucune suggestion pertinente pour cette page.", "suggestions": []}`;

    const completion = await openai.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: pageContext }
      ],
      max_tokens: 2000,
      temperature: 0.3,
    });

    const raw = completion.choices[0]?.message?.content || '{}';
    let cleaned = raw.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    }

    let result;
    try { result = JSON.parse(cleaned); }
    catch { result = { analysis: raw.substring(0, 500), suggestions: [] }; }

    return res.json(result);
  } catch (err) {
    logger.error({ err }, 'ark extension analyze failed');
    return res.status(503).json({ error: 'provider_unavailable', analysis: 'Analyse ARK indisponible.', suggestions: [] });
  }
});

// ── Extension Chrome: suggestion de remplissage pour un champ ────────
router.post('/extension/fill', verifyToken, async (req, res) => {
  try {
    if (!process.env.DEEPSEEK_API_KEY) return arkConfigurationRequired(res)
    const { field_name, field_label, form_title, page_title } = req.body;

    const prompt = `Tu es ARK, assistant pour courtiers en assurances COURTIA.
Un courtier remplit un formulaire et a besoin d'une suggestion pour un champ.

Champ: ${field_label || field_name || 'inconnu'}
Formulaire: ${form_title || 'inconnu'}
Page: ${page_title || 'inconnue'}

Suggestions:
1. Si le champ est un type d'assurance: "Auto", "Moto", "Habitation", "Sante", "Professionnelle", "MRH"
2. Si le champ est une civilite: "M.", "Mme", "Mlle"
3. Si le champ est un pays: "France"
4. Si le champ est une date: la date courante approximee
5. Sinon, une valeur par defaut pertinente

REGLES DE SECURITE:
- Ne jamais suggerer de mot de passe, numero de carte, ou donnees personnelles
- Si le champ est sensible, reponds {"suggestion": null, "raison": "Champ sensible, remplissage manuel requis"}

Reponds UNIQUEMENT avec ce JSON:
{"suggestion": "valeur ou null", "confiance": 0.0-1.0, "raison": "explication courte"}`;

    const completion = await openai.chat.completions.create({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 300,
      temperature: 0.3,
    });

    const raw = completion.choices[0]?.message?.content || '{"suggestion":null,"confiance":0,"raison":"Erreur"}';
    let cleaned = raw.trim();
    if (cleaned.startsWith('```')) cleaned = cleaned.replace(/```json?\n?/g, '').replace(/```/g, '').trim();

    let result;
    try { result = JSON.parse(cleaned); }
    catch { result = { suggestion: null, confiance: 0, raison: 'Erreur de parsing' }; }

    return res.json(result);
  } catch (err) {
    logger.error({ err }, 'ark extension fill failed');
    return res.status(503).json({ error: 'provider_unavailable', message: 'Suggestion ARK indisponible.' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// LOT 2 STUBS — Routes d'actions ARK (réponses mockées)
// TODO: Implémenter avec Anthropic Claude dans LOT 3
// ═══════════════════════════════════════════════════════════════════════════

function logArkStub(route, params = {}) {
  console.log(`[ARK STUB] ${route}`, JSON.stringify(params))
  logger.info({ route, params, stub: true }, 'ARK stub called')
}

// POST /api/ark/actions — Exécuter une action ARK
router.post('/actions', async (req, res) => {
  logArkStub('/actions', { action: req.body?.action })
  const action = req.body?.action || 'unknown'

  res.json({
    success: true,
    mock: true,
    action,
    data: {
      summary: `Action "${action}" simulée avec succès`,
      cards: [{
        type: 'info',
        title: 'Action ARK Mock',
        content: `L'action ${action} a été traitée (mode stub)`,
        priority: 'medium',
        action: { kind: 'navigate', label: 'Voir détails', target: { type: 'page', id: '/dashboard' } }
      }],
      meta: { model: 'stub-mock', tokens: { input: 0, output: 0 }, latencyMs: 50, cached: false }
    },
    timestamp: new Date().toISOString(),
    todo: 'LOT 3: Implémenter avec Anthropic Claude API'
  })
})

// GET /api/ark/client/:id/brief — Résumé client compact
router.get('/client/:id/brief', async (req, res) => {
  const clientId = req.params.id
  logArkStub('/client/:id/brief', { clientId })

  res.json({
    success: true,
    mock: true,
    action: 'client_brief',
    data: {
      clientId: Number(clientId),
      summary: 'Client actif avec 3 contrats. Dernière interaction il y a 15 jours. Score fidélité: 78/100.',
      keyPoints: [
        'Portfolio diversifié: Auto + MRH + Santé',
        'Échéance Auto dans 45 jours - préparer renouvellement',
        'Opportunité Prévoyance détectée'
      ],
      suggestedActions: [
        { kind: 'call', label: 'Appeler pour bilan', priority: 'high' },
        { kind: 'email', label: 'Envoyer offre Prévoyance', priority: 'medium' },
        { kind: 'task', label: 'Préparer renouvellement Auto', priority: 'high' }
      ],
      scores: { fidelite: 78, risque: 22, opportunite: 65 },
      meta: { model: 'stub-mock', cached: false }
    },
    timestamp: new Date().toISOString(),
    todo: 'LOT 3: Générer brief avec Claude Haiku'
  })
})

// GET /api/ark/client/:id/next-best-actions — Meilleures actions client
router.get('/client/:id/next-best-actions', async (req, res) => {
  const clientId = req.params.id
  logArkStub('/client/:id/next-best-actions', { clientId })

  res.json({
    success: true,
    mock: true,
    action: 'next_best_actions',
    data: {
      clientId: Number(clientId),
      actions: [
        { rank: 1, kind: 'call', label: 'Appeler pour bilan annuel', rationale: 'Dernière interaction il y a 30+ jours', impact: 'high', estimatedTime: '15 min' },
        { rank: 2, kind: 'email', label: 'Envoyer comparatif Auto', rationale: 'Échéance dans 45 jours', impact: 'high', estimatedTime: '10 min' },
        { rank: 3, kind: 'task', label: 'Mettre à jour coordonnées', rationale: 'Email bounce détecté', impact: 'medium', estimatedTime: '5 min' }
      ],
      meta: { model: 'stub-mock', cached: false }
    },
    timestamp: new Date().toISOString(),
    todo: 'LOT 3: Calculer NBA avec scoring ML'
  })
})

// POST /api/ark/client/:id/documents-analysis — Analyse documents client
router.post('/client/:id/documents-analysis', async (req, res) => {
  const clientId = req.params.id
  const documents = req.body?.documents || []
  logArkStub('/client/:id/documents-analysis', { clientId, docCount: documents.length })

  res.json({
    success: true,
    mock: true,
    action: 'documents_analysis',
    data: {
      clientId: Number(clientId),
      analyzedCount: documents.length,
      results: [{
        documentId: 'doc_mock_1',
        type: 'contrat_assurance',
        extractedData: { compagnie: 'AXA', typeContrat: 'Auto', primeAnnuelle: 620, dateEcheance: '2026-07-15' },
        confidence: 0.92,
        warnings: []
      }],
      summary: 'Documents analysés avec succès. 1 contrat détecté.',
      meta: { model: 'stub-mock', cached: false }
    },
    timestamp: new Date().toISOString(),
    todo: 'LOT 3: Implémenter OCR + analyse avec Claude Vision'
  })
})

// POST /api/ark/client/:id/quote-assistant — Assistant devis
router.post('/client/:id/quote-assistant', async (req, res) => {
  const clientId = req.params.id
  logArkStub('/client/:id/quote-assistant', { clientId })

  res.json({
    success: true,
    mock: true,
    action: 'quote_assistant',
    data: {
      clientId: Number(clientId),
      suggestions: {
        recommendedProduct: 'MRH Confort Plus',
        recommendedPrime: 520,
        rationale: 'Profil client compatible. Meilleur rapport garanties/prix.',
        alternatives: [
          { product: 'MRH Essentiel', prime: 380, note: 'Économique mais couverture limitée' },
          { product: 'MRH Premium', prime: 720, note: 'Couverture complète avec assistance' }
        ]
      },
      warnings: ['Vérifier la valeur du contenu déclarée', 'Proposer la garantie Vol si zone sensible'],
      meta: { model: 'stub-mock', cached: false }
    },
    timestamp: new Date().toISOString(),
    todo: 'LOT 3: Assistant intelligent avec Claude'
  })
})

// POST /api/ark/compliance-check — Vérification conformité
router.post('/compliance-check', async (req, res) => {
  const { clientId } = req.body || {}
  logArkStub('/compliance-check', { clientId })

  res.json({
    success: true,
    mock: true,
    action: 'compliance_check',
    data: {
      clientId,
      overallStatus: 'warning',
      checks: [
        { rule: 'DDA - Devoir de conseil', status: 'warning', message: 'Fiche de recueil des besoins non complétée', action: 'Compléter la fiche IPID' },
        { rule: 'ORIAS - Vérification inscription', status: 'ok', message: 'Courtier enregistré et actif' },
        { rule: 'Loi Hamon - Information résiliation', status: 'ok', message: 'Mention obligatoire présente' },
        { rule: 'RGPD - Consentement', status: 'pending', message: 'Vérifier le consentement marketing' }
      ],
      recommendations: ['Compléter la fiche IPID avant signature', 'Faire signer le mandat de courtage'],
      meta: { model: 'stub-mock', cached: false }
    },
    timestamp: new Date().toISOString(),
    todo: 'LOT 3: Analyse conformité avec Claude Sonnet'
  })
})

// GET /api/ark/portfolio-health — Santé portefeuille
router.get('/portfolio-health', async (req, res) => {
  logArkStub('/portfolio-health', { userId: req.user?.id })

  res.json({
    success: true,
    mock: true,
    action: 'portfolio_health',
    data: {
      overallScore: 78,
      scoreChange: -2,
      period: 'month',
      metrics: {
        retention: { score: 85, label: 'Rétention', trend: 'stable' },
        growth: { score: 72, label: 'Croissance', trend: 'up' },
        diversification: { score: 68, label: 'Diversification', trend: 'down' },
        profitability: { score: 82, label: 'Rentabilité', trend: 'stable' }
      },
      alerts: [
        { severity: 'high', message: '5 contrats à échéance cette semaine' },
        { severity: 'medium', message: '12 clients silencieux depuis 30+ jours' }
      ],
      recommendations: ['Prioriser les renouvellements', 'Lancer campagne réactivation'],
      meta: { model: 'stub-mock', cached: false }
    },
    timestamp: new Date().toISOString(),
    todo: 'LOT 3: Analyse portefeuille avec ML'
  })
})

// POST /api/ark/generate — Générer contenu (email/sms/script)
router.post('/generate', async (req, res) => {
  const { type, context } = req.body || {}
  logArkStub('/generate', { type, clientId: context?.clientId })

  const templates = {
    email: {
      subject: 'Votre contrat arrive à échéance',
      body: 'Bonjour [Prénom],\n\nJe me permets de vous contacter car votre contrat [Type] arrive à échéance le [Date].\n\nSeriez-vous disponible pour un échange téléphonique cette semaine ?\n\nBien cordialement,\n[Signature]'
    },
    sms: { content: 'Bonjour [Prénom], votre contrat [Type] arrive à échéance. Appelons-nous pour faire le point ? [Courtier]' },
    call_script: {
      intro: 'Bonjour M./Mme [Nom], c\'est [Courtier] de [Cabinet].',
      context: 'Je vous appelle concernant votre contrat [Type] qui arrive à échéance.',
      questions: ['Comment allez-vous ?', 'Des changements cette année ?', 'Satisfait des garanties ?'],
      closing: 'Je vous envoie un comparatif par email. Quel est le meilleur moment pour vous rappeler ?'
    }
  }

  res.json({
    success: true,
    mock: true,
    action: 'generate',
    data: {
      type,
      generated: templates[type] || templates.email,
      variables: ['Prénom', 'Nom', 'Type', 'Date', 'Courtier', 'Cabinet', 'Signature'],
      meta: { model: 'stub-mock', cached: false }
    },
    timestamp: new Date().toISOString(),
    todo: 'LOT 3: Génération personnalisée avec Claude Haiku'
  })
})

// GET /api/ark/context-suggestions — Suggestions selon contexte page
router.get('/context-suggestions', async (req, res) => {
  const { page, clientId } = req.query
  logArkStub('/context-suggestions', { page, clientId })

  const suggestionsByPage = {
    dashboard: [
      { id: 's1', type: 'action', label: 'Voir le Morning Brief', priority: 'high' },
      { id: 's2', type: 'info', label: '5 contrats à renouveler cette semaine', priority: 'high' }
    ],
    clients: [
      { id: 's1', type: 'action', label: 'Filtrer les clients silencieux', priority: 'medium' }
    ],
    client_detail: [
      { id: 's1', type: 'action', label: 'Générer un brief client', priority: 'high' },
      { id: 's2', type: 'action', label: 'Voir les recommandations', priority: 'high' }
    ],
    devis: [
      { id: 's1', type: 'action', label: 'Demander assistance ARK', priority: 'high' },
      { id: 's2', type: 'action', label: 'Vérifier conformité', priority: 'high' }
    ]
  }

  res.json({
    success: true,
    mock: true,
    action: 'context_suggestions',
    data: {
      page: page || 'unknown',
      clientId: clientId || null,
      suggestions: suggestionsByPage[page] || [{ id: 's0', type: 'info', label: 'ARK est prêt', priority: 'low' }],
      availableActions: ['client_brief', 'recommendations', 'generate_email', 'generate_sms', 'call_script', 'compliance_check'],
      meta: { model: 'stub-mock', cached: false }
    },
    timestamp: new Date().toISOString(),
    todo: 'LOT 3: Suggestions contextuelles intelligentes'
  })
})

module.exports = router
