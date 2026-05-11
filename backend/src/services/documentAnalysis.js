/**
 * documentAnalysis.js — Service d'analyse de documents
 *
 * STUB pour LOT 4 : analyse basique par heuristiques (filename, extension).
 * LOT 6 : intégration Claude Vision pour OCR + extraction intelligente.
 */

const path = require('path')

// Types de documents reconnus
const DOCUMENT_TYPES = {
  carte_identite: {
    label: 'Carte d\'identité',
    patterns: ['cni', 'carte_identite', 'carte-identite', 'identite', 'id_card', 'identity'],
    required_for: ['souscription', 'verification'],
  },
  passeport: {
    label: 'Passeport',
    patterns: ['passeport', 'passport'],
    required_for: ['souscription', 'verification'],
  },
  permis_conduire: {
    label: 'Permis de conduire',
    patterns: ['permis', 'driving_license', 'licence', 'permis_conduire'],
    required_for: ['auto', 'moto'],
  },
  rib: {
    label: 'RIB',
    patterns: ['rib', 'releve_identite_bancaire', 'bank', 'iban'],
    required_for: ['prelevement'],
  },
  justificatif_domicile: {
    label: 'Justificatif de domicile',
    patterns: ['domicile', 'adresse', 'facture', 'edf', 'gdf', 'engie', 'residence'],
    required_for: ['mrh', 'auto'],
  },
  carte_grise: {
    label: 'Carte grise',
    patterns: ['carte_grise', 'certificat_immatriculation', 'immatriculation', 'cg_'],
    required_for: ['auto', 'moto'],
  },
  avis_imposition: {
    label: 'Avis d\'imposition',
    patterns: ['imposition', 'impot', 'avis_impot', 'fiscal', 'revenus'],
    required_for: ['emprunteur', 'prevoyance'],
  },
  bulletin_salaire: {
    label: 'Bulletin de salaire',
    patterns: ['salaire', 'bulletin', 'paie', 'fiche_paie', 'salary'],
    required_for: ['emprunteur', 'prevoyance'],
  },
  attestation_assurance: {
    label: 'Attestation d\'assurance',
    patterns: ['attestation', 'assurance', 'certificat'],
    required_for: ['resiliation'],
  },
  releve_sinistres: {
    label: 'Relevé d\'informations / Sinistres',
    patterns: ['releve_information', 'sinistre', 'bonus_malus', 'ri_'],
    required_for: ['auto', 'moto'],
  },
  devis: {
    label: 'Devis',
    patterns: ['devis', 'quote', 'proposition'],
    required_for: [],
  },
  contrat: {
    label: 'Contrat',
    patterns: ['contrat', 'contract', 'police'],
    required_for: [],
  },
  kbis: {
    label: 'Extrait KBIS',
    patterns: ['kbis', 'extrait_kbis', 'registre_commerce'],
    required_for: ['pro', 'entreprise'],
  },
  statuts: {
    label: 'Statuts société',
    patterns: ['statuts', 'statut_societe'],
    required_for: ['pro', 'entreprise'],
  },
  autre: {
    label: 'Autre document',
    patterns: [],
    required_for: [],
  },
}

/**
 * Détecte le type de document par analyse du nom de fichier
 * @param {string} filename
 * @returns {string} - Type détecté
 */
function detectTypeByFilename(filename) {
  const normalized = String(filename || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // Supprime accents
    .replace(/[^a-z0-9]/g, '_')

  for (const [type, config] of Object.entries(DOCUMENT_TYPES)) {
    if (type === 'autre') continue
    for (const pattern of config.patterns) {
      if (normalized.includes(pattern)) {
        return type
      }
    }
  }
  return 'autre'
}

/**
 * Calcule un score de confiance basé sur les heuristiques
 * @param {string} filename
 * @param {string} mimetype
 * @param {number} fileSize
 * @returns {number} - Score 0-100
 */
function computeConfidence(filename, mimetype, fileSize, detectedType) {
  let score = 50 // Base

  // Bonus si le type n'est pas "autre"
  if (detectedType !== 'autre') {
    score += 30
  }

  // Bonus si PDF (généralement plus fiable)
  if (mimetype === 'application/pdf') {
    score += 10
  }

  // Bonus si taille raisonnable (100KB - 5MB = documents typiques)
  if (fileSize >= 100 * 1024 && fileSize <= 5 * 1024 * 1024) {
    score += 10
  }

  return Math.min(100, score)
}

/**
 * Analyse un document (STUB - sera complété avec Claude Vision)
 * @param {Buffer} buffer - Contenu du fichier
 * @param {Object} metadata - { filename, mimetype, fileSize }
 * @returns {Object} - Résultat d'analyse structuré
 */
async function analyzeDocument(buffer, { filename, mimetype, fileSize }) {
  const detectedType = detectTypeByFilename(filename)
  const confidence = computeConfidence(filename, mimetype, fileSize, detectedType)

  // Résultat standard
  const result = {
    type: detectedType,
    type_label: DOCUMENT_TYPES[detectedType]?.label || 'Document',
    confidence,
    fields_extracted: {},
    quality_score: null, // Sera rempli par Claude Vision (LOT 6)
    issues: [],
    ocr_available: false,
    analyzed_at: new Date().toISOString(),
    engine: 'heuristics_v1', // Passera à 'claude_vision' en LOT 6
  }

  // Ajouter des warnings si confiance faible
  if (confidence < 60) {
    result.issues.push({
      level: 'warning',
      code: 'LOW_CONFIDENCE',
      message: 'Type de document détecté avec faible confiance. Vérification manuelle recommandée.',
    })
  }

  // Stub pour extraction de champs (sera rempli par Claude Vision)
  if (detectedType === 'carte_identite') {
    result.fields_extracted = {
      nom: null,
      prenom: null,
      date_naissance: null,
      numero: null,
      date_expiration: null,
    }
  } else if (detectedType === 'rib') {
    result.fields_extracted = {
      iban: null,
      bic: null,
      titulaire: null,
      banque: null,
    }
  } else if (detectedType === 'permis_conduire') {
    result.fields_extracted = {
      nom: null,
      prenom: null,
      categories: null,
      date_obtention: null,
      date_expiration: null,
    }
  } else if (detectedType === 'carte_grise') {
    result.fields_extracted = {
      immatriculation: null,
      marque: null,
      modele: null,
      date_mise_circulation: null,
      puissance_fiscale: null,
    }
  }

  return result
}

/**
 * Analyse avec Claude Vision (STUB pour LOT 6)
 * @param {Buffer} buffer
 * @param {Object} metadata
 * @returns {Object}
 */
async function analyzeWithVision(buffer, metadata) {
  // TODO LOT 6: Implémenter avec Anthropic Claude Vision API
  // Exemple d'appel prévu:
  // const anthropic = new Anthropic()
  // const response = await anthropic.messages.create({
  //   model: 'claude-sonnet-4-20250514',
  //   messages: [{
  //     role: 'user',
  //     content: [
  //       { type: 'image', source: { type: 'base64', media_type: mimetype, data: buffer.toString('base64') } },
  //       { type: 'text', text: 'Analyse ce document...' }
  //     ]
  //   }]
  // })

  // Pour l'instant, fallback sur analyse heuristique
  return analyzeDocument(buffer, metadata)
}

/**
 * Vérifie la qualité d'une image (STUB)
 * @param {Buffer} buffer
 * @returns {Object}
 */
function checkImageQuality(buffer) {
  // STUB - sera implémenté avec une vraie analyse en LOT 6
  return {
    readable: true,
    blur_score: null,
    brightness_score: null,
    resolution_adequate: true,
    issues: [],
  }
}

/**
 * Retourne la définition d'un type de document
 */
function getDocumentTypeDefinition(type) {
  return DOCUMENT_TYPES[type] || DOCUMENT_TYPES.autre
}

/**
 * Liste tous les types de documents disponibles
 */
function listDocumentTypes() {
  return Object.entries(DOCUMENT_TYPES).map(([key, config]) => ({
    type: key,
    label: config.label,
    required_for: config.required_for,
  }))
}

module.exports = {
  analyzeDocument,
  analyzeWithVision,
  detectTypeByFilename,
  computeConfidence,
  checkImageQuality,
  getDocumentTypeDefinition,
  listDocumentTypes,
  DOCUMENT_TYPES,
}
