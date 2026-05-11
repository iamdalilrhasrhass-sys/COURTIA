/**
 * Voice Intake — Routes API
 * LOT 9: Transcription Whisper + extraction ARK → fiche client pré-remplie
 *
 * @module routes/voice
 */

const express = require('express')
const multer = require('multer')
const path = require('path')
const pool = require('../db')
const logger = require('../lib/logger')
const transcriber = require('../services/voice/transcriber')
const intakeProcessor = require('../services/voice/intakeProcessor')

const router = express.Router()

// Multer en mémoire — on persiste ensuite via transcriber.saveAudioFile
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
  fileFilter: (req, file, cb) => {
    const ok = /^audio\//.test(file.mimetype) || /\.(mp3|wav|m4a|ogg|webm|mp4)$/i.test(file.originalname)
    if (!ok) return cb(new Error('Format audio non supporté'))
    cb(null, true)
  }
})

/**
 * POST /api/voice/upload — Upload audio + lance le traitement
 */
router.post('/upload', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Fichier audio manquant (champ "audio")' })
    }
    const brokerId = req.user?.id
    if (!brokerId) return res.status(401).json({ error: 'Non authentifié' })

    if (!transcriber.isWhisperConfigured()) {
      return res.status(503).json({
        error: 'Service de transcription indisponible',
        detail: 'OPENAI_API_KEY non configurée côté serveur'
      })
    }

    // Persister l'audio
    const saved = await transcriber.saveAudioFile(req.file.buffer, {
      brokerId,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype
    })

    // Traitement async — on retourne tout de suite l'ID
    const language = req.body?.language || 'fr'
    intakeProcessor.processIntake({
      brokerId,
      audioPath: saved.relativePath,
      audioSize: req.file.size,
      options: { language }
    }).catch(err => {
      logger.error({ err: err.message, brokerId }, 'Voice processIntake failed (async)')
    })

    res.status(202).json({
      success: true,
      message: 'Audio reçu, transcription et extraction en cours',
      audio: { path: saved.relativePath, size: req.file.size }
    })
  } catch (err) {
    logger.error({ err: err.message }, 'POST /api/voice/upload failed')
    res.status(500).json({ error: err.message })
  }
})

/**
 * GET /api/voice/intakes — Liste des intakes du courtier
 */
router.get('/intakes', async (req, res) => {
  try {
    const brokerId = req.user?.id
    const { status, limit = 50, offset = 0 } = req.query
    const params = [brokerId]
    let sql = `SELECT id, client_id, audio_duration_seconds, status, transcript IS NOT NULL AS has_transcript,
                      extracted_data IS NOT NULL AS has_extraction, ai_cost_usd, transcription_cost_usd,
                      total_latency_ms, processed_at, applied_at, created_at
               FROM voice_intakes WHERE broker_id = $1`
    if (status) { params.push(status); sql += ` AND status = $${params.length}` }
    sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`
    params.push(parseInt(limit), parseInt(offset))
    const result = await pool.query(sql, params)
    res.json({ success: true, count: result.rows.length, intakes: result.rows })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * GET /api/voice/intakes/:id — Détails complet
 */
router.get('/intakes/:id', async (req, res) => {
  try {
    const brokerId = req.user?.id
    const result = await pool.query(
      `SELECT * FROM voice_intakes WHERE id = $1 AND broker_id = $2`,
      [req.params.id, brokerId]
    )
    if (result.rows.length === 0) return res.status(404).json({ error: 'Intake introuvable' })
    res.json({ success: true, intake: result.rows[0] })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * GET /api/voice/intakes/:id/transcript — Texte transcrit seul
 */
router.get('/intakes/:id/transcript', async (req, res) => {
  try {
    const brokerId = req.user?.id
    const result = await pool.query(
      `SELECT transcript, transcript_language, audio_duration_seconds, status
       FROM voice_intakes WHERE id = $1 AND broker_id = $2`,
      [req.params.id, brokerId]
    )
    if (result.rows.length === 0) return res.status(404).json({ error: 'Intake introuvable' })
    res.json({ success: true, ...result.rows[0] })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * GET /api/voice/intakes/:id/audio — Stream du fichier audio
 */
router.get('/intakes/:id/audio', async (req, res) => {
  try {
    const brokerId = req.user?.id
    const result = await pool.query(
      `SELECT audio_storage_path FROM voice_intakes WHERE id = $1 AND broker_id = $2`,
      [req.params.id, brokerId]
    )
    if (result.rows.length === 0) return res.status(404).json({ error: 'Intake introuvable' })
    const fs = require('fs')
    const abs = transcriber.getAudioAbsolutePath(result.rows[0].audio_storage_path)
    if (!fs.existsSync(abs)) return res.status(410).json({ error: 'Audio supprimé du stockage' })
    res.setHeader('Content-Type', 'audio/mpeg')
    fs.createReadStream(abs).pipe(res)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * POST /api/voice/intakes/:id/reprocess — Relance l'extraction
 */
router.post('/intakes/:id/reprocess', async (req, res) => {
  try {
    const brokerId = req.user?.id
    const out = await intakeProcessor.reprocessIntake(req.params.id, brokerId)
    res.json({ success: true, ...out })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * POST /api/voice/intakes/:id/apply — Applique : crée client + actions suggérées
 */
router.post('/intakes/:id/apply', async (req, res) => {
  try {
    const brokerId = req.user?.id
    const out = await intakeProcessor.applyIntake({
      intakeId: parseInt(req.params.id),
      brokerId,
      options: req.body || {}
    })
    res.json({ success: true, ...out })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * DELETE /api/voice/intakes/:id — Supprime intake + audio
 */
router.delete('/intakes/:id', async (req, res) => {
  try {
    const brokerId = req.user?.id
    const result = await pool.query(
      `SELECT audio_storage_path FROM voice_intakes WHERE id = $1 AND broker_id = $2`,
      [req.params.id, brokerId]
    )
    if (result.rows.length === 0) return res.status(404).json({ error: 'Intake introuvable' })
    try { await transcriber.deleteAudioFile(result.rows[0].audio_storage_path) } catch (_) {}
    await pool.query(`DELETE FROM voice_intakes WHERE id = $1 AND broker_id = $2`, [req.params.id, brokerId])
    res.json({ success: true, deleted: req.params.id })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * GET /api/voice/stats — KPI
 */
router.get('/stats', async (req, res) => {
  try {
    const brokerId = req.user?.id
    const out = await intakeProcessor.getStats(brokerId)
    res.json({ success: true, stats: out })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
