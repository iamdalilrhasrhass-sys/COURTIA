/**
 * LOT 10 - Vision Pipeline Orchestrateur
 * Traitement automatique des documents avec Claude Vision
 * 
 * @module docvision/visionPipeline
 */

const logger = require('../../lib/logger')
const pool = require('../../db')
const { callArkVision } = require('../arkEngine')
const { detectType, DOCUMENT_TYPES, getTypeName } = require('./typeDetector')
const { prepareForVision } = require('./pdfToImage')
const { getExtractor, isSupported } = require('./extractors')
const fs = require('fs').promises
const path = require('path')

// Répertoire de stockage des documents
const STORAGE_BASE = process.env.DOCUMENT_STORAGE_PATH || '/tmp/courtia_docs'

/**
 * Charge le contenu d'un document depuis client_documents
 * @param {number} documentId - ID du client_document
 * @returns {Promise<{buffer: Buffer, mimeType: string, filename: string, clientId: number}>}
 */
async function loadDocument(documentId) {
  const result = await pool.query(
    `SELECT cd.*, cd.storage_path, cd.mime_type, cd.original_filename, cd.client_id
     FROM client_documents cd
     WHERE cd.id = $1`,
    [documentId]
  )
  
  if (result.rows.length === 0) {
    throw new Error('Document non trouvé: ' + documentId)
  }
  
  const doc = result.rows[0]
  
  // Charger le fichier
  let buffer
  if (doc.storage_path) {
    try {
      buffer = await fs.readFile(doc.storage_path)
    } catch (err) {
      // Essayer chemin relatif
      const altPath = path.join(STORAGE_BASE, doc.storage_path)
      buffer = await fs.readFile(altPath)
    }
  } else if (doc.file_data) {
    // Base64 stocké en DB
    buffer = Buffer.from(doc.file_data, 'base64')
  } else {
    throw new Error('Aucune donnée fichier disponible pour document ' + documentId)
  }
  
  return {
    buffer,
    mimeType: doc.mime_type || 'application/octet-stream',
    filename: doc.original_filename || 'document',
    clientId: doc.client_id,
    declaredType: doc.document_type
  }
}

/**
 * Traite un document avec Claude Vision
 * 
 * @param {Object} params
 * @param {number} params.brokerId - ID du courtier
 * @param {number} params.clientDocumentId - ID du document à traiter
 * @param {string} params.documentType - Type de document (optionnel, sera détecté)
 * @param {boolean} params.autoApply - Appliquer automatiquement au client
 * @returns {Promise<Object>} Résultat de l'extraction
 */
async function processDocument({ brokerId, clientDocumentId, documentType, autoApply = false }) {
  const startTime = Date.now()
  let extractionId = null
  
  try {
    // 1. Vérifier que le document appartient bien au broker
    const docCheck = await pool.query(
      `SELECT cd.id, cd.client_id 
       FROM client_documents cd
       JOIN clients c ON cd.client_id = c.id
       WHERE cd.id = $1 AND c.broker_id = $2`,
      [clientDocumentId, brokerId]
    )
    
    if (docCheck.rows.length === 0) {
      throw new Error('Document non trouvé ou accès non autorisé')
    }
    
    const clientId = docCheck.rows[0].client_id
    
    // 2. Créer l'entrée d'extraction (status: processing)
    const insertRes = await pool.query(
      `INSERT INTO document_extractions 
       (broker_id, client_document_id, client_id, document_type, extraction_status, created_at)
       VALUES ($1, $2, $3, $4, 'processing', NOW())
       RETURNING id`,
      [brokerId, clientDocumentId, clientId, documentType || 'auto']
    )
    extractionId = insertRes.rows[0].id
    
    // 3. Charger le document
    const docData = await loadDocument(clientDocumentId)
    
    // 4. Détecter/confirmer le type
    const typeResult = detectType({
      filename: docData.filename,
      mimeType: docData.mimeType,
      declaredType: documentType || docData.declaredType
    })
    
    const finalType = typeResult.type
    
    // Vérifier si type supporté
    if (!isSupported(finalType)) {
      await pool.query(
        `UPDATE document_extractions 
         SET extraction_status = 'failed', 
             detected_type = $2,
             warnings = $3,
             processed_at = NOW()
         WHERE id = $1`,
        [extractionId, finalType, JSON.stringify(['Type de document non supporté pour extraction automatique: ' + finalType])]
      )
      
      return {
        success: false,
        extractionId,
        error: 'Type de document non supporté: ' + finalType,
        detectedType: finalType
      }
    }
    
    // 5. Préparer pour Vision (conversion PDF si nécessaire)
    const visionData = await prepareForVision(docData.buffer, docData.mimeType)
    
    // 6. Récupérer l'extractor
    const extractor = getExtractor(finalType)
    
    // 7. Appeler Claude Vision
    const visionResult = await callArkVision({
      system: extractor.SYSTEM_PROMPT,
      user: extractor.USER_PROMPT,
      images: [{
        buffer: visionData.buffer,
        mediaType: visionData.mediaType
      }],
      jsonMode: true,
      maxTokens: 2048,
      userId: brokerId,
      route: 'docvision/' + finalType
    })
    
    // 8. Post-traitement et validation
    let extractedData = visionResult.structured || {}
    let validationResult = { fields: extractedData, confidence: 0.5, warnings: [] }
    
    if (extractor.validateAndNormalize) {
      validationResult = extractor.validateAndNormalize(extractedData)
    }
    
    // Fusionner les warnings
    const allWarnings = [...(typeResult.warnings || []), ...(validationResult.warnings || [])]
    
    // Déterminer le status
    const status = validationResult.isValid !== false ? 'completed' : 'partial'
    
    // 9. Mettre à jour l'extraction
    const latencyMs = Date.now() - startTime
    
    await pool.query(
      `UPDATE document_extractions 
       SET extraction_status = $2,
           document_type = $3,
           detected_type = $4,
           extracted_fields = $5,
           confidence = $6,
           warnings = $7,
           ai_engine = 'claude_vision',
           ai_model = $8,
           ai_cost_usd = $9,
           ai_latency_ms = $10,
           processed_at = NOW()
       WHERE id = $1`,
      [
        extractionId,
        status,
        finalType,
        typeResult.type,
        JSON.stringify(validationResult.fields),
        validationResult.confidence,
        JSON.stringify(allWarnings),
        visionResult.model,
        visionResult.costUsd,
        latencyMs
      ]
    )
    
    logger.info({
      extractionId,
      documentType: finalType,
      confidence: validationResult.confidence,
      warnings: allWarnings.length,
      latencyMs,
      costUsd: visionResult.costUsd
    }, 'Document extraction completed')
    
    // 10. Auto-apply si demandé
    if (autoApply && validationResult.isValid !== false && clientId) {
      try {
        await applyExtractionToClient({ extractionId, brokerId })
      } catch (applyErr) {
        logger.warn({ error: applyErr.message, extractionId }, 'Auto-apply failed')
        allWarnings.push('Auto-apply échoué: ' + applyErr.message)
      }
    }
    
    return {
      success: true,
      extractionId,
      documentType: finalType,
      detectedType: typeResult.type,
      fields: validationResult.fields,
      confidence: validationResult.confidence,
      warnings: allWarnings,
      status,
      latencyMs,
      costUsd: visionResult.costUsd
    }
    
  } catch (err) {
    logger.error({ error: err.message, clientDocumentId, brokerId }, 'Document extraction failed')
    
    // Mettre à jour le status en erreur
    if (extractionId) {
      await pool.query(
        `UPDATE document_extractions 
         SET extraction_status = 'failed',
             warnings = $2,
             processed_at = NOW()
         WHERE id = $1`,
        [extractionId, JSON.stringify([err.message])]
      ).catch(() => {})
    }
    
    return {
      success: false,
      extractionId,
      error: err.message,
      latencyMs: Date.now() - startTime
    }
  }
}

/**
 * Applique les données extraites au client
 * 
 * @param {Object} params
 * @param {number} params.extractionId - ID de l'extraction
 * @param {number} params.brokerId - ID du courtier
 * @param {Object} params.overrides - Champs à forcer/modifier
 * @returns {Promise<Object>}
 */
async function applyExtractionToClient({ extractionId, brokerId, overrides = {} }) {
  // 1. Charger l'extraction
  const extResult = await pool.query(
    `SELECT * FROM document_extractions WHERE id = $1 AND broker_id = $2`,
    [extractionId, brokerId]
  )
  
  if (extResult.rows.length === 0) {
    throw new Error('Extraction non trouvée ou accès non autorisé')
  }
  
  const extraction = extResult.rows[0]
  
  if (!extraction.client_id) {
    throw new Error('Pas de client associé à cette extraction')
  }
  
  if (extraction.applied_to_client) {
    throw new Error('Extraction déjà appliquée')
  }
  
  const fields = { ...extraction.extracted_fields, ...overrides }
  const docType = extraction.document_type
  
  // 2. Construire la mise à jour selon le type
  let updateFields = {}
  
  switch (docType) {
    case DOCUMENT_TYPES.RIB:
      updateFields = {
        payment_method: JSON.stringify({
          type: 'virement',
          iban: fields.iban,
          bic: fields.bic,
          titulaire: fields.titulaire,
          banque: fields.banque,
          updated_at: new Date().toISOString()
        })
      }
      break
      
    case DOCUMENT_TYPES.CARTE_GRISE:
      // Ajouter/mettre à jour le véhicule
      const vehicleData = {
        immatriculation: fields.immatriculation,
        marque: fields.marque,
        modele: fields.modele,
        vin: fields.vin,
        energie: fields.energie,
        puissance_fiscale: fields.puissance_fiscale,
        puissance_kw: fields.puissance_kw,
        mise_en_circulation: fields.date_immatriculation,
        genre: fields.genre,
        places: fields.places,
        updated_at: new Date().toISOString()
      }
      
      // Récupérer les véhicules existants
      const clientRes = await pool.query('SELECT vehicles FROM clients WHERE id = $1', [extraction.client_id])
      let vehicles = clientRes.rows[0]?.vehicles || []
      if (typeof vehicles === 'string') vehicles = JSON.parse(vehicles)
      if (!Array.isArray(vehicles)) vehicles = []
      
      // Chercher si véhicule existe déjà (par immat ou VIN)
      const existingIdx = vehicles.findIndex(v => 
        v.immatriculation === fields.immatriculation || v.vin === fields.vin
      )
      
      if (existingIdx >= 0) {
        vehicles[existingIdx] = { ...vehicles[existingIdx], ...vehicleData }
      } else {
        vehicles.push(vehicleData)
      }
      
      updateFields = { vehicles: JSON.stringify(vehicles) }
      break
      
    case DOCUMENT_TYPES.PIECE_IDENTITE:
      updateFields = {
        identity_info: JSON.stringify({
          type_piece: fields.type_piece,
          numero: fields.numero,
          nom: fields.nom,
          prenom: fields.prenom,
          date_naissance: fields.date_naissance,
          lieu_naissance: fields.lieu_naissance,
          date_expiration: fields.date_expiration,
          updated_at: new Date().toISOString()
        })
      }
      
      // Mettre à jour aussi les champs directs si vides
      if (fields.date_naissance) {
        const clientCheck = await pool.query('SELECT date_naissance FROM clients WHERE id = $1', [extraction.client_id])
        if (!clientCheck.rows[0]?.date_naissance) {
          updateFields.date_naissance = fields.date_naissance
        }
      }
      break
      
    case DOCUMENT_TYPES.RELEVE_INFORMATION:
      updateFields = {
        insurance_history: JSON.stringify({
          coefficient_bonus_malus: fields.coefficient_bonus_malus,
          sinistres: fields.sinistres,
          annees_sans_sinistre: fields.annees_sans_sinistre,
          compagnie_precedente: fields.compagnie,
          updated_at: new Date().toISOString()
        })
      }
      break
      
    case DOCUMENT_TYPES.JUSTIF_DOMICILE:
      updateFields = {
        address_info: JSON.stringify({
          adresse: fields.adresse_ligne1,
          complement: fields.adresse_ligne2,
          code_postal: fields.code_postal,
          ville: fields.ville,
          date_justificatif: fields.date_emission,
          updated_at: new Date().toISOString()
        })
      }
      
      // Mettre à jour l'adresse principale si vide
      const addrCheck = await pool.query('SELECT adresse FROM clients WHERE id = $1', [extraction.client_id])
      if (!addrCheck.rows[0]?.adresse && fields.adresse_complete) {
        updateFields.adresse = fields.adresse_complete
      }
      break
      
    case DOCUMENT_TYPES.ATTESTATION_ASSURANCE:
      updateFields = {
        current_insurance: JSON.stringify({
          compagnie: fields.compagnie,
          contrat_numero: fields.contrat_numero,
          garanties: fields.garanties,
          date_debut: fields.date_debut,
          date_fin: fields.date_fin,
          vehicule_immat: fields.vehicule_immat,
          updated_at: new Date().toISOString()
        })
      }
      break
      
    default:
      throw new Error('Type de document non pris en charge pour l\'application automatique')
  }
  
  // 3. Appliquer les mises à jour
  if (Object.keys(updateFields).length > 0) {
    const setClauses = Object.keys(updateFields).map((k, i) => `${k} = $${i + 2}`)
    const values = Object.values(updateFields)
    
    await pool.query(
      `UPDATE clients SET ${setClauses.join(', ')}, updated_at = NOW() WHERE id = $1`,
      [extraction.client_id, ...values]
    )
  }
  
  // 4. Marquer l'extraction comme appliquée
  await pool.query(
    `UPDATE document_extractions SET applied_to_client = true, applied_at = NOW() WHERE id = $1`,
    [extractionId]
  )
  
  logger.info({ extractionId, clientId: extraction.client_id, docType }, 'Extraction applied to client')
  
  return {
    success: true,
    clientId: extraction.client_id,
    appliedFields: Object.keys(updateFields)
  }
}

/**
 * Re-traite une extraction existante
 */
async function reprocessExtraction({ extractionId, brokerId }) {
  // Récupérer l'extraction
  const extResult = await pool.query(
    `SELECT client_document_id, document_type FROM document_extractions WHERE id = $1 AND broker_id = $2`,
    [extractionId, brokerId]
  )
  
  if (extResult.rows.length === 0) {
    throw new Error('Extraction non trouvée')
  }
  
  const { client_document_id, document_type } = extResult.rows[0]
  
  // Supprimer l'ancienne extraction
  await pool.query('DELETE FROM document_extractions WHERE id = $1', [extractionId])
  
  // Relancer le traitement
  return processDocument({
    brokerId,
    clientDocumentId: client_document_id,
    documentType: document_type
  })
}

/**
 * Récupère les statistiques d'extraction
 */
async function getExtractionStats(brokerId) {
  const result = await pool.query(`
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE extraction_status = 'completed') as completed,
      COUNT(*) FILTER (WHERE extraction_status = 'partial') as partial,
      COUNT(*) FILTER (WHERE extraction_status = 'failed') as failed,
      COUNT(*) FILTER (WHERE applied_to_client = true) as applied,
      AVG(confidence) FILTER (WHERE confidence IS NOT NULL) as avg_confidence,
      SUM(ai_cost_usd) as total_cost_usd,
      AVG(ai_latency_ms) as avg_latency_ms,
      document_type,
      COUNT(*) FILTER (WHERE document_type = document_type) as by_type_count
    FROM document_extractions
    WHERE broker_id = $1
    GROUP BY ROLLUP(document_type)
    ORDER BY document_type NULLS FIRST
  `, [brokerId])
  
  const overall = result.rows.find(r => r.document_type === null) || {}
  const byType = result.rows.filter(r => r.document_type !== null)
  
  return {
    total: parseInt(overall.total) || 0,
    completed: parseInt(overall.completed) || 0,
    partial: parseInt(overall.partial) || 0,
    failed: parseInt(overall.failed) || 0,
    applied: parseInt(overall.applied) || 0,
    avgConfidence: parseFloat(overall.avg_confidence) || 0,
    totalCostUsd: parseFloat(overall.total_cost_usd) || 0,
    avgLatencyMs: parseInt(overall.avg_latency_ms) || 0,
    byType: byType.map(t => ({
      type: t.document_type,
      count: parseInt(t.by_type_count) || 0
    }))
  }
}

module.exports = {
  processDocument,
  applyExtractionToClient,
  reprocessExtraction,
  getExtractionStats,
  loadDocument
}
