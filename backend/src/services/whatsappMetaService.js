/**
 * WhatsApp Meta Cloud API Service
 * LOT 21 — Intégration WhatsApp Business API (Meta)
 */

const axios = require('axios')
const {
  buildWhatsappPayload,
  sanitizeWhatsappPhone,
  getWhatsappTemplates,
  getWhatsappTemplate,
  verifyMetaSignature,
  parseWhatsappWebhookMessages,
  isWhatsappWindowOpen
} = require('./whatsappBusinessService')

const WHATSAPP_API_URL = 'https://graph.facebook.com/v18.0'
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000

function isConfigured() {
  return Boolean(
    process.env.WHATSAPP_ACCESS_TOKEN &&
    process.env.WHATSAPP_PHONE_NUMBER_ID
  )
}

function getClient() {
  if (!isConfigured()) return null
  return axios.create({
    baseURL: `${WHATSAPP_API_URL}/${process.env.WHATSAPP_PHONE_NUMBER_ID}`,
    headers: {
      Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    timeout: 30000
  })
}

/**
 * Envoie un message WhatsApp (texte ou template)
 */
async function sendMessage(pool, userId, { phone, message, clientId, templateId, templateVariables }) {
  const client = getClient()
  const phoneClean = sanitizeWhatsappPhone(phone)
  
  if (!phoneClean) {
    throw new Error('Numéro de téléphone invalide')
  }

  // Mode mock si pas configuré
  if (!client) {
    console.log('[WhatsApp Mock] Message vers', phoneClean, ':', message || templateId)
    const mockResult = await pool.query(`
      INSERT INTO whatsapp_messages (user_id, client_id, phone, direction, message_type, message, template_name, status, sent_at, created_at)
      VALUES ($1, $2, $3, 'outbound', $4, $5, $6, 'mock_sent', NOW(), NOW())
      RETURNING *
    `, [userId, clientId || null, phoneClean, templateId ? 'template' : 'text', message, templateId || null])
    return { success: true, mock: true, data: mockResult.rows[0] }
  }

  try {
    const payload = buildWhatsappPayload({
      to: phone,
      message,
      templateId,
      templateVariables
    })

    const response = await client.post('/messages', payload)
    const waMessageId = response.data?.messages?.[0]?.id || null

    // Sauvegarder en base
    const result = await pool.query(`
      INSERT INTO whatsapp_messages (
        user_id, client_id, phone, direction, message_type, message, 
        template_name, template_params, status, whatsapp_message_id, sent_at, created_at
      )
      VALUES ($1, $2, $3, 'outbound', $4, $5, $6, $7, 'sent', $8, NOW(), NOW())
      RETURNING *
    `, [
      userId,
      clientId || null,
      phoneClean,
      templateId ? 'template' : 'text',
      message,
      templateId || null,
      JSON.stringify(templateVariables || []),
      waMessageId
    ])

    // Mettre à jour la conversation
    await upsertConversation(pool, userId, phoneClean, {
      clientId,
      message: message || `[Template: ${templateId}]`,
      direction: 'outbound'
    })

    return { success: true, data: result.rows[0], waMessageId }
  } catch (error) {
    console.error('[WhatsApp] Erreur envoi:', error.response?.data || error.message)
    
    // Logger l'échec
    await pool.query(`
      INSERT INTO whatsapp_messages (
        user_id, client_id, phone, direction, message_type, message,
        template_name, status, error_message, created_at
      )
      VALUES ($1, $2, $3, 'outbound', $4, $5, $6, 'failed', $7, NOW())
    `, [
      userId,
      clientId || null,
      phoneClean,
      templateId ? 'template' : 'text',
      message,
      templateId || null,
      error.response?.data?.error?.message || error.message
    ])

    throw new Error(error.response?.data?.error?.message || 'Erreur envoi WhatsApp')
  }
}

/**
 * Envoie un template WhatsApp
 */
async function sendTemplate(pool, userId, { phone, templateId, variables, clientId }) {
  return sendMessage(pool, userId, {
    phone,
    templateId,
    templateVariables: variables,
    clientId
  })
}

/**
 * Traite les webhooks entrants Meta
 */
async function handleWebhook(pool, body, signature) {
  // Vérifier la signature si configurée
  if (process.env.WHATSAPP_APP_SECRET) {
    const check = verifyMetaSignature({
      rawBody: JSON.stringify(body),
      signatureHeader: signature,
      appSecret: process.env.WHATSAPP_APP_SECRET
    })
    if (check.configured && !check.valid) {
      throw new Error('Signature webhook invalide')
    }
  }

  const messages = parseWhatsappWebhookMessages(body)
  const results = []

  for (const msg of messages) {
    try {
      // Trouver le client par téléphone
      const clientRes = await pool.query(`
        SELECT c.id, c.courtier_id 
        FROM clients c 
        WHERE c.phone = $1 OR c.phone_mobile = $1
        LIMIT 1
      `, [msg.phone])

      const client = clientRes.rows[0]
      const userId = client?.courtier_id || null

      if (userId) {
        // Sauvegarder le message entrant
        const insertRes = await pool.query(`
          INSERT INTO whatsapp_messages (
            user_id, client_id, phone, direction, message_type, message,
            whatsapp_message_id, status, created_at
          )
          VALUES ($1, $2, $3, 'inbound', $4, $5, $6, 'received', NOW())
          RETURNING *
        `, [
          userId,
          client?.id || null,
          msg.phone,
          msg.type,
          msg.text,
          msg.messageId
        ])

        // Mettre à jour la conversation
        await upsertConversation(pool, userId, msg.phone, {
          clientId: client?.id,
          message: msg.text,
          direction: 'inbound'
        })

        results.push({ success: true, data: insertRes.rows[0] })
      }
    } catch (err) {
      console.error('[WhatsApp Webhook] Erreur message:', err.message)
      results.push({ success: false, error: err.message })
    }
  }

  return { processed: results.length, results }
}

/**
 * Met à jour ou crée une conversation
 */
async function upsertConversation(pool, userId, phone, { clientId, message, direction }) {
  const preview = String(message || '').slice(0, 100)
  const windowExpires = new Date(Date.now() + TWENTY_FOUR_HOURS_MS)

  await pool.query(`
    INSERT INTO whatsapp_conversations (user_id, client_id, phone, last_message_at, last_message_preview, unread_count, window_expires_at, created_at, updated_at)
    VALUES ($1, $2, $3, NOW(), $4, $5, $6, NOW(), NOW())
    ON CONFLICT (user_id, phone) DO UPDATE SET
      client_id = COALESCE(EXCLUDED.client_id, whatsapp_conversations.client_id),
      last_message_at = NOW(),
      last_message_preview = EXCLUDED.last_message_preview,
      unread_count = CASE WHEN $7 = 'inbound' THEN whatsapp_conversations.unread_count + 1 ELSE 0 END,
      window_expires_at = CASE WHEN $7 = 'inbound' THEN $6 ELSE whatsapp_conversations.window_expires_at END,
      updated_at = NOW()
  `, [userId, clientId || null, phone, preview, direction === 'inbound' ? 1 : 0, windowExpires, direction])
}

/**
 * Liste les conversations d'un courtier
 */
async function listConversations(pool, userId, options = {}) {
  const { limit = 50, offset = 0 } = options
  
  const result = await pool.query(`
    SELECT 
      wc.*,
      c.first_name AS client_first_name,
      c.last_name AS client_last_name,
      c.email AS client_email,
      CASE WHEN wc.window_expires_at > NOW() THEN true ELSE false END AS window_open
    FROM whatsapp_conversations wc
    LEFT JOIN clients c ON c.id = wc.client_id
    WHERE wc.user_id = $1
    ORDER BY wc.last_message_at DESC NULLS LAST
    LIMIT $2 OFFSET $3
  `, [userId, limit, offset])

  return result.rows
}

/**
 * Liste les messages d'une conversation
 */
async function listMessages(pool, userId, phone, options = {}) {
  const { limit = 100, offset = 0 } = options
  const phoneClean = sanitizeWhatsappPhone(phone)

  const result = await pool.query(`
    SELECT wm.*
    FROM whatsapp_messages wm
    WHERE wm.user_id = $1 AND wm.phone = $2
    ORDER BY wm.created_at ASC
    LIMIT $3 OFFSET $4
  `, [userId, phoneClean, limit, offset])

  // Marquer comme lus
  await pool.query(`
    UPDATE whatsapp_conversations 
    SET unread_count = 0, updated_at = NOW()
    WHERE user_id = $1 AND phone = $2
  `, [userId, phoneClean])

  return result.rows
}

/**
 * Envoie un rappel d'échéance automatique
 */
async function sendEcheanceReminder(pool, userId, { clientId, contractRef, echeanceDate }) {
  const clientRes = await pool.query(`
    SELECT c.first_name, c.phone, c.phone_mobile
    FROM clients c WHERE c.id = $1 AND c.courtier_id = $2
  `, [clientId, userId])

  const client = clientRes.rows[0]
  if (!client) throw new Error('Client introuvable')

  const phone = client.phone_mobile || client.phone
  if (!phone) throw new Error('Pas de numéro de téléphone')

  return sendTemplate(pool, userId, {
    phone,
    templateId: 'relance_echeance',
    variables: [
      client.first_name,
      contractRef,
      new Date(echeanceDate).toLocaleDateString('fr-FR')
    ],
    clientId
  })
}

module.exports = {
  isConfigured,
  sendMessage,
  sendTemplate,
  handleWebhook,
  listConversations,
  listMessages,
  upsertConversation,
  sendEcheanceReminder,
  getWhatsappTemplates,
  getWhatsappTemplate,
  sanitizeWhatsappPhone,
  isWhatsappWindowOpen
}
