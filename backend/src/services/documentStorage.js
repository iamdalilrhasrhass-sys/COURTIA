/**
 * documentStorage.js — Service de stockage de documents clients
 *
 * Stockage LOCAL pour développement (prêt pour migration S3/R2).
 * Interface compatible cloud : save, getStream, delete, signedUrl
 */

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

// Configuration
const STORAGE_ROOT = process.env.DOCUMENT_STORAGE_PATH || '/root/courtia/storage/documents'
const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25MB
const ALLOWED_MIMES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/heif',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
  'application/msword', // doc
]

const MIME_EXTENSIONS = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/heic': '.heic',
  'image/heif': '.heif',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/msword': '.doc',
}

/**
 * Génère un UUID v4
 */
function generateUUID() {
  return crypto.randomUUID()
}

/**
 * Calcule le hash SHA256 d'un buffer
 */
function computeHash(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex')
}

/**
 * Sanitize filename pour éviter path traversal
 */
function sanitizeFilename(filename) {
  // Supprime caractères dangereux et normalise
  return String(filename || 'document')
    .replace(/[\/\\:*?"<>|]/g, '_')
    .replace(/\.\./g, '_')
    .replace(/^\.+/, '')
    .slice(0, 200)
}

/**
 * Valide le type MIME et la taille du fichier
 */
function validateFile(buffer, mimetype, originalFilename) {
  const errors = []

  // Vérifier taille
  if (buffer.length > MAX_FILE_SIZE) {
    errors.push(`Fichier trop volumineux (${Math.round(buffer.length / 1024 / 1024)}MB > 25MB max)`)
  }

  // Vérifier MIME type
  if (!ALLOWED_MIMES.includes(mimetype)) {
    errors.push(`Type de fichier non autorisé : ${mimetype}. Acceptés : PDF, JPG, PNG, HEIC, DOCX`)
  }

  return {
    valid: errors.length === 0,
    errors,
    size: buffer.length,
    mimetype,
    hash: computeHash(buffer),
  }
}

/**
 * Assure que le répertoire client existe
 */
function ensureClientDir(clientId) {
  const clientDir = path.join(STORAGE_ROOT, String(clientId))
  if (!fs.existsSync(clientDir)) {
    fs.mkdirSync(clientDir, { recursive: true })
  }
  return clientDir
}

/**
 * Sauvegarde un fichier sur le stockage local
 * @param {Buffer} buffer - Contenu du fichier
 * @param {Object} options - { clientId, originalFilename, mimetype }
 * @returns {Object} - { storagePath, hash, size, uuid }
 */
async function save(buffer, { clientId, originalFilename, mimetype }) {
  // Validation
  const validation = validateFile(buffer, mimetype, originalFilename)
  if (!validation.valid) {
    throw new Error(validation.errors.join('; '))
  }

  // Préparer le chemin
  const uuid = generateUUID()
  const sanitized = sanitizeFilename(originalFilename)
  const ext = MIME_EXTENSIONS[mimetype] || path.extname(sanitized) || ''
  const filename = `${uuid}_${sanitized}${ext ? '' : ext}`

  const clientDir = ensureClientDir(clientId)
  const storagePath = path.join(String(clientId), filename)
  const fullPath = path.join(clientDir, filename)

  // Écrire le fichier
  await fs.promises.writeFile(fullPath, buffer)

  return {
    storagePath,
    hash: validation.hash,
    size: validation.size,
    uuid,
    fullPath,
  }
}

/**
 * Récupère un stream de lecture du fichier
 * @param {string} storagePath - Chemin relatif du fichier
 * @returns {ReadStream}
 */
function getStream(storagePath) {
  const fullPath = path.join(STORAGE_ROOT, storagePath)
  if (!fs.existsSync(fullPath)) {
    throw new Error('Fichier introuvable')
  }
  return fs.createReadStream(fullPath)
}

/**
 * Récupère le buffer complet du fichier
 * @param {string} storagePath - Chemin relatif du fichier
 * @returns {Buffer}
 */
async function getBuffer(storagePath) {
  const fullPath = path.join(STORAGE_ROOT, storagePath)
  if (!fs.existsSync(fullPath)) {
    throw new Error('Fichier introuvable')
  }
  return fs.promises.readFile(fullPath)
}

/**
 * Supprime un fichier du stockage
 * @param {string} storagePath - Chemin relatif du fichier
 */
async function remove(storagePath) {
  const fullPath = path.join(STORAGE_ROOT, storagePath)
  if (fs.existsSync(fullPath)) {
    await fs.promises.unlink(fullPath)
    return true
  }
  return false
}

/**
 * Génère une URL signée (stub pour compatibilité S3)
 * En local, retourne simplement un chemin relatif avec token temporaire
 * @param {string} storagePath
 * @param {number} expiresInSec
 * @returns {string}
 */
function signedUrl(storagePath, expiresInSec = 3600) {
  // En mode local, on retourne un token simple
  // En production avec S3/R2, cette méthode générera une vraie URL présignée
  const token = crypto
    .createHmac('sha256', process.env.JWT_SECRET || 'dev-secret')
    .update(`${storagePath}:${Math.floor(Date.now() / 1000) + expiresInSec}`)
    .digest('hex')
    .slice(0, 32)

  return `/api/documents/download/${encodeURIComponent(storagePath)}?token=${token}&expires=${Date.now() + expiresInSec * 1000}`
}

/**
 * Vérifie si un fichier existe déjà via son hash (déduplication)
 * @param {string} hash - SHA256 du fichier
 * @param {number} clientId
 * @returns {string|null} - storagePath si existe, null sinon
 */
async function findByHash(hash, clientId, pool) {
  const result = await pool.query(
    `SELECT storage_path FROM client_documents
     WHERE file_hash = $1 AND client_id = $2 AND deleted_at IS NULL
     LIMIT 1`,
    [hash, clientId]
  )
  return result.rows[0]?.storage_path || null
}

/**
 * Vérifie l'existence d'un fichier
 */
function exists(storagePath) {
  const fullPath = path.join(STORAGE_ROOT, storagePath)
  return fs.existsSync(fullPath)
}

/**
 * Récupère les métadonnées d'un fichier
 */
async function getStats(storagePath) {
  const fullPath = path.join(STORAGE_ROOT, storagePath)
  if (!fs.existsSync(fullPath)) {
    return null
  }
  const stats = await fs.promises.stat(fullPath)
  return {
    size: stats.size,
    createdAt: stats.birthtime,
    modifiedAt: stats.mtime,
  }
}

module.exports = {
  save,
  getStream,
  getBuffer,
  remove,
  signedUrl,
  findByHash,
  exists,
  getStats,
  validateFile,
  computeHash,
  sanitizeFilename,
  STORAGE_ROOT,
  MAX_FILE_SIZE,
  ALLOWED_MIMES,
}
