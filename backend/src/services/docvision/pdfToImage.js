/**
 * LOT 10 - PDF to Image Converter
 * Convertit la première page d'un PDF en image pour Claude Vision
 * 
 * Note: Claude supporte directement les PDF depuis les modèles récents,
 * mais la conversion peut améliorer les résultats pour certains documents.
 * 
 * @module docvision/pdfToImage
 */

const logger = require('../../lib/logger')
const fs = require('fs').promises

// Essayer d'importer pdf-poppler ou fallback
let pdfConverter = null

try {
  pdfConverter = require('pdf-poppler')
  logger.info('PDF converter: pdf-poppler loaded')
} catch (e) {
  logger.info('pdf-poppler not available, will use direct PDF input to Claude Vision')
}

/**
 * Vérifie si un buffer est un PDF
 */
function isPdf(buffer) {
  if (!buffer || buffer.length < 5) return false
  // PDF magic bytes: %PDF-
  return buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46
}

/**
 * Détecte le type d'image depuis les magic bytes
 */
function detectImageType(buffer) {
  if (!buffer || buffer.length < 8) return null
  
  // PNG: 89 50 4E 47
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
    return 'image/png'
  }
  
  // JPEG: FF D8 FF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return 'image/jpeg'
  }
  
  // GIF: GIF89a ou GIF87a
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
    return 'image/gif'
  }
  
  // WebP: RIFF....WEBP
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) {
    if (buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
      return 'image/webp'
    }
  }
  
  return null
}

/**
 * Convertit un PDF en image (première page)
 * 
 * @param {Buffer} pdfBuffer - Buffer du PDF
 * @param {Object} options
 * @param {number} options.page - Page à convertir (défaut: 1)
 * @param {number} options.scale - Facteur de scale (défaut: 2.0)
 * @param {string} options.format - Format de sortie (png ou jpeg)
 * @returns {Promise<{buffer: Buffer, mediaType: string}>}
 */
async function convertPdfToImage(pdfBuffer, options = {}) {
  const { page = 1, scale = 2.0, format = 'png' } = options
  
  // Si pas de convertisseur disponible, retourner le PDF tel quel
  // Claude Vision supporte les PDF directement
  if (!pdfConverter) {
    logger.debug('No PDF converter available, returning PDF as-is')
    return {
      buffer: pdfBuffer,
      mediaType: 'application/pdf',
      converted: false
    }
  }
  
  try {
    const tempDir = '/tmp/docvision_' + Date.now()
    const tempPdf = tempDir + '/input.pdf'
    const outputBase = tempDir + '/output'
    
    // Créer le dossier temporaire
    await fs.mkdir(tempDir, { recursive: true })
    await fs.writeFile(tempPdf, pdfBuffer)
    
    // Conversion avec pdf-poppler
    await pdfConverter.convert(tempPdf, {
      format: format,
      out_dir: tempDir,
      out_prefix: 'output',
      page: page,
      scale: scale * 100 // pdf-poppler utilise un pourcentage
    })
    
    // Lire l'image générée
    const outputFile = outputBase + '-' + page + '.' + format
    const imageBuffer = await fs.readFile(outputFile)
    
    // Cleanup
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {})
    
    logger.debug({ page, format, size: imageBuffer.length }, 'PDF converted to image')
    
    return {
      buffer: imageBuffer,
      mediaType: format === 'png' ? 'image/png' : 'image/jpeg',
      converted: true
    }
  } catch (err) {
    logger.warn({ error: err.message }, 'PDF conversion failed, using direct PDF input')
    
    // Fallback: retourner le PDF tel quel
    return {
      buffer: pdfBuffer,
      mediaType: 'application/pdf',
      converted: false
    }
  }
}

/**
 * Prépare un document (PDF ou image) pour Claude Vision
 * 
 * @param {Buffer} buffer - Buffer du document
 * @param {string} mimeType - Type MIME déclaré (optionnel)
 * @returns {Promise<{buffer: Buffer, mediaType: string}>}
 */
async function prepareForVision(buffer, mimeType) {
  // Détecter le type réel
  const isPdfDoc = isPdf(buffer)
  const detectedImageType = detectImageType(buffer)
  
  if (isPdfDoc) {
    // Convertir le PDF (ou le retourner tel quel si pas de convertisseur)
    return convertPdfToImage(buffer)
  }
  
  if (detectedImageType) {
    return {
      buffer,
      mediaType: detectedImageType,
      converted: false
    }
  }
  
  // Si type MIME fourni, l'utiliser
  if (mimeType && (mimeType.startsWith('image/') || mimeType === 'application/pdf')) {
    return {
      buffer,
      mediaType: mimeType,
      converted: false
    }
  }
  
  // Fallback: supposer PNG
  logger.warn('Unknown document type, assuming image/png')
  return {
    buffer,
    mediaType: 'image/png',
    converted: false
  }
}

module.exports = {
  isPdf,
  detectImageType,
  convertPdfToImage,
  prepareForVision
}
