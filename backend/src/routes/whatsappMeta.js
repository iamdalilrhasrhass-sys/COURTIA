/**
 * Routes WhatsApp Meta Cloud API
 * LOT 21 — WhatsApp Business Integration
 */

const express = require('express')
const router = express.Router()
const verifyToken = require('../middleware/authMiddleware')
const whatsappService = require('../services/whatsappMetaService')

// Webhook verification (GET) - Public pour Meta
router.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode']
  const token = req.query['hub.verify_token']
  const challenge = req.query['hub.challenge']

  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'courtia_whatsapp_verify'

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('[WhatsApp] Webhook vérifié')
    return res.status(200).send(challenge)
  }

  return res.status(403).json({ error: 'Verification failed' })
})

// Webhook events (POST) - Public pour Meta
router.post('/webhook', async (req, res) => {
  try {
    const signature = req.headers['x-hub-signature-256']
    const result = await whatsappService.handleWebhook(req.app.locals.pool, req.body, signature)
    res.json({ success: true, ...result })
  } catch (err) {
    console.error('[WhatsApp Webhook] Erreur:', err.message)
    // Toujours répondre 200 à Meta pour éviter les retries
    res.json({ success: false, error: err.message })
  }
})

// Routes protégées ci-dessous
router.use(verifyToken)

// Liste des conversations
router.get('/conversations', async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId
    const conversations = await whatsappService.listConversations(
      req.app.locals.pool, 
      userId,
      { limit: parseInt(req.query.limit, 10) || 50, offset: parseInt(req.query.offset, 10) || 0 }
    )
    res.json({ data: conversations, total: conversations.length })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Messages d'une conversation
router.get('/conversations/:phone/messages', async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId
    const messages = await whatsappService.listMessages(
      req.app.locals.pool,
      userId,
      req.params.phone,
      { limit: parseInt(req.query.limit, 10) || 100 }
    )
    res.json({ data: messages, total: messages.length })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Envoyer un message
router.post('/send', async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId
    const { phone, message, clientId } = req.body

    if (!phone || !message) {
      return res.status(400).json({ error: 'phone et message requis' })
    }

    const result = await whatsappService.sendMessage(req.app.locals.pool, userId, {
      phone,
      message,
      clientId
    })

    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Envoyer un template
router.post('/template', async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId
    const { phone, templateId, variables, clientId } = req.body

    if (!phone || !templateId) {
      return res.status(400).json({ error: 'phone et templateId requis' })
    }

    const result = await whatsappService.sendTemplate(req.app.locals.pool, userId, {
      phone,
      templateId,
      variables: variables || [],
      clientId
    })

    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Liste des templates disponibles
router.get('/templates', (req, res) => {
  const templates = whatsappService.getWhatsappTemplates()
  res.json({ data: templates })
})

// Rappel d'échéance
router.post('/reminder/echeance', async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId
    const { clientId, contractRef, echeanceDate } = req.body

    if (!clientId || !contractRef || !echeanceDate) {
      return res.status(400).json({ error: 'clientId, contractRef et echeanceDate requis' })
    }

    const result = await whatsappService.sendEcheanceReminder(req.app.locals.pool, userId, {
      clientId,
      contractRef,
      echeanceDate
    })

    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Status de configuration
router.get('/status', (req, res) => {
  res.json({
    configured: whatsappService.isConfigured(),
    templates_count: whatsappService.getWhatsappTemplates().length
  })
})

module.exports = router
