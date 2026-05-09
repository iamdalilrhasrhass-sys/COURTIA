const {
  GOOGLE_CALENDAR_SCOPES,
  GMAIL_SCOPES,
  GOOGLE_COMBINED_SCOPES,
  getGoogleConfig,
  isGoogleConfigured,
  encodeGmailRawMessage,
} = require('./googleIntegrationService')

describe('googleIntegrationService', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('uses provider specific redirect URIs when present', () => {
    process.env.GOOGLE_CLIENT_ID = 'client-id'
    process.env.GOOGLE_CLIENT_SECRET = 'client-secret'
    process.env.GOOGLE_REDIRECT_URI = 'https://app.example/api/integrations/google/oauth/callback'
    process.env.GOOGLE_CALENDAR_REDIRECT_URI = 'https://app.example/api/integrations/google-calendar/callback'
    process.env.GOOGLE_GMAIL_REDIRECT_URI = 'https://app.example/api/integrations/gmail/callback'

    expect(getGoogleConfig('google_calendar').redirectUri).toContain('/google-calendar/callback')
    expect(getGoogleConfig('gmail').redirectUri).toContain('/gmail/callback')
    expect(getGoogleConfig('google').redirectUri).toContain('/google/oauth/callback')
    expect(isGoogleConfigured('gmail')).toBe(true)
  })

  it('exposes real Calendar and Gmail scopes for V1', () => {
    expect(GOOGLE_CALENDAR_SCOPES).toContain('https://www.googleapis.com/auth/calendar')
    expect(GMAIL_SCOPES).toEqual(expect.arrayContaining([
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/gmail.send',
    ]))
    expect(GOOGLE_COMBINED_SCOPES).toEqual(expect.arrayContaining(GOOGLE_CALENDAR_SCOPES))
    expect(GOOGLE_COMBINED_SCOPES).toEqual(expect.arrayContaining(GMAIL_SCOPES))
  })

  it('encodes an RFC 822 Gmail message as base64url', () => {
    const raw = encodeGmailRawMessage({
      to: 'client@example.com',
      from: 'broker@courtia.fr',
      subject: 'Relance échéance',
      body: 'Bonjour, votre échéance approche.',
    })

    expect(raw).not.toContain('+')
    expect(raw).not.toContain('/')
    expect(raw).not.toContain('=')
    const decoded = Buffer.from(raw.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
    expect(decoded).toContain('To: client@example.com')
    expect(decoded).toContain('Subject: =?UTF-8?B?UmVsYW5jZSDDqWNow6lhbmNl?=')
    expect(decoded).toContain('Bonjour, votre échéance approche.')
  })
})
