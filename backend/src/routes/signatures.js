/**
 * Routes Signatures Électroniques — LOT 20
 * Intégration Yousign pour IPID, DDA, Devoir de conseil
 */

const express = require('express')
const router = express.Router()
const yousignService = require('../services/yousignService')
const verifyToken = require('../middleware/authMiddleware')
const { captureException } = require('../sentry')

// POST /api/signatures/create — Crée une demande de signature
router.post('/create', verifyToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool
    const userId = req.user?.id || req.user?.userId
    const { documentId, documentPath, documentBase64, signerEmail, signerName, clientId, title, phone } = req.body

    if (!signerEmail) {
      return res.status(400).json({ error: 'Email du signataire requis' })
    }

    let documentContent = documentBase64
    let documentTitle = title || 'Document COURTIA'

    if (documentId && !documentContent) {
      const docRes = await pool.query(
        'SELECT file_name, file_data, mime_type FROM documents WHERE id = $1 AND user_id = $2',
        [documentId, userId]
      )
      if (docRes.rows.length === 0) {
        return res.status(404).json({ error: 'Document non trouvé' })
      }
      const doc = docRes.rows[0]
      documentContent = doc.file_data
      documentTitle = title || doc.file_name
    }

    if (!documentContent && !documentPath) {
      return res.status(400).json({ error: 'Document requis' })
    }

    const result = await yousignService.createSignatureRequest(
      documentContent || documentPath,
      signerEmail,
      signerName || 'Client',
      { title: documentTitle, phone }
    )

    const insertRes = await pool.query(
      `INSERT INTO signature_requests
        (user_id, document_id, client_id, yousign_request_id, status, signer_email, signer_name, signature_url, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       RETURNING *`,
      [userId, documentId || null, clientId || null, result.providerRequestId, result.status || 'sent_to_sign', signerEmail, signerName || null, result.signatureUrl || null]
    )

    res.json({
      success: true,
      mock: result.mock || false,
      signatureRequest: insertRes.rows[0],
      signatureUrl: result.signatureUrl,
      yousignRequestId: result.providerRequestId,
    })
  } catch (err) {
    console.error('[Signatures] create error:', err)
    captureException(err)
    res.status(500).json({ error: err.message })
  }
})

// GET /api/signatures — Liste les demandes de signature
router.get('/', verifyToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool
    const userId = req.user?.id || req.user?.userId
    const { status, clientId, limit = 50, offset = 0 } = req.query

    let query = `
      SELECT sr.*, c.first_name as client_first_name, c.last_name as client_last_name
      FROM signature_requests sr
      LEFT JOIN clients c ON sr.client_id = c.id
      WHERE sr.user_id = $1`
    const params = [userId]
    let idx = 2

    if (status) { query += ` AND sr.status = $${idx++}`; params.push(status) }
    if (clientId) { query += ` AND sr.client_id = $${idx++}`; params.push(clientId) }

    query += ` ORDER BY sr.created_at DESC LIMIT $${idx++} OFFSET $${idx}`
    params.push(parseInt(limit), parseInt(offset))

    const result = await pool.query(query, params)
    const countRes = await pool.query('SELECT COUNT(*) FROM signature_requests WHERE user_id = $1', [userId])

    res.json({
      signatures: result.rows,
      total: parseInt(countRes.rows[0].count),
      limit: parseInt(limit),
      offset: parseInt(offset),
    })
  } catch (err) {
    console.error('[Signatures] list error:', err)
    captureException(err)
    res.status(500).json({ error: err.message })
  }
})

// GET /api/signatures/:id/status — Récupère le statut
router.get('/:id/status', verifyToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool
    const userId = req.user?.id || req.user?.userId
    const { id } = req.params

    const dbRes = await pool.query(
      'SELECT * FROM signature_requests WHERE id = $1 AND user_id = $2',
      [id, userId]
    )

    if (dbRes.rows.length === 0) {
      return res.status(404).json({ error: 'Demande non trouvée' })
    }

    const sr = dbRes.rows[0]
    const yousignStatus = await yousignService.getSignatureStatus(sr.yousign_request_id)

    if (yousignStatus.status !== sr.status) {
      await pool.query(
        `UPDATE signature_requests SET status = $1, signed_at = CASE WHEN $1 = 'signed' THEN NOW() ELSE signed_at END, updated_at = NOW() WHERE id = $2`,
        [yousignStatus.status, id]
      )
    }

    res.json({
      id: sr.id,
      yousignRequestId: sr.yousign_request_id,
      status: yousignStatus.status,
      signers: yousignStatus.signers,
      createdAt: sr.created_at,
      signedAt: yousignStatus.status === 'signed' ? (sr.signed_at || new Date()) : null,
      mock: yousignStatus.mock || false,
    })
  } catch (err) {
    console.error('[Signatures] status error:', err)
    captureException(err)
    res.status(500).json({ error: err.message })
  }
})

// GET /api/signatures/:id/download — Télécharge le document signé
router.get('/:id/download', verifyToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool
    const userId = req.user?.id || req.user?.userId
    const { id } = req.params

    const dbRes = await pool.query('SELECT * FROM signature_requests WHERE id = $1 AND user_id = $2', [id, userId])
    if (dbRes.rows.length === 0) return res.status(404).json({ error: 'Demande non trouvée' })

    const sr = dbRes.rows[0]
    if (sr.status !== 'signed') return res.status(400).json({ error: 'Document non encore signé' })

    const dl = await yousignService.downloadSignedDocument(sr.yousign_request_id)
    res.setHeader('Content-Type', dl.contentType)
    res.setHeader('Content-Disposition', `attachment; filename="${dl.fileName}"`)
    res.send(dl.buffer)
  } catch (err) {
    console.error('[Signatures] download error:', err)
    captureException(err)
    res.status(500).json({ error: err.message })
  }
})

// POST /api/signatures/:id/remind — Relance le signataire
router.post('/:id/remind', verifyToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool
    const userId = req.user?.id || req.user?.userId
    const { id } = req.params

    const dbRes = await pool.query('SELECT * FROM signature_requests WHERE id = $1 AND user_id = $2', [id, userId])
    if (dbRes.rows.length === 0) return res.status(404).json({ error: 'Demande non trouvée' })

    const sr = dbRes.rows[0]
    if (sr.status === 'signed') return res.status(400).json({ error: 'Document déjà signé' })

    const statusRes = await yousignService.getSignatureStatus(sr.yousign_request_id)
    const signerId = statusRes.signers?.[0]?.id
    if (signerId) await yousignService.sendReminder(sr.yousign_request_id, signerId)

    await pool.query('UPDATE signature_requests SET last_reminder_at = NOW(), updated_at = NOW() WHERE id = $1', [id])
    res.json({ success: true, message: 'Relance envoyée' })
  } catch (err) {
    console.error('[Signatures] remind error:', err)
    captureException(err)
    res.status(500).json({ error: err.message })
  }
})

// POST /api/signatures/:id/cancel — Annule une demande
router.post('/:id/cancel', verifyToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool
    const userId = req.user?.id || req.user?.userId
    const { id } = req.params
    const { reason } = req.body

    const dbRes = await pool.query('SELECT * FROM signature_requests WHERE id = $1 AND user_id = $2', [id, userId])
    if (dbRes.rows.length === 0) return res.status(404).json({ error: 'Demande non trouvée' })

    const sr = dbRes.rows[0]
    if (sr.status === 'signed') return res.status(400).json({ error: 'Document déjà signé' })

    await yousignService.cancelSignatureRequest(sr.yousign_request_id, reason)
    await pool.query('UPDATE signature_requests SET status = $1, updated_at = NOW() WHERE id = $2', ['cancelled', id])
    res.json({ success: true, message: 'Demande annulée' })
  } catch (err) {
    console.error('[Signatures] cancel error:', err)
    captureException(err)
    res.status(500).json({ error: err.message })
  }
})

// POST /api/signatures/webhook — Reçoit les events Yousign
router.post('/webhook', async (req, res) => {
  try {
    const pool = req.app.locals.pool
    const rawBody = req.rawBody || JSON.stringify(req.body)
    const signature = req.headers['x-yousign-signature-256'] || req.headers['x-yousign-signature']

    if (process.env.YOUSIGN_WEBHOOK_SECRET) {
      const isValid = yousignService.verifyWebhookSignature(rawBody, signature)
      if (!isValid) return res.status(401).json({ error: 'Invalid signature' })
    }

    const event = req.body
    const eventType = event.event_name || event.type || ''
    const requestId = yousignService.extractSignatureRequestId(event)
    const newStatus = yousignService.mapWebhookStatus(eventType)

    console.log(`[Yousign Webhook] Event: ${eventType}, RequestId: ${requestId}`)

    if (requestId && newStatus) {
      await pool.query(
        `UPDATE signature_requests SET status = $1, signed_at = CASE WHEN $1 = 'signed' THEN NOW() ELSE signed_at END, updated_at = NOW() WHERE yousign_request_id = $2`,
        [newStatus, requestId]
      )
    }

    res.json({ received: true })
  } catch (err) {
    console.error('[Yousign Webhook] Error:', err)
    captureException(err)
    res.status(500).json({ error: err.message })
  }
})

// GET /api/signatures/stats — Statistiques
router.get('/stats', verifyToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool
    const userId = req.user?.id || req.user?.userId

    const statsRes = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status IN ('sent_to_sign','pending')) as pending,
        COUNT(*) FILTER (WHERE status = 'signed') as signed,
        COUNT(*) FILTER (WHERE status = 'refused') as refused,
        COUNT(*) FILTER (WHERE status = 'expired') as expired,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
        COUNT(*) as total
      FROM signature_requests WHERE user_id = $1
    `, [userId])

    res.json(statsRes.rows[0])
  } catch (err) {
    console.error('[Signatures] stats error:', err)
    captureException(err)
    res.status(500).json({ error: err.message })
  }
})

module.exports = router