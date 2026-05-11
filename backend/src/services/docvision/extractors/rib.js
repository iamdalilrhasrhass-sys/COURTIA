/**
 * LOT 10 - Extracteur RIB
 * Extraction automatique des données d'un Relevé d'Identité Bancaire
 * 
 * @module docvision/extractors/rib
 */

const logger = require('../../../lib/logger')

// Schéma JSON attendu
const RIB_SCHEMA = {
  type: 'object',
  properties: {
    iban: { type: 'string', description: 'IBAN complet (FR76 XXXX XXXX XXXX XXXX XXXX XXX)' },
    bic: { type: 'string', description: 'Code BIC/SWIFT (8 ou 11 caractères)' },
    titulaire: { type: 'string', description: 'Nom du titulaire du compte' },
    banque: { type: 'string', description: 'Nom de la banque' },
    agence: { type: 'string', description: 'Nom ou code de l\'agence (si visible)' },
    code_banque: { type: 'string', description: 'Code banque (5 chiffres)' },
    code_guichet: { type: 'string', description: 'Code guichet (5 chiffres)' },
    numero_compte: { type: 'string', description: 'Numéro de compte (11 caractères)' },
    cle_rib: { type: 'string', description: 'Clé RIB (2 chiffres)' },
    domiciliation: { type: 'string', description: 'Adresse de domiciliation bancaire' }
  },
  required: ['iban', 'bic', 'titulaire']
}

// Prompt système pour Claude Vision
const SYSTEM_PROMPT = `Tu es un expert en analyse de documents bancaires français.
Tu dois extraire les informations d'un Relevé d'Identité Bancaire (RIB).

INSTRUCTIONS:
- Extrais TOUTES les informations visibles
- L'IBAN doit inclure les espaces (format: FR76 XXXX XXXX XXXX XXXX XXXX XXX)
- Le BIC/SWIFT fait 8 ou 11 caractères
- Si une information n'est pas visible, mets null
- Le titulaire peut être une personne physique ou morale
- Vérifie la cohérence: code banque + guichet + compte + clé = partie numérique de l'IBAN

ATTENTION aux erreurs de lecture courantes:
- 0 (zéro) vs O (lettre O)
- 1 (un) vs I (lettre I) vs l (lettre L)
- 5 vs S
- 8 vs B

Réponds UNIQUEMENT avec un JSON valide.`

const USER_PROMPT = `Analyse ce RIB et extrais les informations bancaires.

Retourne un JSON avec ces champs:
- iban: IBAN complet avec espaces
- bic: Code BIC/SWIFT
- titulaire: Nom du titulaire
- banque: Nom de la banque
- agence: Agence (si visible)
- code_banque: 5 chiffres
- code_guichet: 5 chiffres
- numero_compte: 11 caractères
- cle_rib: 2 chiffres
- domiciliation: Adresse (si visible)

JSON:`

/**
 * Valide un IBAN français
 */
function validateIBAN(iban) {
  if (!iban) return { valid: false, error: 'IBAN manquant' }
  
  // Nettoyer l'IBAN
  const cleanIban = iban.replace(/\s/g, '').toUpperCase()
  
  // IBAN français = 27 caractères, commence par FR
  if (!cleanIban.startsWith('FR')) {
    return { valid: false, error: 'IBAN non français' }
  }
  
  if (cleanIban.length !== 27) {
    return { valid: false, error: 'IBAN invalide (longueur: ' + cleanIban.length + ', attendu: 27)' }
  }
  
  // Vérification checksum (algorithme MOD 97)
  const rearranged = cleanIban.slice(4) + cleanIban.slice(0, 4)
  const numStr = rearranged.split('').map(c => {
    const code = c.charCodeAt(0)
    return code >= 65 ? (code - 55).toString() : c
  }).join('')
  
  let remainder = ''
  for (const char of numStr) {
    remainder = (parseInt(remainder + char, 10) % 97).toString()
  }
  
  if (parseInt(remainder, 10) !== 1) {
    return { valid: false, error: 'IBAN checksum invalide' }
  }
  
  return { valid: true }
}

/**
 * Valide un BIC
 */
function validateBIC(bic) {
  if (!bic) return { valid: false, error: 'BIC manquant' }
  
  const cleanBic = bic.replace(/\s/g, '').toUpperCase()
  
  if (cleanBic.length !== 8 && cleanBic.length !== 11) {
    return { valid: false, error: 'BIC invalide (longueur: ' + cleanBic.length + ')' }
  }
  
  // Format: 4 lettres (banque) + 2 lettres (pays) + 2 alphanum (localisation) + 3 optionnel (branche)
  const bicRegex = /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/
  if (!bicRegex.test(cleanBic)) {
    return { valid: false, error: 'Format BIC invalide' }
  }
  
  return { valid: true }
}

/**
 * Post-traitement et validation des données extraites
 */
function validateAndNormalize(extracted) {
  const warnings = []
  const normalized = { ...extracted }
  
  // Normaliser l'IBAN
  if (normalized.iban) {
    const ibanVal = validateIBAN(normalized.iban)
    if (!ibanVal.valid) {
      warnings.push('IBAN: ' + ibanVal.error)
    } else {
      // Formater avec espaces
      const clean = normalized.iban.replace(/\s/g, '').toUpperCase()
      normalized.iban = clean.match(/.{1,4}/g).join(' ')
    }
  } else {
    warnings.push('IBAN non détecté')
  }
  
  // Normaliser le BIC
  if (normalized.bic) {
    normalized.bic = normalized.bic.replace(/\s/g, '').toUpperCase()
    const bicVal = validateBIC(normalized.bic)
    if (!bicVal.valid) {
      warnings.push('BIC: ' + bicVal.error)
    }
  } else {
    warnings.push('BIC non détecté')
  }
  
  // Normaliser le titulaire
  if (normalized.titulaire) {
    normalized.titulaire = normalized.titulaire.trim()
  } else {
    warnings.push('Titulaire non détecté')
  }
  
  // Calculer la confiance
  const requiredFields = ['iban', 'bic', 'titulaire', 'banque']
  const presentRequired = requiredFields.filter(f => normalized[f]).length
  const confidence = Math.round((presentRequired / requiredFields.length) * 0.7 + (warnings.length === 0 ? 0.3 : 0.15)) * 1000 / 1000
  
  return {
    fields: normalized,
    confidence: Math.min(0.98, confidence),
    warnings,
    isValid: warnings.length === 0
  }
}

module.exports = {
  SCHEMA: RIB_SCHEMA,
  SYSTEM_PROMPT,
  USER_PROMPT,
  validateIBAN,
  validateBIC,
  validateAndNormalize,
  documentType: 'rib'
}
