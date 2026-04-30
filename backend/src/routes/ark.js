const express = require('express')
const router = express.Router()
const OpenAI = require('openai')
const { verifyToken } = require('../middleware/auth')
const { requireUnderLimit } = require('../middleware/planGuard')
const { incrementUsage } = require('../services/planService')

// Initialisation client DeepSeek (compatible OpenAI SDK)
const openai = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com/v1'
})

// Log au démarrage pour vérifier la clé
console.log('ARK init - DEEPSEEK_API_KEY présente:', !!process.env.DEEPSEEK_API_KEY)

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
          console.error('ARK auto-fetch contrats failed:', e.message)
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
          console.error('ARK auto-fetch taches failed:', e.message)
          clientData.taches = []
        }
      }
    }

    if (!process.env.DEEPSEEK_API_KEY) {
      console.error('ARK ERROR: DEEPSEEK_API_KEY non définie')
      return res.status(500).json({
        error: 'Configuration ARK incomplète',
        details: 'La clé API DeepSeek est manquante. Vérifiez les variables d\'environnement.'
      })
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
          console.error('ARK: erreur fetch contrats/tâches:', fetchErr.message)
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

    console.log(`ARK: appel DeepSeek - message: "${message.substring(0, 60)}..." - client: ${clientData?.id || 'global'}`)

    // Appel API DeepSeek via OpenAI SDK
    const response = await openai.chat.completions.create({
      model: 'deepseek-chat',
      max_tokens: 600,
      messages: messages
    })

    const reply = response.choices && response.choices[0] 
      ? response.choices[0].message.content 
      : 'Aucune réponse générée'

    console.log(`ARK: réponse reçue - ${reply.substring(0, 80)}...`)

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
        console.error('ARK: erreur sauvegarde conversation:', saveErr.message)
      }
    }

    // Répondre au frontend
    res.json({ reply })

    // Incrémenter usage APRÈS réponse réussie
    try {
      const userId = req.user.userId || req.user.id
      await incrementUsage(userId, 'ark_messages')
    } catch (err) {
      console.error('[ARK] Erreur incrément usage (non bloquant):', err.message)
    }

  } catch (err) {
    console.error('ARK ERREUR CRITIQUE:', err.message)
    console.error('ARK ERREUR STACK:', err.stack)

    // Gérer les erreurs DeepSeek spécifiques
    if (err.status === 401 || (err.message && err.message.includes('api_key'))) {
      return res.status(500).json({
        error: 'Clé API DeepSeek invalide ou expirée',
        details: 'Vérifiez DEEPSEEK_API_KEY'
      })
    }

    if (err.status === 429 || (err.message && err.message.includes('rate_limit'))) {
      return res.status(429).json({
        error: 'Limite d\'utilisation ARK atteinte',
        details: 'Réessayez dans quelques instants'
      })
    }

    if (err.status === 404 || (err.message && err.message.includes('model'))) {
      return res.status(500).json({
        error: 'Modèle ARK non disponible',
        details: 'Contactez le support COURTIA'
      })
    }

    res.status(500).json({
      error: 'ARK temporairement indisponible',
      details: err.message || 'Erreur inconnue'
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
    console.error('ARK conversations erreur:', err.message)
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
    console.error('ARK history erreur:', err.message)
    res.json({ messages: [] })
  }
})

module.exports = router
