/**
 * Routes ARK Chat
 * LOT 21 — Chatbot FAQ pour portail client
 */

const express = require('express')
const router = express.Router()
const arkChatService = require('../services/arkChatService')

/**
 * Middleware d'authentification client portail
 * Vérifie le token JWT du client (différent du courtier)
 */
async function verifyClientToken(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token requis' })
  }

  const token = authHeader.split(' ')[1]
  
  try {
    const jwt = require('jsonwebtoken')
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'courtia_secret_key')
    
    // Vérifier que c'est un token client portail
    if (!decoded.clientId) {
      return res.status(403).json({ error: 'Accès client portail requis' })
    }

    req.clientId = decoded.clientId
    req.portalSession = decoded
    next()
  } catch (err) {
    // Mode démo : permettre l'accès avec un clientId en query
    if (process.env.NODE_ENV === 'development' && req.query.clientId) {
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
    res.status(500).json({ error: err.message })
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
    res.status(500).json({ error: err.message })
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
    res.status(500).json({ error: err.message })
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
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
