const sodium = require('libsodium-wrappers')
const { encrypt, decrypt, __resetForTests } = require('./encryption')

describe('encryption', () => {
  const originalKey = process.env.ENCRYPTION_KEY

  beforeAll(async () => {
    await sodium.ready
  })

  afterEach(() => {
    process.env.ENCRYPTION_KEY = originalKey
    __resetForTests()
  })

  it('encrypts and decrypts with libsodium secretbox', async () => {
    process.env.ENCRYPTION_KEY = sodium.to_base64(
      sodium.randombytes_buf(sodium.crypto_secretbox_KEYBYTES),
      sodium.base64_variants.ORIGINAL
    )
    __resetForTests()

    const encrypted = await encrypt('refresh-token-value')
    expect(Buffer.isBuffer(encrypted)).toBe(true)
    expect(encrypted.toString('utf8')).not.toContain('refresh-token-value')
    await expect(decrypt(encrypted)).resolves.toBe('refresh-token-value')
  })

  it('fails clearly when key is invalid', async () => {
    process.env.ENCRYPTION_KEY = Buffer.from('short').toString('base64')
    __resetForTests()
    await expect(encrypt('x')).rejects.toThrow('ENCRYPTION_KEY must decode to 32 bytes')
  })
})
