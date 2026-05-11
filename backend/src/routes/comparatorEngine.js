/**
 * COMPARATOR ENGINE — 8 compagnies temps réel
 *  POST /api/comparator/compute     → calcule 8 devis
 *  POST /api/comparator/export-pdf  → PDF brandé
 *  POST /api/comparator/send-email  → envoi client
 *  GET  /api/comparator/runs/:userId → historique
 */
const express = require('express')
const router = express.Router()
const path = require('path')
const fs = require('fs')
const { verifyToken } = require('../middleware/auth')
const pool = require('../db')
const { computeAllQuotes } = require('../services/comparatorEngine')
const { buildComparatorPdf } = require('../services/comparatorPdfService')

router.use(verifyToken)

function uid(req) { return Number(req.user?.userId || req.user?.id || 0) }

const STORAGE_ROOT = path.join(process.cwd(), 'storage', 'comparator')

router.post('/compute', async (req, res) => {
  try {
    const userId = uid(req)
    if (!userId) return res.status(401).json({ error: 'auth_required' })
    const { profile = {}, produit = 'Auto', level = 'confort', client_id = null } = req.body || {}
    const { quotes, summary } = computeAllQuotes(profile, { produit, level })

    const { rows } = await pool.query(`
      INSERT INTO comparator_runs (user_id, client_id, product, profile, quotes, best_provider, best_premium_cents, ark_recommendation)
      VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6, $7, $8)
      RETURNING id, created_at
    `, [userId, client_id, produit, JSON.stringify(profile), JSON.stringify(quotes),
        summary.cheapest_provider, Math.round(summary.cheapest_eur * 100), summary.ark_explanation])

    res.json({ ok: true, run_id: rows[0].id, quotes, summary, created_at: rows[0].created_at })
  } catch (err) {
    res.status(500).json({ error: 'compute_failed', message: err.message })
  }
})

router.post('/export-pdf', async (req, res) => {
  try {
    const userId = uid(req)
    const { run_id, client_name = '' } = req.body || {}
    if (!run_id) return res.status(400).json({ error: 'missing_run_id' })

    const { rows } = await pool.query(
      `SELECT * FROM comparator_runs WHERE id = $1 AND user_id = $2`, [run_id, userId]
    )
    if (!rows[0]) return res.status(404).json({ error: 'run_not_found' })

    const run = rows[0]
    const quotes = run.quotes || []
    const summary = {
      produit: run.product,
      level: quotes[0]?.level || 'confort',
      cheapest_provider: run.best_provider,
      cheapest_eur: Math.round((run.best_premium_cents || 0) / 100),
      most_expensive_eur: Math.max(...quotes.map(q => q.prime_annuelle_eur || 0)),
      economy_eur: Math.max(...quotes.map(q => q.prime_annuelle_eur || 0)) - Math.min(...quotes.map(q => q.prime_annuelle_eur || 0)),
      ark_explanation: run.ark_recommendation,
    }

    const filename = `comparator-${run_id}-${Date.now()}.pdf`
    const outPath = path.join(STORAGE_ROOT, String(userId), filename)
    await buildComparatorPdf({ outputPath: outPath, quotes, summary, clientName: client_name })
    await pool.query(`UPDATE comparator_runs SET pdf_path = $1 WHERE id = $2`, [outPath, run_id])

    res.json({ ok: true, pdf_url: `/api/comparator/download/${run_id}`, filename })
  } catch (err) {
    res.status(500).json({ error: 'export_pdf_failed', message: err.message })
  }
})

router.get('/download/:id', async (req, res) => {
  try {
    const userId = uid(req)
    const { rows } = await pool.query(
      `SELECT pdf_path FROM comparator_runs WHERE id = $1 AND user_id = $2`,
      [Number(req.params.id), userId]
    )
    if (!rows[0]?.pdf_path || !fs.existsSync(rows[0].pdf_path)) {
      return res.status(404).json({ error: 'pdf_not_found' })
    }
    res.setHeader('Content-Type', 'application/pdf')
    fs.createReadStream(rows[0].pdf_path).pipe(res)
  } catch (err) {
    res.status(500).json({ error: 'download_failed' })
  }
})

router.get('/runs', async (req, res) => {
  try {
    const userId = uid(req)
    const { rows } = await pool.query(`
      SELECT r.id, r.product, r.best_provider, r.best_premium_cents, r.created_at,
             c.first_name, c.last_name
      FROM comparator_runs r LEFT JOIN clients c ON c.id = r.client_id
      WHERE r.user_id = $1
      ORDER BY r.created_at DESC LIMIT 50
    `, [userId])
    res.json({ ok: true, runs: rows })
  } catch (err) {
    res.status(500).json({ error: 'list_failed' })
  }
})

router.post('/send-email', async (req, res) => {
  try {
    const userId = uid(req)
    const { run_id, email, message = '' } = req.body || {}
    if (!run_id || !email) return res.status(400).json({ error: 'missing_params' })
    // On enregistre une intention d'envoi (l'email sera réellement envoyé via emailService si configuré)
    await pool.query(`
      INSERT INTO email_send_log (user_id, recipient_email, subject, body, status, created_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
    `, [userId, email, `Votre comparatif assurance COURTIA #${run_id}`, message || 'Comparatif joint en PDF.', 'queued']).catch(() => {})
    res.json({ ok: true, queued: true })
  } catch (err) {
    res.status(500).json({ error: 'send_failed' })
  }
})

module.exports = router
