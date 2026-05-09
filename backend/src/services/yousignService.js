const crypto = require('crypto')
const axios = require('axios')

const DEFAULT_BASE_URL = 'https://api.yousign.app/v3'

function getBaseUrl() {
  return String(process.env.YOUSIGN_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, '')
}

function getConfigStatus() {
  const missing = []
  if (!process.env.YOUSIGN_API_KEY) missing.push('YOUSIGN_API_KEY')
  if (!process.env.YOUSIGN_WEBHOOK_SECRET) missing.push('YOUSIGN_WEBHOOK_SECRET')
  return {
    configured: missing.length === 0,
    missing,
    baseUrl: getBaseUrl(),
  }
}

function isConfigured() {
  return getConfigStatus().configured
}

function normalizeSignature(value = '') {
  return String(value || '').trim().replace(/^sha256=/i, '')
}

function computeWebhookSignature(rawBody, secret = process.env.YOUSIGN_WEBHOOK_SECRET) {
  const payload = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(String(rawBody || ''), 'utf8')
  return crypto.createHmac('sha256', String(secret || '')).update(payload).digest('hex')
}

function verifyWebhookSignature(rawBody, headerValue, secret = process.env.YOUSIGN_WEBHOOK_SECRET) {
  if (!secret || !headerValue) return false
  const expected = Buffer.from(computeWebhookSignature(rawBody, secret), 'hex')
  const provided = Buffer.from(normalizeSignature(headerValue), 'hex')
  return provided.length === expected.length && crypto.timingSafeEqual(provided, expected)
}

function mapWebhookStatus(eventType = '') {
  const type = String(eventType || '').toLowerCase()
  if (type.includes('signed') || type.includes('done') || type.includes('completed')) return 'signed'
  if (type.includes('refused') || type.includes('declined')) return 'refused'
  if (type.includes('expired')) return 'expired'
  if (type.includes('activated') || type.includes('sent')) return 'sent_to_sign'
  return null
}

function extractSignatureRequestId(event = {}) {
  return (
    event.signature_request_id ||
    event.signatureRequestId ||
    event.data?.signature_request?.id ||
    event.data?.signature_request_id ||
    event.data?.id ||
    event.object?.signature_request?.id ||
    null
  )
}

function extractEventId(event = {}) {
  return event.id || event.event_id || event.data?.event_id || event.data?.id || crypto.randomUUID()
}

function getYousignClient() {
  return axios.create({
    baseURL: getBaseUrl(),
    timeout: 15000,
    headers: {
      Authorization: `Bearer ${process.env.YOUSIGN_API_KEY}`,
    },
  })
}

async function createSignatureRequest({ document, signer }) {
  const config = getConfigStatus()
  if (!config.configured) {
    return {
      configured: false,
      missing: config.missing,
      status: 'configuration_required',
    }
  }

  const client = getYousignClient()
  const title = document?.title || document?.fileName || `COURTIA document ${document?.id || ''}`
  const request = await client.post('/signature_requests', {
    name: title,
    delivery_mode: 'email',
    timezone: 'Europe/Paris',
  })
  const requestId = request.data?.id
  if (!requestId) throw new Error('yousign_missing_signature_request_id')

  if (!document?.content) throw new Error('yousign_missing_document_content')
  if (typeof FormData === 'undefined' || typeof Blob === 'undefined') {
    throw new Error('yousign_formdata_unavailable')
  }
  const form = new FormData()
  const blob = new Blob([document.content], { type: document.mimeType || 'application/pdf' })
  form.append('file', blob, document.fileName || `${title}.pdf`)
  form.append('nature', 'signable_document')
  await client.post(`/signature_requests/${requestId}/documents`, form)

  await client.post(`/signature_requests/${requestId}/signers`, {
    info: {
      first_name: signer?.firstName || signer?.first_name || 'Client',
      last_name: signer?.lastName || signer?.last_name || 'COURTIA',
      email: signer?.email,
      phone_number: signer?.phone || signer?.phone_number || undefined,
    },
    signature_level: 'electronic_signature',
    signature_authentication_mode: 'no_otp',
    fields: [],
  })

  await client.post(`/signature_requests/${requestId}/activate`)

  return {
    configured: true,
    providerRequestId: requestId,
    status: 'sent_to_sign',
    raw: request.data,
  }
}

module.exports = {
  DEFAULT_BASE_URL,
  getConfigStatus,
  isConfigured,
  computeWebhookSignature,
  verifyWebhookSignature,
  mapWebhookStatus,
  extractSignatureRequestId,
  extractEventId,
  createSignatureRequest,
}
