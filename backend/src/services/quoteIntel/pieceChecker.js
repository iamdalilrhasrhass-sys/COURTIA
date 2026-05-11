/**
 * LOT 11 — Quote Intelligence: Piece Checker
 * Compare les pièces obligatoires du provider avec les documents client disponibles
 * 
 * @module quoteIntel/pieceChecker
 */

const pool = require('../../db')
const logger = require('../../lib/logger')

/**
 * Mapping des types de documents (normalisation)
 * Clé = type stocké en base, Valeur = variations possibles
 */
const DOCUMENT_TYPE_ALIASES = {
  carte_grise: ['carte_grise', 'cg', 'certificat_immatriculation', 'carte-grise'],
  releve_information: ['releve_information', 'ri', 'releve_info', 'relevé_information'],
  piece_identite: ['piece_identite', 'cni', 'passeport', 'carte_identite', 'id', 'identite'],
  justif_domicile: ['justif_domicile', 'justificatif_domicile', 'facture_edf', 'attestation_hebergement'],
  permis_conduire: ['permis_conduire', 'permis', 'driving_license'],
  attestation_secu: ['attestation_secu', 'carte_vitale', 'attestation_securite_sociale', 'ameli'],
  bulletins_salaire: ['bulletins_salaire', 'fiches_paie', 'bulletin_salaire', 'fiche_paie'],
  questionnaire_sante: ['questionnaire_sante', 'questionnaire_medical', 'declaration_sante'],
  avis_imposition: ['avis_imposition', 'avis_impot', 'declaration_revenus'],
  kbis: ['kbis', 'extrait_kbis', 'k-bis'],
  rib: ['rib', 'releve_identite_bancaire', 'iban'],
  offre_pret: ['offre_pret', 'offre_de_pret', 'proposition_pret'],
  tableau_amortissement: ['tableau_amortissement', 'echeancier_pret'],
  bail: ['bail', 'contrat_location', 'contrat_bail'],
  titre_propriete: ['titre_propriete', 'acte_propriete', 'acte_notarie'],
  photo_vehicule: ['photo_vehicule', 'photos_auto', 'photo_voiture'],
  bilan_comptable: ['bilan_comptable', 'bilan', 'liasse_fiscale']
}

/**
 * Normalise un type de document vers sa forme canonique
 */
function normalizeDocType(docType) {
  if (!docType) return null
  const lowerType = docType.toLowerCase().replace(/-/g, '_')
  
  for (const [canonical, aliases] of Object.entries(DOCUMENT_TYPE_ALIASES)) {
    if (aliases.includes(lowerType) || canonical === lowerType) {
      return canonical
    }
  }
  
  return lowerType
}

/**
 * Vérifie si un document est périmé (> 3 mois pour certains types)
 */
function isDocumentOutdated(doc) {
  const THREE_MONTHS_MS = 90 * 24 * 60 * 60 * 1000
  const SIX_MONTHS_MS = 180 * 24 * 60 * 60 * 1000
  
  if (!doc.created_at) return false
  
  const docAge = Date.now() - new Date(doc.created_at).getTime()
  
  // Documents avec durée de validité courte (3 mois)
  const shortValidityTypes = ['justif_domicile', 'bulletins_salaire', 'attestation_secu']
  if (shortValidityTypes.includes(normalizeDocType(doc.document_type))) {
    return docAge > THREE_MONTHS_MS
  }
  
  // Documents avec durée de validité moyenne (6 mois)
  const mediumValidityTypes = ['avis_imposition', 'kbis', 'bilan_comptable']
  if (mediumValidityTypes.includes(normalizeDocType(doc.document_type))) {
    return docAge > SIX_MONTHS_MS
  }
  
  return false
}

/**
 * Récupère les documents d'un client
 */
async function getClientDocuments(clientId) {
  const result = await pool.query(
    `SELECT id, document_type, file_name, status, created_at, metadata
     FROM client_documents
     WHERE client_id = $1 AND status != 'deleted'
     ORDER BY created_at DESC`,
    [clientId]
  )
  return result.rows
}

/**
 * Récupère les pièces obligatoires d'un provider
 */
async function getProviderMandatoryDocs(providerId) {
  const result = await pool.query(
    `SELECT mandatory_documents FROM insurance_providers WHERE id = $1`,
    [providerId]
  )
  
  if (result.rows.length === 0) return []
  
  const mandatoryDocs = result.rows[0].mandatory_documents
  return Array.isArray(mandatoryDocs) ? mandatoryDocs : []
}

/**
 * Compare les pièces obligatoires du provider avec les documents disponibles
 * 
 * @param {Object} options
 * @param {number} options.clientId - ID du client
 * @param {number} options.providerId - ID du provider
 * @returns {Promise<Object>} { present, missing, outdated }
 */
async function checkPieces(options) {
  const { clientId, providerId } = options
  
  // Récupérer les données
  const [clientDocs, mandatoryDocs] = await Promise.all([
    getClientDocuments(clientId),
    getProviderMandatoryDocs(providerId)
  ])
  
  // Normaliser les types de documents client
  const normalizedClientDocs = clientDocs.map(doc => ({
    ...doc,
    normalized_type: normalizeDocType(doc.document_type)
  }))
  
  // Créer un map des documents par type normalisé
  const docsByType = new Map()
  for (const doc of normalizedClientDocs) {
    if (!docsByType.has(doc.normalized_type)) {
      docsByType.set(doc.normalized_type, [])
    }
    docsByType.get(doc.normalized_type).push(doc)
  }
  
  const present = []
  const missing = []
  const outdated = []
  
  for (const requiredType of mandatoryDocs) {
    const normalizedRequired = normalizeDocType(requiredType)
    const matchingDocs = docsByType.get(normalizedRequired)
    
    if (!matchingDocs || matchingDocs.length === 0) {
      // Document manquant
      missing.push({
        type: requiredType,
        normalized_type: normalizedRequired,
        label: getDocumentLabel(normalizedRequired)
      })
    } else {
      // Document présent - vérifier s'il est périmé
      const latestDoc = matchingDocs[0] // Déjà trié par date DESC
      
      if (isDocumentOutdated(latestDoc)) {
        outdated.push({
          type: requiredType,
          normalized_type: normalizedRequired,
          label: getDocumentLabel(normalizedRequired),
          document: {
            id: latestDoc.id,
            file_name: latestDoc.file_name,
            created_at: latestDoc.created_at
          }
        })
      } else {
        present.push({
          type: requiredType,
          normalized_type: normalizedRequired,
          label: getDocumentLabel(normalizedRequired),
          document: {
            id: latestDoc.id,
            file_name: latestDoc.file_name,
            created_at: latestDoc.created_at,
            status: latestDoc.status
          }
        })
      }
    }
  }
  
  return {
    present,
    missing,
    outdated,
    summary: {
      total_required: mandatoryDocs.length,
      total_present: present.length,
      total_missing: missing.length,
      total_outdated: outdated.length,
      completion_rate: mandatoryDocs.length > 0 
        ? Math.round((present.length / mandatoryDocs.length) * 100) 
        : 100
    }
  }
}

/**
 * Retourne un label lisible pour un type de document
 */
function getDocumentLabel(normalizedType) {
  const labels = {
    carte_grise: 'Carte grise',
    releve_information: 'Relevé d\'information',
    piece_identite: 'Pièce d\'identité',
    justif_domicile: 'Justificatif de domicile',
    permis_conduire: 'Permis de conduire',
    attestation_secu: 'Attestation Sécurité Sociale',
    bulletins_salaire: 'Bulletins de salaire',
    questionnaire_sante: 'Questionnaire de santé',
    avis_imposition: 'Avis d\'imposition',
    kbis: 'Extrait Kbis',
    rib: 'RIB',
    offre_pret: 'Offre de prêt',
    tableau_amortissement: 'Tableau d\'amortissement',
    bail: 'Bail / Contrat de location',
    titre_propriete: 'Titre de propriété',
    photo_vehicule: 'Photo du véhicule',
    bilan_comptable: 'Bilan comptable'
  }
  
  return labels[normalizedType] || normalizedType.replace(/_/g, ' ')
}

/**
 * Vérifie les pièces pour plusieurs providers
 */
async function checkPiecesBatch(clientId, providerIds) {
  const results = await Promise.all(
    providerIds.map(async providerId => {
      const check = await checkPieces({ clientId, providerId })
      return {
        providerId,
        ...check
      }
    })
  )
  
  return results
}

module.exports = {
  checkPieces,
  checkPiecesBatch,
  getClientDocuments,
  getProviderMandatoryDocs,
  normalizeDocType,
  isDocumentOutdated,
  getDocumentLabel
}
