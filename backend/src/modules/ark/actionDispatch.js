function dbPool() {
  return require('../../db')
}

function dispatchError(status, message) {
  const error = new Error(message)
  error.status = status
  return error
}

function channelFor(actionType) {
  if (actionType === 'send_whatsapp_message') return 'whatsapp'
  if (actionType === 'send_email') return 'email'
  if (['create_task', 'create_renewal_opportunity', 'request_missing_documents', 'update_client_status'].includes(actionType)) {
    return 'internal'
  }
  return 'none'
}

function requireDispatchMessage(action) {
  const payload = action.payload || {}
  const body = payload.body || payload.suggested_reply || payload.message
  if (!String(body || '').trim()) {
    throw dispatchError(422, "Message vide : renseigne le contenu avant de l'envoyer.")
  }
  return String(body)
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function normalizeEmailHtml(body) {
  return `<p>${escapeHtml(body).replace(/\r?\n/g, '<br>')}</p>`
}

async function clientContact(clientId) {
  if (!clientId) return {}
  const { rows } = await dbPool().query(
    `SELECT email, phone, mobile
       FROM clients
      WHERE id::text = $1
      LIMIT 1`,
    [String(clientId)],
  )
  const row = rows[0] || {}
  return {
    email: row.email || null,
    phone: row.phone || row.mobile || null,
  }
}

async function tenantPhoneNumberId(tenantId) {
  const { rows } = await dbPool().query(
    'SELECT phone_number_id FROM whatsapp_accounts WHERE tenant_id = $1 LIMIT 1',
    [String(tenantId)],
  )
  return rows[0]?.phone_number_id || process.env.WHATSAPP_PHONE_NUMBER_ID || null
}

async function sendEmailBrevo({ to, subject, html }) {
  if (!process.env.BREVO_API_KEY) throw dispatchError(412, 'BREVO_API_KEY non configuree.')
  if (!process.env.BREVO_SENDER_EMAIL) throw dispatchError(412, 'BREVO_SENDER_EMAIL non configuree.')

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': process.env.BREVO_API_KEY,
      accept: 'application/json',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender: {
        email: process.env.BREVO_SENDER_EMAIL,
        name: process.env.BREVO_SENDER_NAME || 'Courtia',
      },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  })

  if (!response.ok) {
    throw dispatchError(502, `Brevo ${response.status} : ${await response.text()}`)
  }

  return {
    channel: 'email',
    sent: true,
    provider_response: await response.json(),
  }
}

function buildDispatch(tenantId) {
  return async (action) => {
    const channel = channelFor(action.action_type)

    if (channel === 'whatsapp') {
      const body = requireDispatchMessage(action)
      const contact = await clientContact(action.client_id)
      const to = action.payload?.to || contact.phone
      if (!to) throw dispatchError(422, 'Aucun numero destinataire pour ce client.')
      const phoneNumberId = action.payload?.phoneNumberId || await tenantPhoneNumberId(tenantId)
      if (!phoneNumberId) throw dispatchError(412, 'Aucun numero WhatsApp Business configure.')

      const { sendText } = require('./whatsapp/whatsappService')
      const providerResponse = await sendText(phoneNumberId, to, body)
      return { channel, sent: true, provider_response: providerResponse }
    }

    if (channel === 'email') {
      const body = requireDispatchMessage(action)
      const contact = await clientContact(action.client_id)
      const to = action.payload?.to_email || action.payload?.to || contact.email
      if (!to) throw dispatchError(422, 'Aucun email destinataire pour ce client.')
      return sendEmailBrevo({
        to,
        subject: action.payload?.subject || 'Votre dossier Courtia',
        html: normalizeEmailHtml(body),
      })
    }

    if (channel === 'internal') return { channel, noted: true }
    return { channel, noop: true }
  }
}

module.exports = {
  buildDispatch,
  channelFor,
  normalizeEmailHtml,
  requireDispatchMessage,
}
