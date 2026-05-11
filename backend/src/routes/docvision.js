/**
 * LOT 10 - Routes Document Vision API
 * Extraction automatique de données depuis documents (RIB, carte grise, etc.)
 * 
 * @module routes/docvision
 */

const express = require('express')
const router = express.Router()
const pool = require('../db')
const logger = require('../lib/logger')
const { processDocument, applyExtractionToClient, reprocessExtraction, getExtractionStats } = require('../services/docvision/visionPipeline')
const { DOCUMENT_TYPES, getTypeName, isValidType } = require('../services/docvision/typeDetector')
const { getSupportedTypes } = require('../services/docvision/extractors')

/**
 * POST /api/docvision/extract/:documentId
 * Déclenche l'extraction automatique d'un document
 */
router.post('/extract/:documentId', async (req, res) => {
  try {
    const { documentId } = req.params
    const { document_type, auto_apply } = req.body
    const brokerId = req.user.id || req.user.userId
    
    if (!documentId || isNaN(parseInt(documentId))) {
      return res.status(400).json({ error: 'ID document invalide' })
    }
    
    // Valider le type si fourni
    if (document_type && !isValidType(document_type)) {
      return res.status(400).json({
        error: 'Type de document non supporté',
        supportedTypes: getSupportedTypes()
      })
    }
    
    const result = await processDocument({
      brokerId,
      clientDocumentId: parseInt(documentId),
      documentType: document_type,
      autoApply: auto_apply === true
    })
    
    if (result.success) {
      res.json({
        success: true,
        extraction: {
          id: result.extractionId,
          document_type: result.documentType,
          detected_type: result.detectedType,
          fields: result.fields,
          confidence: result.confidence,
          warnings: result.warnings,
          status: result.status
        },
        performance: {
          latency_ms: result.latencyMs,
          cost_usd: result.costUsd
        }
      })
    } else {
      res.status(422).json({
        success: false,
        error: result.error,
        extraction_id: result.extractionId,
        detected_type: result.detectedType
      })
    }
  } catch (err) {
    logger.error({ error: err.message, documentId: req.params.documentId }, 'Extract endpoint error')
    res.status(500).json({ error: 'Erreur lors de l\'extraction', details: err.message })
  }
})

/**
 * GET /api/docvision/extractions
 * Liste les extractions (avec filtres)
 */
router.get('/extractions', async (req, res) => {
  try {
    const brokerId = req.user.id || req.user.userId
    const { 
      client_id, 
      document_type, 
      status, 
      applied,
      limit = 50, 
      offset = 0,
      sort = 'created_at',
      order = 'DESC'
    } = req.query
    
    // Construire la requête
    let whereClause = 'WHERE de.broker_id = $1'
    const params = [brokerId]
    let paramIdx = 2
    
    if (client_id) {
      whereClause += ` AND de.client_id = $${paramIdx++}`
      params.push(parseInt(client_id))
    }
    
    if (document_type) {
      whereClause += ` AND de.document_type = $${paramIdx++}`
      params.push(document_type)
    }
    
    if (status) {
      whereClause += ` AND de.extraction_status = $${paramIdx++}`
      params.push(status)
    }
    
    if (applied !== undefined) {
      whereClause += ` AND de.applied_to_client = $${paramIdx++}`
      params.push(applied === 'true' || applied === true)
    }
    
    // Valider sort
    const allowedSorts = ['created_at', 'processed_at', 'confidence', 'document_type']
    const sortCol = allowedSorts.includes(sort) ? sort : 'created_at'
    const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'
    
    // Requête principale
    const result = await pool.query(`
      SELECT 
        de.id,
        de.client_document_id,
        de.client_id,
        de.document_type,
        de.detected_type,
        de.extraction_status as status,
        de.extracted_fields as fields,
        de.confidence,
        de.warnings,
        de.ai_model,
        de.ai_cost_usd as cost_usd,
        de.ai_latency_ms as latency_ms,
        de.applied_to_client as applied,
        de.applied_at,
        de.created_at,
        de.processed_at,
        c.nom as client_nom,
        c.prenom as client_prenom,
        cd.original_filename as document_filename
      FROM document_extractions de
      LEFT JOIN clients c ON de.client_id = c.id
      LEFT JOIN client_documents cd ON de.client_document_id = cd.id
      ${whereClause}
      ORDER BY de.${sortCol} ${sortOrder}
      LIMIT $${paramIdx++} OFFSET $${paramIdx}
    `, [...params, parseInt(limit), parseInt(offset)])
    
    // Compter le total
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM document_extractions de ${whereClause}`,
      params
    )
    
    res.json({
      extractions: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit: parseInt(limit),
      offset: parseInt(offset)
    })
  } catch (err) {
    logger.error({ error: err.message }, 'List extractions error')
    res.status(500).json({ error: 'Erreur lors de la récupération des extractions' })
  }
})

/**
 * GET /api/docvision/extractions/:id
 * Détail d'une extraction
 */
router.get('/extractions/:id', async (req, res) => {
  try {
    const { id } = req.params
    const brokerId = req.user.id || req.user.userId
    
    const result = await pool.query(`
      SELECT 
        de.*,
        c.nom as client_nom,
        c.prenom as client_prenom,
        c.email as client_email,
        cd.original_filename as document_filename,
        cd.mime_type as document_mime_type
      FROM document_extractions de
      LEFT JOIN clients c ON de.client_id = c.id
      LEFT JOIN client_documents cd ON de.client_document_id = cd.id
      WHERE de.id = $1 AND de.broker_id = $2
    `, [id, brokerId])
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Extraction non trouvée' })
    }
    
    const extraction = result.rows[0]
    
    res.json({
      extraction: {
        id: extraction.id,
        client_document_id: extraction.client_document_id,
        client_id: extraction.client_id,
        document_type: extraction.document_type,
        document_type_label: getTypeName(extraction.document_type),
        detected_type: extraction.detected_type,
        status: extraction.extraction_status,
        fields: extraction.extracted_fields,
        confidence: parseFloat(extraction.confidence),
        warnings: extraction.warnings,
        applied: extraction.applied_to_client,
        applied_at: extraction.applied_at,
        created_at: extraction.created_at,
        processed_at: extraction.processed_at,
        ai: {
          engine: extraction.ai_engine,
          model: extraction.ai_model,
          cost_usd: parseFloat(extraction.ai_cost_usd),
          latency_ms: extraction.ai_latency_ms
        },
        client: extraction.client_id ? {
          id: extraction.client_id,
          nom: extraction.client_nom,
          prenom: extraction.client_prenom,
          email: extraction.client_email
        } : null,
        document: {
          filename: extraction.document_filename,
          mime_type: extraction.document_mime_type
        }
      }
    })
  } catch (err) {
    logger.error({ error: err.message, id: req.params.id }, 'Get extraction error')
    res.status(500).json({ error: 'Erreur lors de la récupération de l\'extraction' })
  }
})

/**
 * POST /api/docvision/extractions/:id/apply
 * Applique les données extraites au client
 */
router.post('/extractions/:id/apply', async (req, res) => {
  try {
    const { id } = req.params
    const { overrides } = req.body
    const brokerId = req.user.id || req.user.userId
    
    const result = await applyExtractionToClient({
      extractionId: parseInt(id),
      brokerId,
      overrides: overrides || {}
    })
    
    res.json({
      success: true,
      client_id: result.clientId,
      applied_fields: result.appliedFields
    })
  } catch (err) {
    logger.error({ error: err.message, id: req.params.id }, 'Apply extraction error')
    res.status(400).json({ error: err.message })
  }
})

/**
 * POST /api/docvision/extractions/:id/reprocess
 * Re-traite une extraction
 */
router.post('/extractions/:id/reprocess', async (req, res) => {
  try {
    const { id } = req.params
    const brokerId = req.user.id || req.user.userId
    
    const result = await reprocessExtraction({
      extractionId: parseInt(id),
      brokerId
    })
    
    if (result.success) {
      res.json({
        success: true,
        extraction: {
          id: result.extractionId,
          document_type: result.documentType,
          fields: result.fields,
          confidence: result.confidence,
          warnings: result.warnings,
          status: result.status
        }
      })
    } else {
      res.status(422).json({
        success: false,
        error: result.error
      })
    }
  } catch (err) {
    logger.error({ error: err.message, id: req.params.id }, 'Reprocess extraction error')
    res.status(500).json({ error: err.message })
  }
})

/**
 * DELETE /api/docvision/extractions/:id
 * Supprime une extraction
 */
router.delete('/extractions/:id', async (req, res) => {
  try {
    const { id } = req.params
    const brokerId = req.user.id || req.user.userId
    
    const result = await pool.query(
      'DELETE FROM document_extractions WHERE id = $1 AND broker_id = $2 RETURNING id',
      [id, brokerId]
    )
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Extraction non trouvée ou accès non autorisé' })
    }
    
    res.json({ success: true, deleted_id: parseInt(id) })
  } catch (err) {
    logger.error({ error: err.message, id: req.params.id }, 'Delete extraction error')
    res.status(500).json({ error: 'Erreur lors de la suppression' })
  }
})

/**
 * GET /api/docvision/stats
 * Statistiques d'extraction
 */
router.get('/stats', async (req, res) => {
  try {
    const brokerId = req.user.id || req.user.userId
    
    const stats = await getExtractionStats(brokerId)
    
    res.json({
      stats: {
        ...stats,
        supported_types: getSupportedTypes().map(t => ({
          code: t,
          label: getTypeName(t)
        }))
      }
    })
  } catch (err) {
    logger.error({ error: err.message }, 'Get stats error')
    res.status(500).json({ error: 'Erreur lors de la récupération des statistiques' })
  }
})

/**
 * GET /api/docvision/types
 * Liste des types de documents supportés
 */
router.get('/types', (req, res) => {
  const types = getSupportedTypes().map(t => ({
    code: t,
    label: getTypeName(t)
  }))
  
  res.json({ types })
})

module.exports = router
