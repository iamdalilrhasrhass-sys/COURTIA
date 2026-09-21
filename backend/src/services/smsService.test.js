jest.mock('axios', () => ({
  post: jest.fn(),
}))

describe('smsService provider guard', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
    jest.clearAllMocks()
  })

  it('does not send and reports configuration_required when SMS credentials are absent', async () => {
    delete process.env.SMS_PROVIDER
    delete process.env.TWILIO_ACCOUNT_SID
    delete process.env.TWILIO_AUTH_TOKEN
    delete process.env.TWILIO_FROM
    delete process.env.SMS_GATEWAY_URL
    delete process.env.SMS_GATEWAY_TOKEN

    const smsService = require('./smsService')
    const result = await smsService.sendSMS({
      to: '06 12 34 56 78',
      message: 'Bonjour',
      // Pays du CLIENT : sans lui, une forme nationale est AMBIGUË (même
      // longueur en France et en Suisse) — voir les tests CH-008 plus bas.
      pays: 'FR',
    })

    expect(result).toMatchObject({
      success: false,
      skipped: true,
      error: 'configuration_required',
      provider: 'none',
    })
    expect(smsService.getSmsStatus()).toMatchObject({
      configured: false,
      status: 'configuration_required',
    })
  })

  it('sends through a generic SMS gateway only when configured', async () => {
    process.env.SMS_PROVIDER = 'generic'
    process.env.SMS_GATEWAY_URL = 'https://sms.example/send'
    process.env.SMS_GATEWAY_TOKEN = 'sms_token'
    const axios = require('axios')
    axios.post.mockResolvedValue({ data: { id: 'sms_123' } })

    const smsService = require('./smsService')
    const result = await smsService.sendSMS({ to: '06 12 34 56 78', message: 'Bonjour', pays: 'FR' })

    expect(axios.post).toHaveBeenCalledWith(
      'https://sms.example/send',
      { to: '+33612345678', message: 'Bonjour' },
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer sms_token' }),
      })
    )
    expect(result).toMatchObject({
      success: true,
      provider: 'generic',
      id: 'sms_123',
    })
  })
})

/**
 * CH-008 — UN MOBILE SUISSE NE PART PAS VERS UN NUMÉRO FRANÇAIS.
 *
 * Défaut mesuré sur le code d'avant ce correctif :
 *     sanitizePhone('078 123 45 67')  →  '+33781234567'
 * Un mobile suisse de 10 chiffres était lu comme un numéro français : les SMS
 * de relance partaient vers un numéro inexistant. La règle d'origine
 * (« suisse = 9 caractères ») décrivait un plan de numérotation qui n'existe
 * pas : un numéro suisse s'écrit sur 10 caractères, comme un numéro français.
 */
describe('smsService — indicatif du CLIENT (CH-008)', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv }
    process.env.SMS_PROVIDER = 'generic'
    process.env.SMS_GATEWAY_URL = 'https://sms.example/send'
    process.env.SMS_GATEWAY_TOKEN = 'sms_token'
  })

  afterEach(() => {
    process.env = originalEnv
    jest.clearAllMocks()
  })

  it('un mobile suisse (pays CH) part en +41, jamais en +33', async () => {
    const axios = require('axios')
    axios.post.mockResolvedValue({ data: { id: 'sms_ch' } })

    const smsService = require('./smsService')
    const result = await smsService.sendSMS({ to: '078 123 45 67', message: 'Rappel', pays: 'CH' })

    expect(result.success).toBe(true)
    expect(axios.post).toHaveBeenCalledWith(
      'https://sms.example/send',
      { to: '+41781234567', message: 'Rappel' },
      expect.anything()
    )
    expect(axios.post.mock.calls[0][1].to).not.toContain('+33')
  })

  it('refuse un numéro national sans pays connu au lieu de le convertir en +33', async () => {
    const axios = require('axios')
    const smsService = require('./smsService')
    const result = await smsService.sendSMS({ to: '078 123 45 67', message: 'Rappel' })

    expect(result).toMatchObject({ success: false, error: 'invalid_phone' })
    expect(axios.post).not.toHaveBeenCalled()
    // C'est EXACTEMENT le défaut CH-008 : ce numéro finissait en +33781234567.
    expect(smsService.sanitizePhone('078 123 45 67')).toBeNull()
    expect(smsService.sanitizePhone('078 123 45 67', { pays: 'CH' })).toBe('+41781234567')
  })

  it('un numéro français reste français, un numéro suisse international est conservé', async () => {
    const axios = require('axios')
    axios.post.mockResolvedValue({ data: { id: 'sms_ok' } })

    const smsService = require('./smsService')
    await smsService.sendSMS({ to: '06 12 34 56 78', message: 'Bonjour', pays: 'FR' })
    expect(axios.post.mock.calls[0][1].to).toBe('+33612345678')

    await smsService.sendSMS({ to: '+41 78 123 45 67', message: 'Bonjour', pays: 'FR' })
    expect(axios.post.mock.calls[1][1].to).toBe('+41781234567')
  })
})
