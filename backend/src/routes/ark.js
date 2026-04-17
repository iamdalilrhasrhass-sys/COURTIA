const express = require('express')
const router = express.Router()
const Anthropic = require('@anthropic-ai/sdk')
const { verifyToken } = require('../middleware/auth')
const { requireUnderLimit } = require('../middleware/planGuard')
const { incrementUsage } = require('../services/planService')

// Initialisation client Anthropic
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

// Log au démarrage pour vérifier la clé
console.log('ARK init - ANTHROPIC_API_KEY présente:', !!process.env.ANTHROPIC_API_KEY)
if (process.env.ANTHROPIC_API_KEY) {
  console.log('ARK init - Clé commence par:', process.env.ANTHROPIC_API_KEY.substring(0, 15))
}

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

    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('ARK ERROR: ANTHROPIC_API_KEY non définie dans les variables Render')
      return res.status(500).json({
        error: 'Configuration ARK incomplète',
        details: 'La clé API Anthropic est manquante. Vérifiez les variables d\'environnement Render.'
      })
    }

    // Construire le prompt système selon le contexte
    const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    let systemPrompt
    if (clientData && (clientData.id || clientData.nom)) {
      // Lister les contrats actifs du client si disponibles
      const contratsActifs = Array.isArray(clientData.contrats)
        ? clientData.contrats.filter(c => (c.status || c.statut || '').toLowerCase() === 'actif')
        : []
      const contratsStr = contratsActifs.length > 0
        ? contratsActifs.map(c => `  • ${c.type_contrat || c.type} chez ${c.compagnie || 'N/A'} — prime ${c.prime_annuelle ? c.prime_annuelle + '€' : 'N/A'} — échéance ${c.date_echeance ? new Date(c.date_echeance).toLocaleDateString('fr-FR') : 'N/A'}`).join('\n')
        : '  Aucun contrat actif renseigné'

      systemPrompt = `Tu es ARK, conseiller IA COURTIA, expert assurance française. Date : ${today}

CLIENT : ${clientData.prenom || ''} ${clientData.nom || ''} | Statut : ${clientData.statut || clientData.status || 'NC'} | Profession : ${clientData.profession || 'NC'} | Zone : ${clientData.zone_geographique || 'NC'}
CONTRATS ACTIFS : ${contratsStr}

RÈGLE ABSOLUE : Si le message contient une instruction JSON, tu dois répondre UNIQUEMENT en JSON valide avec ce schéma exact et rien d'autre :
{"resume":"string ≤200 chars","points":["string ≤100","string ≤100","string ≤100"],"actions":[{"label":"string","priorite":"haute|moyenne|basse","impact":"string"}]}
Maximum 3 points, maximum 3 actions. Pas de markdown, pas de texte hors JSON.

Si le message ne demande pas de JSON : réponds en français, ton expert, 120 mots max, orienté action.`
    } else {
      systemPrompt = `Tu es ARK, conseiller IA COURTIA, expert assurance française. Date : ${today}
Expertise : portefeuille, cross-sell, fidélisation, réglementation DDA/ORIAS/Loi Hamon.

RÈGLE ABSOLUE : Si le message contient une instruction JSON, réponds UNIQUEMENT en JSON valide :
{"resume":"...","points":["...","...","..."],"actions":[{"label":"...","priorite":"haute|moyenne|basse","impact":"..."}]}
Sinon : réponse française, 120 mots max, orientée action.`
    }

    // Construire l'historique pour l'API Anthropic
    const messages = [
      ...conversationHistory
        .filter(m => m && m.role && m.content && typeof m.content === 'string')
        .slice(-10) // Garder les 10 derniers messages max
        .map(m => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content
        })),
      {
        role: 'user',
        content: message.trim()
      }
    ]

    console.log(`ARK: appel Anthropic - message: "${message.substring(0, 60)}..." - client: ${clientData?.id || 'global'}`)

    // Appel API Anthropic avec le bon modèle
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      system: systemPrompt,
      messages: messages
    })

    const reply = response.content && response.content[0] ? response.content[0].text : 'Aucune réponse générée'

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
          const updatedMessages = [...currentMessages, ...newMsg].slice(-50) // Max 50 messages
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
        // Ne pas bloquer la réponse principale si la sauvegarde échoue
        console.error('ARK: erreur sauvegarde conversation:', saveErr.message)
      }
    }

    // Répondre au frontend EN PREMIER — toujours avant incrementUsage
    res.json({ reply })

    // Incrémenter APRÈS la réponse réussie (Anthropic a bien répondu)
    // Si Anthropic avait échoué, on ne serait pas arrivé ici
    try {
      const userId = req.user.userId || req.user.id
      await incrementUsage(userId, 'ark_messages')
    } catch (err) {
      console.error('[ARK] Erreur incrément usage (non bloquant):', err.message)
    }

  } catch (err) {
    console.error('ARK ERREUR CRITIQUE:', err.message)
    console.error('ARK ERREUR STACK:', err.stack)

    // Gérer les erreurs Anthropic spécifiques
    if (err.status === 401 || (err.message && err.message.includes('api_key'))) {
      return res.status(500).json({
        error: 'Clé API Anthropic invalide ou expirée',
        details: 'Vérifiez ANTHROPIC_API_KEY dans Render Environment'
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
 * Récupérer l'historique des conversations ARK pour un client
 */
router.get('/conversations/:clientId', verifyToken, async (req, res) => {
  try {
    const pool = require('../db')
    const result = await pool.query(
      'SELECT messages FROM ark_conversations WHERE client_id = $1 ORDER BY updated_at DESC LIMIT 1',
      [req.params.clientId]
    )
    res.json(result.rows[0]?.messages || [])
  } catch (err) {
    console.error('ARK conversations erreur:', err.message)
    res.json([]) // Retourner tableau vide plutôt qu'une erreur
  }
})

module.exports = router
