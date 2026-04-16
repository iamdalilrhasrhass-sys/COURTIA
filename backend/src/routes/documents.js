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

router.use(verifyToken)

const VALID_TEMPLATES = ['attestation_assurance', 'proposition_commerciale', 'courrier_resiliation']

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
    console.error('[POST /api/documents/generate]', err.message)
    return res.status(500).json({ error: 'server_error', message: err.message })
  }
})

// GET /api/documents/:id/download — télécharger un PDF
router.get('/:id/download', async (req, res) => {
  try {
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

module.exports = router
