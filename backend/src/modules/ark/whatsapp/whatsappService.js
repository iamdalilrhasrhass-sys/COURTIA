function verifyWebhook(queryLike, expectedToken = process.env.WHATSAPP_VERIFY_TOKEN) {
  const mode = queryLike?.['hub.mode']
  const token = queryLike?.['hub.verify_token']
  const challenge = queryLike?.['hub.challenge']

  if (mode === 'subscribe' && token && token === expectedToken) {
    return { ok: true, challenge }
  }

  return { ok: false, challenge: null }
}

function parseInboundPayload(body) {
  const messages = []
  const entries = body?.entry || []

  for (const entry of entries) {
    for (const change of entry.changes || []) {
      const value = change.value || {}
      const phoneNumberId = value.metadata?.phone_number_id || null
      const contactName = value.contacts?.[0]?.profile?.name || null

      for (const message of value.messages || []) {
        const normalized = {
          phoneNumberId,
          from: message.from,
          contactName,
          messageId: message.id,
          type: message.type,
          text: null,
          mediaId: null,
          mimeType: null,
          fileName: null,
          timestamp: message.timestamp,
        }

        if (message.type === 'text') {
          normalized.text = message.text?.body || ''
        } else if (message.type === 'image') {
          normalized.mediaId = message.image?.id || null
          normalized.mimeType = message.image?.mime_type || null
        } else if (message.type === 'document') {
          normalized.mediaId = message.document?.id || null
          normalized.mimeType = message.document?.mime_type || null
          normalized.fileName = message.document?.filename || null
        }

        messages.push(normalized)
      }
    }
  }

  return messages
}

async function downloadMedia(mediaId) {
  const graphVersion = process.env.GRAPH_API_VERSION || 'v21.0'
  const token = process.env.WHATSAPP_TOKEN
  if (!token) throw new Error('WHATSAPP_TOKEN manquant')

  const graph = `https://graph.facebook.com/${graphVersion}`
  const metaResponse = await fetch(`${graph}/${mediaId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!metaResponse.ok) throw new Error(`WhatsApp media meta ${metaResponse.status}`)
  const meta = await metaResponse.json()

  const binaryResponse = await fetch(meta.url, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!binaryResponse.ok) throw new Error(`WhatsApp media download ${binaryResponse.status}`)

  const buffer = Buffer.from(await binaryResponse.arrayBuffer())
  return {
    base64: buffer.toString('base64'),
    mimeType: meta.mime_type,
  }
}

async function sendText(phoneNumberId, to, body) {
  const graphVersion = process.env.GRAPH_API_VERSION || 'v21.0'
  const token = process.env.WHATSAPP_TOKEN
  if (!token) throw new Error('WHATSAPP_TOKEN manquant')

  const response = await fetch(`https://graph.facebook.com/${graphVersion}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body },
    }),
  })

  if (!response.ok) throw new Error(`WhatsApp send ${response.status}: ${await response.text()}`)
  return response.json()
}

async function classifyDocumentType({ base64, mediaType }) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { document_type: 'unknown', confidence: 0 }
  }

  const Anthropic = require('@anthropic-ai/sdk')
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const knownTypes = ['carte_grise', 'releve_information', 'permis', 'kbis', 'rib']
  const model = process.env.ARK_MODEL || 'claude-sonnet-4-6'
  const isPdf = mediaType === 'application/pdf'
  const contentBlock = isPdf
    ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } }
    : { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } }

  const message = await anthropic.messages.create({
    model,
    max_tokens: 200,
    tools: [{
      name: 'classify_document',
      description: "Identifie le type d'un document d'assurance recu.",
      input_schema: {
        type: 'object',
        properties: {
          document_type: { type: 'string', enum: [...knownTypes, 'unknown'] },
          confidence: { type: 'number' },
        },
        required: ['document_type', 'confidence'],
      },
    }],
    tool_choice: { type: 'tool', name: 'classify_document' },
    messages: [{
      role: 'user',
      content: [contentBlock, { type: 'text', text: `Quel type de document est-ce parmi : ${knownTypes.join(', ')} ?` }],
    }],
  })

  const toolUse = message.content.find((block) => block.type === 'tool_use')
  return toolUse?.input || { document_type: 'unknown', confidence: 0 }
}

module.exports = {
  verifyWebhook,
  parseInboundPayload,
  downloadMedia,
  sendText,
  classifyDocumentType,
}
