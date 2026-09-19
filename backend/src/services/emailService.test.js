jest.mock('axios', () => ({
  post: jest.fn(),
}))

describe('emailService transactional provider', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
    jest.clearAllMocks()
  })

  it('returns configuration_required instead of a fake success when no provider is configured', async () => {
    delete process.env.RESEND_API_KEY
    delete process.env.SMTP_HOST
    delete process.env.EMAIL_USER

    const emailService = require('./emailService')
    const result = await emailService.sendEmail({
      to: 'client@example.com',
      subject: 'Invitation',
      text: 'Bonjour',
    })

    expect(result).toMatchObject({
      success: false,
      skipped: true,
      error: 'configuration_required',
      provider: 'none',
      missing: ['RESEND_API_KEY'],
    })
    expect(emailService.getEmailStatus()).toMatchObject({
      configured: false,
      provider: 'none',
      status: 'configuration_required',
    })
  })

  it('sends through Resend when RESEND_API_KEY is configured', async () => {
    process.env.RESEND_API_KEY = 're_test'
    process.env.EMAIL_FROM = 'COURTIA <noreply@courtiark.fr>'
    const axios = require('axios')
    axios.post.mockResolvedValue({ data: { id: 'email_123' } })

    const emailService = require('./emailService')
    const result = await emailService.sendEmail({
      to: 'client@example.com',
      subject: 'Invitation',
      text: 'Bonjour',
      html: '<p>Bonjour</p>',
    })

    expect(axios.post).toHaveBeenCalledWith(
      'https://api.resend.com/emails',
      expect.objectContaining({
        from: 'COURTIA <noreply@courtiark.fr>',
        to: ['client@example.com'],
        subject: 'Invitation',
      }),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer re_test' }),
      })
    )
    expect(result).toMatchObject({
      success: true,
      provider: 'resend',
      id: 'email_123',
    })
  })

  it('expose reply_to dans getEmailStatus et le transmet a Resend (reply_to)', async () => {
    process.env.RESEND_API_KEY = 're_test'
    process.env.EMAIL_REPLY_TO = 'bonjour@courtiark.fr'
    const axios = require('axios')
    axios.post.mockResolvedValue({ data: { id: 'email_456' } })

    const emailService = require('./emailService')
    expect(emailService.getEmailStatus()).toMatchObject({
      configured: true,
      provider: 'resend',
      reply_to: 'bonjour@courtiark.fr',
      reply_to_configured: true,
    })
    expect(emailService.isCommercialEmailReady()).toBe(true)

    await emailService.sendEmail({ to: 'client@example.com', subject: 'Demande de demo', text: 'Bonjour' })

    // Sans `reply_to`, le destinataire ne peut pas repondre : la cle doit etre la.
    expect(axios.post).toHaveBeenCalledWith(
      'https://api.resend.com/emails',
      expect.objectContaining({ reply_to: 'bonjour@courtiark.fr' }),
      expect.anything()
    )
  })

  it('refuse un envoi COMMERCIAL quand EMAIL_REPLY_TO est absent (echec visible, pas silencieux)', async () => {
    process.env.RESEND_API_KEY = 're_test'
    delete process.env.EMAIL_REPLY_TO
    const axios = require('axios')
    axios.post.mockResolvedValue({ data: { id: 'jamais' } })

    const emailService = require('./emailService')
    expect(emailService.getEmailStatus()).toMatchObject({ reply_to: null, reply_to_configured: false })
    expect(emailService.isCommercialEmailReady()).toBe(false)

    const result = await emailService.sendCommercialEmail({
      to: 'prospect@cabinet.fr',
      subject: 'Votre demo COURTIA',
      text: 'Bonjour',
    })

    expect(result).toMatchObject({
      success: false,
      skipped: true,
      error: 'reply_to_required',
      missing: ['EMAIL_REPLY_TO'],
    })
    expect(axios.post).not.toHaveBeenCalled()
  })

  it('envoie le commercial quand les deux sont configures, avec la bonne adresse de reponse', async () => {
    process.env.RESEND_API_KEY = 're_test'
    process.env.EMAIL_REPLY_TO = 'bonjour@courtiark.fr'
    const axios = require('axios')
    axios.post.mockResolvedValue({ data: { id: 'email_789' } })

    const emailService = require('./emailService')
    const result = await emailService.sendCommercialEmail({
      to: 'prospect@cabinet.fr',
      subject: 'Votre demo COURTIA',
      text: 'Bonjour',
    })

    expect(result).toMatchObject({ success: true, provider: 'resend' })
    expect(axios.post).toHaveBeenCalledWith(
      'https://api.resend.com/emails',
      expect.objectContaining({ reply_to: 'bonjour@courtiark.fr' }),
      expect.anything()
    )
  })
})
