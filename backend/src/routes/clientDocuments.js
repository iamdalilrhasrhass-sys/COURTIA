/**
 * clientDocuments.js — Routes de gestion des documents clients
 *
 * Upload, collecte, analyse et transmission aux compagnies.
 * LOT 4 — Backend Documents Clients
 */

const express = require('express')
const router = express.Router()
const multer = require('multer')
const rateLimit = require('express-rate-limit')
const pool = require('../db')
const verifyToken = require('../middleware/authMiddleware')
const porteeCabinet = require('../lib/porteeCabinet')
const documentStorage = require('../services/documentStorage')
const documentAnalysis = require('../services/documentAnalysis')
const documentLinks = require('../services/documentLinks')
const logger = require('../lib/logger')
const { messagePublic } = require('../lib/erreursPubliques')

// Configuration Multer (stockage en mémoire pour traitement)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB
    files: 10, // Max 10 fichiers par requête
  },
  fileFilter: (req, file, cb) => {
    const allowed = documentStorage.ALLOWED_MIMES
    if (allowed.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error(`Type de fichier non autorisé: ${file.mimetype}`), false)
    }
  },
})

// Rate limiter pour routes publiques
const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 requêtes max
  message: { error: 'Trop de requêtes. Réessayez dans quelques minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
})

// ============================================================================
// MIDDLEWARE : Vérifie que le client appartient au CABINET de l'appelant
//
// DÉFAUT FERMÉ (P3 SEC-023, mesuré en production le 20/09/2026)
// Ce contrôle filtrait sur `clients.user_id` — une colonne de propriété
// CONCURRENTE de `clients.courtier_id`, jamais renseignée par la création d'un
// client (routes/clients.js écrit `courtier_id`). Résultat : la comparaison
// était TOUJOURS fausse, et l'upload documentaire par client répondait 403 pour
// tout le monde, y compris au cabinet propriétaire du dossier. La fonction
// « déposez les pièces de ce client » était donc morte.
//
// Deux colonnes de propriété ne peuvent pas coexister sans qu'une des deux
// mente. La portée est désormais résolue par `lib/porteeCabinet` — seule
// autorité : appartenance par `clients.cabinet_id`, avec repli sur
// `clients.courtier_id` pour les lignes créées avant le rattachement au cabinet
// (aucune donnée existante ne disparaît).
//
// Une ressource HORS CABINET répond 404 (et non 403) : elle n'existe pas pour
// l'appelant, elle ne lui est pas simplement interdite.
// ============================================================================

async function porteeDocuments(req) {
  return porteeCabinet.resoudrePortee(req.app?.locals?.pool || pool, req)
}

/** Clause SQL de portée sur la table `clients` (alias `c`). */
function fragmentClients(portee, depart) {
  return porteeCabinet.fragment(portee, {
    cabinet: 'c.cabinet_id',
    proprietaire: 'c.courtier_id',
    depart,
  })
}

async function verifyClientOwnership(req, res, next) {
  try {
    const clientId = parseInt(req.params.id || req.params.clientId)
    const brokerId = req.user?.id || req.user?.userId
    const userId = Number(brokerId)

    if (!clientId || !Number.isFinite(userId) || userId <= 0) {
      return res.status(400).json({ error: 'Client ID ou authentification manquante' })
    }

    const portee = await porteeDocuments(req)
    const f = fragmentClients(portee, 2)
    const result = await pool.query(
      `SELECT c.id, c.courtier_id, c.cabinet_id FROM clients c WHERE c.id = $1 AND ${f.sql}`,
      [clientId, ...f.params]
    )

    if (result.rows.length === 0) {
      // Hors cabinet : 404, jamais un 403 qui confirmerait l'existence du dossier.
      return res.status(404).json({ error: 'not_found', message: 'Client introuvable.' })
    }

    req.clientId = clientId
    req.clientLigne = result.rows[0]
    req.brokerId = brokerId
    // Cabinet réel du client : c'est lui qui est estampillé sur les documents,
    // pas le cabinet « courant » de l'appelant (un collaborateur peut appartenir
    // à plusieurs cabinets).
    req.cabinetId = result.rows[0].cabinet_id || portee.cabinetId || null
    next()
  } catch (err) {
    logger.error({ error: err.message }, 'verifyClientOwnership error')
    res.status(500).json({ error: 'Erreur vérification client' })
  }
}

/**
 * Propriété d'un DOCUMENT : le document appartient à l'appelant si son client
 * appartient à un cabinet de l'appelant. Un seul chemin de résolution pour les
 * quatre routes (téléchargement, suppression, analyse) — avant ce correctif,
 * chacune comparait `clients.user_id`, colonne jamais renseignée, et répondait
 * donc 403 au cabinet propriétaire lui-même.
 */
async function chargerDocumentAutorise(req, res) {
  const documentId = parseInt(req.params.id)
  if (!Number.isFinite(documentId) || documentId <= 0) {
    res.status(400).json({ error: 'Identifiant de document invalide' })
    return null
  }
  const portee = await porteeDocuments(req)
  const f = fragmentClients(portee, 2)
  const result = await pool.query(
    `SELECT cd.*, c.courtier_id, c.cabinet_id
       FROM client_documents cd
       JOIN clients c ON c.id = cd.client_id
      WHERE cd.id = $1 AND cd.deleted_at IS NULL AND ${f.sql}`,
    [documentId, ...f.params]
  )
  if (result.rows.length === 0) {
    res.status(404).json({ error: 'not_found', message: 'Document introuvable.' })
    return null
  }
  return { documentId, doc: result.rows[0] }
}

// ============================================================================
// ROUTES PROTÉGÉES (Auth required)
// ============================================================================

/**
 * POST /api/clients/:id/documents
 * Upload un ou plusieurs documents pour un client
 */
router.post('/clients/:id/documents',
  verifyToken,
  verifyClientOwnership,
  upload.array('files', 10),
  async (req, res) => {
    try {
      const { clientId, brokerId } = req
      const files = req.files || []
      const { document_type, source = 'manual' } = req.body

      if (files.length === 0) {
        return res.status(400).json({ error: 'Aucun fichier fourni' })
      }

      const results = []

      for (const file of files) {
        try {
          // Sauvegarder le fichier
          const stored = await documentStorage.save(file.buffer, {
            clientId,
            originalFilename: file.originalname,
            mimetype: file.mimetype,
          })

          // Analyse heuristique
          const analysis = await documentAnalysis.analyzeDocument(file.buffer, {
            filename: file.originalname,
            mimetype: file.mimetype,
            fileSize: file.size,
          })

          // Déterminer le type (explicite ou détecté)
          const finalType = document_type || analysis.type

          // Insérer en base
          const insertResult = await pool.query(
            `INSERT INTO client_documents
             (client_id, broker_id, document_type, original_filename, storage_path,
              mime_type, file_size_bytes, file_hash, source, analysis_status, analysis_result)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'completed', $10)
             RETURNING id, document_type, original_filename, uploaded_at`,
            [
              clientId, brokerId, finalType, file.originalname, stored.storagePath,
              file.mimetype, stored.size, stored.hash, source, JSON.stringify(analysis)
            ]
          )

          results.push({
            id: insertResult.rows[0].id,
            filename: file.originalname,
            type: finalType,
            typeLabel: documentAnalysis.getDocumentTypeDefinition(finalType).label,
            size: stored.size,
            analysis,
            uploadedAt: insertResult.rows[0].uploaded_at,
          })
        } catch (fileErr) {
          results.push({
            filename: file.originalname,
            error: fileErr.message,
          })
        }
      }

      const success = results.filter(r => !r.error)
      const failed = results.filter(r => r.error)

      res.status(success.length > 0 ? 201 : 400).json({
        uploaded: success.length,
        failed: failed.length,
        documents: success,
        errors: failed,
      })
    } catch (err) {
      logger.error({ error: err.message }, 'document upload error')
      res.status(500).json({ error: 'Erreur upload document', details: messagePublic(err, { statut: 500 }) })
    }
  }
)

/**
 * GET /api/clients/:id/documents
 * Liste les documents d'un client
 */
router.get('/clients/:id/documents',
  verifyToken,
  verifyClientOwnership,
  async (req, res) => {
    try {
      const { clientId } = req
      const { type, status } = req.query

      // Portée CABINET sur la liste : une ligne ne sort que si son client
      // appartient à un cabinet de l'appelant (même autorité que l'upload).
      const portee = await porteeDocuments(req)
      const f = porteeCabinet.fragment(portee, {
        cabinet: 'c.cabinet_id',
        proprietaire: 'c.courtier_id',
        depart: 2,
      })

      let query = `
        SELECT cd.id, cd.document_type, cd.original_filename, cd.mime_type, cd.file_size_bytes,
               cd.status, cd.source, cd.analysis_status, cd.analysis_result, cd.uploaded_at, cd.analyzed_at
        FROM client_documents cd
        JOIN clients c ON c.id = cd.client_id
        WHERE cd.client_id = $1 AND cd.deleted_at IS NULL AND ${f.sql}
      `
      const params = [clientId, ...f.params]
      let paramIndex = f.suivant

      if (type) {
        query += ` AND cd.document_type = $${paramIndex++}`
        params.push(type)
      }

      if (status) {
        query += ` AND cd.status = $${paramIndex++}`
        params.push(status)
      }

      query += ' ORDER BY cd.uploaded_at DESC'

      const result = await pool.query(query, params)

      res.json({
        count: result.rows.length,
        documents: result.rows.map(doc => ({
          id: doc.id,
          type: doc.document_type,
          typeLabel: documentAnalysis.getDocumentTypeDefinition(doc.document_type).label,
          filename: doc.original_filename,
          mimeType: doc.mime_type,
          size: doc.file_size_bytes,
          status: doc.status,
          source: doc.source,
          analysisStatus: doc.analysis_status,
          analysis: doc.analysis_result,
          uploadedAt: doc.uploaded_at,
          analyzedAt: doc.analyzed_at,
        })),
      })
    } catch (err) {
      logger.error({ error: err.message }, 'list documents error')
      res.status(500).json({ error: 'Erreur récupération documents' })
    }
  }
)

/**
 * GET /api/documents/:id
 * Télécharge un document (avec vérification ownership)
 */
router.get('/documents/:id',
  verifyToken,
  async (req, res) => {
    try {
      // Résolution par la PORTÉE CABINET (voir chargerDocumentAutorise).
      const trouve = await chargerDocumentAutorise(req, res)
      if (!trouve) return
      const { doc } = trouve

      // Stream le fichier
      const stream = documentStorage.getStream(doc.storage_path)
      res.setHeader('Content-Type', doc.mime_type)
      res.setHeader('Content-Disposition', `attachment; filename="${doc.original_filename}"`)
      stream.pipe(res)
    } catch (err) {
      logger.error({ error: err.message }, 'download document error')
      res.status(500).json({ error: 'Erreur téléchargement document' })
    }
  }
)

/**
 * DELETE /api/documents/:id
 * Soft delete un document
 */
router.delete('/documents/:id',
  verifyToken,
  async (req, res) => {
    try {
      const trouve = await chargerDocumentAutorise(req, res)
      if (!trouve) return
      const { documentId } = trouve

      // Soft delete
      await pool.query(
        `UPDATE client_documents SET deleted_at = NOW(), status = 'deleted' WHERE id = $1`,
        [documentId]
      )

      res.json({ success: true, message: 'Document supprimé' })
    } catch (err) {
      logger.error({ error: err.message }, 'delete document error')
      res.status(500).json({ error: 'Erreur suppression document' })
    }
  }
)

/**
 * POST /api/documents/:id/analyze
 * Relance l'analyse d'un document
 */
router.post('/documents/:id/analyze',
  verifyToken,
  async (req, res) => {
    try {
      const trouve = await chargerDocumentAutorise(req, res)
      if (!trouve) return
      const { documentId, doc } = trouve

      // Mettre à jour statut
      await pool.query(
        `UPDATE client_documents SET analysis_status = 'analyzing' WHERE id = $1`,
        [documentId]
      )

      // Récupérer le buffer et analyser
      const buffer = await documentStorage.getBuffer(doc.storage_path)
      const analysis = await documentAnalysis.analyzeDocument(buffer, {
        filename: doc.original_filename,
        mimetype: doc.mime_type,
        fileSize: doc.file_size_bytes,
      })

      // Sauvegarder résultat
      await pool.query(
        `UPDATE client_documents
         SET analysis_status = 'completed', analysis_result = $1, analyzed_at = NOW()
         WHERE id = $2`,
        [JSON.stringify(analysis), documentId]
      )

      res.json({
        documentId,
        analysis,
      })
    } catch (err) {
      logger.error({ error: err.message }, 'analyze document error')
      res.status(500).json({ error: 'Erreur analyse document' })
    }
  }
)

/**
 * POST /api/clients/:id/document-request
 * Génère un lien de collecte de documents
 */
router.post('/clients/:id/document-request',
  verifyToken,
  verifyClientOwnership,
  async (req, res) => {
    try {
      const { clientId, brokerId } = req
      const { requestedTypes = [], expiresInHours = 72, notes } = req.body

      const request = await documentLinks.createDocumentRequest({
        clientId,
        brokerId,
        requestedTypes,
        expiresInHours,
        notes,
      })

      res.status(201).json({
        success: true,
        request,
        message: `Lien de collecte créé, valide ${expiresInHours} heures`,
      })
    } catch (err) {
      logger.error({ error: err.message }, 'create document request error')
      res.status(500).json({ error: 'Erreur création lien collecte' })
    }
  }
)

/**
 * POST /api/clients/:id/transmit-documents
 * Envoie des documents à une compagnie d'assurance
 */
router.post('/clients/:id/transmit-documents',
  verifyToken,
  verifyClientOwnership,
  async (req, res) => {
    try {
      const { clientId, brokerId } = req
      const { documentIds, providerName, channel = 'email', metadata = {} } = req.body

      if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
        return res.status(400).json({ error: 'Liste de documents requise' })
      }

      if (!providerName) {
        return res.status(400).json({ error: 'Nom de la compagnie requis' })
      }

      // Vérifier que les documents appartiennent bien au client
      const docsResult = await pool.query(
        `SELECT id FROM client_documents
         WHERE id = ANY($1) AND client_id = $2 AND deleted_at IS NULL`,
        [documentIds, clientId]
      )

      if (docsResult.rows.length !== documentIds.length) {
        return res.status(400).json({ error: 'Certains documents sont invalides ou ne vous appartiennent pas' })
      }

      // Créer la transmission (STUB - sera complété pour envoi réel)
      const result = await pool.query(
        `INSERT INTO document_transmissions
         (client_id, broker_id, provider_name, channel, document_ids, status, metadata)
         VALUES ($1, $2, $3, $4, $5::jsonb, 'pending', $6::jsonb)
         RETURNING id, status, created_at`,
        [clientId, brokerId, providerName, channel, JSON.stringify(documentIds), JSON.stringify(metadata)]
      )

      // CORRECTION 2026-09-19 : la transmission restait 'pending' côté base mais
      // la réponse annonçait 'sent' avec success:true — le cabinet croyait les
      // pièces transmises à l'assureur et arrêtait de relancer. On ne ment plus :
      // statut réel 'prepared', réponse 501 explicite.
      await pool.query(
        `UPDATE document_transmissions SET status = 'prepared', metadata = metadata || '{"envoi_non_implemente": true}'::jsonb WHERE id = $1`,
        [result.rows[0].id]
      )

      res.status(501).json({
        success: false,
        email_sent: false,
        transmissionId: result.rows[0].id,
        status: 'prepared',
        error: 'envoi_non_implemente',
        message: `Transmission préparée pour ${providerName}, AUCUN envoi effectué : le canal (e-mail compagnie) n'est pas branché.`,
      })
    } catch (err) {
      logger.error({ error: err.message }, 'transmit documents error')
      res.status(500).json({ error: 'Erreur transmission documents' })
    }
  }
)

// ============================================================================
// ROUTES PUBLIQUES (Collecte via lien)
// ============================================================================

/**
 * GET /api/document-request/:token
 * Validation d'un lien de collecte (public)
 */
router.get('/document-request/:token',
  publicLimiter,
  async (req, res) => {
    try {
      const { token } = req.params
      const validation = await documentLinks.validateToken(token)

      if (!validation.valid) {
        return res.status(validation.code === 'NOT_FOUND' ? 404 : 400).json({
          valid: false,
          error: validation.error,
          code: validation.code,
        })
      }

      // Ne pas exposer toutes les infos sensibles
      const { request } = validation
      res.json({
        valid: true,
        request: {
          status: request.status,
          expiresAt: request.expiresAt,
          client: {
            firstName: request.client.firstName,
            // lastName masqué pour confidentialité
          },
          broker: {
            name: request.broker.name,
          },
          items: request.items.map(item => ({
            type: item.type,
            typeLabel: documentAnalysis.getDocumentTypeDefinition(item.type).label,
            status: item.status,
          })),
        },
      })
    } catch (err) {
      logger.error({ error: err.message }, 'validate token error')
      res.status(500).json({ error: 'Erreur validation lien' })
    }
  }
)

/**
 * POST /api/document-request/:token/upload
 * Upload via lien de collecte (public)
 */
router.post('/document-request/:token/upload',
  publicLimiter,
  upload.array('files', 10),
  async (req, res) => {
    try {
      const { token } = req.params
      const files = req.files || []
      const { document_type } = req.body

      // Valider le token
      const validation = await documentLinks.validateToken(token)
      if (!validation.valid) {
        return res.status(400).json({
          error: validation.error,
          code: validation.code,
        })
      }

      if (files.length === 0) {
        return res.status(400).json({ error: 'Aucun fichier fourni' })
      }

      const { request } = validation
      const results = []

      for (const file of files) {
        try {
          // Sauvegarder
          const stored = await documentStorage.save(file.buffer, {
            clientId: request.clientId,
            originalFilename: file.originalname,
            mimetype: file.mimetype,
          })

          // Analyser
          const analysis = await documentAnalysis.analyzeDocument(file.buffer, {
            filename: file.originalname,
            mimetype: file.mimetype,
            fileSize: file.size,
          })

          const finalType = document_type || analysis.type

          // Insérer en base
          const insertResult = await pool.query(
            `INSERT INTO client_documents
             (client_id, broker_id, document_type, original_filename, storage_path,
              mime_type, file_size_bytes, file_hash, source, analysis_status, analysis_result)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'collect_link', 'completed', $9)
             RETURNING id`,
            [
              request.clientId, request.brokerId, finalType, file.originalname,
              stored.storagePath, file.mimetype, stored.size, stored.hash, JSON.stringify(analysis)
            ]
          )

          const documentId = insertResult.rows[0].id

          // Marquer l'item comme reçu si type correspond
          await documentLinks.markItemReceived(request.id, finalType, documentId)

          results.push({
            id: documentId,
            filename: file.originalname,
            type: finalType,
            typeLabel: documentAnalysis.getDocumentTypeDefinition(finalType).label,
          })
        } catch (fileErr) {
          results.push({
            filename: file.originalname,
            error: fileErr.message,
          })
        }
      }

      const success = results.filter(r => !r.error)

      res.status(success.length > 0 ? 201 : 400).json({
        uploaded: success.length,
        documents: success,
        errors: results.filter(r => r.error),
        message: success.length > 0 ? 'Merci ! Vos documents ont été reçus.' : 'Erreur lors de l\'upload',
      })
    } catch (err) {
      logger.error({ error: err.message }, 'collect upload error')
      res.status(500).json({ error: 'Erreur upload documents' })
    }
  }
)

// ============================================================================
// ROUTES UTILITAIRES
// ============================================================================

/**
 * GET /api/document-types
 * Liste des types de documents disponibles
 */
router.get('/document-types',
  verifyToken,
  (req, res) => {
    res.json({
      types: documentAnalysis.listDocumentTypes(),
    })
  }
)

module.exports = router
