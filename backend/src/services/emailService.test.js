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
    process.env.EMAIL_FROM = 'COURTIA <noreply@courtia.fr>'
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
        from: 'COURTIA <noreply@courtia.fr>',
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
})
