/**
 * ARK Compose Orchestrator
 * Génération et stockage des documents de conformité
 * 
 * @module compose/composer
 */

const path = require('path')
const fs = require('fs').promises
const crypto = require('crypto')
const pool = require('../../db')
const logger = require('../../lib/logger')

const { generateIpid } = require('./templates/ipidTemplate')
const { generateDda } = require('./templates/ddaTemplate')
const { generateDevoirConseil } = require('./templates/devoirConseilTemplate')
const { 
  extractNeedsFromClient, 
  buildRecommendation, 
  generateIpidContent, 
  enrichQuoteData 
} = require('./composeAi')

// Chemin stockage (hors webroot)
const STORAGE_BASE = process.env.COMPOSE_STORAGE_PATH || '/root/courtia/storage/compliance'

/**
 * Assure que le dossier de stockage existe
 */
async function ensureStorageDir(brokerId, clientId) {
  const dir = path.join(STORAGE_BASE, String(brokerId), String(clientId))
  await fs.mkdir(dir, { recursive: true })
  return dir
}

/**
 * Génère un hash SHA-256 du PDF
 */
function hashPdf(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex')
}

/**
 * Récupère le profil courtier
 */
async function getBrokerProfile(brokerId) {
  const res = await pool.query(
    `SELECT bps.*, u.email AS user_email, u.name AS user_name
     FROM broker_profile_settings bps
     RIGHT JOIN users u ON u.id = bps.broker_id
     WHERE u.id = $1`,
    [brokerId]
  )
  
  if (res.rows.length === 0) {
    return {
      company_name: 'Cabinet à configurer',
      orias_number: null,
      remuneration_type: 'commissions',
      supervisor_name: 'ACPR',
      supervisor_address: '4 place de Budapest CS 92459 75436 Paris cedex 09'
    }
  }
  
  return res.rows[0]
}

/**
 * Récupère les données client
 */
async function getClientData(clientId, brokerId) {
  const res = await pool.query(
    'SELECT * FROM clients WHERE id = $1 AND broker_id = $2',
    [clientId, brokerId]
  )
  
  if (res.rows.length === 0) {
    throw new Error('Client non trouvé ou accès non autorisé')
  }
  
  return res.rows[0]
}

/**
 * Récupère les données d'un devis
 */
async function getQuoteData(quoteId, brokerId) {
  const res = await pool.query(
    `SELECT q.*, ip.name AS provider_name, ip.logo_url
     FROM quotes q
     LEFT JOIN insurance_providers ip ON ip.id = q.provider_id
     WHERE q.id = $1 AND q.broker_id = $2`,
    [quoteId, brokerId]
  )
  
  if (res.rows.length === 0) {
    throw new Error('Devis non trouvé ou accès non autorisé')
  }
  
  return res.rows[0]
}

/**
 * Sauvegarde un document de conformité en BDD
 */
async function saveComplianceDocument({
  brokerId,
  clientId,
  quoteId,
  documentType,
  storagePath,
  pdfHash,
  contentData,
  aiGenerated = true,
  aiReasoning = null
}) {
  // Vérifier si version existante
  const existingRes = await pool.query(
    `SELECT id, version FROM compliance_documents 
     WHERE broker_id = $1 AND client_id = $2 AND document_type = $3
     ORDER BY version DESC LIMIT 1`,
    [brokerId, clientId, documentType]
  )
  
  const version = existingRes.rows.length > 0 ? existingRes.rows[0].version + 1 : 1
  
  const res = await pool.query(
    `INSERT INTO compliance_documents 
     (broker_id, client_id, quote_id, document_type, status, version, storage_path, pdf_hash, ai_generated, ai_reasoning, content_data, generated_at)
     VALUES ($1, $2, $3, $4, 'generated', $5, $6, $7, $8, $9, $10, NOW())
     RETURNING *`,
    [brokerId, clientId, quoteId, documentType, version, storagePath, pdfHash, aiGenerated, aiReasoning, JSON.stringify(contentData)]
  )
  
  return res.rows[0]
}

// ============================================
// FONCTIONS DE GÉNÉRATION
// ============================================

/**
 * Génère un document IPID
 */
async function composeIpid({ brokerId, clientId, quoteId }) {
  logger.info({ brokerId, clientId, quoteId }, 'compose:ipid:start')
  
  const broker = await getBrokerProfile(brokerId)
  const client = await getClientData(clientId, brokerId)
  
  let quote = null
  let productData = {}
  let coverageData = {}
  
  if (quoteId) {
    quote = await getQuoteData(quoteId, brokerId)
    
    // Enrichir si données incomplètes
    if (!quote.guarantees && !quote.coverage_data) {
      quote = await enrichQuoteData(quote, brokerId)
    }
    
    productData = {
      name: quote.product_name || quote.product_type || 'Produit d\'assurance',
      type: quote.product_type || 'Assurance',
      reference: quote.reference || `Q-${quoteId}`,
      duration: '1 an, renouvelable par tacite reconduction'
    }
    
    coverageData = {
      guarantees: quote.guarantees || quote.coverage_data?.guarantees || [],
      restrictions: quote.coverage_data?.restrictions || [],
      obligations: quote.coverage_data?.obligations || []
    }
  }
  
  // Enrichir via IA si nécessaire
  const ipidContent = await generateIpidContent({
    productData,
    coverageData,
    brokerId,
    clientId
  })
  
  const data = {
    product: ipidContent.product || productData,
    coverage: ipidContent.coverage || coverageData,
    exclusions: ipidContent.exclusions || [],
    premium: quote ? {
      amount: quote.premium_annual || quote.prime_annuelle,
      frequency: 'Annuel, semestriel, trimestriel ou mensuel',
      method: 'Prélèvement, virement, chèque, CB'
    } : ipidContent.premium || {},
    broker,
    client,
    insurer: {
      name: quote?.provider_name || quote?.compagnie || 'Compagnie d\'assurance'
    },
    generatedAt: new Date()
  }
  
  // Générer PDF
  const pdfBuffer = await generateIpid(data)
  const pdfHash = hashPdf(pdfBuffer)
  
  // Stocker fichier
  const storageDir = await ensureStorageDir(brokerId, clientId)
  const filename = `ipid_${quoteId || 'draft'}_${Date.now()}.pdf`
  const storagePath = path.join(storageDir, filename)
  await fs.writeFile(storagePath, pdfBuffer)
  
  // Sauvegarder en BDD
  const doc = await saveComplianceDocument({
    brokerId,
    clientId,
    quoteId,
    documentType: 'ipid',
    storagePath,
    pdfHash,
    contentData: data,
    aiGenerated: true,
    aiReasoning: 'Contenu généré et enrichi par ARK IA'
  })
  
  logger.info({ docId: doc.id, brokerId, clientId }, 'compose:ipid:success')
  
  return {
    id: doc.id,
    storage_path: storagePath,
    pdf_hash: pdfHash,
    content_data: data,
    version: doc.version
  }
}

/**
 * Génère un document DDA (Information Distributeur)
 */
async function composeDda({ brokerId, clientId }) {
  logger.info({ brokerId, clientId }, 'compose:dda:start')
  
  const broker = await getBrokerProfile(brokerId)
  const client = clientId ? await getClientData(clientId, brokerId) : {}
  
  const data = {
    broker,
    client,
    generatedAt: new Date()
  }
  
  // Générer PDF
  const pdfBuffer = await generateDda(data)
  const pdfHash = hashPdf(pdfBuffer)
  
  // Stocker fichier
  const storageDir = await ensureStorageDir(brokerId, clientId || 0)
  const filename = `dda_${clientId || 'generic'}_${Date.now()}.pdf`
  const storagePath = path.join(storageDir, filename)
  await fs.writeFile(storagePath, pdfBuffer)
  
  // Sauvegarder en BDD (client_id=0 si générique)
  const doc = await saveComplianceDocument({
    brokerId,
    clientId: clientId || 0,
    quoteId: null,
    documentType: 'dda',
    storagePath,
    pdfHash,
    contentData: data,
    aiGenerated: false,
    aiReasoning: null
  })
  
  logger.info({ docId: doc.id, brokerId }, 'compose:dda:success')
  
  return {
    id: doc.id,
    storage_path: storagePath,
    pdf_hash: pdfHash,
    content_data: data,
    version: doc.version
  }
}

/**
 * Génère un document Devoir de Conseil
 */
async function composeDevoirConseil({ brokerId, clientId, quoteId = null }) {
  logger.info({ brokerId, clientId, quoteId }, 'compose:devoir-conseil:start')
  
  const broker = await getBrokerProfile(brokerId)
  const client = await getClientData(clientId, brokerId)
  
  // Extraire besoins via IA
  const needs = await extractNeedsFromClient(clientId, brokerId)
  
  // Construire recommandation via IA
  const recommendation = await buildRecommendation({
    clientId,
    brokerId,
    needs,
    availableQuotes: []
  })
  
  const data = {
    client,
    needs,
    recommendation,
    alternatives: recommendation.alternatives_considered || [],
    broker,
    generatedAt: new Date(),
    aiReasoning: recommendation.detailed_reasoning
  }
  
  // Générer PDF
  const pdfBuffer = await generateDevoirConseil(data)
  const pdfHash = hashPdf(pdfBuffer)
  
  // Stocker fichier
  const storageDir = await ensureStorageDir(brokerId, clientId)
  const filename = `devoir_conseil_${quoteId || 'global'}_${Date.now()}.pdf`
  const storagePath = path.join(storageDir, filename)
  await fs.writeFile(storagePath, pdfBuffer)
  
  // Sauvegarder en BDD
  const doc = await saveComplianceDocument({
    brokerId,
    clientId,
    quoteId,
    documentType: 'devoir_conseil',
    storagePath,
    pdfHash,
    contentData: data,
    aiGenerated: true,
    aiReasoning: recommendation.detailed_reasoning
  })
  
  logger.info({ docId: doc.id, brokerId, clientId }, 'compose:devoir-conseil:success')
  
  return {
    id: doc.id,
    storage_path: storagePath,
    pdf_hash: pdfHash,
    content_data: data,
    version: doc.version,
    recommendation
  }
}

/**
 * Génère le pack complet (IPID + DDA + Devoir de Conseil)
 */
async function composeFullPack({ brokerId, clientId, quoteId }) {
  logger.info({ brokerId, clientId, quoteId }, 'compose:full-pack:start')
  
  // Exécuter en parallèle
  const [ipid, dda, devoirConseil] = await Promise.all([
    composeIpid({ brokerId, clientId, quoteId }).catch(err => {
      logger.error({ error: err.message }, 'compose:full-pack:ipid:error')
      return { error: err.message }
    }),
    composeDda({ brokerId, clientId }).catch(err => {
      logger.error({ error: err.message }, 'compose:full-pack:dda:error')
      return { error: err.message }
    }),
    composeDevoirConseil({ brokerId, clientId, quoteId }).catch(err => {
      logger.error({ error: err.message }, 'compose:full-pack:devoir-conseil:error')
      return { error: err.message }
    })
  ])
  
  const success = [ipid, dda, devoirConseil].filter(d => !d.error).length
  
  logger.info({ brokerId, clientId, success }, 'compose:full-pack:complete')
  
  return {
    ipid,
    dda,
    devoir_conseil: devoirConseil,
    success_count: success,
    total_count: 3
  }
}

/**
 * Récupère un document par ID
 */
async function getDocument(docId, brokerId) {
  const res = await pool.query(
    'SELECT * FROM compliance_documents WHERE id = $1 AND broker_id = $2',
    [docId, brokerId]
  )
  
  if (res.rows.length === 0) {
    throw new Error('Document non trouvé ou accès non autorisé')
  }
  
  return res.rows[0]
}

/**
 * Liste les documents avec filtres
 */
async function listDocuments({ brokerId, clientId, documentType, status, limit = 50, offset = 0 }) {
  let query = `
    SELECT cd.*, c.nom AS client_nom, c.prenom AS client_prenom
    FROM compliance_documents cd
    LEFT JOIN clients c ON c.id = cd.client_id
    WHERE cd.broker_id = $1
  `
  const params = [brokerId]
  let paramIndex = 2
  
  if (clientId) {
    query += ` AND cd.client_id = $${paramIndex++}`
    params.push(clientId)
  }
  
  if (documentType) {
    query += ` AND cd.document_type = $${paramIndex++}`
    params.push(documentType)
  }
  
  if (status) {
    query += ` AND cd.status = $${paramIndex++}`
    params.push(status)
  }
  
  query += ` ORDER BY cd.generated_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`
  params.push(limit, offset)
  
  const res = await pool.query(query, params)
  
  // Compte total
  let countQuery = `
    SELECT COUNT(*) FROM compliance_documents WHERE broker_id = $1
  `
  const countParams = [brokerId]
  let countIndex = 2
  
  if (clientId) {
    countQuery += ` AND client_id = $${countIndex++}`
    countParams.push(clientId)
  }
  if (documentType) {
    countQuery += ` AND document_type = $${countIndex++}`
    countParams.push(documentType)
  }
  if (status) {
    countQuery += ` AND status = $${countIndex++}`
    countParams.push(status)
  }
  
  const countRes = await pool.query(countQuery, countParams)
  
  return {
    documents: res.rows,
    total: parseInt(countRes.rows[0].count, 10),
    limit,
    offset
  }
}

/**
 * Supprime un document
 */
async function deleteDocument(docId, brokerId) {
  const doc = await getDocument(docId, brokerId)
  
  // Supprimer fichier
  try {
    await fs.unlink(doc.storage_path)
  } catch (err) {
    logger.warn({ error: err.message, path: doc.storage_path }, 'compose:delete:file-not-found')
  }
  
  // Supprimer en BDD
  await pool.query(
    'DELETE FROM compliance_documents WHERE id = $1 AND broker_id = $2',
    [docId, brokerId]
  )
  
  return { deleted: true, id: docId }
}

/**
 * Met à jour le statut signature
 */
async function updateSignatureStatus(docId, brokerId, { signedBy, signatureMethod, signatureProof }) {
  const res = await pool.query(
    `UPDATE compliance_documents 
     SET status = 'signed', signed_at = NOW(), signed_by = $3, signature_method = $4, signature_proof = $5
     WHERE id = $1 AND broker_id = $2
     RETURNING *`,
    [docId, brokerId, signedBy, signatureMethod, JSON.stringify(signatureProof || {})]
  )
  
  if (res.rows.length === 0) {
    throw new Error('Document non trouvé ou accès non autorisé')
  }
  
  return res.rows[0]
}

module.exports = {
  composeIpid,
  composeDda,
  composeDevoirConseil,
  composeFullPack,
  getDocument,
  listDocuments,
  deleteDocument,
  updateSignatureStatus,
  getBrokerProfile,
  STORAGE_BASE
}