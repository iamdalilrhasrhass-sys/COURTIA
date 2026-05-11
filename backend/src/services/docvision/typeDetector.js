/**
 * LOT 10 - Document Type Detector
 * Détection automatique du type de document (RIB, carte grise, etc.)
 * 
 * @module docvision/typeDetector
 */

const logger = require('../../lib/logger')

// Types de documents supportés
const DOCUMENT_TYPES = {
  RIB: 'rib',
  CARTE_GRISE: 'carte_grise',
  RELEVE_INFORMATION: 'releve_information',
  ATTESTATION_ASSURANCE: 'attestation_assurance',
  PIECE_IDENTITE: 'piece_identite',
  JUSTIF_DOMICILE: 'justif_domicile',
  AUTRE: 'autre'
}

// Patterns par type (pour détection heuristique)
const TYPE_PATTERNS = {
  [DOCUMENT_TYPES.RIB]: {
    filename: [/rib/i, /relev[eé].*identit[eé].*bancaire/i, /bic/i, /iban/i],
    content: ['IBAN', 'BIC', 'RIB', 'SWIFT', 'DOMICILIATION', 'TITULAIRE DU COMPTE', 'CODE BANQUE', 'CODE GUICHET']
  },
  [DOCUMENT_TYPES.CARTE_GRISE]: {
    filename: [/carte.*grise/i, /certificat.*immatriculation/i, /ci_/i, /cg_/i],
    content: ['CERTIFICAT D\'IMMATRICULATION', 'CARTE GRISE', 'PUISSANCE FISCALE', 'N° D\'IMMATRICULATION', 'TYPE MINE', 'GENRE', 'ENERGIE', 'DATE DE PREMIÈRE IMMATRICULATION']
  },
  [DOCUMENT_TYPES.RELEVE_INFORMATION]: {
    filename: [/relev[eé].*info/i, /ri_/i, /bonus.*malus/i],
    content: ['RELEVÉ D\'INFORMATION', 'BONUS', 'MALUS', 'COEFFICIENT', 'CRM', 'SINISTRES', 'RESPONSABILITÉ']
  },
  [DOCUMENT_TYPES.ATTESTATION_ASSURANCE]: {
    filename: [/attestation/i, /assurance/i, /carte.*verte/i],
    content: ['ATTESTATION D\'ASSURANCE', 'CARTE VERTE', 'GARANTIES', 'RESPONSABILITÉ CIVILE', 'PÉRIODE DE VALIDITÉ', 'COMPAGNIE D\'ASSURANCE']
  },
  [DOCUMENT_TYPES.PIECE_IDENTITE]: {
    filename: [/cni/i, /carte.*identit[eé]/i, /passeport/i, /permis/i, /id_/i],
    content: ['CARTE NATIONALE D\'IDENTITÉ', 'PASSEPORT', 'RÉPUBLIQUE FRANÇAISE', 'NOM', 'PRÉNOM', 'DATE DE NAISSANCE', 'NATIONALITÉ']
  },
  [DOCUMENT_TYPES.JUSTIF_DOMICILE]: {
    filename: [/justif.*domicile/i, /facture/i, /edf/i, /engie/i, /eau/i, /taxe/i, /quittance/i],
    content: ['FACTURE', 'AVIS D\'IMPOSITION', 'QUITTANCE', 'TAXE D\'HABITATION', 'ADRESSE DE FOURNITURE']
  }
}

/**
 * Détection heuristique basée sur le nom de fichier
 */
function detectFromFilename(filename) {
  if (!filename) return null
  
  const lowername = filename.toLowerCase()
  
  for (const [type, patterns] of Object.entries(TYPE_PATTERNS)) {
    for (const pattern of patterns.filename) {
      if (pattern.test(lowername)) {
        return { type, confidence: 0.7, source: 'filename' }
      }
    }
  }
  
  return null
}

/**
 * Détection heuristique basée sur le contenu textuel (OCR préalable)
 */
function detectFromContent(textContent) {
  if (!textContent) return null
  
  const upperContent = textContent.toUpperCase()
  const scores = {}
  
  for (const [type, patterns] of Object.entries(TYPE_PATTERNS)) {
    let matches = 0
    for (const keyword of patterns.content) {
      if (upperContent.includes(keyword.toUpperCase())) {
        matches++
      }
    }
    if (matches > 0) {
      scores[type] = matches / patterns.content.length
    }
  }
  
  if (Object.keys(scores).length === 0) return null
  
  const bestType = Object.entries(scores).sort((a, b) => b[1] - a[1])[0]
  return {
    type: bestType[0],
    confidence: Math.min(0.85, 0.5 + bestType[1] * 0.5),
    source: 'content'
  }
}

/**
 * Détection par type MIME
 */
function detectFromMime(mimeType) {
  if (!mimeType) return null
  
  // Les documents financiers sont généralement des PDF
  if (mimeType === 'application/pdf') {
    return { type: null, confidence: 0.3, hint: 'pdf_document' }
  }
  
  // Les pièces d'identité sont souvent des images
  if (mimeType.startsWith('image/')) {
    return { type: null, confidence: 0.2, hint: 'image_document' }
  }
  
  return null
}

/**
 * Détection combinée (heuristiques multiples)
 * @param {Object} params
 * @param {string} params.filename - Nom du fichier
 * @param {string} params.mimeType - Type MIME
 * @param {string} params.textContent - Contenu OCR (optionnel)
 * @param {string} params.declaredType - Type déclaré par l'utilisateur
 * @returns {Object} { type, confidence, source, warnings }
 */
function detectType({ filename, mimeType, textContent, declaredType }) {
  const results = []
  const warnings = []
  
  // 1. Si type déclaré, on le prend en compte
  if (declaredType && Object.values(DOCUMENT_TYPES).includes(declaredType)) {
    results.push({ type: declaredType, confidence: 0.6, source: 'declared' })
  }
  
  // 2. Détection par nom de fichier
  const filenameResult = detectFromFilename(filename)
  if (filenameResult) {
    results.push(filenameResult)
  }
  
  // 3. Détection par contenu
  const contentResult = detectFromContent(textContent)
  if (contentResult) {
    results.push(contentResult)
  }
  
  // 4. Si aucun résultat, type inconnu
  if (results.length === 0) {
    return {
      type: DOCUMENT_TYPES.AUTRE,
      confidence: 0.3,
      source: 'fallback',
      warnings: ['Type de document non reconnu automatiquement']
    }
  }
  
  // 5. Fusionner les résultats (prendre le meilleur ou valider croisement)
  const typeCount = {}
  for (const r of results) {
    if (!typeCount[r.type]) typeCount[r.type] = []
    typeCount[r.type].push(r.confidence)
  }
  
  let bestType = null
  let bestScore = 0
  
  for (const [type, confidences] of Object.entries(typeCount)) {
    // Score = moyenne des confidences * (1 + 0.2 par source additionnelle)
    const avgConf = confidences.reduce((a, b) => a + b, 0) / confidences.length
    const multiSourceBonus = 1 + (confidences.length - 1) * 0.15
    const score = Math.min(0.98, avgConf * multiSourceBonus)
    
    if (score > bestScore) {
      bestScore = score
      bestType = type
    }
  }
  
  // 6. Vérifier cohérence avec type déclaré
  if (declaredType && declaredType !== DOCUMENT_TYPES.AUTRE && bestType !== declaredType) {
    warnings.push(`Type détecté (${bestType}) différent du type déclaré (${declaredType})`)
  }
  
  logger.debug({ filename, detectedType: bestType, confidence: bestScore }, 'Document type detected')
  
  return {
    type: bestType,
    confidence: Math.round(bestScore * 1000) / 1000,
    source: results.length > 1 ? 'combined' : results[0]?.source,
    warnings
  }
}

/**
 * Valide si un type est supporté
 */
function isValidType(type) {
  return Object.values(DOCUMENT_TYPES).includes(type)
}

/**
 * Retourne le nom lisible d'un type
 */
function getTypeName(type) {
  const names = {
    [DOCUMENT_TYPES.RIB]: 'Relevé d\'Identité Bancaire',
    [DOCUMENT_TYPES.CARTE_GRISE]: 'Carte Grise',
    [DOCUMENT_TYPES.RELEVE_INFORMATION]: 'Relevé d\'Information',
    [DOCUMENT_TYPES.ATTESTATION_ASSURANCE]: 'Attestation d\'Assurance',
    [DOCUMENT_TYPES.PIECE_IDENTITE]: 'Pièce d\'Identité',
    [DOCUMENT_TYPES.JUSTIF_DOMICILE]: 'Justificatif de Domicile',
    [DOCUMENT_TYPES.AUTRE]: 'Autre Document'
  }
  return names[type] || type
}

module.exports = {
  DOCUMENT_TYPES,
  detectType,
  detectFromFilename,
  detectFromContent,
  isValidType,
  getTypeName
}
