/**
 * Routes ARK Chat
 * LOT 21 — Chatbot FAQ pour portail client
 */

const express = require('express')
const router = express.Router()
const arkChatService = require('../services/arkChatService')
const { getJwtSecret } = require('../utils/jwtSecret')
// Import au niveau MODULE : placé dans le bloc `try` de verifyClientToken, il
// n'était pas visible des handlers de routes — /api/ark/chat répondait alors une
// erreur interne au lieu de son message métier (défaut mesuré le 21/09/2026).
const { messagePublic } = require('../lib/erreursPubliques')

/**
 * Middleware d'authentification client portail
 * Vérifie le token JWT du client (différent du courtier)
 *
 * SEC-012 / SEC-015 — le secret de signature vient du helper central
 * getJwtSecret() : plus aucun secret de repli codé en dur (en production, le
 * helper refuse de signer/vérifier sans JWT_SECRET).
 */
async function verifyClientToken(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token requis' })
  }

  const token = authHeader.split(' ')[1]
  
  try {
    const jwt = require('jsonwebtoken')
    const decoded = jwt.verify(token, getJwtSecret())
    
    // Vérifier que c'est un token client portail
    if (!decoded.clientId) {
      return res.status(403).json({ error: 'Accès client portail requis' })
    }

    req.clientId = decoded.clientId
    req.portalSession = decoded
    next()
  } catch (err) {
    // Mode démo : UNIQUEMENT hors production et sur activation explicite
    // (ARK_CHAT_DEMO_MODE=true). Auparavant, un simple ?clientId= en
    // développement suffisait à lire la conversation d'un client.
    if (
      process.env.NODE_ENV !== 'production' &&
      process.env.ARK_CHAT_DEMO_MODE === 'true' &&
      req.query.clientId
    ) {
      req.clientId = parseInt(req.query.clientId, 10)
      return next()
    }
    return res.status(401).json({ error: 'Token invalide' })
  }
}

// Envoyer un message et recevoir une réponse ARK
router.post('/message', verifyClientToken, async (req, res) => {
  try {
    const { message, sessionId } = req.body

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message requis' })
    }

    if (message.length > 2000) {
      return res.status(400).json({ error: 'Message trop long (max 2000 caractères)' })
    }

    const result = await arkChatService.processMessage(
      req.app.locals.pool,
      req.clientId,
      message.trim(),
      sessionId || null
    )

    res.json({
      response: result.response,
      sessionId: result.sessionId,
      mock: result.mock || false
    })
  } catch (err) {
    console.error('[ARK Chat] Erreur:', err.message)
    res.status(500).json({ 
      error: 'Erreur lors du traitement',
      message: 'Je suis temporairement indisponible. Veuillez réessayer dans quelques instants.'
    })
  }
})

// Historique de conversation
router.get('/history/:clientId', verifyClientToken, async (req, res) => {
  try {
    // Vérifier que le client demande son propre historique
    if (parseInt(req.params.clientId, 10) !== req.clientId) {
      return res.status(403).json({ error: 'Accès non autorisé' })
    }

    const history = await arkChatService.getHistory(
      req.app.locals.pool,
      req.clientId,
      { 
        sessionId: req.query.sessionId,
        limit: parseInt(req.query.limit, 10) || 50
      }
    )

    res.json({ data: history, total: history.length })
  } catch (err) {
    res.status(500).json({ error: messagePublic(err, { statut: 500 }) })
  }
})

// Supprimer l'historique
router.delete('/history/:clientId', verifyClientToken, async (req, res) => {
  try {
    if (parseInt(req.params.clientId, 10) !== req.clientId) {
      return res.status(403).json({ error: 'Accès non autorisé' })
    }

    await arkChatService.clearHistory(req.app.locals.pool, req.clientId)
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: messagePublic(err, { statut: 500 }) })
  }
})

// Suggestions contextuelles
router.get('/suggestions', verifyClientToken, async (req, res) => {
  try {
    const context = await arkChatService.getClientContext(req.app.locals.pool, req.clientId)
    
    if (!context) {
      return res.json({ suggestions: ['Bonjour, comment puis-je vous aider ?'] })
    }

    const suggestions = arkChatService.getSuggestions(context)
    res.json({ suggestions })
  } catch (err) {
    res.status(500).json({ error: messagePublic(err, { statut: 500 }) })
  }
})

// Info du client (pour personnalisation)
router.get('/context', verifyClientToken, async (req, res) => {
  try {
    const context = await arkChatService.getClientContext(req.app.locals.pool, req.clientId)
    
    if (!context) {
      return res.status(404).json({ error: 'Client introuvable' })
    }

    res.json({
      cabinetName: context.cabinetName,
      clientName: context.clientName,
      hasContracts: context.contracts?.length > 0,
      hasClaims: context.claims?.length > 0,
      upcomingDeadlinesCount: context.upcomingDeadlines?.length || 0
    })
  } catch (err) {
    res.status(500).json({ error: messagePublic(err, { statut: 500 }) })
  }
})

module.exports = router
