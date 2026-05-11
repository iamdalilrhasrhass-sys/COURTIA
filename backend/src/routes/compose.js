/**
 * Routes ARK Compose
 * Génération documents conformité (IPID, DDA, Devoir de Conseil)
 * 
 * @module routes/compose
 */

const express = require('express')
const router = express.Router()
const fs = require('fs').promises
const path = require('path')
const pool = require('../db')
const logger = require('../lib/logger')

const {
  composeIpid,
  composeDda,
  composeDevoirConseil,
  composeFullPack,
  getDocument,
  listDocuments,
  deleteDocument,
  updateSignatureStatus,
  getBrokerProfile
} = require('../services/compose/composer')

// ============================================
// DOCUMENTS
// ============================================

/**
 * GET /api/compose/documents
 * Liste des documents avec filtres
 */
router.get('/documents', async (req, res) => {
  try {
    const brokerId = req.user.id || req.user.userId
    const { client_id, type, status, limit = 50, offset = 0 } = req.query
    
    const result = await listDocuments({
      brokerId,
      clientId: client_id ? parseInt(client_id, 10) : null,
      documentType: type,
      status,
      limit: Math.min(parseInt(limit, 10) || 50, 100),
      offset: parseInt(offset, 10) || 0
    })
    
    res.json(result)
  } catch (err) {
    logger.error({ error: err.message }, 'compose:list:error')
    res.status(500).json({ error: 'Erreur lors de la récupération des documents' })
  }
})

/**
 * GET /api/compose/documents/:id
 * Métadonnées d'un document
 */
router.get('/documents/:id', async (req, res) => {
  try {
    const brokerId = req.user.id || req.user.userId
    const docId = parseInt(req.params.id, 10)
    
    const doc = await getDocument(docId, brokerId)
    
    // Ne pas exposer le chemin complet
    const response = {
      ...doc,
      storage_path: undefined,
      download_url: `/api/compose/documents/${doc.id}/download`
    }
    
    res.json(response)
  } catch (err) {
    if (err.message.includes('non trouvé')) {
      return res.status(404).json({ error: err.message })
    }
    logger.error({ error: err.message }, 'compose:get:error')
    res.status(500).json({ error: 'Erreur lors de la récupération du document' })
  }
})

/**
 * GET /api/compose/documents/:id/download
 * Téléchargement du PDF
 */
router.get('/documents/:id/download', async (req, res) => {
  try {
    const brokerId = req.user.id || req.user.userId
    const docId = parseInt(req.params.id, 10)
    
    const doc = await getDocument(docId, brokerId)
    
    // Vérifier que le fichier existe
    try {
      await fs.access(doc.storage_path)
    } catch {
      return res.status(404).json({ error: 'Fichier PDF non trouvé' })
    }
    
    // Nom de fichier lisible
    const typeNames = {
      'ipid': 'IPID',
      'dda': 'Document_Information_Distributeur',
      'devoir_conseil': 'Devoir_de_Conseil'
    }
    const typeName = typeNames[doc.document_type] || doc.document_type
    const filename = `${typeName}_${doc.client_id}_v${doc.version}.pdf`
    
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    
    const fileBuffer = await fs.readFile(doc.storage_path)
    res.send(fileBuffer)
  } catch (err) {
    if (err.message.includes('non trouvé')) {
      return res.status(404).json({ error: err.message })
    }
    logger.error({ error: err.message }, 'compose:download:error')
    res.status(500).json({ error: 'Erreur lors du téléchargement' })
  }
})

/**
 * DELETE /api/compose/documents/:id
 * Suppression d'un document
 */
router.delete('/documents/:id', async (req, res) => {
  try {
    const brokerId = req.user.id || req.user.userId
    const docId = parseInt(req.params.id, 10)
    
    const result = await deleteDocument(docId, brokerId)
    
    res.json(result)
  } catch (err) {
    if (err.message.includes('non trouvé')) {
      return res.status(404).json({ error: err.message })
    }
    logger.error({ error: err.message }, 'compose:delete:error')
    res.status(500).json({ error: 'Erreur lors de la suppression' })
  }
})

// ============================================
// GÉNÉRATION
// ============================================

/**
 * POST /api/compose/ipid
 * Génère un IPID
 */
router.post('/ipid', async (req, res) => {
  try {
    const brokerId = req.user.id || req.user.userId
    const { client_id, quote_id } = req.body
    
    if (!client_id) {
      return res.status(400).json({ error: 'client_id requis' })
    }
    
    const result = await composeIpid({
      brokerId,
      clientId: parseInt(client_id, 10),
      quoteId: quote_id ? parseInt(quote_id, 10) : null
    })
    
    res.json({
      success: true,
      document: {
        id: result.id,
        type: 'ipid',
        version: result.version,
        download_url: `/api/compose/documents/${result.id}/download`
      }
    })
  } catch (err) {
    logger.error({ error: err.message }, 'compose:ipid:error')
    res.status(500).json({ error: 'Erreur lors de la génération de l\'IPID', details: err.message })
  }
})

/**
 * POST /api/compose/dda
 * Génère un document DDA
 */
router.post('/dda', async (req, res) => {
  try {
    const brokerId = req.user.id || req.user.userId
    const { client_id } = req.body
    
    const result = await composeDda({
      brokerId,
      clientId: client_id ? parseInt(client_id, 10) : null
    })
    
    res.json({
      success: true,
      document: {
        id: result.id,
        type: 'dda',
        version: result.version,
        download_url: `/api/compose/documents/${result.id}/download`
      }
    })
  } catch (err) {
    logger.error({ error: err.message }, 'compose:dda:error')
    res.status(500).json({ error: 'Erreur lors de la génération du document DDA', details: err.message })
  }
})

/**
 * POST /api/compose/devoir-conseil
 * Génère un Devoir de Conseil
 */
router.post('/devoir-conseil', async (req, res) => {
  try {
    const brokerId = req.user.id || req.user.userId
    const { client_id, quote_id } = req.body
    
    if (!client_id) {
      return res.status(400).json({ error: 'client_id requis' })
    }
    
    const result = await composeDevoirConseil({
      brokerId,
      clientId: parseInt(client_id, 10),
      quoteId: quote_id ? parseInt(quote_id, 10) : null
    })
    
    res.json({
      success: true,
      document: {
        id: result.id,
        type: 'devoir_conseil',
        version: result.version,
        download_url: `/api/compose/documents/${result.id}/download`
      },
      recommendation: result.recommendation
    })
  } catch (err) {
    logger.error({ error: err.message }, 'compose:devoir-conseil:error')
    res.status(500).json({ error: 'Erreur lors de la génération du Devoir de Conseil', details: err.message })
  }
})

/**
 * POST /api/compose/pack
 * Génère les 3 documents en une seule requête
 */
router.post('/pack', async (req, res) => {
  try {
    const brokerId = req.user.id || req.user.userId
    const { client_id, quote_id } = req.body
    
    if (!client_id) {
      return res.status(400).json({ error: 'client_id requis' })
    }
    
    const result = await composeFullPack({
      brokerId,
      clientId: parseInt(client_id, 10),
      quoteId: quote_id ? parseInt(quote_id, 10) : null
    })
    
    res.json({
      success: result.success_count === result.total_count,
      success_count: result.success_count,
      total_count: result.total_count,
      documents: {
        ipid: result.ipid.error ? { error: result.ipid.error } : {
          id: result.ipid.id,
          download_url: `/api/compose/documents/${result.ipid.id}/download`
        },
        dda: result.dda.error ? { error: result.dda.error } : {
          id: result.dda.id,
          download_url: `/api/compose/documents/${result.dda.id}/download`
        },
        devoir_conseil: result.devoir_conseil.error ? { error: result.devoir_conseil.error } : {
          id: result.devoir_conseil.id,
          download_url: `/api/compose/documents/${result.devoir_conseil.id}/download`
        }
      }
    })
  } catch (err) {
    logger.error({ error: err.message }, 'compose:pack:error')
    res.status(500).json({ error: 'Erreur lors de la génération du pack', details: err.message })
  }
})

// ============================================
// SIGNATURE
// ============================================

/**
 * POST /api/compose/documents/:id/sign
 * Marque un document comme signé
 */
router.post('/documents/:id/sign', async (req, res) => {
  try {
    const brokerId = req.user.id || req.user.userId
    const docId = parseInt(req.params.id, 10)
    const { signed_by, signature_method, signature_proof } = req.body
    
    if (!signed_by || !signature_method) {
      return res.status(400).json({ error: 'signed_by et signature_method requis' })
    }
    
    const doc = await updateSignatureStatus(docId, brokerId, {
      signedBy: signed_by,
      signatureMethod: signature_method,
      signatureProof: signature_proof
    })
    
    res.json({
      success: true,
      document: {
        id: doc.id,
        status: doc.status,
        signed_at: doc.signed_at,
        signed_by: doc.signed_by
      }
    })
  } catch (err) {
    if (err.message.includes('non trouvé')) {
      return res.status(404).json({ error: err.message })
    }
    logger.error({ error: err.message }, 'compose:sign:error')
    res.status(500).json({ error: 'Erreur lors de la mise à jour de la signature' })
  }
})

// ============================================
// PROFIL COURTIER
// ============================================

/**
 * GET /api/compose/broker-profile
 * Récupère le profil courtier
 */
router.get('/broker-profile', async (req, res) => {
  try {
    const brokerId = req.user.id || req.user.userId
    
    const profile = await getBrokerProfile(brokerId)
    
    res.json(profile)
  } catch (err) {
    logger.error({ error: err.message }, 'compose:broker-profile:get:error')
    res.status(500).json({ error: 'Erreur lors de la récupération du profil' })
  }
})

/**
 * PUT /api/compose/broker-profile
 * Met à jour le profil courtier
 */
router.put('/broker-profile', async (req, res) => {
  try {
    const brokerId = req.user.id || req.user.userId
    const {
      orias_number,
      company_name,
      siret,
      legal_form,
      address,
      postal_code,
      city,
      country,
      phone,
      email,
      website,
      remuneration_type,
      remuneration_details,
      conflicts_disclosure,
      complaints_handling,
      supervisor_name,
      supervisor_address,
      rcp_insurer,
      rcp_policy_number,
      rcp_coverage_amount,
      financial_guarantee_insurer,
      financial_guarantee_amount,
      custom_branding
    } = req.body
    
    // Upsert
    const result = await pool.query(
      `INSERT INTO broker_profile_settings 
       (broker_id, orias_number, company_name, siret, legal_form, address, postal_code, city, country, phone, email, website, 
        remuneration_type, remuneration_details, conflicts_disclosure, complaints_handling, supervisor_name, supervisor_address,
        rcp_insurer, rcp_policy_number, rcp_coverage_amount, financial_guarantee_insurer, financial_guarantee_amount, custom_branding)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
       ON CONFLICT (broker_id) DO UPDATE SET
         orias_number = COALESCE(EXCLUDED.orias_number, broker_profile_settings.orias_number),
         company_name = COALESCE(EXCLUDED.company_name, broker_profile_settings.company_name),
         siret = COALESCE(EXCLUDED.siret, broker_profile_settings.siret),
         legal_form = COALESCE(EXCLUDED.legal_form, broker_profile_settings.legal_form),
         address = COALESCE(EXCLUDED.address, broker_profile_settings.address),
         postal_code = COALESCE(EXCLUDED.postal_code, broker_profile_settings.postal_code),
         city = COALESCE(EXCLUDED.city, broker_profile_settings.city),
         country = COALESCE(EXCLUDED.country, broker_profile_settings.country),
         phone = COALESCE(EXCLUDED.phone, broker_profile_settings.phone),
         email = COALESCE(EXCLUDED.email, broker_profile_settings.email),
         website = COALESCE(EXCLUDED.website, broker_profile_settings.website),
         remuneration_type = COALESCE(EXCLUDED.remuneration_type, broker_profile_settings.remuneration_type),
         remuneration_details = COALESCE(EXCLUDED.remuneration_details, broker_profile_settings.remuneration_details),
         conflicts_disclosure = COALESCE(EXCLUDED.conflicts_disclosure, broker_profile_settings.conflicts_disclosure),
         complaints_handling = COALESCE(EXCLUDED.complaints_handling, broker_profile_settings.complaints_handling),
         supervisor_name = COALESCE(EXCLUDED.supervisor_name, broker_profile_settings.supervisor_name),
         supervisor_address = COALESCE(EXCLUDED.supervisor_address, broker_profile_settings.supervisor_address),
         rcp_insurer = COALESCE(EXCLUDED.rcp_insurer, broker_profile_settings.rcp_insurer),
         rcp_policy_number = COALESCE(EXCLUDED.rcp_policy_number, broker_profile_settings.rcp_policy_number),
         rcp_coverage_amount = COALESCE(EXCLUDED.rcp_coverage_amount, broker_profile_settings.rcp_coverage_amount),
         financial_guarantee_insurer = COALESCE(EXCLUDED.financial_guarantee_insurer, broker_profile_settings.financial_guarantee_insurer),
         financial_guarantee_amount = COALESCE(EXCLUDED.financial_guarantee_amount, broker_profile_settings.financial_guarantee_amount),
         custom_branding = COALESCE(EXCLUDED.custom_branding, broker_profile_settings.custom_branding),
         updated_at = NOW()
       RETURNING *`,
      [
        brokerId, orias_number, company_name, siret, legal_form, address, postal_code, city, country || 'France',
        phone, email, website, remuneration_type, remuneration_details, conflicts_disclosure, complaints_handling,
        supervisor_name || 'ACPR', supervisor_address || '4 place de Budapest CS 92459 75436 Paris cedex 09',
        rcp_insurer, rcp_policy_number, rcp_coverage_amount, financial_guarantee_insurer, financial_guarantee_amount,
        JSON.stringify(custom_branding || {})
      ]
    )
    
    res.json({
      success: true,
      profile: result.rows[0]
    })
  } catch (err) {
    logger.error({ error: err.message }, 'compose:broker-profile:update:error')
    res.status(500).json({ error: 'Erreur lors de la mise à jour du profil' })
  }
})

// ============================================
// STATISTIQUES
// ============================================

/**
 * GET /api/compose/stats
 * Statistiques de génération
 */
router.get('/stats', async (req, res) => {
  try {
    const brokerId = req.user.id || req.user.userId
    
    const statsRes = await pool.query(
      `SELECT 
         document_type,
         COUNT(*) AS total,
         COUNT(*) FILTER (WHERE status = 'signed') AS signed,
         COUNT(*) FILTER (WHERE status = 'generated') AS pending,
         COUNT(*) FILTER (WHERE ai_generated = true) AS ai_generated
       FROM compliance_documents
       WHERE broker_id = $1
       GROUP BY document_type`,
      [brokerId]
    )
    
    const recentRes = await pool.query(
      `SELECT id, document_type, status, generated_at
       FROM compliance_documents
       WHERE broker_id = $1
       ORDER BY generated_at DESC
       LIMIT 5`,
      [brokerId]
    )
    
    res.json({
      by_type: statsRes.rows,
      recent: recentRes.rows,
      total_documents: statsRes.rows.reduce((acc, r) => acc + parseInt(r.total, 10), 0)
    })
  } catch (err) {
    logger.error({ error: err.message }, 'compose:stats:error')
    res.status(500).json({ error: 'Erreur lors de la récupération des statistiques' })
  }
})

module.exports = router