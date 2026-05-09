const crypto = require('crypto')

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000

const WHATSAPP_TEMPLATES = [
  {
    key: 'relance_echeance',
    metaTemplateName: 'relance_echeance',
    label: 'Relance échéance',
    description: 'Prévenir un client avant renouvellement.',
    body: 'Bonjour {{1}}, votre contrat {{2}} arrive à échéance le {{3}}. Souhaitez-vous qu’on en discute ?',
    variableLabels: ['Prénom', 'Contrat', 'Date échéance'],
  },
  {
    key: 'prise_contact',
    metaTemplateName: 'prise_contact',
    label: 'Prise de contact',
    description: 'Premier message professionnel court.',
    body: 'Bonjour {{1}}, c’est {{2}} de {{3}}. Pouvons-nous échanger quelques minutes ?',
    variableLabels: ['Prénom', 'Courtier', 'Cabinet'],
  },
  {
    key: 'confirmation_rdv',
    metaTemplateName: 'confirmation_rdv',
    label: 'Confirmation rendez-vous',
    description: 'Confirmer un rendez-vous client.',
    body: 'Confirmé : RDV le {{1}} à {{2}}. {{3}}.',
    variableLabels: ['Date', 'Heure', 'Lieu ou lien'],
  },
  {
    key: 'demande_pieces',
    metaTemplateName: 'demande_pieces',
    label: 'Demande de pièces',
    description: 'Demander les pièces manquantes.',
    body: 'Bonjour {{1}}, pour finaliser votre dossier {{2}}, pouvez-vous nous envoyer les pièces manquantes ?',
    variableLabels: ['Prénom', 'Dossier'],
  },
  {
    key: 'relance_prospect',
    metaTemplateName: 'relance_prospect',
    label: 'Relance prospect',
    description: 'Relancer un prospect sans forcer.',
    body: 'Bonjour {{1}}, je reviens vers vous concernant votre projet d’assurance. Un créneau cette semaine ?',
    variableLabels: ['Prénom'],
  },
]

function sanitizeWhatsappPhone(phone, options = {}) {
  const raw = String(phone || '').trim()
  if (!raw) return ''

  let digits = raw.replace(/[^\d+]/g, '')
  digits = digits.replace(/^\+33\(0\)/, '+33')
  digits = digits.replace(/^\+330/, '+33')
  digits = digits.replace(/^0033/, '+33')
  digits = digits.replace(/^33\(0\)/, '33')
  digits = digits.replace(/^330/, '33')

  if (digits.startsWith('0') && digits.length === 10) {
    digits = `+33${digits.slice(1)}`
  } else if (digits.startsWith('33')) {
    digits = `+${digits}`
  } else if (!digits.startsWith('+') && digits.length >= 8) {
    digits = `+${digits}`
  }

  if (options.forMeta) {
    return digits.replace(/^\+/, '')
  }
  return digits
}

function verifyMetaSignature({ rawBody, signatureHeader, appSecret }) {
  if (!appSecret) return { configured: false, valid: false }
  const signature = String(signatureHeader || '')
  if (!signature.startsWith('sha256=')) return { configured: true, valid: false }

  const expected = `sha256=${crypto
    .createHmac('sha256', appSecret)
    .update(rawBody || Buffer.from(''))
    .digest('hex')}`

  const a = Buffer.from(signature)
  const b = Buffer.from(expected)
  const valid = a.length === b.length && crypto.timingSafeEqual(a, b)
  return { configured: true, valid }
}

function getWhatsappTemplates() {
  return WHATSAPP_TEMPLATES.map((template) => ({ ...template }))
}

function getWhatsappTemplate(key) {
  const normalized = String(key || '').trim()
  return WHATSAPP_TEMPLATES.find((template) => template.key === normalized || template.metaTemplateName === normalized) || null
}

function buildTemplateComponents(values = []) {
  const parameters = values
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .map((text) => ({ type: 'text', text }))

  return parameters.length > 0
    ? [{ type: 'body', parameters }]
    : undefined
}

function buildWhatsappPayload({ to, message, templateId, templateVariables = [], language = 'fr' }) {
  const recipient = sanitizeWhatsappPhone(to, { forMeta: true })
  if (!recipient) throw new Error('whatsapp_to_missing')

  if (templateId) {
    const template = getWhatsappTemplate(templateId)
    if (!template) throw new Error('whatsapp_template_unknown')
    const components = buildTemplateComponents(templateVariables)
    return {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: recipient,
      type: 'template',
      template: {
        name: template.metaTemplateName,
        language: { code: language || 'fr' },
        ...(components ? { components } : {}),
      },
    }
  }

  const text = String(message || '').trim()
  if (!text) throw new Error('whatsapp_message_missing')
  return {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: recipient,
    type: 'text',
    text: { body: text },
  }
}

function isWhatsappWindowOpen(lastMessageAt, now = new Date()) {
  if (!lastMessageAt) return false
  const ts = new Date(lastMessageAt).getTime()
  if (!Number.isFinite(ts)) return false
  return now.getTime() - ts <= TWENTY_FOUR_HOURS_MS
}

function extractMessageText(message = {}) {
  return (
    message?.text?.body ||
    message?.button?.text ||
    message?.interactive?.button_reply?.title ||
    message?.interactive?.list_reply?.title ||
    message?.image?.caption ||
    message?.document?.caption ||
    `[message ${message.type || 'whatsapp'}]`
  )
}

function parseWhatsappWebhookMessages(payload = {}) {
  const rows = []
  const entries = Array.isArray(payload.entry) ? payload.entry : []

  for (const entry of entries) {
    const changes = Array.isArray(entry.changes) ? entry.changes : []
    for (const change of changes) {
      const value = change.value || {}
      const metadata = value.metadata || {}
      const phoneNumberId = metadata.phone_number_id || null
      const contactName = value.contacts?.[0]?.profile?.name || null
      const messages = Array.isArray(value.messages) ? value.messages : []

      for (const message of messages) {
        const phone = sanitizeWhatsappPhone(message.from)
        if (!phone) continue
        rows.push({
          phone,
          phoneNumberId,
          messageId: message.id || null,
          text: extractMessageText(message),
          type: message.type || 'text',
          occurredAt: message.timestamp ? new Date(Number(message.timestamp) * 1000) : new Date(),
          contactName,
          raw: message,
        })
      }
    }
  }

  return rows
}

module.exports = {
  WHATSAPP_TEMPLATES,
  buildWhatsappPayload,
  getWhatsappTemplate,
  getWhatsappTemplates,
  isWhatsappWindowOpen,
  parseWhatsappWebhookMessages,
  sanitizeWhatsappPhone,
  verifyMetaSignature,
}
