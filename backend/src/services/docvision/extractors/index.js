/**
 * LOT 10 - Index des Extractors Document Vision
 * 
 * @module docvision/extractors
 */

const ribExtractor = require('./rib')
const carteGriseExtractor = require('./carteGrise')
const releveInformationExtractor = require('./releveInformation')
const attestationExtractor = require('./attestation')
const pieceIdentiteExtractor = require('./pieceIdentite')
const justifDomicileExtractor = require('./justifDomicile')

const extractors = {
  rib: ribExtractor,
  carte_grise: carteGriseExtractor,
  releve_information: releveInformationExtractor,
  attestation_assurance: attestationExtractor,
  piece_identite: pieceIdentiteExtractor,
  justif_domicile: justifDomicileExtractor
}

/**
 * Récupère l'extractor pour un type de document
 * @param {string} documentType - Type de document
 * @returns {Object|null} Extractor ou null si non supporté
 */
function getExtractor(documentType) {
  return extractors[documentType] || null
}

/**
 * Liste des types supportés
 */
function getSupportedTypes() {
  return Object.keys(extractors)
}

/**
 * Vérifie si un type est supporté
 */
function isSupported(documentType) {
  return documentType in extractors
}

module.exports = {
  extractors,
  getExtractor,
  getSupportedTypes,
  isSupported,
  // Re-export individuel
  ribExtractor,
  carteGriseExtractor,
  releveInformationExtractor,
  attestationExtractor,
  pieceIdentiteExtractor,
  justifDomicileExtractor
}
