/**
 * LOT 10 - Extracteur Carte Grise
 * Extraction automatique des données d'un Certificat d'Immatriculation
 * 
 * @module docvision/extractors/carteGrise
 */

const logger = require('../../../lib/logger')

// Schéma JSON attendu
const CARTE_GRISE_SCHEMA = {
  type: 'object',
  properties: {
    immatriculation: { type: 'string', description: 'N° d\'immatriculation (AA-123-BB ou ancien format)' },
    date_immatriculation: { type: 'string', description: 'Date de première immatriculation (YYYY-MM-DD)' },
    marque: { type: 'string', description: 'Marque du véhicule (D.1)' },
    modele: { type: 'string', description: 'Désignation commerciale (D.3)' },
    version: { type: 'string', description: 'Version / variante (D.2)' },
    type_mine: { type: 'string', description: 'Type / variante / version (D.2.1)' },
    vin: { type: 'string', description: 'Numéro d\'identification (E)' },
    genre: { type: 'string', description: 'Genre national (J.1) - VP, CTTE, MTL...' },
    carrosserie: { type: 'string', description: 'Carrosserie (J.2) - CI, BREAK...' },
    energie: { type: 'string', description: 'Source d\'énergie (P.3) - ES, GO, EL, EH...' },
    puissance_fiscale: { type: 'number', description: 'Puissance fiscale CV (P.6)' },
    puissance_kw: { type: 'number', description: 'Puissance nette max kW (P.2)' },
    cylindree: { type: 'number', description: 'Cylindrée cm3 (P.1)' },
    co2: { type: 'number', description: 'Emissions CO2 g/km (V.7)' },
    places: { type: 'number', description: 'Nombre de places (S.1)' },
    ptac: { type: 'number', description: 'PTAC en kg (F.2)' },
    ptra: { type: 'number', description: 'PTRA en kg (F.3)' },
    titulaire_nom: { type: 'string', description: 'Nom du titulaire (C.1)' },
    titulaire_prenom: { type: 'string', description: 'Prénom du titulaire' },
    titulaire_adresse: { type: 'string', description: 'Adresse du titulaire (C.3)' },
    date_certificat: { type: 'string', description: 'Date du certificat (I)' }
  },
  required: ['immatriculation', 'marque', 'vin']
}

// Prompt système pour Claude Vision
const SYSTEM_PROMPT = `Tu es un expert en lecture de Certificats d'Immatriculation (cartes grises) français.

STRUCTURE D'UNE CARTE GRISE:
- Section A: N° d'immatriculation
- Section B: Date de première immatriculation
- Section C: Titulaire (C.1 nom, C.3 adresse)
- Section D: Véhicule (D.1 marque, D.2 type/variante, D.3 modèle commercial)
- Section E: VIN (17 caractères)
- Section F: Masses (F.1, F.2 PTAC, F.3 PTRA)
- Section G: Poids à vide
- Section I: Date du certificat
- Section J: Catégorie (J.1 genre, J.2 carrosserie, J.3 cat. CE)
- Section P: Moteur (P.1 cylindrée, P.2 puissance kW, P.3 énergie, P.6 CV fiscaux)
- Section S: Places (S.1 assises)
- Section V: Environnement (V.7 CO2)

CODES ÉNERGIE (P.3):
- ES = Essence
- GO = Diesel/Gazole
- EL = Électrique
- EH = Hybride Essence
- GH = Hybride Diesel
- GP = GPL
- GN = GNV
- FE = Superéthanol

INSTRUCTIONS:
- Lis TOUS les champs visibles
- Le VIN fait exactement 17 caractères alphanumériques
- L'immatriculation nouveau format: AA-123-BB
- Convertis les dates en format YYYY-MM-DD
- Les champs numériques doivent être des nombres, pas des chaînes

Réponds UNIQUEMENT avec un JSON valide.`

const USER_PROMPT = `Analyse cette carte grise et extrais toutes les informations du véhicule.

Retourne un JSON avec les champs suivants:
- immatriculation: plaque (format AA-123-BB)
- date_immatriculation: date 1ère immat (YYYY-MM-DD)
- marque: marque (D.1)
- modele: modèle commercial (D.3)
- version: version (D.2)
- type_mine: type mine (D.2.1)
- vin: VIN 17 car. (E)
- genre: VP, CTTE, etc. (J.1)
- carrosserie: CI, BREAK... (J.2)
- energie: ES, GO, EL, EH... (P.3)
- puissance_fiscale: CV (P.6)
- puissance_kw: kW (P.2)
- cylindree: cm3 (P.1)
- co2: g/km (V.7)
- places: nombre (S.1)
- ptac: kg (F.2)
- titulaire_nom: nom (C.1)
- titulaire_prenom: prénom
- titulaire_adresse: adresse (C.3)
- date_certificat: date certificat (I)

JSON:`

/**
 * Valide un VIN
 */
function validateVIN(vin) {
  if (!vin) return { valid: false, error: 'VIN manquant' }
  
  const cleanVin = vin.replace(/[\s-]/g, '').toUpperCase()
  
  if (cleanVin.length !== 17) {
    return { valid: false, error: 'VIN invalide (longueur: ' + cleanVin.length + ', attendu: 17)' }
  }
  
  // VIN ne contient pas I, O, Q
  if (/[IOQ]/.test(cleanVin)) {
    return { valid: false, error: 'VIN contient des caractères interdits (I, O ou Q)' }
  }
  
  return { valid: true }
}

/**
 * Valide une immatriculation française
 */
function validateImmat(immat) {
  if (!immat) return { valid: false, error: 'Immatriculation manquante' }
  
  const clean = immat.replace(/[\s-]/g, '').toUpperCase()
  
  // Nouveau format: AA-123-BB (7 caractères sans tirets)
  const newFormat = /^[A-Z]{2}\d{3}[A-Z]{2}$/
  // Ancien format: 123 ABC 75 (variable)
  const oldFormat = /^\d{1,4}[A-Z]{1,3}\d{2,3}$/
  
  if (!newFormat.test(clean) && !oldFormat.test(clean)) {
    return { valid: false, error: 'Format d\'immatriculation non reconnu' }
  }
  
  return { valid: true }
}

/**
 * Normalise le code énergie
 */
function normalizeEnergie(energie) {
  if (!energie) return null
  
  const mapping = {
    'ESSENCE': 'ES', 'SUPER': 'ES', 'SP': 'ES', 'ES': 'ES',
    'DIESEL': 'GO', 'GAZOLE': 'GO', 'GO': 'GO',
    'ELECTRIQUE': 'EL', 'EL': 'EL',
    'HYBRIDE': 'EH', 'HYB': 'EH', 'EH': 'EH',
    'GPL': 'GP', 'GP': 'GP',
    'GNV': 'GN', 'GAZ': 'GN', 'GN': 'GN',
    'ETHANOL': 'FE', 'E85': 'FE', 'FE': 'FE'
  }
  
  const upper = energie.toUpperCase().trim()
  return mapping[upper] || energie
}

/**
 * Post-traitement et validation des données extraites
 */
function validateAndNormalize(extracted) {
  const warnings = []
  const normalized = { ...extracted }
  
  // Normaliser l'immatriculation
  if (normalized.immatriculation) {
    const immatVal = validateImmat(normalized.immatriculation)
    if (!immatVal.valid) {
      warnings.push('Immatriculation: ' + immatVal.error)
    } else {
      // Formater avec tirets
      const clean = normalized.immatriculation.replace(/[\s-]/g, '').toUpperCase()
      if (clean.length === 7 && /^[A-Z]{2}\d{3}[A-Z]{2}$/.test(clean)) {
        normalized.immatriculation = clean.slice(0, 2) + '-' + clean.slice(2, 5) + '-' + clean.slice(5)
      }
    }
  } else {
    warnings.push('Immatriculation non détectée')
  }
  
  // Normaliser le VIN
  if (normalized.vin) {
    normalized.vin = normalized.vin.replace(/[\s-]/g, '').toUpperCase()
    const vinVal = validateVIN(normalized.vin)
    if (!vinVal.valid) {
      warnings.push('VIN: ' + vinVal.error)
    }
  }
  
  // Normaliser l'énergie
  if (normalized.energie) {
    normalized.energie = normalizeEnergie(normalized.energie)
  }
  
  // Convertir les champs numériques
  const numericFields = ['puissance_fiscale', 'puissance_kw', 'cylindree', 'co2', 'places', 'ptac', 'ptra']
  for (const field of numericFields) {
    if (normalized[field] && typeof normalized[field] === 'string') {
      const num = parseFloat(normalized[field].replace(/[^\d.,]/g, '').replace(',', '.'))
      if (!isNaN(num)) {
        normalized[field] = num
      }
    }
  }
  
  // Calculer la confiance
  const requiredFields = ['immatriculation', 'marque', 'vin', 'energie', 'puissance_fiscale']
  const presentRequired = requiredFields.filter(f => normalized[f]).length
  const confidence = Math.round((presentRequired / requiredFields.length) * 0.75 + (warnings.length === 0 ? 0.25 : 0.1)) * 1000 / 1000
  
  return {
    fields: normalized,
    confidence: Math.min(0.98, confidence),
    warnings,
    isValid: warnings.filter(w => w.includes('non détecté')).length === 0
  }
}

module.exports = {
  SCHEMA: CARTE_GRISE_SCHEMA,
  SYSTEM_PROMPT,
  USER_PROMPT,
  validateVIN,
  validateImmat,
  normalizeEnergie,
  validateAndNormalize,
  documentType: 'carte_grise'
}
