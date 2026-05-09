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
    const result = await smsService.sendSMS({ to: '06 12 34 56 78', message: 'Bonjour' })

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
    const result = await smsService.sendSMS({ to: '06 12 34 56 78', message: 'Bonjour' })

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
