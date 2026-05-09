const {
  buildWhatsappPayload,
  getWhatsappTemplate,
  isWhatsappWindowOpen,
  parseWhatsappWebhookMessages,
  sanitizeWhatsappPhone,
  verifyMetaSignature,
} = require('./whatsappBusinessService')

describe('whatsappBusinessService', () => {
  test('normalizes phone numbers for storage and Meta recipients', () => {
    expect(sanitizeWhatsappPhone('06 12 34 56 78')).toBe('+33612345678')
    expect(sanitizeWhatsappPhone('+33 (0)6 12 34 56 78')).toBe('+33612345678')
    expect(sanitizeWhatsappPhone('33612345678', { forMeta: true })).toBe('33612345678')
  })

  test('validates Meta webhook signatures with app secret', () => {
    const crypto = require('crypto')
    const rawBody = Buffer.from(JSON.stringify({ ok: true }))
    const secret = 'meta-app-secret'
    const signature = `sha256=${crypto.createHmac('sha256', secret).update(rawBody).digest('hex')}`

    expect(verifyMetaSignature({ rawBody, signatureHeader: signature, appSecret: secret })).toEqual({
      configured: true,
      valid: true,
    })
    expect(verifyMetaSignature({ rawBody, signatureHeader: 'sha256=bad', appSecret: secret }).valid).toBe(false)
    expect(verifyMetaSignature({ rawBody, signatureHeader: signature, appSecret: '' }).configured).toBe(false)
  })

  test('builds compliant text and template payloads', () => {
    expect(buildWhatsappPayload({ to: '+33612345678', message: 'Bonjour' })).toMatchObject({
      messaging_product: 'whatsapp',
      to: '33612345678',
      type: 'text',
      text: { body: 'Bonjour' },
    })

    expect(buildWhatsappPayload({
      to: '+33612345678',
      templateId: 'relance_echeance',
      templateVariables: ['Sophie', 'Auto', '15/06/2026'],
    })).toMatchObject({
      messaging_product: 'whatsapp',
      to: '33612345678',
      type: 'template',
      template: {
        name: 'relance_echeance',
        language: { code: 'fr' },
      },
    })
  })

  test('detects the 24h customer care window', () => {
    const now = new Date('2026-05-09T12:00:00Z')
    expect(isWhatsappWindowOpen('2026-05-09T10:00:00Z', now)).toBe(true)
    expect(isWhatsappWindowOpen('2026-05-07T10:00:00Z', now)).toBe(false)
    expect(isWhatsappWindowOpen(null, now)).toBe(false)
  })

  test('extracts inbound messages from Meta webhook payload', () => {
    const rows = parseWhatsappWebhookMessages({
      entry: [{
        changes: [{
          value: {
            metadata: { phone_number_id: '123' },
            contacts: [{ profile: { name: 'Sophie Martin' } }],
            messages: [{
              id: 'wamid.1',
              from: '33612345678',
              timestamp: '1778328000',
              text: { body: 'Bonjour, voici la carte grise.' },
            }],
          },
        }],
      }],
    })

    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      phone: '+33612345678',
      phoneNumberId: '123',
      messageId: 'wamid.1',
      text: 'Bonjour, voici la carte grise.',
      contactName: 'Sophie Martin',
    })
  })

  test('exposes approved internal templates metadata', () => {
    expect(getWhatsappTemplate('confirmation_rdv')).toMatchObject({
      key: 'confirmation_rdv',
      metaTemplateName: 'confirmation_rdv',
    })
    expect(getWhatsappTemplate('unknown')).toBe(null)
  })
})
