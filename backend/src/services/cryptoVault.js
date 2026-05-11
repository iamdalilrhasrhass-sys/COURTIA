/**
 * COURTIA — CryptoVault Service
 * Chiffrement AES-256-GCM pour les credentials API courtiers
 * 
 * Sécurité:
 * - Master key 32 bytes en env (VAULT_MASTER_KEY)
 * - IV unique par opération (12 bytes)
 * - Auth tag pour intégrité (16 bytes)
 * - Ne JAMAIS retourner les valeurs en clair dans les APIs
 */

const crypto = require('crypto')

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12    // 96 bits recommended for GCM
const TAG_LENGTH = 16   // 128 bits auth tag
const KEY_LENGTH = 32   // 256 bits

// Récupérer ou générer la master key
function getMasterKey() {
  const envKey = process.env.VAULT_MASTER_KEY
  
  if (!envKey || envKey === 'replace_with_32_bytes_hex') {
    // En dev, générer une clé temporaire (warning loggé)
    const tempKey = crypto.randomBytes(KEY_LENGTH)
    console.warn('⚠️  [CryptoVault] VAULT_MASTER_KEY non configurée ! Génération temporaire.')
    console.warn('⚠️  [CryptoVault] Ajoutez dans .env: VAULT_MASTER_KEY=' + tempKey.toString('hex'))
    return tempKey
  }
  
  // Valider le format hex 64 caractères = 32 bytes
  if (!/^[a-fA-F0-9]{64}$/.test(envKey)) {
    throw new Error('[CryptoVault] VAULT_MASTER_KEY invalide (attendu: 64 caractères hex)')
  }
  
  return Buffer.from(envKey, 'hex')
}

let _masterKey = null

function getKey() {
  if (!_masterKey) {
    _masterKey = getMasterKey()
  }
  return _masterKey
}

/**
 * Chiffre une valeur sensible
 * @param {string} plaintext - Texte en clair à chiffrer
 * @returns {{ ciphertext: string, iv: string, authTag: string }} - Données chiffrées en hex
 */
function encrypt(plaintext) {
  if (!plaintext || typeof plaintext !== 'string') {
    throw new Error('[CryptoVault] encrypt: plaintext requis')
  }
  
  const key = getKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  
  let encrypted = cipher.update(plaintext, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  
  const authTag = cipher.getAuthTag()
  
  return {
    ciphertext: encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex')
  }
}

/**
 * Déchiffre une valeur sensible
 * @param {{ ciphertext: string, iv: string, authTag: string }} encryptedData
 * @returns {string} - Texte en clair
 */
function decrypt({ ciphertext, iv, authTag }) {
  if (!ciphertext || !iv || !authTag) {
    throw new Error('[CryptoVault] decrypt: ciphertext, iv et authTag requis')
  }
  
  const key = getKey()
  const ivBuffer = Buffer.from(iv, 'hex')
  const authTagBuffer = Buffer.from(authTag, 'hex')
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, ivBuffer)
  decipher.setAuthTag(authTagBuffer)
  
  let decrypted = decipher.update(ciphertext, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  
  return decrypted
}

/**
 * Extrait les 4 derniers caractères (pour affichage masqué)
 * @param {string} plaintext 
 * @returns {string}
 */
function getLastFour(plaintext) {
  if (!plaintext || plaintext.length < 4) {
    return '****'
  }
  return plaintext.slice(-4)
}

/**
 * Masque une valeur pour l'affichage
 * @param {string} plaintext 
 * @returns {string} - Ex: "****abc123"
 */
function maskValue(plaintext) {
  if (!plaintext) return '****'
  const lastFour = getLastFour(plaintext)
  return `****${lastFour}`
}

/**
 * Valide qu'une master key est correctement configurée
 * @returns {boolean}
 */
function isConfigured() {
  const envKey = process.env.VAULT_MASTER_KEY
  return envKey && envKey !== 'replace_with_32_bytes_hex' && /^[a-fA-F0-9]{64}$/.test(envKey)
}

/**
 * Génère une nouvelle master key (pour le setup initial)
 * @returns {string} - Clé hex 64 caractères
 */
function generateMasterKey() {
  return crypto.randomBytes(KEY_LENGTH).toString('hex')
}

module.exports = {
  encrypt,
  decrypt,
  getLastFour,
  maskValue,
  isConfigured,
  generateMasterKey,
  ALGORITHM,
  KEY_LENGTH
}