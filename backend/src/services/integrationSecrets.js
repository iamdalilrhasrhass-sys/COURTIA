const crypto = require('crypto')

function deriveKey(secret) {
  if (!secret) return null
  return crypto.createHash('sha256').update(String(secret)).digest()
}

function hasEncryptionKey() {
  return Boolean(process.env.ENCRYPTION_KEY)
}

function encryptSecret(plainText) {
  if (plainText == null || plainText === '') return null
  const key = deriveKey(process.env.ENCRYPTION_KEY)
  if (!key) return null

  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(String(plainText), 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()

  return `${iv.toString('base64')}.${tag.toString('base64')}.${encrypted.toString('base64')}`
}

function decryptSecret(payload) {
  if (!payload || typeof payload !== 'string') return null
  const key = deriveKey(process.env.ENCRYPTION_KEY)
  if (!key) return null

  const [ivB64, tagB64, dataB64] = payload.split('.')
  if (!ivB64 || !tagB64 || !dataB64) return null

  try {
    const iv = Buffer.from(ivB64, 'base64')
    const tag = Buffer.from(tagB64, 'base64')
    const encrypted = Buffer.from(dataB64, 'base64')
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(tag)
    const plain = Buffer.concat([decipher.update(encrypted), decipher.final()])
    return plain.toString('utf8')
  } catch {
    return null
  }
}

module.exports = {
  hasEncryptionKey,
  encryptSecret,
  decryptSecret,
}
