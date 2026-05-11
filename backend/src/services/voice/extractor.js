/**
 * Voice Extractor — Extraction IA des données client depuis transcription
 * LOT 9: Voice Intake
 * 
 * Utilise ARK (Claude) pour extraire informations structurées
 * @module voice/extractor
 */

const arkEngine = require('../arkEngine')
const logger = require('../../lib/logger')

// Schéma d'extraction structuré
const EXTRACTION_SCHEMA = {
  type: 'object',
  properties: {
    client: {
      type: 'object',
      properties: {
        prenom: { type: ['string', 'null'] },
        nom: { type: ['string', 'null'] },
        telephone: { type: ['string', 'null'] },
        email: { type: ['string', 'null'] },
        date_naissance: { type: ['string', 'null'], description: 'Format YYYY-MM-DD si mentionné' },
        adresse: { type: ['string', 'null'] },
        situation_familiale: { type: ['string', 'null'], description: 'célibataire, marié, pacsé, divorcé, veuf' },
        profession: { type: ['string', 'null'] },
        confidence: { type: 'number', minimum: 0, maximum: 1, description: 'Niveau de confiance 0-1' }
      },
      required: ['confidence']
    },
    besoins: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['auto', 'habitation', 'sante', 'prevoyance', 'pro', 'autre'] },
          detail: { type: 'string' },
          urgence: { type: 'string', enum: ['haute', 'normale', 'basse'] }
        },
        required: ['type', 'detail', 'urgence']
      }
    },
    situation_actuelle: { type: 'string', description: 'Résumé de la situation assurance actuelle du client' },
    objections: {
      type: 'array',
      items: { type: 'string' },
      description: 'Objections ou freins exprimés par le client'
    },
    pieces_demandees: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string', description: 'Type de document (carte grise, avis impôt, RIB, etc.)' },
          raison: { type: 'string', description: 'Pourquoi ce document est nécessaire' }
        },
        required: ['type', 'raison']
      }
    },
    prochaine_action: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['rappel', 'envoi_devis', 'rdv', 'envoi_documents'] },
        detail: { type: 'string' },
        deadline_iso: { type: ['string', 'null'], description: 'Date limite ISO si mentionnée' }
      },
      required: ['type', 'detail']
    },
    resume_court: { type: 'string', description: 'Résumé en 2-3 phrases de la conversation' },
    confidence_globale: { type: 'number', minimum: 0, maximum: 1, description: 'Confiance globale extraction 0-1' }
  },
  required: ['client', 'besoins', 'prochaine_action', 'resume_court', 'confidence_globale']
}

// Prompt système pour l'extraction
const EXTRACTION_SYSTEM_PROMPT = `Tu es un assistant expert en courtage d'assurance français.

Tu analyses la transcription d'un appel téléphonique entre un courtier et un client/prospect.

Ton rôle est d'extraire TOUTES les informations utiles pour pré-remplir une fiche CRM.

RÈGLES STRICTES:
1. N'invente JAMAIS d'information - si quelque chose n'est pas mentionné, mets null
2. Normalise les numéros de téléphone au format français (+33 ou 0X XX XX XX XX)
3. Détecte les besoins d'assurance même s'ils sont implicites
4. Identifie les objections pour aider le courtier à y répondre
5. Suggère les pièces à demander en fonction des besoins identifiés
6. Propose une prochaine action concrète avec deadline si possible

TYPES DE BESOINS:
- auto: véhicule, voiture, moto, scooter
- habitation: maison, appartement, locataire, propriétaire
- sante: mutuelle, complémentaire santé
- prevoyance: décès, invalidité, incapacité, obsèques
- pro: RC pro, multirisque pro, décennale, flotte
- autre: voyage, scolaire, animaux, etc.

PIÈCES TYPIQUES:
- Carte grise (auto)
- Permis de conduire (auto)
- Relevé d'information (auto)
- Avis d'imposition (tous)
- RIB (tous)
- Bail ou titre propriété (habitation)
- Carte d'identité (tous)
- Attestation précédent assureur (tous)

Réponds UNIQUEMENT avec un JSON valide respectant le schéma fourni.`

/**
 * Extrait les données structurées d'une transcription
 * @param {string} transcript - Transcription de l'appel
 * @param {Object} options
 * @param {number} [options.userId] - ID utilisateur pour logging ARK
 * @param {number} [options.clientId] - ID client existant (optionnel)
 * @returns {Promise<{ data: Object, costUsd: number, latencyMs: number }>}
 */
async function extractFromTranscript(transcript, options = {}) {
  const { userId = null, clientId = null } = options

  if (!transcript || transcript.trim().length === 0) {
    throw new Error('Transcription vide - impossible d\'extraire des données')
  }

  const startTime = Date.now()

  logger.info({
    transcriptLength: transcript.length,
    userId,
    clientId
  }, 'Extraction IA démarrée')

  try {
    const result = await arkEngine.callArkStructured({
      system: EXTRACTION_SYSTEM_PROMPT,
      user: `Voici la transcription d'un appel téléphonique à analyser:\n\n---\n${transcript}\n---\n\nExtrais toutes les informations pertinentes.`,
      schema: EXTRACTION_SCHEMA,
      userId,
      clientId,
      route: 'voice-intake-extract'
    })

    const latencyMs = Date.now() - startTime

    if (result.error) {
      logger.error({ error: result.error, message: result.message }, 'Erreur ARK extraction')
      throw new Error(result.message || 'Erreur lors de l\'extraction IA')
    }

    const extractedData = result.structured || {}

    // Valider et normaliser
    const normalizedData = normalizeExtractedData(extractedData)

    logger.info({
      latencyMs,
      costUsd: result.costUsd,
      confidence: normalizedData.confidence_globale,
      besoinsCount: normalizedData.besoins?.length || 0,
      hasClient: Boolean(normalizedData.client?.nom || normalizedData.client?.prenom)
    }, 'Extraction IA terminée')

    return {
      data: normalizedData,
      costUsd: result.costUsd || 0,
      latencyMs
    }

  } catch (err) {
    logger.error({ error: err.message }, 'Échec extraction IA')
    throw err
  }
}

/**
 * Normalise et complète les données extraites
 * @param {Object} data
 * @returns {Object}
 */
function normalizeExtractedData(data) {
  // S'assurer que tous les champs requis existent
  const normalized = {
    client: {
      prenom: null,
      nom: null,
      telephone: null,
      email: null,
      date_naissance: null,
      adresse: null,
      situation_familiale: null,
      profession: null,
      confidence: 0,
      ...(data.client || {})
    },
    besoins: Array.isArray(data.besoins) ? data.besoins : [],
    situation_actuelle: data.situation_actuelle || '',
    objections: Array.isArray(data.objections) ? data.objections : [],
    pieces_demandees: Array.isArray(data.pieces_demandees) ? data.pieces_demandees : [],
    prochaine_action: data.prochaine_action || { type: 'rappel', detail: 'Recontacter le client' },
    resume_court: data.resume_court || '',
    confidence_globale: data.confidence_globale || 0
  }

  // Normaliser téléphone français
  if (normalized.client.telephone) {
    normalized.client.telephone = normalizePhoneNumber(normalized.client.telephone)
  }

  // Normaliser email
  if (normalized.client.email) {
    normalized.client.email = normalized.client.email.toLowerCase().trim()
  }

  return normalized
}

/**
 * Normalise un numéro de téléphone français
 * @param {string} phone
 * @returns {string}
 */
function normalizePhoneNumber(phone) {
  if (!phone) return null
  
  // Retirer tout sauf les chiffres et le +
  let cleaned = phone.replace(/[^\d+]/g, '')
  
  // Convertir +33 en 0
  if (cleaned.startsWith('+33')) {
    cleaned = '0' + cleaned.slice(3)
  } else if (cleaned.startsWith('33') && cleaned.length === 11) {
    cleaned = '0' + cleaned.slice(2)
  }
  
  // Formater en XX XX XX XX XX si 10 chiffres
  if (cleaned.length === 10 && cleaned.startsWith('0')) {
    return cleaned.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5')
  }
  
  return cleaned
}

/**
 * Construit un objet client suggéré pour création/mise à jour
 * @param {Object} extractedData - Données extraites
 * @returns {Object} Objet client formaté pour l'API clients
 */
function buildSuggestedClient(extractedData) {
  const c = extractedData.client || {}
  
  return {
    prenom: c.prenom || '',
    nom: c.nom || '',
    email: c.email || '',
    telephone: c.telephone || '',
    date_naissance: c.date_naissance || null,
    adresse: c.adresse || '',
    situation_familiale: c.situation_familiale || null,
    profession: c.profession || '',
    notes: extractedData.resume_court || '',
    source: 'voice_intake',
    confidence: c.confidence || 0
  }
}

/**
 * Construit les besoins suggérés pour le devoir de conseil
 * @param {Object} extractedData
 * @returns {Array}
 */
function buildSuggestedNeeds(extractedData) {
  return (extractedData.besoins || []).map(b => ({
    type_assurance: b.type,
    detail: b.detail,
    urgence: b.urgence,
    source: 'voice_intake',
    statut: 'a_traiter'
  }))
}

/**
 * Construit les documents suggérés à demander
 * @param {Object} extractedData
 * @returns {Array}
 */
function buildSuggestedDocuments(extractedData) {
  return (extractedData.pieces_demandees || []).map(p => ({
    type: p.type,
    raison: p.raison,
    statut: 'a_demander'
  }))
}

/**
 * Construit l'action suivante suggérée
 * @param {Object} extractedData
 * @returns {Object}
 */
function buildSuggestedNextAction(extractedData) {
  const action = extractedData.prochaine_action || {}
  return {
    type: action.type || 'rappel',
    detail: action.detail || 'Recontacter le client',
    deadline_iso: action.deadline_iso || null
  }
}

module.exports = {
  extractFromTranscript,
  normalizeExtractedData,
  normalizePhoneNumber,
  buildSuggestedClient,
  buildSuggestedNeeds,
  buildSuggestedDocuments,
  buildSuggestedNextAction,
  EXTRACTION_SCHEMA
}
