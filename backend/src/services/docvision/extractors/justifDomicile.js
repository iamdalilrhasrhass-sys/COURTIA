/**
 * LOT 10 - Extracteur Justificatif de Domicile
 * Extraction automatique des données d'un justificatif de domicile
 * 
 * @module docvision/extractors/justifDomicile
 */

const logger = require('../../../lib/logger')

// Schéma JSON attendu
const JUSTIF_DOMICILE_SCHEMA = {
  type: 'object',
  properties: {
    type_justif: { 
      type: 'string', 
      enum: ['facture_energie', 'facture_telecom', 'facture_eau', 'avis_imposition', 'quittance_loyer', 'attestation_hebergement', 'taxe_habitation', 'taxe_fonciere', 'autre'],
      description: 'Type de justificatif' 
    },
    fournisseur: { type: 'string', description: 'Nom du fournisseur/émetteur' },
    nom_titulaire: { type: 'string', description: 'Nom sur le document' },
    prenom_titulaire: { type: 'string', description: 'Prénom sur le document' },
    adresse_ligne1: { type: 'string', description: 'Première ligne d\'adresse' },
    adresse_ligne2: { type: 'string', description: 'Complément d\'adresse' },
    code_postal: { type: 'string', description: 'Code postal (5 chiffres en France, 4 chiffres — NPA — en Suisse)' },
    ville: { type: 'string', description: 'Ville' },
    pays: { type: 'string', description: 'Pays (si précisé)' },
    numero_client: { type: 'string', description: 'N° client ou référence' },
    date_emission: { type: 'string', description: 'Date d\'émission/facture (YYYY-MM-DD)' },
    periode_debut: { type: 'string', description: 'Début de période couverte (YYYY-MM-DD)' },
    periode_fin: { type: 'string', description: 'Fin de période couverte (YYYY-MM-DD)' },
    montant_ttc: { type: 'number', description: 'Montant TTC (si facture)' }
  },
  required: ['type_justif', 'nom_titulaire', 'adresse_ligne1', 'code_postal', 'ville']
}

// Prompt système pour Claude Vision
// Le cabinet peut être français (code postal à 5 chiffres, fournisseurs EDF /
// Orange…) ou suisse (NPA à 4 chiffres, régies locales) : le prompt ne doit
// enfermer la lecture ni dans un pays ni dans un format. Il ne présume rien du
// fournisseur et laisse les exemples tels quels (ce ne sont que des exemples).
const SYSTEM_PROMPT = `Tu es un expert en lecture de justificatifs de domicile (France et Suisse).

TYPES DE JUSTIFICATIFS ACCEPTÉS:
1. FACTURES D'ÉNERGIE
2. FACTURES TELECOM
3. FACTURES D'EAU (régie, distributeur local)
4. AVIS D'IMPOSITION
5. TAXE D'HABITATION / TAXE FONCIÈRE
6. QUITTANCE DE LOYER
7. ATTESTATION D'HÉBERGEMENT

INFORMATIONS À EXTRAIRE:
- Adresse COMPLÈTE (n°, rue, CP, ville)
- Nom du titulaire
- Date du document (< 6 mois généralement requis)
- Type de document
- Émetteur/fournisseur

ATTENTION:
- Un justificatif doit dater de moins de 6 mois
- L'adresse doit être complète
- Ne pas confondre adresse de facturation et adresse du point de livraison

Réponds UNIQUEMENT avec un JSON valide.`

const USER_PROMPT = `Analyse ce justificatif de domicile et extrais les informations.

Retourne un JSON avec:
- type_justif: facture_energie/facture_telecom/facture_eau/avis_imposition/quittance_loyer/attestation_hebergement/taxe_habitation/taxe_fonciere/autre
- fournisseur: nom de l'émetteur
- nom_titulaire: nom (MAJUSCULES)
- prenom_titulaire: prénom
- adresse_ligne1: n° et rue
- adresse_ligne2: complément
- code_postal: code postal tel qu'imprimé (5 chiffres en France, 4 chiffres — NPA — en Suisse)
- ville: ville
- pays: pays (si précisé)
- numero_client: référence client
- date_emission: YYYY-MM-DD
- periode_debut: YYYY-MM-DD (si applicable)
- periode_fin: YYYY-MM-DD (si applicable)
- montant_ttc: montant (si facture)

JSON:`

/**
 * Détecte le type de justificatif
 */
function detectJustifType(text, fournisseur) {
  if (!text && !fournisseur) return 'autre'
  
  const combined = ((text || '') + ' ' + (fournisseur || '')).toUpperCase()
  
  // Énergie
  if (/EDF|ENGIE|TOTAL ?ENERGIES|GAZ DE FRANCE|DIRECT ENERGIE|ENI|ELECTRICITE|ENERGIE/.test(combined)) {
    return 'facture_energie'
  }
  
  // Télécom
  if (/ORANGE|SFR|FREE|BOUYGUES|SOSH|RED|B&YOU|NUMERICABLE|MOBILE|INTERNET|FIBRE/.test(combined)) {
    return 'facture_telecom'
  }
  
  // Eau
  if (/VEOLIA|SUEZ|SAUR|EAU|ASSAINISSEMENT/.test(combined)) {
    return 'facture_eau'
  }
  
  // Impôts
  if (/AVIS D.IMPOSITION|IMPOT|IMPÔT|REVENUS|DIRECTION GENERALE DES FINANCES/.test(combined)) {
    return 'avis_imposition'
  }
  
  // Taxe habitation/foncière
  if (/TAXE D.HABITATION|TAXE HABITATION/.test(combined)) {
    return 'taxe_habitation'
  }
  if (/TAXE FONCI[EÈ]RE|TAXE FONCIERE/.test(combined)) {
    return 'taxe_fonciere'
  }
  
  // Loyer
  if (/QUITTANCE|LOYER|BAILLEUR|LOCATAIRE/.test(combined)) {
    return 'quittance_loyer'
  }
  
  // Hébergement
  if (/ATTESTATION D.H[EÉ]BERGEMENT|HEBERGE/.test(combined)) {
    return 'attestation_hebergement'
  }
  
  return 'autre'
}

/**
 * Valide un groupe de chiffres comme code postal : français (5 chiffres) ou
 * suisse (NPA à 4 chiffres). Fonction interne, sans nettoyage.
 */
function validerChiffres(chiffres) {
  if (/^\d{4}$/.test(chiffres)) {
    const npa = parseInt(chiffres, 10)
    if (npa < 1000 || npa > 9999) {
      return { valid: false, error: 'NPA hors plage valide (1000-9999)' }
    }
    return { valid: true, pays: 'CH', format: 'npa' }
  }
  if (/^\d{5}$/.test(chiffres)) {
    const num = parseInt(chiffres, 10)
    if (num < 1000 || num > 98999) {
      return { valid: false, error: 'Code postal hors plage valide' }
    }
    return { valid: true, pays: 'FR', format: 'code_postal' }
  }
  return null
}

/**
 * Valide le code postal du document : français (5 chiffres) OU suisse (NPA à
 * 4 chiffres).
 *
 * POURQUOI : la version précédente n'acceptait que 5 chiffres. Un cabinet
 * suisse ne pouvait donc jamais valider un justificatif de domicile réel
 * (« 1844 Villeneuve », « 1201 Genève », « 3003 Berne ») : le document était
 * rejeté comme invalide alors qu'il était parfaitement lisible.
 *
 * Les deux formats sont disjoints (4 vs 5 chiffres) : accepter le NPA suisse
 * n'assouplit RIEN pour la France, où un code à 4 chiffres reste refusé.
 * Le pays détecté est renvoyé pour que l'appelant sache ce qu'il a lu, ainsi
 * que le groupe de chiffres isolé quand la lecture a collé le code postal et la
 * ville (« 1844Villeneuve »).
 */
function validateCodePostal(cp) {
  if (!cp) return { valid: false, error: 'Code postal manquant' }

  const clean = String(cp).replace(/\s/g, '')

  // 1. Cas nominal : le champ ne contient que le code.
  const direct = validerChiffres(clean)
  if (direct) return direct

  // Un nombre de 6 chiffres ou plus n'est jamais un code postal (4 ou 5
  // chiffres). Sans ce refus, « 123456 » livrerait « 12345 » par extraction
  // partielle — un code postal qui n'est pas sur le document.
  if (/\d{6,}/.test(clean)) {
    return {
      valid: false,
      error: 'Code postal invalide (5 chiffres en France, 4 chiffres — NPA — en Suisse)',
    }
  }

  // 2. Code postal collé à la ville ou accompagné d'un complément : on isole le
  // SEUL groupe de 4 ou 5 chiffres. Deux groupes candidats = ambigu, on refuse
  // plutôt que de choisir au hasard.
  const groupes = clean.match(/\d{4,5}/g) || []
  if (groupes.length === 1) {
    const isole = validerChiffres(groupes[0])
    if (isole) return { ...isole, extrait: groupes[0] }
  }

  return {
    valid: false,
    error: 'Code postal invalide (5 chiffres en France, 4 chiffres — NPA — en Suisse)',
  }
}

/**
 * Vérifie l'ancienneté du document
 */
function checkDocumentAge(dateEmission) {
  if (!dateEmission) return { valid: null, warning: 'Date d\'émission manquante' }
  
  const emission = new Date(dateEmission)
  const today = new Date()
  const diffMs = today - emission
  const diffMonths = diffMs / (1000 * 60 * 60 * 24 * 30.44)
  
  if (diffMonths > 6) {
    return {
      valid: false,
      error: 'Document de plus de 6 mois (' + Math.round(diffMonths) + ' mois)',
      ageMonths: Math.round(diffMonths)
    }
  }
  
  if (diffMonths > 3) {
    return {
      valid: true,
      warning: 'Document de plus de 3 mois',
      ageMonths: Math.round(diffMonths)
    }
  }
  
  return { valid: true, ageMonths: Math.round(diffMonths) }
}

/**
 * Post-traitement et validation des données extraites
 */
function validateAndNormalize(extracted) {
  const warnings = []
  const normalized = { ...extracted }
  
  // Détecter/normaliser le type
  if (!normalized.type_justif || normalized.type_justif === 'autre') {
    const detectedType = detectJustifType(JSON.stringify(extracted), normalized.fournisseur)
    normalized.type_justif = detectedType
  }
  
  // Normaliser le nom (majuscules)
  if (normalized.nom_titulaire) {
    normalized.nom_titulaire = normalized.nom_titulaire.toUpperCase().trim()
  } else {
    warnings.push('Nom du titulaire non détecté')
  }
  
  // Valider le code postal
  if (normalized.code_postal) {
    normalized.code_postal = normalized.code_postal.replace(/\s/g, '')
    const cpVal = validateCodePostal(normalized.code_postal)
    if (!cpVal.valid) {
      warnings.push('Code postal: ' + cpVal.error)
    } else if (cpVal.extrait) {
      // « 1844Villeneuve » (code postal collé à la ville) : on ne conserve que
      // les chiffres réellement lus sur le document.
      normalized.code_postal = cpVal.extrait
    }
  } else {
    warnings.push('Code postal non détecté')
  }
  
  // Normaliser la ville (majuscules)
  if (normalized.ville) {
    normalized.ville = normalized.ville.toUpperCase().trim()
  } else {
    warnings.push('Ville non détectée')
  }
  
  // Vérifier l'adresse
  if (!normalized.adresse_ligne1) {
    warnings.push('Adresse (ligne 1) non détectée')
  }
  
  // Vérifier l'ancienneté
  const ageCheck = checkDocumentAge(normalized.date_emission)
  if (ageCheck.error) {
    warnings.push(ageCheck.error)
  } else if (ageCheck.warning) {
    warnings.push(ageCheck.warning)
  }
  
  // Construire l'adresse complète
  const adresseParts = [
    normalized.adresse_ligne1,
    normalized.adresse_ligne2,
    normalized.code_postal && normalized.ville ? normalized.code_postal + ' ' + normalized.ville : null,
    normalized.pays
  ].filter(Boolean)
  normalized.adresse_complete = adresseParts.join(', ')
  
  // Calculer la confiance
  const requiredFields = ['nom_titulaire', 'adresse_ligne1', 'code_postal', 'ville']
  const presentRequired = requiredFields.filter(f => normalized[f]).length
  const hasDate = normalized.date_emission && !ageCheck.error ? 0.15 : 0
  const confidence = Math.round((presentRequired / requiredFields.length) * 0.65 + hasDate + (warnings.filter(w => w.includes('non détecté')).length === 0 ? 0.2 : 0.05)) * 1000 / 1000

  return {
    fields: normalized,
    confidence: Math.min(0.98, confidence),
    warnings,
    // `isValid` doit être un VRAI booléen : l'expression `a && b && c && d`
    // renvoyait la DERNIÈRE valeur trouvée (par exemple la chaîne « VILLENEUVE »
    // au lieu de `true`). Un appelant qui teste `isValid === true` ou qui
    // transmet ce champ tel quel lisait donc autre chose qu'un verdict.
    isValid: Boolean(normalized.nom_titulaire && normalized.adresse_ligne1 && normalized.code_postal && normalized.ville)
  }
}

module.exports = {
  SCHEMA: JUSTIF_DOMICILE_SCHEMA,
  SYSTEM_PROMPT,
  USER_PROMPT,
  detectJustifType,
  validateCodePostal,
  checkDocumentAge,
  validateAndNormalize,
  documentType: 'justif_domicile'
}
