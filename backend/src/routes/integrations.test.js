const integrationsModule = require('./integrations')

const { __internals } = integrationsModule

describe('integrations route internals', () => {
  const envBackup = { ...process.env }

  afterEach(() => {
    process.env = { ...envBackup }
  })

  it('extracts and normalizes emails from headers', () => {
    expect(__internals.parseEmailAddress('Jane Doe <JANE@Cabinet.fr>')).toBe('jane@cabinet.fr')
    expect(__internals.extractFirstEmailFromHeader('a@courtia.fr, b@courtia.fr')).toBe('a@courtia.fr')
  })

  it('builds gmail raw payload containing subject and body', () => {
    const raw = __internals.buildGmailRawMessage({
      from: 'courtier@cabinet.fr',
      to: 'client@test.fr',
      subject: 'Sujet test',
      textBody: 'Bonjour client',
    })

    const decoded = Buffer.from(raw, 'base64url').toString('utf8')
    expect(decoded).toContain('To: client@test.fr')
    expect(decoded).toContain('Subject: Sujet test')
    expect(decoded).toContain('Bonjour client')
  })

  it('reflects provider readiness based on env vars', () => {
    delete process.env.GOOGLE_CLIENT_ID
    delete process.env.GOOGLE_CLIENT_SECRET
    delete process.env.GOOGLE_REDIRECT_URI

    const notReady = __internals.buildProviderReadiness('gmail')
    expect(notReady.configured).toBe(false)

    process.env.GOOGLE_CLIENT_ID = 'x'
    process.env.GOOGLE_CLIENT_SECRET = 'y'
    process.env.GOOGLE_REDIRECT_URI = 'https://example.com/callback'
    process.env.ENCRYPTION_KEY = 'secret-123'

    const ready = __internals.buildProviderReadiness('gmail')
    expect(ready.configured).toBe(true)
    expect(ready.oauthReady).toBe(true)
    expect(ready.encryptionReady).toBe(true)
  })
})
