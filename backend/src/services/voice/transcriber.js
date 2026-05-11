/**
 * Voice Transcriber — Service de transcription audio
 * LOT 9: Voice Intake
 * 
 * Provider abstrait avec implémentation OpenAI Whisper
 * @module voice/transcriber
 */

const fs = require('fs')
const path = require('path')
const logger = require('../../lib/logger')

// Tarif Whisper : $0.006 / minute = $0.0001 / seconde
const WHISPER_RATE_PER_SECOND = 0.0001

// Formats audio supportés par Whisper
const SUPPORTED_FORMATS = ['mp3', 'mp4', 'mpeg', 'mpga', 'm4a', 'wav', 'webm', 'ogg']
const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25 MB
const MAX_DURATION_SECONDS = 30 * 60 // 30 minutes

/**
 * Vérifie si OpenAI est configuré
 */
function isWhisperConfigured() {
  return Boolean(process.env.OPENAI_API_KEY)
}

/**
 * Obtient le client OpenAI
 */
function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    return null
  }
  const OpenAI = require('openai')
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
}

/**
 * Valide un fichier audio avant transcription
 * @param {string} filePath - Chemin du fichier
 * @param {number} fileSize - Taille en bytes
 * @returns {{ valid: boolean, error?: string }}
 */
function validateAudioFile(filePath, fileSize) {
  // Vérifier la taille
  if (fileSize > MAX_FILE_SIZE) {
    return { 
      valid: false, 
      error: `Fichier trop volumineux (${Math.round(fileSize/1024/1024)}MB). Maximum: 25MB` 
    }
  }

  // Vérifier l'extension
  const ext = path.extname(filePath).toLowerCase().replace('.', '')
  if (!SUPPORTED_FORMATS.includes(ext)) {
    return { 
      valid: false, 
      error: `Format non supporté: .${ext}. Formats acceptés: ${SUPPORTED_FORMATS.join(', ')}` 
    }
  }

  return { valid: true }
}

/**
 * Transcrit un fichier audio avec OpenAI Whisper
 * @param {Buffer|string} audioSource - Buffer audio ou chemin fichier
 * @param {Object} options
 * @param {string} [options.language='fr'] - Langue (ISO 639-1)
 * @param {string} [options.filePath] - Chemin original (pour extension)
 * @param {number} [options.fileSize] - Taille en bytes
 * @returns {Promise<{ text: string, language: string, duration_s: number|null, cost_usd: number, engine: string }>}
 */
async function transcribe(audioSource, options = {}) {
  const startTime = Date.now()
  const { language = 'fr', filePath = null, fileSize = 0 } = options

  // Vérifier configuration
  if (!isWhisperConfigured()) {
    throw new Error('OPENAI_API_KEY non configurée. Transcription Whisper indisponible.')
  }

  const openai = getOpenAIClient()

  // Préparer le fichier pour l'API
  let fileStream
  let actualFilePath
  
  if (Buffer.isBuffer(audioSource)) {
    // Si c'est un buffer, on doit le sauvegarder temporairement
    const tempPath = `/tmp/whisper_${Date.now()}.mp3`
    fs.writeFileSync(tempPath, audioSource)
    actualFilePath = tempPath
    fileStream = fs.createReadStream(tempPath)
  } else if (typeof audioSource === 'string') {
    // C'est un chemin de fichier
    actualFilePath = audioSource
    fileStream = fs.createReadStream(audioSource)
  } else {
    throw new Error('audioSource doit être un Buffer ou un chemin de fichier')
  }

  try {
    logger.info({ 
      filePath: actualFilePath, 
      language,
      fileSize 
    }, 'Transcription Whisper démarrée')

    // Appel API Whisper
    const response = await openai.audio.transcriptions.create({
      file: fileStream,
      model: 'whisper-1',
      language: language,
      response_format: 'verbose_json' // Pour avoir la durée
    })

    const latencyMs = Date.now() - startTime
    const durationSeconds = response.duration || null
    const costUsd = durationSeconds 
      ? parseFloat((durationSeconds * WHISPER_RATE_PER_SECOND).toFixed(6))
      : 0

    logger.info({
      engine: 'whisper-1',
      language: response.language || language,
      durationSeconds,
      costUsd,
      latencyMs,
      textLength: response.text?.length || 0
    }, 'Transcription Whisper terminée')

    return {
      text: response.text || '',
      language: response.language || language,
      duration_s: durationSeconds,
      cost_usd: costUsd,
      engine: 'openai-whisper-1'
    }

  } finally {
    // Nettoyer fichier temporaire si créé
    if (Buffer.isBuffer(audioSource) && actualFilePath.startsWith('/tmp/')) {
      try {
        fs.unlinkSync(actualFilePath)
      } catch (e) {
        // Ignore
      }
    }
  }
}

/**
 * Estime le coût de transcription sans l'effectuer
 * @param {number} durationSeconds - Durée en secondes
 * @returns {number} Coût estimé en USD
 */
function estimateCost(durationSeconds) {
  return parseFloat((durationSeconds * WHISPER_RATE_PER_SECOND).toFixed(6))
}

/**
 * Sauvegarde un fichier audio dans le storage
 * @param {Buffer} audioBuffer - Contenu audio
 * @param {number} brokerId - ID courtier
 * @param {string} originalName - Nom original du fichier
 * @returns {Promise<{ path: string, size: number }>}
 */
async function saveAudioFile(audioBuffer, brokerId, originalName) {
  const crypto = require('crypto')
  const uuid = crypto.randomUUID()
  const ext = path.extname(originalName).toLowerCase() || '.mp3'
  
  // Créer répertoire broker si nécessaire
  const brokerDir = path.join(process.cwd(), 'storage', 'voice', String(brokerId))
  if (!fs.existsSync(brokerDir)) {
    fs.mkdirSync(brokerDir, { recursive: true })
  }

  const fileName = `${uuid}${ext}`
  const filePath = path.join(brokerDir, fileName)
  const relativePath = `voice/${brokerId}/${fileName}`

  fs.writeFileSync(filePath, audioBuffer)

  return {
    path: relativePath,
    absolutePath: filePath,
    size: audioBuffer.length
  }
}

/**
 * Supprime un fichier audio du storage
 * @param {string} relativePath - Chemin relatif (voice/broker/file.ext)
 */
function deleteAudioFile(relativePath) {
  if (!relativePath) return
  
  const absolutePath = path.join(process.cwd(), 'storage', relativePath)
  if (fs.existsSync(absolutePath)) {
    fs.unlinkSync(absolutePath)
    logger.info({ path: relativePath }, 'Fichier audio supprimé')
  }
}

/**
 * Retourne le chemin absolu d'un fichier audio
 * @param {string} relativePath
 * @returns {string}
 */
function getAudioAbsolutePath(relativePath) {
  return path.join(process.cwd(), 'storage', relativePath)
}

module.exports = {
  transcribe,
  validateAudioFile,
  isWhisperConfigured,
  estimateCost,
  saveAudioFile,
  deleteAudioFile,
  getAudioAbsolutePath,
  SUPPORTED_FORMATS,
  MAX_FILE_SIZE,
  MAX_DURATION_SECONDS,
  WHISPER_RATE_PER_SECOND
}
