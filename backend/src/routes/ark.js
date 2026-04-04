const express = require('express')
const router = express.Router()
const Anthropic = require('@anthropic-ai/sdk')
const jwt = require('jsonwebtoken')

// Vérifier la clé API au démarrage
if (!process.env.ANTHROPIC_API_KEY) {
  console.warn('⚠️  ANTHROPIC_API_KEY NOT SET — ARK responses will fail')
} else {
  console.log('✅ ANTHROPIC_API_KEY loaded:', process.env.ANTHROPIC_API_KEY.substring(0, 20) + '...')
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || ''
})

// Middleware local pour vérifier le JWT
const verifyTokenLocal = (req, res, next) => {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  const token = authHeader.substring(7)
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key')
    req.user = decoded
    next()
  } catch (err) {
    console.error('JWT error:', err.message)
    res.status(401).json({ error: 'Invalid token', details: err.message })
  }
}

// POST /api/ark/chat — Chat avec ARK
router.post('/chat', async (req, res) => {
  try {
    const { message, clientData, conversationHistory } = req.body

    if (!message || typeof message !== 'string' || message.trim() === '') {
      return res.status(400).json({ error: 'Message required' })
    }

    // Vérifier API key
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(500).json({
        error: 'ARK API key not configured',
        details: 'ANTHROPIC_API_KEY missing from environment'
      })
    }

    // System prompt avec contexte client
    let systemPrompt
    if (clientData && clientData.id) {
      systemPrompt = `Tu es ARK, l'assistant IA de COURTIA spécialisé en assurance.

Données du client:
- Nom: ${clientData.prenom || ''} ${clientData.nom || ''}
- Email: ${clientData.email || 'N/A'}
- Statut: ${clientData.statut || 'N/A'}
- Score risque: ${clientData.score_risque || 'N/A'}/100
- Bonus-malus: ${clientData.bonus_malus || 'N/A'}
- Années permis: ${clientData.annees_permis || 'N/A'}
- Sinistres 3 ans: ${clientData.nb_sinistres_3ans ?? 'N/A'}
- Zone: ${clientData.zone_geographique || 'N/A'}
- Profession: ${clientData.profession || 'N/A'}

Fournis une analyse détaillée, actionnable et en français.`
    } else {
      systemPrompt = `Tu es ARK, l'assistant IA de COURTIA pour courtiers en assurance française. 
Réponds en français, sois précis et professionnel.`
    }

    // Construire l'historique pour Anthropic
    const messages = [
      ...(conversationHistory || [])
        .filter(m => m.role && m.content)
        .map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: message.trim() }
    ]

    console.log(`🔄 ARK: "${message.substring(0, 50)}..." | messages: ${messages.length}`)

    // Appel Anthropic
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      system: systemPrompt,
      messages
    })

    const reply = response.content[0]?.text || 'No response'
    console.log(`✅ ARK replied: "${reply.substring(0, 50)}..."`)

    res.json({ reply })

  } catch (err) {
    console.error('❌ ARK Error:', err.message)

    if (err.message.includes('401') || err.message.includes('api_key')) {
      return res.status(500).json({
        error: 'ANTHROPIC_API_KEY invalid or missing',
        details: err.message
      })
    }

    res.status(500).json({
      error: 'ARK error',
      details: err.message
    })
  }
})

module.exports = router
