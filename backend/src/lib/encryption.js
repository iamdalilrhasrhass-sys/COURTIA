const sodium = require('libsodium-wrappers')

let cachedKey = null

async function getKey() {
  await sodium.ready
  if (cachedKey) return cachedKey

  const b64 = process.env.ENCRYPTION_KEY
  if (!b64) {
    throw new Error('ENCRYPTION_KEY missing')
  }

  const key = sodium.from_base64(b64, sodium.base64_variants.ORIGINAL)
  if (key.length !== sodium.crypto_secretbox_KEYBYTES) {
    throw new Error('ENCRYPTION_KEY must decode to 32 bytes')
  }
  cachedKey = key
  return cachedKey
}

async function encrypt(plaintext) {
  await sodium.ready
  const key = await getKey()
  const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES)
  const cipher = sodium.crypto_secretbox_easy(String(plaintext), nonce, key)
  return Buffer.concat([Buffer.from(nonce), Buffer.from(cipher)])
}

async function decrypt(buffer) {
  await sodium.ready
  const key = await getKey()
  const source = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer)
  const nonce = source.subarray(0, sodium.crypto_secretbox_NONCEBYTES)
  const cipher = source.subarray(sodium.crypto_secretbox_NONCEBYTES)
  const plain = sodium.crypto_secretbox_open_easy(cipher, nonce, key)
  return Buffer.from(plain).toString('utf8')
}

function __resetForTests() {
  cachedKey = null
}

module.exports = {
  encrypt,
  decrypt,
  __resetForTests,
}
