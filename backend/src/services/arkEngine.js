/**
 * ARK Engine - Moteur central Anthropic Claude pour COURTIA
 * LOT 3: Backend ARK Réel
 * 
 * @module arkEngine
 */

const Anthropic = require('@anthropic-ai/sdk')
const logger = require('../lib/logger')
const pool = require('../db')

// Modèles Claude
const DEFAULT_MODEL = process.env.ARK_DEFAULT_MODEL || 'claude-sonnet-4-5-20250929'
const FALLBACK_MODEL = process.env.ARK_FALLBACK_MODEL || 'claude-haiku-4-5-20250514'
const LIGHT_MODEL = process.env.ARK_LIGHT_MODEL || 'claude-haiku-4-5-20250514'

// Pricing (USD per 1M tokens) - Claude Sonnet 4.5 et Haiku 4.5
const MODEL_PRICING = {
  'claude-sonnet-4-5-20250929': { input: 3.00, output: 15.00 },
  'claude-sonnet-4-5': { input: 3.00, output: 15.00 },
  'claude-haiku-4-5-20250514': { input: 0.80, output: 4.00 },
  'claude-haiku-4-5': { input: 0.80, output: 4.00 },
}

// Rate limiting basique en mémoire
const rateLimitStore = new Map()
const RATE_LIMIT_MAX = 30
const RATE_LIMIT_WINDOW = 60 * 1000

function checkRateLimit(userId) {
  const now = Date.now()
  const key = 'ark_' + userId
  
  if (!rateLimitStore.has(key)) {
    rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW })
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1 }
  }
  
  const entry = rateLimitStore.get(key)
  if (now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW })
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1 }
  }
  
  if (entry.count >= RATE_LIMIT_MAX) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt }
  }
  
  entry.count++
  return { allowed: true, remaining: RATE_LIMIT_MAX - entry.count }
}

function computeCost(model, inputTokens, outputTokens) {
  const pricing = MODEL_PRICING[model] || MODEL_PRICING['claude-sonnet-4-5-20250929']
  const inputCost = (inputTokens / 1000000) * pricing.input
  const outputCost = (outputTokens / 1000000) * pricing.output
  return parseFloat((inputCost + outputCost).toFixed(6))
}

async function logArkCall(params) {
  const {
    userId,
    clientId = null,
    route,
    action = null,
    model,
    inputTokens,
    outputTokens,
    latencyMs,
    success = true,
    errorMessage = null
  } = params
  
  try {
    const cost = computeCost(model, inputTokens, outputTokens)
    
    await pool.query(
      `INSERT INTO ark_runs (user_id, feature, model, input_tokens, output_tokens, cost_micro_eur, latency_ms, status, error, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
      [
        userId,
        route || action || 'unknown',
        model,
        inputTokens,
        outputTokens,
        Math.round(cost * 0.92 * 1000000),
        latencyMs,
        success ? 'success' : 'error',
        errorMessage
      ]
    )
    
    logger.info({
      userId, clientId, route, model, inputTokens, outputTokens, costUsd: cost, latencyMs, success
    }, 'ARK call logged')
  } catch (err) {
    logger.warn({ error: err.message }, 'Failed to log ARK call - continuing without crash')
  }
}

function getAnthropicClient() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY non configurée')
  }
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
}

async function callArk(options) {
  const {
    system,
    user,
    context = {},
    maxTokens = 1024,
    model = DEFAULT_MODEL,
    jsonMode = false,
    userId = null,
    clientId = null,
    route = 'unknown'
  } = options
  
  const startTime = Date.now()
  
  if (userId) {
    const rateCheck = checkRateLimit(userId)
    if (!rateCheck.allowed) {
      const waitSec = Math.ceil((rateCheck.resetAt - Date.now()) / 1000)
      throw new Error('Rate limit dépassé. Réessayez dans ' + waitSec + 's')
    }
  }
  
  let enrichedSystem = system
  if (context && Object.keys(context).length > 0) {
    const contextEntries = Object.entries(context).filter(function(e) { 
      return e[1] !== null && e[1] !== undefined 
    })
    const contextStr = contextEntries.map(function(e) {
      const k = e[0], v = e[1]
      if (typeof v === 'object') return k + ': ' + JSON.stringify(v, null, 2)
      return k + ': ' + v
    }).join('\n')
    
    enrichedSystem = system + '\n\n=== CONTEXTE ===\n' + contextStr
  }
  
  if (jsonMode) {
    enrichedSystem += '\n\nIMPORTANT: Tu DOIS répondre UNIQUEMENT avec un objet JSON valide. Pas de texte avant ou après.'
  }
  
  let anthropic
  try {
    anthropic = getAnthropicClient()
  } catch (err) {
    return {
      text: null,
      error: 'configuration_required',
      message: 'Clé API Anthropic non configurée. Ajoutez ANTHROPIC_API_KEY.',
      usage: { inputTokens: 0, outputTokens: 0 },
      latencyMs: Date.now() - startTime,
      model: null
    }
  }
  
  let currentModel = model
  let attempts = 0
  const maxAttempts = 2
  
  while (attempts < maxAttempts) {
    attempts++
    
    try {
      const response = await anthropic.messages.create({
        model: currentModel,
        max_tokens: maxTokens,
        system: enrichedSystem,
        messages: [{ role: 'user', content: user }]
      })
      
      const latencyMs = Date.now() - startTime
      const text = response.content[0] ? response.content[0].text : ''
      const usage = {
        inputTokens: response.usage ? response.usage.input_tokens : 0,
        outputTokens: response.usage ? response.usage.output_tokens : 0
      }
      
      await logArkCall({
        userId, clientId, route,
        model: currentModel,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        latencyMs, success: true
      })
      
      let structured = null
      if (jsonMode) {
        try {
          let cleanText = text.trim()
          if (cleanText.startsWith('```json')) {
            cleanText = cleanText.replace(/^```json\s*/, '').replace(/\s*```$/, '')
          } else if (cleanText.startsWith('```')) {
            cleanText = cleanText.replace(/^```\s*/, '').replace(/\s*```$/, '')
          }
          structured = JSON.parse(cleanText)
        } catch (parseErr) {
          logger.warn({ error: parseErr.message, text: text.substring(0, 200) }, 'JSON parsing failed')
        }
      }
      
      return {
        text, structured, usage, latencyMs,
        model: currentModel,
        costUsd: computeCost(currentModel, usage.inputTokens, usage.outputTokens)
      }
      
    } catch (err) {
      const latencyMs = Date.now() - startTime
      
      const isRateLimited = err.status === 429 || err.status === 529
      const isOverloaded = err.message && err.message.includes('overload')
      if ((isRateLimited || isOverloaded) && currentModel !== FALLBACK_MODEL) {
        logger.warn({ error: err.message, model: currentModel }, 'ARK switching to fallback model')
        currentModel = FALLBACK_MODEL
        continue
      }
      
      await logArkCall({
        userId, clientId, route,
        model: currentModel,
        inputTokens: 0, outputTokens: 0,
        latencyMs, success: false,
        errorMessage: err.message
      })
      
      throw err
    }
  }
  
  throw new Error('Max attempts reached')
}

async function callArkLight(options) {
  return callArk({
    ...options,
    model: LIGHT_MODEL,
    maxTokens: options.maxTokens || 512
  })
}

async function callArkStructured(options) {
  const schemaInstruction = options.schema 
    ? '\n\nRéponds avec un JSON respectant ce schéma:\n' + JSON.stringify(options.schema, null, 2)
    : ''
  
  return callArk({
    system: options.system + schemaInstruction,
    user: options.user,
    context: options.context || {},
    maxTokens: 2048,
    jsonMode: true,
    userId: options.userId,
    clientId: options.clientId,
    route: options.route
  })
}

// Modèles Vision
const VISION_MODEL = process.env.ARK_VISION_MODEL || 'claude-sonnet-4-5-20250929'

// Pricing Vision (même pricing que texte pour Claude)
const VISION_PRICING = MODEL_PRICING

/**
 * Appel Claude Vision pour analyse d'images/documents
 *
 * @param {Object} options
 * @param {string} options.system - Prompt système
 * @param {string} options.user - Prompt utilisateur
 * @param {Array} options.images - [{buffer: Buffer, mediaType: 'image/png'|'image/jpeg'|'application/pdf'}]
 * @param {Object} options.context - Contexte additionnel
 * @param {number} options.maxTokens - Tokens max
 * @param {boolean} options.jsonMode - Mode JSON
 * @param {string} options.model - Modèle (défaut: claude-sonnet-4-5)
 * @param {number} options.userId - ID utilisateur
 * @param {string} options.route - Route/feature pour logging
 * @returns {Promise<Object>} { text, structured, usage, latencyMs, model, costUsd }
 */
async function callArkVision(options) {
  const {
    system,
    user,
    images = [],
    context = {},
    maxTokens = 2048,
    model = VISION_MODEL,
    jsonMode = false,
    userId = null,
    clientId = null,
    route = 'vision'
  } = options

  const startTime = Date.now()

  // Rate limiting
  if (userId) {
    const rateCheck = checkRateLimit(userId)
    if (!rateCheck.allowed) {
      const waitSec = Math.ceil((rateCheck.resetAt - Date.now()) / 1000)
      throw new Error('Rate limit dépassé. Réessayez dans ' + waitSec + 's')
    }
  }

  // Construire le prompt système enrichi
  let enrichedSystem = system
  if (context && Object.keys(context).length > 0) {
    const contextEntries = Object.entries(context).filter(function(e) {
      return e[1] !== null && e[1] !== undefined
    })
    const contextStr = contextEntries.map(function(e) {
      const k = e[0], v = e[1]
      if (typeof v === 'object') return k + ': ' + JSON.stringify(v, null, 2)
      return k + ': ' + v
    }).join('\n')

    enrichedSystem = system + '\n\n=== CONTEXTE ===\n' + contextStr
  }

  if (jsonMode) {
    enrichedSystem += '\n\nIMPORTANT: Tu DOIS répondre UNIQUEMENT avec un objet JSON valide. Pas de texte avant ou après.'
  }

  // Construire le contenu multimodal
  const content = []

  // Ajouter les images
  for (const img of images) {
    if (!img.buffer) continue

    const base64 = img.buffer.toString('base64')
    const mediaType = img.mediaType || 'image/png'

    content.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: mediaType,
        data: base64
      }
    })
  }

  // Ajouter le texte utilisateur
  content.push({
    type: 'text',
    text: user
  })

  let anthropic
  try {
    anthropic = getAnthropicClient()
  } catch (err) {
    return {
      text: null,
      error: 'configuration_required',
      message: 'Clé API Anthropic non configurée. Ajoutez ANTHROPIC_API_KEY.',
      usage: { inputTokens: 0, outputTokens: 0 },
      latencyMs: Date.now() - startTime,
      model: null
    }
  }

  let currentModel = model
  let attempts = 0
  const maxAttempts = 2

  while (attempts < maxAttempts) {
    attempts++

    try {
      const response = await anthropic.messages.create({
        model: currentModel,
        max_tokens: maxTokens,
        system: enrichedSystem,
        messages: [{ role: 'user', content: content }]
      })

      const latencyMs = Date.now() - startTime
      const text = response.content[0] ? response.content[0].text : ''
      const usage = {
        inputTokens: response.usage ? response.usage.input_tokens : 0,
        outputTokens: response.usage ? response.usage.output_tokens : 0
      }

      await logArkCall({
        userId, clientId, route,
        model: currentModel,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        latencyMs, success: true
      })

      let structured = null
      if (jsonMode) {
        try {
          let cleanText = text.trim()
          if (cleanText.startsWith('```json')) {
            cleanText = cleanText.replace(/^```json\s*/, '').replace(/\s*```$/, '')
          } else if (cleanText.startsWith('```')) {
            cleanText = cleanText.replace(/^```\s*/, '').replace(/\s*```$/, '')
          }
          structured = JSON.parse(cleanText)
        } catch (parseErr) {
          logger.warn({ error: parseErr.message, text: text.substring(0, 200) }, 'Vision JSON parsing failed')
        }
      }

      return {
        text, structured, usage, latencyMs,
        model: currentModel,
        costUsd: computeCost(currentModel, usage.inputTokens, usage.outputTokens)
      }

    } catch (err) {
      const latencyMs = Date.now() - startTime

      const isRateLimited = err.status === 429 || err.status === 529
      const isOverloaded = err.message && err.message.includes('overload')
      if ((isRateLimited || isOverloaded) && currentModel !== FALLBACK_MODEL) {
        logger.warn({ error: err.message, model: currentModel }, 'ARK Vision switching to fallback model')
        currentModel = FALLBACK_MODEL
        continue
      }

      await logArkCall({
        userId, clientId, route,
        model: currentModel,
        inputTokens: 0, outputTokens: 0,
        latencyMs, success: false,
        errorMessage: err.message
      })

      throw err
    }
  }

  throw new Error('Max attempts reached')
}

module.exports = {
  callArk,
  callArkLight,
  callArkStructured,
  callArkVision,
  checkRateLimit,
  computeCost,
  logArkCall,
  DEFAULT_MODEL,
  FALLBACK_MODEL,
  LIGHT_MODEL,
  VISION_MODEL,
  MODEL_PRICING
}
