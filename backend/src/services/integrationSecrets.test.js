const { hasEncryptionKey, encryptSecret, decryptSecret } = require('./integrationSecrets')

describe('integrationSecrets', () => {
  const originalKey = process.env.ENCRYPTION_KEY

  afterEach(() => {
    process.env.ENCRYPTION_KEY = originalKey
  })

  it('returns null encryption without key', () => {
    delete process.env.ENCRYPTION_KEY
    expect(hasEncryptionKey()).toBe(false)
    expect(encryptSecret('abc')).toBe(null)
    expect(decryptSecret('x.y.z')).toBe(null)
  })

  it('encrypts and decrypts with key', () => {
    process.env.ENCRYPTION_KEY = 'courtia-test-secret-key'
    const encrypted = encryptSecret('token-value-123')
    expect(typeof encrypted).toBe('string')
    expect(encrypted).not.toContain('token-value-123')
    const decrypted = decryptSecret(encrypted)
    expect(decrypted).toBe('token-value-123')
  })
})
