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
const { recordClientInteraction } = require('../services/integrationsStore')

router.use(verifyToken)

const LEGACY_TEMPLATES = ['attestation_assurance', 'proposition_commerciale', 'courrier_resiliation']
const DDA_TEMPLATES = ['fic', 'mandat_courtage', 'devoir_conseil', 'synthese_client']
const VALID_TEMPLATES = [...LEGACY_TEMPLATES, ...DDA_TEMPLATES]
const DOCUMENT_STATUSES = ['brouillon', 'genere', 'envoye', 'signe', 'archive']

let ensureDocumentsSchemaPromise = null

function normalizeDocumentStatus(status) {
  const normalized = String(status || '').trim().toLowerCase()
  return DOCUMENT_STATUSES.includes(normalized) ? normalized : 'genere'
}

function toJson(value, fallback) {
  if (value == null) return fallback
  if (typeof value === 'object') return value
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

async function ensureDocumentsSchema() {
  if (!ensureDocumentsSchemaPromise) {
    ensureDocumentsSchemaPromise = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS generated_documents (
          id SERIAL PRIMARY KEY,
          courtier_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
          document_type TEXT NOT NULL,
          template_id TEXT NOT NULL,
          pdf_url TEXT,
          data JSONB DEFAULT '{}'::jsonb,
          document_status TEXT DEFAULT 'genere',
          document_version INTEGER DEFAULT 1,
          generated_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
          document_category TEXT DEFAULT 'legacy',
          activity_log JSONB DEFAULT '[]'::jsonb,
          archived_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `)

      await pool.query(`
        ALTER TABLE generated_documents
          ADD COLUMN IF NOT EXISTS document_status TEXT DEFAULT 'genere',
          ADD COLUMN IF NOT EXISTS document_version INTEGER DEFAULT 1,
          ADD COLUMN IF NOT EXISTS generated_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
          ADD COLUMN IF NOT EXISTS document_category TEXT DEFAULT 'legacy',
          ADD COLUMN IF NOT EXISTS activity_log JSONB DEFAULT '[]'::jsonb,
          ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
          ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
      `)

      await pool.query(`
        CREATE TABLE IF NOT EXISTS document_activity_logs (
          id SERIAL PRIMARY KEY,
          generated_document_id INTEGER NOT NULL REFERENCES generated_documents(id) ON DELETE CASCADE,
          client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
          user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
          action TEXT NOT NULL,
          previous_status TEXT,
          next_status TEXT,
          version INTEGER,
          metadata JSONB DEFAULT '{}'::jsonb,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `)

      await pool.query('CREATE INDEX IF NOT EXISTS idx_generated_documents_courtier_created ON generated_documents(courtier_id, created_at DESC);')
      await pool.query('CREATE INDEX IF NOT EXISTS idx_generated_documents_client ON generated_documents(client_id, created_at DESC);')
      await pool.query('CREATE INDEX IF NOT EXISTS idx_document_activity_logs_doc ON document_activity_logs(generated_document_id, created_at DESC);')
    })()
  }

  return ensureDocumentsSchemaPromise
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
    courrier_resiliation: 'COURRIER DE RÉSILIATION',
    fic: 'FICHE D\'INFORMATION CLIENT (FIC)',
    mandat_courtage: 'MANDAT DE COURTAGE',
    devoir_conseil: 'DEVOIR DE CONSEIL',
    synthese_client: 'SYNTHÈSE CLIENT',
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
    } else if (template === 'fic') {
      doc
        .text('Cette fiche aide le cabinet à structurer les besoins et le profil client (DDA).')
        .moveDown(0.5)
        .text(`Objectif client : ${data?.objectif || 'Non renseigné'}`)
        .text(`Situation actuelle : ${data?.situation || 'Non renseignée'}`)
        .text(`Besoins exprimés : ${data?.besoins || 'Non renseignés'}`)
        .text(`Tolérance au risque : ${data?.tolerance_risque || 'Non renseignée'}`)
    } else if (template === 'mandat_courtage') {
      doc
        .text('Le présent mandat autorise le cabinet à rechercher et présenter des offres adaptées.')
        .moveDown(0.5)
        .text(`Durée du mandat : ${data?.duree_mois || 12} mois`)
        .text(`Périmètre : ${data?.perimetre || 'IARD / Santé / Prévoyance'}`)
        .text(`Canal de contact préféré : ${data?.canal_contact || 'Email'}`)
    } else if (template === 'devoir_conseil') {
      doc
        .text('Synthèse du devoir de conseil: besoins identifiés, solutions proposées et justification.')
        .moveDown(0.5)
        .text(`Contexte: ${data?.contexte || 'Non renseigné'}`)
        .text(`Solution recommandée: ${data?.solution || 'Non renseignée'}`)
        .text(`Raison de la recommandation: ${data?.justification || 'Non renseignée'}`)
    } else if (template === 'synthese_client') {
      doc
        .text('Synthèse client 360 pour préparation de rendez-vous et suivi commercial.')
        .moveDown(0.5)
        .text(`Priorité actuelle: ${data?.priorite || 'Normale'}`)
        .text(`Contrats clés: ${data?.contrats_cles || 'Non renseignés'}`)
        .text(`Actions recommandées: ${data?.actions || 'Non renseignées'}`)
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

    if (courtier.rc_pro) {
      doc.text(`RC Pro : ${courtier.rc_pro}`, 50, pageHeight - 66)
    }

    doc.text(
      'COURTIA aide à structurer et tracer le devoir de conseil. La responsabilité réglementaire finale reste humaine.',
      50,
      pageHeight - 54,
      { width: 495 }
    )

    doc.end()

    stream.on('finish', resolve)
    stream.on('error', reject)
  })
}

// GET /api/documents — liste des documents générés
router.get('/templates', async (_req, res) => {
  return res.json({
    success: true,
    templates: {
      legacy: LEGACY_TEMPLATES,
      dda: DDA_TEMPLATES,
    },
    statuses: DOCUMENT_STATUSES,
  })
})

// GET /api/documents — liste des documents générés
router.get('/', async (req, res) => {
  try {
    await ensureDocumentsSchema()
    const courtier_id = req.user.userId
    const result = await pool.query(
      'SELECT * FROM generated_documents WHERE courtier_id = $1 ORDER BY created_at DESC',
      [courtier_id]
    )
    return res.json({ success: true, data: result.rows })
  } catch (err) {
    console.error('[GET /api/documents]', err.message)
    return res.status(500).json({ error: 'server_error', message: err.message })
  }
})

// POST /api/documents/generate — générer un PDF
router.post('/generate', requireUnderLimit('pdf_generations'), async (req, res) => {
  try {
    await ensureDocumentsSchema()
    const courtier_id = req.user.userId
    const { template, client_id, data, status, version } = req.body

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
    const profileResult = await pool.query(
      `SELECT cabinet, orias, telephone, adresse, ville, code_postal, rc_pro, representant_legal
       FROM broker_profiles
       WHERE user_id = $1
       LIMIT 1`,
      [courtier_id]
    )
    const courtier = {
      ...(courtierResult.rows[0] || {}),
      ...(profileResult.rows[0] || {}),
    }

    // Créer le répertoire si besoin
    const tmpDir = ensureTmpDir()
    const docId = generateDocId()
    const filePath = path.join(tmpDir, `${docId}.pdf`)

    // Générer le PDF
    await generatePDF(filePath, template, client, courtier, data || {})

    // Insérer en base
    const pdf_url = `/api/documents/${docId}/download`
    const nextStatus = normalizeDocumentStatus(status)
    const nextVersion = Number.isFinite(Number(version)) && Number(version) > 0 ? Number(version) : 1
    const category = DDA_TEMPLATES.includes(template) ? 'dda' : 'legacy'
    const activityEntry = {
      action: 'generated',
      user_id: courtier_id,
      at: new Date().toISOString(),
      previous_status: null,
      next_status: nextStatus,
      version: nextVersion,
    }
    const insertResult = await pool.query(
      `INSERT INTO generated_documents (
         courtier_id, client_id, document_type, template_id, pdf_url, data,
         document_status, document_version, generated_by_user_id, document_category, activity_log
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb)
       RETURNING *`,
      [
        courtier_id,
        client_id,
        template,
        docId,
        pdf_url,
        data ? JSON.stringify(data) : null,
        nextStatus,
        nextVersion,
        courtier_id,
        category,
        JSON.stringify([activityEntry]),
      ]
    )

    const doc = insertResult.rows[0]

    await pool.query(
      `INSERT INTO document_activity_logs (
         generated_document_id, client_id, user_id, action, previous_status, next_status, version, metadata
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb)`,
      [
        doc.id,
        client_id,
        courtier_id,
        'generated',
        null,
        nextStatus,
        nextVersion,
        JSON.stringify({ template }),
      ]
    ).catch(() => {})

    await recordClientInteraction(pool, {
      user_id: courtier_id,
      client_id,
      provider: 'document',
      direction: 'system',
      external_id: doc.template_id,
      subject: `Document généré: ${getTemplateTitle(template)}`,
      body_preview: `Statut ${nextStatus} • Version ${nextVersion}`,
      occurred_at: doc.created_at || new Date(),
      metadata: {
        document_id: doc.id,
        document_type: template,
        document_status: nextStatus,
        document_category: category,
      },
    }).catch(() => {})

    return res.status(201).json({
      success: true,
      data: {
        id: docId,
        db_id: doc.id,
        pdf_url,
        download_url: pdf_url,
        created_at: doc.created_at,
        status: doc.document_status,
        version: doc.document_version,
        category: doc.document_category,
      }
    })
  } catch (err) {
    console.error('[POST /api/documents/generate]', err.message)
    return res.status(500).json({ error: 'server_error', message: err.message })
  }
})

// GET /api/documents/:id/download — télécharger un PDF
router.get('/:id/download', async (req, res) => {
  try {
    await ensureDocumentsSchema()
    const courtier_id = req.user.userId
    const { id } = req.params

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
    console.error('[GET /api/documents/:id/download]', err.message)
    return res.status(500).json({ error: 'server_error', message: err.message })
  }
})

// PATCH /api/documents/:id/status — mettre à jour le statut DDA (brouillon/généré/envoyé/signé/archivé)
router.patch('/:id/status', async (req, res) => {
  try {
    await ensureDocumentsSchema()
    const courtier_id = req.user.userId
    const { id } = req.params
    const nextStatus = normalizeDocumentStatus(req.body?.status)

    const existingResult = await pool.query(
      `SELECT id, client_id, template_id, document_status, document_version, activity_log
       FROM generated_documents
       WHERE (id::text = $1 OR template_id = $1) AND courtier_id = $2
       LIMIT 1`,
      [id, courtier_id]
    )

    if (!existingResult.rowCount) {
      return res.status(404).json({ error: 'not_found', message: 'Document introuvable' })
    }

    const existing = existingResult.rows[0]
    const previousStatus = String(existing.document_status || 'genere')
    const activityLog = Array.isArray(existing.activity_log) ? existing.activity_log : toJson(existing.activity_log, [])
    const entry = {
      action: 'status_updated',
      user_id: courtier_id,
      at: new Date().toISOString(),
      previous_status: previousStatus,
      next_status: nextStatus,
      version: existing.document_version || 1,
    }
    const updatedLog = [...activityLog, entry].slice(-150)

    const updateResult = await pool.query(
      `UPDATE generated_documents
       SET document_status = $1,
           archived_at = CASE WHEN $1 = 'archive' THEN NOW() ELSE archived_at END,
           activity_log = $2::jsonb,
           updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [nextStatus, JSON.stringify(updatedLog), existing.id]
    )

    await pool.query(
      `INSERT INTO document_activity_logs (
         generated_document_id, client_id, user_id, action, previous_status, next_status, version, metadata
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb)`,
      [
        existing.id,
        existing.client_id,
        courtier_id,
        'status_updated',
        previousStatus,
        nextStatus,
        existing.document_version || 1,
        JSON.stringify({ template_id: existing.template_id }),
      ]
    ).catch(() => {})

    await recordClientInteraction(pool, {
      user_id: courtier_id,
      client_id: existing.client_id,
      provider: 'document',
      direction: 'system',
      external_id: existing.template_id,
      subject: `Document ${existing.template_id}: statut ${nextStatus}`,
      body_preview: `Statut précédent: ${previousStatus}`,
      occurred_at: new Date(),
      metadata: {
        document_id: existing.id,
        previous_status: previousStatus,
        next_status: nextStatus,
      },
    }).catch(() => {})

    return res.json({
      success: true,
      data: updateResult.rows[0],
    })
  } catch (err) {
    console.error('[PATCH /api/documents/:id/status]', err.message)
    return res.status(500).json({ error: 'server_error', message: err.message })
  }
})

// GET /api/documents/client/:clientId/dda — documents DDA d’un client
router.get('/client/:clientId/dda', async (req, res) => {
  try {
    await ensureDocumentsSchema()
    const courtier_id = req.user.userId
    const { clientId } = req.params
    const result = await pool.query(
      `SELECT *
       FROM generated_documents
       WHERE courtier_id = $1
         AND client_id = $2
         AND document_category = 'dda'
       ORDER BY created_at DESC`,
      [courtier_id, clientId]
    )
    return res.json({ success: true, data: result.rows })
  } catch (err) {
    console.error('[GET /api/documents/client/:clientId/dda]', err.message)
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
    console.error('[POST /api/documents/analyze]', err.message)
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
    console.error('[POST /api/documents/classify]', err.message)
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
    console.error('[POST /api/documents/bulk]', err.message)
    return res.status(500).json({ error: 'server_error', message: err.message })
  }
})

// GET /api/documents/client/:clientId — récupérer tous les documents indexés d'un client
router.get('/client/:clientId', async (req, res) => {
  try {
    await ensureDocumentsSchema()
    const { clientId } = req.params
    const courtier_id = req.user.id || req.user.userId
    const result = await pool.query(
      `SELECT * FROM documents_indexes WHERE client_id = $1 AND user_id = $2 ORDER BY created_at DESC`,
      [clientId, courtier_id]
    )
    return res.json({ success: true, data: result.rows })
  } catch (err) {
    console.error('[GET /api/documents/client/:clientId]', err.message)
    return res.status(500).json({ error: 'server_error', message: err.message })
  }
})

// POST /api/documents/client/:clientId — indexer un document analysé
router.post('/client/:clientId', async (req, res) => {
  try {
    await ensureDocumentsSchema()
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

    await recordClientInteraction(pool, {
      user_id: courtier_id,
      client_id: Number(clientId),
      provider: 'document',
      direction: 'in',
      external_id: `index-${result.rows[0].id}`,
      subject: `Document indexé: ${type || 'document'}`,
      body_preview: `Source: ${source || 'upload'} • Confiance: ${Math.round((confiance || 0) * 100)}%`,
      occurred_at: new Date(),
      metadata: {
        document_index_id: result.rows[0].id,
        categorie: type || 'autre',
      },
    }).catch(() => {})

    return res.status(201).json({ success: true, data: result.rows[0] })
  } catch (err) {
    console.error('[POST /api/documents/client/:clientId]', err.message)
    return res.status(500).json({ error: 'server_error', message: err.message })
  }
})

module.exports = router
module.exports.__internals = {
  LEGACY_TEMPLATES,
  DDA_TEMPLATES,
  VALID_TEMPLATES,
  DOCUMENT_STATUSES,
  normalizeDocumentStatus,
  getTemplateTitle,
}
