/**
 * LOT 10 - Extracteur Attestation d'Assurance
 * Extraction automatique des données d'une attestation / carte verte
 * 
 * @module docvision/extractors/attestation
 */

const logger = require('../../../lib/logger')

// Schéma JSON attendu
const ATTESTATION_SCHEMA = {
  type: 'object',
  properties: {
    compagnie: { type: 'string', description: 'Nom de la compagnie d\'assurance' },
    contrat_numero: { type: 'string', description: 'Numéro de contrat/police' },
    assure_nom: { type: 'string', description: 'Nom de l\'assuré' },
    assure_prenom: { type: 'string', description: 'Prénom de l\'assuré' },
    assure_adresse: { type: 'string', description: 'Adresse de l\'assuré' },
    vehicule_immat: { type: 'string', description: 'Immatriculation du véhicule' },
    vehicule_marque: { type: 'string', description: 'Marque du véhicule' },
    vehicule_modele: { type: 'string', description: 'Modèle du véhicule' },
    vehicule_vin: { type: 'string', description: 'VIN du véhicule (si présent)' },
    garanties: {
      type: 'array',
      items: { type: 'string' },
      description: 'Liste des garanties (RC, VOL, INCENDIE, BDG, etc.)'
    },
    date_debut: { type: 'string', description: 'Date de début de validité (YYYY-MM-DD)' },
    date_fin: { type: 'string', description: 'Date de fin de validité (YYYY-MM-DD)' },
    date_emission: { type: 'string', description: 'Date d\'émission du document (YYYY-MM-DD)' },
    usage: { type: 'string', description: 'Usage du véhicule (privé, professionnel, etc.)' },
    zone_circulation: { type: 'string', description: 'Zone de circulation couverte' },
    franchise_info: { type: 'string', description: 'Informations sur les franchises' }
  },
  required: ['compagnie', 'vehicule_immat', 'date_debut', 'date_fin']
}

// Prompt système pour Claude Vision
const SYSTEM_PROMPT = `Tu es un expert en lecture d'attestations d'assurance automobile et cartes vertes.

STRUCTURE D'UNE ATTESTATION/CARTE VERTE:
- Zone 1-3: Identification compagnie
- Zone 4: N° police/contrat
- Zone 5: Nom de l'assuré
- Zone 6: Adresse
- Zone 7: Période de validité (du... au...)
- Zone 8: Immatriculation
- Zone 9: Catégorie/marque/modèle
- Cases garanties (lettres encadrées): indiquent les couvertures

GARANTIES COMMUNES:
- RC (Responsabilité Civile) - obligatoire
- VOL (Vol)
- INC (Incendie)
- BDG (Bris de Glace)
- CAT NAT (Catastrophes Naturelles)
- DOMMAGES (Tous risques/dommages)
- ASSISTANCE
- DEFENSE RECOURS

INSTRUCTIONS:
- Extrait TOUTES les dates au format YYYY-MM-DD
- Liste toutes les garanties visibles
- L'immatriculation doit être au format XX-XXX-XX
- Indique si c'est une attestation provisoire ou définitive

Réponds UNIQUEMENT avec un JSON valide.`

const USER_PROMPT = `Analyse cette attestation d'assurance et extrais les informations.

Retourne un JSON avec:
- compagnie: nom assureur
- contrat_numero: n° police
- assure_nom: nom
- assure_prenom: prénom
- assure_adresse: adresse complète
- vehicule_immat: plaque
- vehicule_marque: marque
- vehicule_modele: modèle
- vehicule_vin: VIN (si visible)
- garanties: ["RC", "VOL", "INC", ...]
- date_debut: YYYY-MM-DD
- date_fin: YYYY-MM-DD
- date_emission: YYYY-MM-DD
- usage: privé/professionnel
- zone_circulation: zone couverte
- franchise_info: info franchises

JSON:`

/**
 * Normalise les garanties
 */
function normalizeGaranties(garanties) {
  if (!garanties) return []
  if (!Array.isArray(garanties)) return [garanties]
  
  const mapping = {
    'RESPONSABILITE CIVILE': 'RC',
    'RESPONSABILITÉ CIVILE': 'RC',
    'RESP. CIVILE': 'RC',
    'RC': 'RC',
    'VOL': 'VOL',
    'INCENDIE': 'INC',
    'INC': 'INC',
    'BRIS DE GLACE': 'BDG',
    'BDG': 'BDG',
    'CATASTROPHES NATURELLES': 'CAT NAT',
    'CAT NAT': 'CAT NAT',
    'DOMMAGES': 'DOMMAGES',
    'TOUS RISQUES': 'TOUS RISQUES',
    'ASSISTANCE': 'ASSISTANCE',
    'DEFENSE RECOURS': 'DEFENSE RECOURS',
    'PROTECTION JURIDIQUE': 'PJ'
  }
  
  return garanties.map(g => {
    const upper = String(g).toUpperCase().trim()
    return mapping[upper] || upper
  })
}

/**
 * Vérifie la validité des dates
 */
function validateDates(debut, fin) {
  const warnings = []
  
  if (!debut) {
    warnings.push('Date de début manquante')
  }
  if (!fin) {
    warnings.push('Date de fin manquante')
  }
  
  if (debut && fin) {
    const d1 = new Date(debut)
    const d2 = new Date(fin)
    
    if (d2 <= d1) {
      warnings.push('Date de fin antérieure ou égale à la date de début')
    }
    
    const today = new Date()
    if (d2 < today) {
      warnings.push('Attestation expirée (fin: ' + fin + ')')
    }
  }
  
  return warnings
}

/**
 * Post-traitement et validation des données extraites
 */
function validateAndNormalize(extracted) {
  const warnings = []
  const normalized = { ...extracted }
  
  // Normaliser les garanties
  normalized.garanties = normalizeGaranties(normalized.garanties)
  
  // Vérifier la RC obligatoire
  if (!normalized.garanties.includes('RC')) {
    warnings.push('Garantie Responsabilité Civile (RC) non détectée - obligatoire')
  }
  
  // Valider les dates
  const dateWarnings = validateDates(normalized.date_debut, normalized.date_fin)
  warnings.push(...dateWarnings)
  
  // Normaliser l'immatriculation
  if (normalized.vehicule_immat) {
    const clean = normalized.vehicule_immat.replace(/[\s-]/g, '').toUpperCase()
    if (clean.length === 7 && /^[A-Z]{2}\d{3}[A-Z]{2}$/.test(clean)) {
      normalized.vehicule_immat = clean.slice(0, 2) + '-' + clean.slice(2, 5) + '-' + clean.slice(5)
    }
  } else {
    warnings.push('Immatriculation non détectée')
  }
  
  // Vérifier la compagnie
  if (!normalized.compagnie) {
    warnings.push('Compagnie d\'assurance non détectée')
  }
  
  // Calculer la confiance
  const requiredFields = ['compagnie', 'vehicule_immat', 'date_debut', 'date_fin']
  const presentRequired = requiredFields.filter(f => normalized[f]).length
  const hasRC = normalized.garanties.includes('RC') ? 0.1 : 0
  const confidence = Math.round((presentRequired / requiredFields.length) * 0.7 + hasRC + (warnings.length === 0 ? 0.2 : 0.05)) * 1000 / 1000
  
  return {
    fields: normalized,
    confidence: Math.min(0.98, confidence),
    warnings,
    isValid: normalized.vehicule_immat && normalized.date_debut && normalized.date_fin
  }
}

module.exports = {
  SCHEMA: ATTESTATION_SCHEMA,
  SYSTEM_PROMPT,
  USER_PROMPT,
  normalizeGaranties,
  validateDates,
  validateAndNormalize,
  documentType: 'attestation_assurance'
}
