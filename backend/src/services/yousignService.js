/**
 * Service Yousign — Signature électronique
 * LOT 20 — Intégration complète avec API v3
 */

const crypto = require('crypto')
const axios = require('axios')
const FormData = require('form-data')
const fs = require('fs')
const path = require('path')

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

/**
 * Crée une demande de signature avec un fichier PDF
 * @param {string} documentPath - Chemin vers le document PDF
 * @param {string} signerEmail - Email du signataire
 * @param {string} signerName - Nom complet du signataire
 * @param {object} options - Options additionnelles
 */
async function createSignatureRequest(documentPathOrObj, signerEmailOrObj, signerName, options = {}) {
  const config = getConfigStatus()

  // Mode mock si non configuré
  if (!config.configured) {
    console.log('[Yousign] Mode mock — API non configurée')
    const mockId = `mock_${crypto.randomUUID()}`
    return {
      configured: false,
      mock: true,
      providerRequestId: mockId,
      signatureUrl: `https://app.yousign.com/procedure/sign?mock=true&id=${mockId}`,
      status: 'sent_to_sign',
      missing: config.missing,
    }
  }

  const client = getYousignClient()

  // Support ancien format { document, signer }
  let documentPath, signerEmail, firstName, lastName, phone
  if (typeof documentPathOrObj === 'object' && documentPathOrObj.document) {
    const doc = documentPathOrObj.document
    const signer = documentPathOrObj.signer || signerEmailOrObj
    documentPath = doc.path || doc.content
    signerEmail = signer?.email
    firstName = signer?.firstName || signer?.first_name || 'Client'
    lastName = signer?.lastName || signer?.last_name || 'COURTIA'
    phone = signer?.phone
  } else {
    documentPath = documentPathOrObj
    signerEmail = signerEmailOrObj
    const nameParts = (signerName || 'Client COURTIA').split(' ')
    firstName = nameParts[0] || 'Client'
    lastName = nameParts.slice(1).join(' ') || 'COURTIA'
    phone = options.phone
  }

  const title = options.title || `Document COURTIA - ${new Date().toLocaleDateString('fr-FR')}`
  const webhookUrl = options.webhookUrl || process.env.YOUSIGN_WEBHOOK_URL || `${process.env.API_URL || 'https://api.courtiark.fr'}/api/signatures/webhook`

  // 1. Créer la demande de signature
  const requestRes = await client.post('/signature_requests', {
    name: title,
    delivery_mode: 'email',
    timezone: 'Europe/Paris',
    ordered_signers: false,
    reminder_settings: {
      interval_in_days: 3,
      max_occurrences: 3,
    },
    external_id: options.externalId || null,
  })

  const requestId = requestRes.data?.id
  if (!requestId) throw new Error('yousign_missing_signature_request_id')

  // 2. Uploader le document
  let documentBuffer
  if (Buffer.isBuffer(documentPath)) {
    documentBuffer = documentPath
  } else if (typeof documentPath === 'string' && fs.existsSync(documentPath)) {
    documentBuffer = fs.readFileSync(documentPath)
  } else if (typeof documentPath === 'string') {
    // Assume base64
    documentBuffer = Buffer.from(documentPath, 'base64')
  } else {
    throw new Error('yousign_invalid_document')
  }

  const form = new FormData()
  form.append('file', documentBuffer, {
    filename: options.fileName || 'document.pdf',
    contentType: 'application/pdf',
  })
  form.append('nature', 'signable_document')

  const docRes = await client.post(`/signature_requests/${requestId}/documents`, form, {
    headers: form.getHeaders(),
  })

  const documentId = docRes.data?.id
  if (!documentId) throw new Error('yousign_missing_document_id')

  // 3. Ajouter le signataire avec zone de signature
  const signerRes = await client.post(`/signature_requests/${requestId}/signers`, {
    info: {
      first_name: firstName,
      last_name: lastName,
      email: signerEmail,
      phone_number: phone || undefined,
    },
    signature_level: 'electronic_signature',
    signature_authentication_mode: 'no_otp',
    fields: [
      {
        document_id: documentId,
        type: 'signature',
        page: 1,
        x: 50,
        y: 700,
        width: 180,
        height: 60,
      },
    ],
  })

  const signerId = signerRes.data?.id

  // 4. Configurer le webhook
  if (webhookUrl) {
    try {
      await client.patch(`/signature_requests/${requestId}`, {
        webhook: {
          url: webhookUrl,
          events: [
            'signature_request.activated',
            'signature_request.done',
            'signer.signed',
            'signer.refused',
            'signature_request.expired',
          ],
        },
      })
    } catch (err) {
      console.warn('[Yousign] Webhook configuration failed:', err.message)
    }
  }

  // 5. Activer la demande (envoie l'email au signataire)
  await client.post(`/signature_requests/${requestId}/activate`)

  // 6. Récupérer l'URL de signature
  let signatureUrl = null
  if (signerId) {
    try {
      const signerDetail = await client.get(`/signature_requests/${requestId}/signers/${signerId}`)
      signatureUrl = signerDetail.data?.signature_link || null
    } catch (err) {
      console.warn('[Yousign] Could not fetch signer URL:', err.message)
    }
  }

  return {
    configured: true,
    mock: false,
    providerRequestId: requestId,
    documentId,
    signerId,
    signatureUrl,
    status: 'sent_to_sign',
    raw: requestRes.data,
  }
}

/**
 * Récupère le statut d'une demande de signature
 * @param {string} requestId - ID Yousign de la demande
 */
async function getSignatureStatus(requestId) {
  const config = getConfigStatus()

  if (!config.configured || requestId?.startsWith('mock_')) {
    return {
      configured: false,
      mock: true,
      requestId,
      status: 'pending',
      signers: [{ status: 'pending', email: 'mock@example.com' }],
    }
  }

  const client = getYousignClient()

  try {
    const res = await client.get(`/signature_requests/${requestId}`)
    const data = res.data

    // Mapper le statut Yousign vers notre format
    let status = 'pending'
    if (data.status === 'done') status = 'signed'
    else if (data.status === 'expired') status = 'expired'
    else if (data.status === 'refused' || data.status === 'declined') status = 'refused'
    else if (data.status === 'ongoing' || data.status === 'activated') status = 'sent_to_sign'
    else if (data.status === 'draft') status = 'draft'

    // Récupérer les signataires
    const signersRes = await client.get(`/signature_requests/${requestId}/signers`)
    const signers = (signersRes.data?.data || signersRes.data || []).map(s => ({
      id: s.id,
      email: s.info?.email,
      name: `${s.info?.first_name || ''} ${s.info?.last_name || ''}`.trim(),
      status: s.status,
      signedAt: s.signed_at || null,
    }))

    return {
      configured: true,
      mock: false,
      requestId,
      status,
      yousignStatus: data.status,
      signers,
      createdAt: data.created_at,
      expiresAt: data.expiration_date,
      raw: data,
    }
  } catch (err) {
    console.error('[Yousign] getSignatureStatus error:', err.message)
    throw new Error(`yousign_status_error: ${err.message}`)
  }
}

/**
 * Télécharge le document signé
 * @param {string} requestId - ID Yousign de la demande
 */
async function downloadSignedDocument(requestId) {
  const config = getConfigStatus()

  if (!config.configured || requestId?.startsWith('mock_')) {
    // Retourner un PDF mock basique
    const mockPdf = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R>>endobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n193\n%%EOF', 'utf8')
    return {
      configured: false,
      mock: true,
      buffer: mockPdf,
      contentType: 'application/pdf',
      fileName: `document_signe_mock_${requestId}.pdf`,
    }
  }

  const client = getYousignClient()

  try {
    // D'abord, vérifier le statut
    const statusRes = await client.get(`/signature_requests/${requestId}`)
    if (statusRes.data?.status !== 'done') {
      throw new Error(`Document non signé (statut: ${statusRes.data?.status})`)
    }

    // Récupérer la liste des documents
    const docsRes = await client.get(`/signature_requests/${requestId}/documents`)
    const documents = docsRes.data?.data || docsRes.data || []

    if (documents.length === 0) {
      throw new Error('Aucun document trouvé pour cette demande')
    }

    // Télécharger le premier document signé
    const docId = documents[0].id
    const downloadRes = await client.get(`/signature_requests/${requestId}/documents/${docId}/download`, {
      responseType: 'arraybuffer',
    })

    return {
      configured: true,
      mock: false,
      buffer: Buffer.from(downloadRes.data),
      contentType: 'application/pdf',
      fileName: `document_signe_${requestId}.pdf`,
    }
  } catch (err) {
    console.error('[Yousign] downloadSignedDocument error:', err.message)
    throw new Error(`yousign_download_error: ${err.message}`)
  }
}

/**
 * Annule une demande de signature
 * @param {string} requestId - ID Yousign de la demande
 * @param {string} reason - Raison de l'annulation
 */
async function cancelSignatureRequest(requestId, reason = 'Annulé par le courtier') {
  const config = getConfigStatus()

  if (!config.configured || requestId?.startsWith('mock_')) {
    return { success: true, mock: true, requestId }
  }

  const client = getYousignClient()

  try {
    await client.post(`/signature_requests/${requestId}/cancel`, {
      reason,
    })
    return { success: true, mock: false, requestId }
  } catch (err) {
    console.error('[Yousign] cancelSignatureRequest error:', err.message)
    throw new Error(`yousign_cancel_error: ${err.message}`)
  }
}

/**
 * Relance un signataire par email
 * @param {string} requestId - ID Yousign de la demande
 * @param {string} signerId - ID du signataire
 */
async function sendReminder(requestId, signerId) {
  const config = getConfigStatus()

  if (!config.configured || requestId?.startsWith('mock_')) {
    return { success: true, mock: true, requestId, signerId }
  }

  const client = getYousignClient()

  try {
    await client.post(`/signature_requests/${requestId}/signers/${signerId}/send_reminder`)
    return { success: true, mock: false, requestId, signerId }
  } catch (err) {
    console.error('[Yousign] sendReminder error:', err.message)
    throw new Error(`yousign_reminder_error: ${err.message}`)
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
  getSignatureStatus,
  downloadSignedDocument,
  cancelSignatureRequest,
  sendReminder,
}
