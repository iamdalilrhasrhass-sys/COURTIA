/**
 * Routes WhatsApp Meta Cloud API
 * LOT 21 — WhatsApp Business Integration
 */

const express = require('express')
const router = express.Router()
const verifyToken = require('../middleware/authMiddleware')
const whatsappService = require('../services/whatsappMetaService')
const secretsEntrants = require('../lib/secretsEntrants')

// Webhook verification (GET) - Public pour Meta
//
// DÉFAUT FERMÉ (P2 SEC-014, mesuré en production le 20/09/2026) : le jeton de
// vérification avait une valeur par défaut ÉCRITE EN DUR et PUBLIQUE
// ('courtia_whatsapp_verify'). Le GET renvoyait donc le challenge à quiconque
// connaissait le dépôt — c'est-à-dire que l'abonnement du webhook pouvait être
// détourné vers un endpoint tiers.
//
// RÈGLE : sans `WHATSAPP_WEBHOOK_VERIFY_TOKEN` (ou l'ancien nom
// `WHATSAPP_VERIFY_TOKEN`) configuré, on répond 503 ; il n'existe AUCUNE valeur
// par défaut. Jeton faux → 403.
router.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode']
  const token = req.query['hub.verify_token']
  const challenge = req.query['hub.challenge']

  const attendu = secretsEntrants.lireSecret(secretsEntrants.SECRETS.whatsappVerification)
  if (!attendu) {
    return secretsEntrants.repondreSecretAbsent(
      res,
      'whatsapp_webhook_verify_token',
      "La vérification du webhook WhatsApp est fermée : le jeton (WHATSAPP_WEBHOOK_VERIFY_TOKEN) n'est pas configuré sur ce serveur."
    )
  }

  if (mode === 'subscribe' && secretsEntrants.verifierSecretSimple({ secret: attendu, fourni: token }).valide) {
    console.log('[WhatsApp] Webhook vérifié')
    return res.status(200).send(challenge)
  }

  return res.status(403).json({ error: 'Verification failed' })
})

// Webhook events (POST) - Public pour Meta
//
// DÉFAUT FERMÉ (P2 SEC-014) : la signature était vérifiée dans le SERVICE sur
// `JSON.stringify(body)` (services/whatsappMetaService.js:142). Une signature
// recalculée sur une mise en forme réécrite ne prouve rien sur les octets reçus.
// La vérification se fait désormais ICI, sur `req.rawBody` (corps brut conservé
// par `server.js`), AVANT d'appeler le service : sans secret configuré → 503,
// signature absente ou fausse → 403, et dans les deux cas rien n'est traité.
router.post('/webhook', async (req, res) => {
  const secret = secretsEntrants.lireSecret(secretsEntrants.SECRETS.whatsappSignature)
  if (!secret) {
    return secretsEntrants.repondreSecretAbsent(
      res,
      'whatsapp_app_secret',
      "Le webhook WhatsApp est fermé : le secret d'application Meta (WHATSAPP_APP_SECRET) n'est pas configuré sur ce serveur."
    )
  }

  const verdict = secretsEntrants.verifierSignatureHmac({
    rawBody: req.rawBody,
    enteteSignature: req.headers['x-hub-signature-256'],
    secret,
  })
  if (!verdict.valide) {
    return res.status(403).json({ success: false, error: 'whatsapp_signature_invalid', raison: verdict.raison })
  }

  try {
    // La signature est déjà vérifiée sur les octets bruts : on la transmet au
    // service pour qu'il ne refasse pas un calcul sur du JSON reconstruit.
    const result = await whatsappService.handleWebhook(req.app.locals.pool, req.body, {
      signatureVerifiee: true,
    })
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
