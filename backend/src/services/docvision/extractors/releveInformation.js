/**
 * LOT 10 - Extracteur Relevé d'Information
 * Extraction automatique des données d'un Relevé d'Information assurance auto
 * 
 * @module docvision/extractors/releveInformation
 */

const logger = require('../../../lib/logger')

// Schéma JSON attendu
const RELEVE_INFO_SCHEMA = {
  type: 'object',
  properties: {
    compagnie: { type: 'string', description: 'Nom de la compagnie d\'assurance' },
    contrat_numero: { type: 'string', description: 'Numéro du contrat' },
    souscripteur_nom: { type: 'string', description: 'Nom du souscripteur' },
    souscripteur_prenom: { type: 'string', description: 'Prénom du souscripteur' },
    vehicule_immat: { type: 'string', description: 'Immatriculation du véhicule concerné' },
    vehicule_marque: { type: 'string', description: 'Marque du véhicule' },
    vehicule_modele: { type: 'string', description: 'Modèle du véhicule' },
    periode_debut: { type: 'string', description: 'Date de début de période (YYYY-MM-DD)' },
    periode_fin: { type: 'string', description: 'Date de fin de période (YYYY-MM-DD)' },
    coefficient_bonus_malus: { type: 'number', description: 'Coefficient bonus/malus (CRM) - ex: 0.50' },
    bonus_50_depuis: { type: 'string', description: 'Date d\'obtention du bonus 50% (YYYY-MM-DD)' },
    annees_sans_sinistre: { type: 'number', description: 'Nombre d\'années sans sinistre responsable' },
    sinistres: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          date: { type: 'string', description: 'Date du sinistre (YYYY-MM-DD)' },
          type: { type: 'string', description: 'Type de sinistre' },
          responsabilite: { type: 'string', description: 'Taux de responsabilité (0%, 50%, 100%)' },
          indemnisation: { type: 'number', description: 'Montant indemnisé (si indiqué)' },
          description: { type: 'string', description: 'Description du sinistre' }
        }
      }
    },
    date_emission: { type: 'string', description: 'Date d\'émission du relevé (YYYY-MM-DD)' }
  },
  required: ['compagnie', 'coefficient_bonus_malus']
}

// Prompt système pour Claude Vision
const SYSTEM_PROMPT = `Tu es un expert en lecture de Relevés d'Information d'assurance automobile français.

INFORMATIONS CLÉS À EXTRAIRE:
1. COEFFICIENT BONUS/MALUS (CRM - Coefficient de Réduction/Majoration)
   - Varie de 0.50 (bonus max) à 3.50 (malus max)
   - Format: 0.50, 0.95, 1.00, 1.25, etc.
   - Peut être noté: "coefficient: 0.50" ou "CRM: 50%" ou "Bonus: -50%"

2. HISTORIQUE DES SINISTRES (5 ans glissants)
   - Date, type, responsabilité (0%, 50%, 100%)
   - Un sinistre responsable à 100% = +25% sur le coefficient
   - Un sinistre responsable à 50% = +12.5%

3. PÉRIODE COUVERTE
   - Date de début et fin du relevé
   - Souvent les 5 dernières années

ATTENTION:
- Le coefficient peut être exprimé en % ou en décimal (50% = 0.50)
- Convertir toujours en décimal (0.50, pas 50)
- Les dates doivent être au format YYYY-MM-DD
- Liste TOUS les sinistres même si responsabilité 0%

Réponds UNIQUEMENT avec un JSON valide.`

const USER_PROMPT = `Analyse ce Relevé d'Information et extrais les données d'assurance.

Retourne un JSON avec:
- compagnie: nom assureur
- contrat_numero: n° contrat
- souscripteur_nom: nom
- souscripteur_prenom: prénom
- vehicule_immat: plaque
- vehicule_marque: marque
- vehicule_modele: modèle
- periode_debut: YYYY-MM-DD
- periode_fin: YYYY-MM-DD
- coefficient_bonus_malus: nombre décimal (ex: 0.50)
- bonus_50_depuis: date obtention bonus 50 (si applicable)
- annees_sans_sinistre: nombre
- sinistres: [{ date, type, responsabilite, indemnisation, description }]
- date_emission: YYYY-MM-DD

JSON:`

/**
 * Valide un coefficient bonus/malus
 */
function validateCoefficient(coef) {
  if (coef === null || coef === undefined) {
    return { valid: false, error: 'Coefficient manquant' }
  }
  
  const num = typeof coef === 'string' ? parseFloat(coef.replace(',', '.')) : coef
  
  if (isNaN(num)) {
    return { valid: false, error: 'Coefficient non numérique' }
  }
  
  // Si > 1 et ressemble à un pourcentage (50 au lieu de 0.50)
  if (num > 3.5) {
    return { valid: false, error: 'Coefficient hors plage (max 3.50)', suggestion: num / 100 }
  }
  
  if (num < 0.50) {
    return { valid: false, error: 'Coefficient trop bas (min 0.50)' }
  }
  
  return { valid: true }
}

/**
 * Normalise un coefficient (convertit % en décimal)
 */
function normalizeCoefficient(coef) {
  if (!coef) return null
  
  let num = typeof coef === 'string' ? parseFloat(coef.replace(',', '.').replace('%', '')) : coef
  
  // Si c'est un pourcentage > 3.5, convertir
  if (num > 3.5 && num <= 350) {
    num = num / 100
  }
  
  return Math.round(num * 100) / 100
}

/**
 * Post-traitement et validation des données extraites
 */
function validateAndNormalize(extracted) {
  const warnings = []
  const normalized = { ...extracted }
  
  // Normaliser le coefficient
  if (normalized.coefficient_bonus_malus !== undefined && normalized.coefficient_bonus_malus !== null) {
    normalized.coefficient_bonus_malus = normalizeCoefficient(normalized.coefficient_bonus_malus)
    const coefVal = validateCoefficient(normalized.coefficient_bonus_malus)
    if (!coefVal.valid) {
      warnings.push('Coefficient: ' + coefVal.error)
      if (coefVal.suggestion) {
        normalized.coefficient_bonus_malus = coefVal.suggestion
      }
    }
  } else {
    warnings.push('Coefficient bonus/malus non détecté')
  }
  
  // Normaliser les sinistres
  if (normalized.sinistres && Array.isArray(normalized.sinistres)) {
    normalized.sinistres = normalized.sinistres.map(s => ({
      date: s.date || null,
      type: s.type || 'Non précisé',
      responsabilite: s.responsabilite || 'Non précisé',
      indemnisation: s.indemnisation ? parseFloat(s.indemnisation) : null,
      description: s.description || null
    }))
    
    // Vérifier cohérence coefficient / sinistres
    const sinistresResp = normalized.sinistres.filter(s => 
      s.responsabilite && (s.responsabilite.includes('100') || s.responsabilite.includes('50'))
    )
    
    if (sinistresResp.length > 0 && normalized.coefficient_bonus_malus === 0.50) {
      warnings.push('Incohérence: sinistres responsables détectés mais coefficient à 0.50')
    }
  } else {
    normalized.sinistres = []
  }
  
  // Vérifier la compagnie
  if (!normalized.compagnie) {
    warnings.push('Compagnie d\'assurance non détectée')
  }
  
  // Calculer la confiance
  const requiredFields = ['compagnie', 'coefficient_bonus_malus', 'souscripteur_nom']
  const presentRequired = requiredFields.filter(f => normalized[f]).length
  const confidence = Math.round((presentRequired / requiredFields.length) * 0.7 + (warnings.length === 0 ? 0.3 : 0.1)) * 1000 / 1000
  
  return {
    fields: normalized,
    confidence: Math.min(0.98, confidence),
    warnings,
    isValid: normalized.coefficient_bonus_malus && normalized.compagnie
  }
}

module.exports = {
  SCHEMA: RELEVE_INFO_SCHEMA,
  SYSTEM_PROMPT,
  USER_PROMPT,
  validateCoefficient,
  normalizeCoefficient,
  validateAndNormalize,
  documentType: 'releve_information'
}
