const express = require('express')
const router = express.Router()
const Anthropic = require('@anthropic-ai/sdk')
const jwt = require('jsonwebtoken')

console.log('✅ ARK routes loading... API Key:', process.env.ANTHROPIC_API_KEY ? '✅ SET' : '❌ MISSING')

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || ''
})

// Simple JWT verify
function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    console.warn('❌ No bearer token')
    return res.status(401).json({ error: 'No token' })
  }

  const token = authHeader.substring(7)
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key')
    next()
  } catch (err) {
    console.error('JWT error:', err.message)
    res.status(401).json({ error: 'Invalid token' })
  }
}

// POST /api/ark/chat
router.post('/chat', async (req, res) => {
  try {
    const { message, clientData, conversationHistory } = req.body

    if (!message) return res.status(400).json({ error: 'Message required' })

    // Build system prompt
    let systemPrompt = `Tu es ARK, l'assistant IA de COURTIA spécialisé en assurance française.`
    
    if (clientData && clientData.id) {
      systemPrompt = `Tu es ARK, expert en gestion de portefeuille assurance pour courtiers français.

Client: ${clientData.prenom || ''} ${clientData.nom || ''}
Risque: ${clientData.score_risque || 'N/A'}/100 | Bonus-malus: ${clientData.bonus_malus || 'N/A'}
Zone: ${clientData.zone_geographique || 'N/A'} | Sinistres 3 ans: ${clientData.nb_sinistres_3ans ?? 0}
Profession: ${clientData.profession || 'N/A'}

Fournis une analyse précise et actionnable en français.`
    }

    // Build message history
    const messages = [
      ...(conversationHistory || []).filter(m => m.role && m.content),
      { role: 'user', content: message.trim() }
    ]

    console.log(`🔄 ARK: "${message.substring(0, 40)}..." | Calling Anthropic`)

    // Call Anthropic
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      system: systemPrompt,
      messages
    })

    const reply = response.content[0]?.text || 'No response'
    console.log(`✅ ARK responded: "${reply.substring(0, 40)}..."`)

    res.json({ reply })

  } catch (err) {
    console.error('❌ ARK Error:', err.message, err.code)

    const errorMsg = err.message.includes('401') ? 'API key invalid' 
                   : err.message.includes('rate_limit') ? 'Rate limited'
                   : err.message

    res.status(500).json({
      error: 'ARK error',
      details: errorMsg
    })
  }
})

module.exports = router
