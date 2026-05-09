/**
 * documents.js — Routes génération de documents PDF
 * GET /            → tous les plans
 * POST /generate   → requireUnderLimit('documents')
 * GET /:id/download → tous les plans
 */

const express = require('express')
const router = express.Router()
const pool = require('../db')
const fs = require('fs')
const path = require('path')
const PDFDocument = require('pdfkit')
const { verifyToken } = require('../middleware/auth')
const { requireUnderLimit } = require('../middleware/planGuard')
const visionService = require('../services/visionService')
const logger = require('../lib/logger')
const { logAudit } = require('../lib/audit')
const { incrementUsage } = require('../services/planService')
const { trackEvent } = require('../services/analyticsService')
const { isFeatureEnabled } = require('../lib/featureFlags')
const {
  normalizeDocumentType,
  getDocumentDefinition,
  validateDdaReadiness,
  buildDdaVariables,
  renderDdaPlainText,
  getDdaFileName,
} = require('../services/documentDdaService')
const {
  getConfigStatus: getYousignConfigStatus,
  verifyWebhookSignature,
  mapWebhookStatus,
  extractSignatureRequestId,
  extractEventId,
  createSignatureRequest,
} = require('../services/yousignService')

const VALID_TEMPLATES = ['attestation_assurance', 'proposition_commerciale', 'courrier_resiliation']

router.post('/yousign/webhook', async (req, res) => {
  try {
    const config = getYousignConfigStatus()
    if (config.missing.includes('YOUSIGN_WEBHOOK_SECRET')) {
      return res.status(503).json({
        error: 'configuration_required',
        message: 'YOUSIGN_WEBHOOK_SECRET est requis pour vérifier les webhooks Yousign.',
        missing: ['YOUSIGN_WEBHOOK_SECRET'],
      })
    }

    const signature = req.headers['x-yousign-signature-256'] ||
      req.headers['x-yousign-signature'] ||
      req.headers['yousign-signature'] ||
      req.headers['x-hub-signature-256']
    const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body || {}), 'utf8')
    if (!verifyWebhookSignature(rawBody, signature)) {
      return res.status(400).json({ error: 'invalid_signature', message: 'Signature webhook Yousign invalide.' })
    }

    const event = req.body || {}
    const eventType = event.event_name || event.event || event.type || 'unknown'
    const eventId = extractEventId(event)
    const signatureRequestId = extractSignatureRequestId(event)
    const status = mapWebhookStatus(eventType)
    const signedStoragePath = event.data?.signed_document_download_url ||
      event.data?.download_url ||
      event.data?.documents?.[0]?.download_url ||
      null

    await pool.query(
      `INSERT INTO yousign_webhook_events (event_id, event_type, signature_request_id, payload)
       VALUES ($1,$2,$3,$4::jsonb)
       ON CONFLICT (event_id) DO NOTHING`,
      [eventId, eventType, signatureRequestId, JSON.stringify(event)]
    )

    if (signatureRequestId && status) {
      const update = await pool.query(
        `UPDATE documents
         SET status = $1,
             signed_at = CASE WHEN $1 = 'signed' THEN NOW() ELSE signed_at END,
             signed_storage_path = COALESCE($3, signed_storage_path),
             updated_at = NOW()
         WHERE yousign_signature_id = $2
         RETURNING id, user_id, type`,
        [status, signatureRequestId, signedStoragePath]
      )
      for (const document of update.rows) {
        await pool.query(
          `INSERT INTO document_activity_log (document_id, user_id, action, metadata)
           VALUES ($1,$2,$3,$4::jsonb)`,
          [document.id, document.user_id, `yousign.${status}`, JSON.stringify({ event_id: eventId, event_type: eventType, signature_request_id: signatureRequestId })]
        )
      }
    }

    return res.json({ success: true, received: true, status: status || 'ignored' })
  } catch (err) {
    logger.error({ error: err.message }, 'yousign webhook failed')
    return res.status(500).json({ error: 'server_error', message: 'Webhook Yousign non traité.' })
  }
})

router.use(verifyToken)

function getCurrentUserId(req) {
  return Number(req.user?.userId || req.user?.id || 0)
}

function isMissingTable(err) {
  return err?.code === '42P01'
}

async function getCourtierContext(userId) {
  try {
    const result = await pool.query(
      `SELECT u.id, u.email, u.first_name, u.last_name,
              bp.cabinet, bp.orias, bp.telephone, bp.adresse, bp.ville, bp.code_postal,
              c.id AS cabinet_id, c.name AS cabinet_name, c.orias_number,
              c.ias_categories, c.rc_pro_company, c.rc_pro_number, c.rc_pro_amount_cents,
              c.address_line1, c.postal_code, c.city, c.tutelle_authority, c.dpa_signed_at
       FROM users u
       LEFT JOIN broker_profiles bp ON bp.user_id = u.id
       LEFT JOIN cabinet_members cm ON cm.user_id = u.id AND cm.removed_at IS NULL
       LEFT JOIN cabinets c ON c.id = cm.cabinet_id
       WHERE u.id = $1
       ORDER BY cm.created_at ASC NULLS LAST
       LIMIT 1`,
      [userId]
    )
    const row = result.rows[0] || {}
    return {
      courtier: row,
      cabinet: {
        id: row.cabinet_id || null,
        name: row.cabinet_name || row.cabinet || 'Cabinet COURTIA',
        orias_number: row.orias_number || row.orias || '',
        ias_categories: row.ias_categories || [],
        rc_pro_company: row.rc_pro_company || '',
        rc_pro_number: row.rc_pro_number || '',
        rc_pro_amount_cents: row.rc_pro_amount_cents || null,
        address_line1: row.address_line1 || row.adresse || '',
        postal_code: row.postal_code || row.code_postal || '',
        city: row.city || row.ville || '',
        tutelle_authority: row.tutelle_authority || 'ACPR',
        dpa_signed_at: row.dpa_signed_at || null,
      },
    }
  } catch (err) {
    logger.warn({ error: err.message, user_id: userId }, 'documents courtier context fallback')
    const result = await pool.query('SELECT id, email, first_name, last_name FROM users WHERE id = $1 LIMIT 1', [userId])
    return { courtier: result.rows[0] || {}, cabinet: { name: 'Cabinet COURTIA' } }
  }
}

async function createPdfBufferFromText({ title, text }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 48 })
    const chunks = []
    doc.on('data', (chunk) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    doc.fontSize(22).font('Helvetica-Bold').fillColor('#111827').text('COURTIA', { align: 'left' })
    doc.moveDown(0.3).fontSize(14).fillColor('#5b4df5').text(title, { align: 'left' })
    doc.moveDown(1)
    doc.fontSize(10).font('Helvetica').fillColor('#111827')
    for (const line of String(text || '').split('\n')) {
      if (!line.trim()) {
        doc.moveDown(0.55)
      } else if (line === line.toUpperCase() && line.length < 80) {
        doc.moveDown(0.2).font('Helvetica-Bold').text(line).font('Helvetica')
      } else {
        doc.text(line, { lineGap: 3 })
      }
    }
    doc.moveDown(1)
    doc.fontSize(8).fillColor('#6b7280').text('Document généré par COURTIA. Validation humaine obligatoire avant remise ou signature.', { align: 'left' })
    doc.end()
  })
}

async function getLinkedContractForDocument(contractId, clientId) {
  if (!contractId) return {}

  try {
    const contractResult = await pool.query('SELECT * FROM contracts WHERE id = $1 AND client_id = $2 LIMIT 1', [contractId, clientId])
    if (contractResult.rows[0]) return contractResult.rows[0]
  } catch (err) {
    if (!isMissingTable(err)) throw err
  }

  const quoteResult = await pool.query(
    `SELECT id,
            client_id,
            status,
            quote_data->>'type_contrat' AS type,
            quote_data->>'type' AS contract_type,
            quote_data->>'compagnie' AS company,
            quote_data->>'insurer' AS insurer,
            quote_data->>'numero' AS number,
            quote_data->>'numero_contrat' AS policy_number,
            quote_data->>'prime_annuelle' AS annual_premium,
            quote_data->>'date_effet' AS start_date,
            quote_data->>'date_echeance' AS end_date
     FROM quotes
     WHERE id = $1 AND client_id = $2
     LIMIT 1`,
    [contractId, clientId]
  )
  return quoteResult.rows[0] || {}
}

async function generateDdaDocument(req, res, documentType) {
  const userId = getCurrentUserId(req)
  const body = req.body || {}
  const clientId = Number(body.client_id || body.clientId || 0)
  const contractId = Number(body.contract_id || body.contractId || 0) || null
  const definition = getDocumentDefinition(documentType)

  if (!userId) return res.status(401).json({ error: 'auth_required' })
  if (!definition) return res.status(400).json({ error: 'unsupported_document_type' })
  if (!clientId) return res.status(400).json({ error: 'client_required', message: 'client_id est requis' })

  const clientResult = await pool.query('SELECT * FROM clients WHERE id = $1 AND courtier_id = $2 LIMIT 1', [clientId, userId])
  const client = clientResult.rows[0]
  if (!client) return res.status(404).json({ error: 'not_found', message: 'Client introuvable' })

  const contract = await getLinkedContractForDocument(contractId, clientId)
  const { cabinet, courtier } = await getCourtierContext(userId)
  if (req.user?.role !== 'super_admin') {
    const enabled = await isFeatureEnabled({
      userId,
      cabinetId: cabinet.id ? String(cabinet.id) : null,
      key: 'v1_dda_documents',
    })
    if (!enabled) {
      return res.status(403).json({
        error: 'feature_disabled',
        message: 'Les documents métier DDA ne sont pas activés pour ce cabinet.',
        feature_flag: 'v1_dda_documents',
      })
    }
  }
  const readiness = validateDdaReadiness({ cabinet, courtier })
  if (!readiness.ok) {
    return res.status(400).json(readiness)
  }

  const variables = buildDdaVariables({
    type: definition.type,
    client,
    courtier,
    cabinet,
    contract,
    overrides: body.variablesOverride || body.variables || {},
  })
  const text = renderDdaPlainText(definition.type, variables)

  const inserted = await pool.query(
    `INSERT INTO documents (
       user_id, client_id, contract_id, type, status, template_version,
       variables, storage_path, generated_by, generated_at, created_at, updated_at
     ) VALUES ($1,$2,$3,$4,'generated',$5,$6,NULL,$1,NOW(),NOW(),NOW())
     RETURNING *`,
    [userId, clientId, contractId, definition.type, definition.templateVersion, JSON.stringify(variables)]
  )
  const documentRow = inserted.rows[0]
  const fileName = getDdaFileName(definition.type, documentRow.id)
  const buffer = await createPdfBufferFromText({ title: definition.title, text })

  await pool.query(
    `INSERT INTO documents_blob (document_id, content, mime_type, file_name, created_at)
     VALUES ($1,$2,'application/pdf',$3,NOW())
     ON CONFLICT (document_id) DO UPDATE SET content = EXCLUDED.content, file_name = EXCLUDED.file_name`,
    [documentRow.id, buffer, fileName]
  )
  await pool.query('UPDATE documents SET storage_path = $1, updated_at = NOW() WHERE id = $2', [`db://documents_blob/${documentRow.id}`, documentRow.id])
  await pool.query(
    `INSERT INTO document_activity_log (document_id, user_id, action, metadata)
     VALUES ($1,$2,'generated',$3::jsonb)`,
    [documentRow.id, userId, JSON.stringify({ type: definition.type, client_id: clientId, contract_id: contractId })]
  )
  await logAudit({
    cabinetId: cabinet.id ? String(cabinet.id) : null,
    userId,
    entityType: 'document',
    entityId: documentRow.id,
    action: 'document.generated',
    metadata: { type: definition.type, client_id: clientId, contract_id: contractId },
    req,
  })
  await incrementUsage(userId, 'documents_generated').catch(() => {})
  await trackEvent({
    userId,
    event: 'document_generated',
    properties: { type: definition.type, client_id: clientId },
  }).catch(() => {})

  return res.status(201).json({
    success: true,
    data: {
      ...documentRow,
      storage_path: `db://documents_blob/${documentRow.id}`,
      title: definition.title,
      download_url: `/api/documents/${documentRow.id}/download`,
      file_name: fileName,
    },
  })
}

function buildSignerFromDocument(body = {}, documentRow = {}) {
  const variables = documentRow.variables || {}
  const client = variables.client || {}
  const rawName = String(client.name || '').trim()
  const parts = rawName.split(/\s+/).filter(Boolean)
  return {
    email: body.email || body.signer?.email || client.email || '',
    firstName: body.first_name || body.firstName || body.signer?.first_name || body.signer?.firstName || parts[0] || 'Client',
    lastName: body.last_name || body.lastName || body.signer?.last_name || body.signer?.lastName || parts.slice(1).join(' ') || 'COURTIA',
    phone: body.phone || body.signer?.phone || client.phone || '',
  }
}

async function sendDocumentToYousign(req, res) {
  const userId = getCurrentUserId(req)
  const documentId = Number(req.params.id)
  if (!userId) return res.status(401).json({ error: 'auth_required' })
  if (!documentId) return res.status(400).json({ error: 'document_required', message: 'Document invalide.' })

  if (req.user?.role !== 'super_admin') {
    const enabled = await isFeatureEnabled({ userId, key: 'v1_yousign_signature' })
    if (!enabled) {
      return res.status(403).json({
        error: 'feature_disabled',
        message: 'La signature électronique Yousign est désactivée pour ce cabinet.',
        feature_flag: 'v1_yousign_signature',
      })
    }
  }

  const result = await pool.query(
    `SELECT d.*, db.content, db.mime_type, db.file_name
     FROM documents d
     JOIN documents_blob db ON db.document_id = d.id
     WHERE d.id = $1 AND d.user_id = $2
     LIMIT 1`,
    [documentId, userId]
  )
  const documentRow = result.rows[0]
  if (!documentRow) return res.status(404).json({ error: 'not_found', message: 'Document introuvable.' })
  if (documentRow.status === 'archived') return res.status(400).json({ error: 'document_archived', message: 'Un document archivé ne peut pas être envoyé à signer.' })

  const signer = buildSignerFromDocument(req.body || {}, documentRow)
  if (!signer.email) {
    return res.status(400).json({
      error: 'signer_email_required',
      message: 'Email signataire requis pour envoyer le document à signer.',
    })
  }

  const config = getYousignConfigStatus()
  if (!config.configured) {
    return res.status(503).json({
      error: 'configuration_required',
      provider: 'yousign',
      missing: config.missing,
      message: 'Yousign n’est pas configuré. Renseignez YOUSIGN_API_KEY et YOUSIGN_WEBHOOK_SECRET côté backend.',
    })
  }

  const signature = await createSignatureRequest({
    document: {
      id: documentRow.id,
      title: documentRow.title || documentRow.type,
      fileName: documentRow.file_name,
      mimeType: documentRow.mime_type,
      content: documentRow.content,
    },
    signer,
  })

  await pool.query(
    `UPDATE documents
     SET status = 'sent_to_sign', yousign_signature_id = $1, updated_at = NOW()
     WHERE id = $2 AND user_id = $3`,
    [signature.providerRequestId, documentId, userId]
  )
  await pool.query(
    `INSERT INTO document_activity_log (document_id, user_id, action, metadata)
     VALUES ($1,$2,'sent_to_sign',$3::jsonb)`,
    [documentId, userId, JSON.stringify({ provider: 'yousign', signature_request_id: signature.providerRequestId, signer_email: signer.email })]
  )
  await logAudit({
    userId,
    entityType: 'document',
    entityId: documentId,
    action: 'document.sent_to_sign',
    metadata: { provider: 'yousign', signature_request_id: signature.providerRequestId, signer_email: signer.email },
    req,
  })

  return res.json({
    success: true,
    data: {
      id: documentId,
      status: 'sent_to_sign',
      yousign_signature_id: signature.providerRequestId,
    },
  })
}

// S'assurer que le répertoire temporaire existe
function ensureTmpDir() {
  const dir = '/tmp/documents'
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  return dir
}

// Générer un identifiant unique basé sur timestamp + random
function generateDocId() {
  return `doc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

// Titre du document selon le template
function getTemplateTitle(template) {
  const titles = {
    attestation_assurance: 'ATTESTATION D\'ASSURANCE',
    proposition_commerciale: 'PROPOSITION COMMERCIALE',
    courrier_resiliation: 'COURRIER DE RÉSILIATION'
  }
  return titles[template] || template.toUpperCase()
}

// Génération PDF avec pdfkit
function generatePDF(filePath, template, client, courtier, data) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 })
    const stream = fs.createWriteStream(filePath)

    doc.pipe(stream)

    // ── Header ──────────────────────────────────────────────────────────────
    doc
      .fontSize(22)
      .font('Helvetica-Bold')
      .fillColor('#1a1a2e')
      .text('COURTIA', 50, 50)
      .fontSize(9)
      .font('Helvetica')
      .fillColor('#666666')
      .text(`Date : ${new Date().toLocaleDateString('fr-FR')}`, { align: 'right' })
      .text(`N° document : ${path.basename(filePath, '.pdf')}`, { align: 'right' })

    // Ligne séparatrice
    doc
      .moveTo(50, 110)
      .lineTo(545, 110)
      .strokeColor('#cccccc')
      .stroke()

    // ── Titre ───────────────────────────────────────────────────────────────
    doc
      .moveDown(2)
      .fontSize(16)
      .font('Helvetica-Bold')
      .fillColor('#1a1a2e')
      .text(getTemplateTitle(template), { align: 'center' })

    doc.moveDown(1.5)

    // ── Informations client ─────────────────────────────────────────────────
    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .fillColor('#333333')
      .text('Informations client :')
      .moveDown(0.5)
      .font('Helvetica')
      .fontSize(10)
      .text(`Nom : ${client.first_name || ''} ${client.last_name || ''}`)
      .text(`Email : ${client.email || 'Non renseigné'}`)
      .text(`Téléphone : ${client.phone || 'Non renseigné'}`)

    doc.moveDown(1.5)

    // ── Contenu selon le template ───────────────────────────────────────────
    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .fillColor('#333333')
      .text('Détails :')
      .moveDown(0.5)
      .font('Helvetica')
      .fontSize(10)

    if (template === 'attestation_assurance') {
      doc
        .text(`Nous attestons que ${client.first_name || ''} ${client.last_name || ''} est bien assuré(e) auprès de notre cabinet.`)
        .moveDown(0.5)
      if (data && data.contrat) {
        doc.text(`Contrat : ${data.contrat}`)
      }
      if (data && data.date_debut) {
        doc.text(`Prise d'effet : ${data.date_debut}`)
      }
      if (data && data.garanties) {
        doc.text(`Garanties souscrites : ${data.garanties}`)
      }
    } else if (template === 'proposition_commerciale') {
      doc
        .text('Objet : Proposition d\'assurance personnalisée')
        .moveDown(0.5)
      if (data && data.produit) {
        doc.text(`Produit proposé : ${data.produit}`)
      }
      if (data && data.prime_annuelle) {
        doc.text(`Prime annuelle indicative : ${data.prime_annuelle} €`)
      }
      if (data && data.description) {
        doc.text(data.description)
      }
    } else if (template === 'courrier_resiliation') {
      doc
        .text(`Objet : Résiliation de contrat d'assurance`)
        .moveDown(0.5)
        .text(`Je soussigné(e) ${client.first_name || ''} ${client.last_name || ''}, vous informe de ma décision de résilier le contrat suivant :`)
        .moveDown(0.5)
      if (data && data.numero_contrat) {
        doc.text(`Numéro de contrat : ${data.numero_contrat}`)
      }
      if (data && data.motif) {
        doc.text(`Motif : ${data.motif}`)
      }
      if (data && data.date_effet) {
        doc.text(`Date d'effet souhaitée : ${data.date_effet}`)
      }
    }

    // Données supplémentaires generiques
    if (data && data.notes) {
      doc.moveDown(0.5).text(`Notes : ${data.notes}`)
    }

    // ── Footer ──────────────────────────────────────────────────────────────
    const pageHeight = doc.page.height
    doc
      .moveTo(50, pageHeight - 100)
      .lineTo(545, pageHeight - 100)
      .strokeColor('#cccccc')
      .stroke()

    doc
      .fontSize(8)
      .font('Helvetica')
      .fillColor('#999999')
      .text(
        `${courtier.first_name || ''} ${courtier.last_name || ''} — Cabinet de courtage en assurances`,
        50,
        pageHeight - 90
      )

    if (courtier.orias_number) {
      doc.text(`ORIAS : ${courtier.orias_number}`, 50, pageHeight - 78)
    }

    doc.text(
      'Document généré par COURTIA — Logiciel de gestion pour courtiers en assurances.',
      50,
      pageHeight - 66,
      { width: 495 }
    )

    doc.end()

    stream.on('finish', resolve)
    stream.on('error', reject)
  })
}

// GET /api/documents — liste des documents générés
router.get('/', async (req, res) => {
  try {
    const userId = getCurrentUserId(req)
    const filters = []
    const params = [userId]
    if (req.query.client_id) {
      params.push(Number(req.query.client_id))
      filters.push(`d.client_id = $${params.length}`)
    }
    if (req.query.status) {
      params.push(String(req.query.status))
      filters.push(`d.status = $${params.length}`)
    }
    if (req.query.type) {
      params.push(String(req.query.type))
      filters.push(`d.type = $${params.length}`)
    }
    const where = filters.length ? ` AND ${filters.join(' AND ')}` : ''
    const result = await pool.query(
      `SELECT d.*, db.file_name,
              CASE d.type
                WHEN 'fic' THEN 'Fiche d’information et de conseil'
                WHEN 'mandat_courtage' THEN 'Mandat de courtage'
                WHEN 'devoir_conseil' THEN 'Devoir de conseil'
                WHEN 'attestation' THEN 'Attestation / synthèse client'
                ELSE d.type
              END AS title,
              COALESCE(c.company_name, NULLIF(CONCAT_WS(' ', c.first_name, c.last_name), ''), c.email, CONCAT('Client #', c.id)) AS client_name
       FROM documents d
       LEFT JOIN documents_blob db ON db.document_id = d.id
       LEFT JOIN clients c ON c.id = d.client_id
       WHERE d.user_id = $1${where}
       ORDER BY d.created_at DESC`,
      params
    )
    return res.json({ success: true, data: result.rows })
  } catch (err) {
    if (isMissingTable(err)) {
      try {
        const userId = getCurrentUserId(req)
        const result = await pool.query(
          'SELECT * FROM generated_documents WHERE courtier_id = $1 ORDER BY created_at DESC',
          [userId]
        )
        return res.json({ success: true, data: result.rows, legacy: true })
      } catch (legacyErr) {
        if (isMissingTable(legacyErr)) return res.json({ success: true, data: [], migration_required: true })
        logger.error({ error: legacyErr.message }, 'documents legacy list failed')
        return res.status(500).json({ error: 'server_error', message: legacyErr.message })
      }
    }
    logger.error({ error: err.message }, 'documents list failed')
    return res.status(500).json({ error: 'server_error', message: err.message })
  }
})

// POST /api/documents/generate — générer un PDF
router.post('/generate', requireUnderLimit('pdf_generations'), async (req, res) => {
  try {
    const requestedType = normalizeDocumentType(req.body?.type || req.body?.document_type || req.body?.template)
    if (requestedType) {
      return await generateDdaDocument(req, res, requestedType)
    }

    const courtier_id = req.user.userId
    const { template, client_id, data } = req.body

    if (!template || !VALID_TEMPLATES.includes(template)) {
      return res.status(400).json({
        error: 'validation_error',
        message: `Template invalide. Valeurs acceptées : ${VALID_TEMPLATES.join(', ')}`
      })
    }

    if (!client_id) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'client_id est requis'
      })
    }

    // Récupérer le client
    const clientResult = await pool.query(
      'SELECT * FROM clients WHERE id = $1 AND courtier_id = $2',
      [client_id, courtier_id]
    )
    if (clientResult.rows.length === 0) {
      return res.status(404).json({ error: 'not_found', message: 'Client introuvable' })
    }
    const client = clientResult.rows[0]

    // Récupérer les infos courtier (user)
    const courtierResult = await pool.query(
      'SELECT first_name, last_name, orias_number FROM users WHERE id = $1',
      [courtier_id]
    )
    const courtier = courtierResult.rows[0] || {}

    // Créer le répertoire si besoin
    const tmpDir = ensureTmpDir()
    const docId = generateDocId()
    const filePath = path.join(tmpDir, `${docId}.pdf`)

    // Générer le PDF
    await generatePDF(filePath, template, client, courtier, data || {})

    // Insérer en base
    const pdf_url = `/api/documents/${docId}/download`
    const insertResult = await pool.query(
      `INSERT INTO generated_documents (courtier_id, client_id, document_type, template_id, pdf_url, data)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        courtier_id,
        client_id,
        template,
        docId,
        pdf_url,
        data ? JSON.stringify(data) : null
      ]
    )

    const doc = insertResult.rows[0]

    return res.status(201).json({
      success: true,
      data: {
        id: docId,
        db_id: doc.id,
        pdf_url,
        download_url: pdf_url,
        created_at: doc.created_at
      }
    })
  } catch (err) {
    logger.error({ error: err.message }, 'documents generate failed')
    return res.status(500).json({ error: 'server_error', message: err.message })
  }
})

router.post('/:id/archive', async (req, res) => {
  try {
    const userId = getCurrentUserId(req)
    const id = Number(req.params.id)
    const result = await pool.query(
      `UPDATE documents
       SET status = 'archived', updated_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, userId]
    )
    if (!result.rows[0]) return res.status(404).json({ error: 'not_found', message: 'Document introuvable' })
    await pool.query(
      `INSERT INTO document_activity_log (document_id, user_id, action, metadata)
       VALUES ($1,$2,'archived',$3::jsonb)`,
      [id, userId, JSON.stringify({ reason: req.body?.reason || 'user_request' })]
    )
    await logAudit({
      userId,
      entityType: 'document',
      entityId: id,
      action: 'document.archived',
      metadata: { reason: req.body?.reason || 'user_request' },
      req,
    })
    return res.json({ success: true, data: result.rows[0] })
  } catch (err) {
    logger.error({ error: err.message }, 'documents archive failed')
    return res.status(500).json({ error: 'server_error', message: err.message })
  }
})

router.get('/yousign/status', async (req, res) => {
  const config = getYousignConfigStatus()
  return res.json({
    success: true,
    data: {
      provider: 'yousign',
      configured: config.configured,
      missing: config.missing,
      status: config.configured ? 'ready' : 'configuration_required',
    },
  })
})

router.post('/:id/send-to-sign', async (req, res) => {
  try {
    return await sendDocumentToYousign(req, res)
  } catch (err) {
    logger.error({ error: err.message, document_id: req.params?.id }, 'documents send to yousign failed')
    return res.status(500).json({ error: 'server_error', message: 'Envoi Yousign impossible.' })
  }
})

// GET /api/documents/:id/download — télécharger un PDF
router.get('/:id/download', async (req, res) => {
  try {
    const courtier_id = getCurrentUserId(req)
    const { id } = req.params

    if (/^\d+$/.test(String(id))) {
      try {
        const v1 = await pool.query(
          `SELECT d.*, db.content, db.mime_type, db.file_name
           FROM documents d
           JOIN documents_blob db ON db.document_id = d.id
           WHERE d.id = $1 AND d.user_id = $2
           LIMIT 1`,
          [Number(id), courtier_id]
        )
        if (v1.rows[0]) {
          const row = v1.rows[0]
          res.setHeader('Content-Type', row.mime_type || 'application/pdf')
          res.setHeader('Content-Disposition', `attachment; filename="${row.file_name || getDdaFileName(row.type, row.id)}"`)
          return res.send(row.content)
        }
      } catch (err) {
        if (!isMissingTable(err)) throw err
      }
    }

    // Récupérer le document — id peut être l'id DB ou le template_id
    const result = await pool.query(
      'SELECT * FROM generated_documents WHERE (id::text = $1 OR template_id = $1) AND courtier_id = $2 LIMIT 1',
      [id, courtier_id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'not_found', message: 'Document introuvable' })
    }

    const doc = result.rows[0]
    const docId = doc.template_id || id
    const filePath = path.join('/tmp/documents', `${docId}.pdf`)

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        error: 'file_not_found',
        message: 'Fichier PDF introuvable (peut avoir expiré du stockage temporaire)'
      })
    }

    return res.download(filePath, `courtia_${doc.document_type}_${docId}.pdf`)
  } catch (err) {
    logger.error({ error: err.message }, 'documents download failed')
    return res.status(500).json({ error: 'server_error', message: err.message })
  }
})

// ── Endpoints Vision IA ──────────────────────────────────────────────────────

// POST /api/documents/analyze — analyser un document (OCR + extraction)
router.post('/analyze', async (req, res) => {
  try {
    const { file, mimeType, clientId } = req.body
    if (!file || !mimeType) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'file (base64) et mimeType sont requis'
      })
    }
    const result = await visionService.analyzeDocument(file, mimeType)
    return res.status(200).json({
      success: true,
      data: {
        type: result.type,
        donnees_extraites: result.donnees_extraites,
        confiance: result.confiance,
        resume: result.resume,
        type_document: result.type_document
      }
    })
  } catch (err) {
    logger.error({ error: err.message }, 'documents analyze failed')
    return res.status(500).json({ error: 'server_error', message: err.message })
  }
})

// POST /api/documents/classify — classer un document par catégorie
router.post('/classify', async (req, res) => {
  try {
    const { file, mimeType } = req.body
    if (!file || !mimeType) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'file (base64) et mimeType sont requis'
      })
    }
    const result = await visionService.classifyDocument(file, mimeType)
    return res.status(200).json({
      success: true,
      data: {
        categorie: result.categorie,
        confiance: result.confiance
      }
    })
  } catch (err) {
    logger.error({ error: err.message }, 'documents classify failed')
    return res.status(500).json({ error: 'server_error', message: err.message })
  }
})

// POST /api/documents/bulk — analyser plusieurs documents en lot (max 10)
router.post('/bulk', async (req, res) => {
  try {
    const { files } = req.body
    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'files (tableau) est requis avec au moins un fichier'
      })
    }
    if (files.length > 10) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'Maximum 10 fichiers autorisés par requête'
      })
    }
    const results = await Promise.all(
      files.map((f) => visionService.analyzeDocument(f.file, f.mimeType, f.fileName))
    )
    return res.status(200).json({
      success: true,
      data: results,
      total: results.length
    })
  } catch (err) {
    logger.error({ error: err.message }, 'documents bulk analyze failed')
    return res.status(500).json({ error: 'server_error', message: err.message })
  }
})

// GET /api/documents/client/:clientId — récupérer tous les documents indexés d'un client
router.get('/client/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params
    const courtier_id = req.user.id || req.user.userId
    const result = await pool.query(
      `SELECT * FROM documents_indexes WHERE client_id = $1 AND user_id = $2 ORDER BY created_at DESC`,
      [clientId, courtier_id]
    )
    return res.json({ success: true, data: result.rows })
  } catch (err) {
    logger.error({ error: err.message, client_id: req.params?.clientId }, 'documents client index list failed')
    return res.status(500).json({ error: 'server_error', message: err.message })
  }
})

// POST /api/documents/client/:clientId — indexer un document analysé
router.post('/client/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params
    const courtier_id = req.user.id || req.user.userId
    const { type, donnees_extraites, confiance, resume, source, fileName } = req.body

    const result = await pool.query(
      `INSERT INTO documents_indexes (client_id, user_id, categorie, donnees_extraites, confiance, source, fichier_nom)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [clientId, courtier_id, type || 'autre', JSON.stringify(donnees_extraites || {}), confiance || 0.5, source || 'upload', fileName || 'document']
    )

    // Mettre à jour clients.documents JSONB
    await pool.query(
      `UPDATE clients SET documents = COALESCE(documents, '[]'::jsonb) || $1::jsonb, updated_at = NOW() WHERE id = $2`,
      [JSON.stringify([{ id: result.rows[0].id, categorie: type, date: new Date().toISOString(), source: source || 'upload', fileName }]), clientId]
    )

    return res.status(201).json({ success: true, data: result.rows[0] })
  } catch (err) {
    logger.error({ error: err.message, client_id: req.params?.clientId }, 'documents client index insert failed')
    return res.status(500).json({ error: 'server_error', message: err.message })
  }
})

module.exports = router
