/**
 * LOT 10 - Extracteur Pièce d'Identité
 * Extraction automatique des données d'une CNI, passeport ou permis
 * 
 * @module docvision/extractors/pieceIdentite
 */

const logger = require('../../../lib/logger')

// Schéma JSON attendu
const PIECE_IDENTITE_SCHEMA = {
  type: 'object',
  properties: {
    type_piece: { type: 'string', enum: ['cni', 'passeport', 'permis', 'titre_sejour', 'autre'], description: 'Type de pièce' },
    numero: { type: 'string', description: 'Numéro de la pièce' },
    nom: { type: 'string', description: 'Nom de famille' },
    nom_usage: { type: 'string', description: 'Nom d\'usage (si différent)' },
    prenom: { type: 'string', description: 'Prénom(s)' },
    sexe: { type: 'string', enum: ['M', 'F'], description: 'Sexe' },
    date_naissance: { type: 'string', description: 'Date de naissance (YYYY-MM-DD)' },
    lieu_naissance: { type: 'string', description: 'Lieu de naissance' },
    nationalite: { type: 'string', description: 'Nationalité' },
    taille: { type: 'number', description: 'Taille en cm (permis)' },
    adresse: { type: 'string', description: 'Adresse (si présente)' },
    date_emission: { type: 'string', description: 'Date d\'émission (YYYY-MM-DD)' },
    date_expiration: { type: 'string', description: 'Date d\'expiration (YYYY-MM-DD)' },
    autorite: { type: 'string', description: 'Autorité de délivrance' },
    mrz: { type: 'string', description: 'Zone de lecture automatique (MRZ) si visible' },
    categories_permis: {
      type: 'array',
      items: { type: 'string' },
      description: 'Catégories de permis (B, A, A2, etc.) - pour permis uniquement'
    }
  },
  required: ['type_piece', 'nom', 'prenom', 'date_naissance']
}

// Prompt système pour Claude Vision
const SYSTEM_PROMPT = `Tu es un expert en lecture de documents d'identité français.

TYPES DE DOCUMENTS:
1. CARTE NATIONALE D'IDENTITÉ (CNI)
   - Recto: photo, nom, prénoms, sexe, nationalité, date/lieu naissance
   - Verso: adresse, taille, date émission/expiration, n° carte
   - MRZ en bas (2 lignes de 36 caractères)

2. PASSEPORT
   - Page photo: nom, prénoms, date/lieu naissance, sexe, nationalité
   - MRZ en bas (2 lignes de 44 caractères)
   - N° passeport en haut à droite

3. PERMIS DE CONDUIRE
   - Nom, prénom (1, 2)
   - Date/lieu naissance (3)
   - Date émission (4a), expiration (4b)
   - N° permis (5)
   - Photo
   - Catégories (9) avec dates

INSTRUCTIONS:
- Dates au format YYYY-MM-DD
- Nom en MAJUSCULES
- Prénoms avec majuscule initiale
- Si plusieurs prénoms, les séparer par espace
- Sexe: M ou F
- Pour le permis, lister toutes les catégories visibles

ATTENTION À LA CONFIDENTIALITÉ:
- Ne jamais inventer de données
- Si un champ n'est pas lisible, mettre null

Réponds UNIQUEMENT avec un JSON valide.`

const USER_PROMPT = `Analyse cette pièce d'identité et extrais les informations personnelles.

Retourne un JSON avec:
- type_piece: cni/passeport/permis/titre_sejour/autre
- numero: n° du document
- nom: nom de famille (MAJUSCULES)
- nom_usage: nom d'usage (si différent)
- prenom: prénom(s)
- sexe: M ou F
- date_naissance: YYYY-MM-DD
- lieu_naissance: ville/pays
- nationalite: nationalité
- taille: cm (si visible)
- adresse: adresse (si visible)
- date_emission: YYYY-MM-DD
- date_expiration: YYYY-MM-DD
- autorite: autorité émettrice
- mrz: zone MRZ (si visible)
- categories_permis: ["B", "A"] (pour permis)

JSON:`

/**
 * Détecte le type de pièce
 */
function detectPieceType(text) {
  if (!text) return null
  const upper = text.toUpperCase()
  
  if (upper.includes('CARTE NATIONALE') || upper.includes("CARTE D'IDENTITÉ") || upper.includes('RÉPUBLIQUE FRANÇAISE') && upper.includes('IDENTITÉ')) {
    return 'cni'
  }
  if (upper.includes('PASSEPORT')) {
    return 'passeport'
  }
  if (upper.includes('PERMIS DE CONDUIRE') || upper.includes('DRIVING LICENCE')) {
    return 'permis'
  }
  if (upper.includes('TITRE DE SÉJOUR') || upper.includes('CARTE DE SÉJOUR') || upper.includes('CARTE DE RESIDENT')) {
    return 'titre_sejour'
  }
  
  return 'autre'
}

/**
 * Vérifie l'expiration
 */
function checkExpiration(dateExpiration) {
  if (!dateExpiration) return { expired: null, daysUntilExpiry: null }
  
  const exp = new Date(dateExpiration)
  const today = new Date()
  const diffMs = exp - today
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  
  return {
    expired: diffDays < 0,
    daysUntilExpiry: diffDays,
    expiresIn30Days: diffDays >= 0 && diffDays <= 30,
    expiresIn90Days: diffDays >= 0 && diffDays <= 90
  }
}

/**
 * Valide le format du numéro selon le type
 */
function validateNumero(numero, type) {
  if (!numero) return { valid: false, error: 'Numéro manquant' }
  
  const clean = numero.replace(/[\s-]/g, '').toUpperCase()
  
  switch (type) {
    case 'cni':
      // CNI: 12 caractères alphanumériques
      if (clean.length !== 12) {
        return { valid: false, error: 'N° CNI: longueur incorrecte (' + clean.length + ', attendu 12)' }
      }
      break
    case 'passeport':
      // Passeport FR: 2 chiffres + 2 lettres + 5 chiffres = 9 caractères
      if (!/^\d{2}[A-Z]{2}\d{5}$/.test(clean)) {
        return { valid: false, warning: 'Format passeport non standard' }
      }
      break
    case 'permis':
      // Permis: format variable selon époque
      if (clean.length < 8) {
        return { valid: false, warning: 'N° permis court' }
      }
      break
  }
  
  return { valid: true }
}

/**
 * Post-traitement et validation des données extraites
 */
function validateAndNormalize(extracted) {
  const warnings = []
  const normalized = { ...extracted }
  
  // Normaliser le type
  if (!normalized.type_piece || !['cni', 'passeport', 'permis', 'titre_sejour', 'autre'].includes(normalized.type_piece)) {
    normalized.type_piece = detectPieceType(JSON.stringify(extracted)) || 'autre'
    if (normalized.type_piece === 'autre') {
      warnings.push('Type de pièce non reconnu')
    }
  }
  
  // Normaliser le nom (majuscules)
  if (normalized.nom) {
    normalized.nom = normalized.nom.toUpperCase().trim()
  } else {
    warnings.push('Nom non détecté')
  }
  
  // Normaliser le prénom
  if (normalized.prenom) {
    normalized.prenom = normalized.prenom.trim()
  } else {
    warnings.push('Prénom non détecté')
  }
  
  // Valider le numéro
  if (normalized.numero) {
    const numVal = validateNumero(normalized.numero, normalized.type_piece)
    if (!numVal.valid) {
      warnings.push(numVal.error || numVal.warning)
    }
  }
  
  // Vérifier l'expiration
  const expCheck = checkExpiration(normalized.date_expiration)
  if (expCheck.expired === true) {
    warnings.push('Document expiré depuis ' + Math.abs(expCheck.daysUntilExpiry) + ' jours')
  } else if (expCheck.expiresIn30Days) {
    warnings.push('Document expire dans moins de 30 jours')
  } else if (expCheck.expiresIn90Days) {
    warnings.push('Document expire dans moins de 90 jours')
  }
  
  // Normaliser le sexe
  if (normalized.sexe) {
    const s = normalized.sexe.toUpperCase().trim()
    if (s === 'MASCULIN' || s === 'M' || s === 'HOMME' || s === 'H') {
      normalized.sexe = 'M'
    } else if (s === 'FEMININ' || s === 'FÉMININ' || s === 'F' || s === 'FEMME') {
      normalized.sexe = 'F'
    }
  }
  
  // Calculer la confiance
  const requiredFields = ['type_piece', 'nom', 'prenom', 'date_naissance']
  const presentRequired = requiredFields.filter(f => normalized[f]).length
  const hasNumero = normalized.numero ? 0.1 : 0
  const hasExpiration = normalized.date_expiration ? 0.1 : 0
  const confidence = Math.round((presentRequired / requiredFields.length) * 0.6 + hasNumero + hasExpiration + (warnings.filter(w => w.includes('non détecté')).length === 0 ? 0.2 : 0.05)) * 1000 / 1000
  
  return {
    fields: normalized,
    confidence: Math.min(0.98, confidence),
    warnings,
    isValid: normalized.nom && normalized.prenom && normalized.date_naissance
  }
}

module.exports = {
  SCHEMA: PIECE_IDENTITE_SCHEMA,
  SYSTEM_PROMPT,
  USER_PROMPT,
  detectPieceType,
  checkExpiration,
  validateNumero,
  validateAndNormalize,
  documentType: 'piece_identite'
}
