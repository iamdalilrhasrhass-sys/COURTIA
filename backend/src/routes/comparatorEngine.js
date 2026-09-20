/**
 * COMPARATOR ENGINE — moteur de SIMULATION tarifaire (8 profils simulés)
 *  POST /api/comparator/compute     → calcule 8 devis SIMULÉS
 *  POST /api/comparator/export-pdf  → PDF (refusé sur un comparatif simulé)
 *  POST /api/comparator/send-email  → envoi client (refusé sur un comparatif simulé)
 *  GET  /api/comparator/runs/:userId → historique
 *
 * Ce moteur ne consulte AUCUN assureur : les offres qu'il produit portent
 * `is_simulation: true` et `source: 'simulation'`. Elles ne peuvent donc pas
 * être exportées en PDF ni envoyées à un client (voir lib/donneesReelles.js).
 */
const express = require('express')
const router = express.Router()
const path = require('path')
const fs = require('fs')
const { verifyToken } = require('../middleware/auth')
const pool = require('../db')
const { computeAllQuotes, SIMULATION_NOTICE } = require('../services/comparatorEngine')
const { buildComparatorPdf } = require('../services/comparatorPdfService')
const { estOffreReelle, MESSAGE_OFFRES_SIMULEES } = require('../lib/donneesReelles')

router.use(verifyToken)

function uid(req) { return Number(req.user?.userId || req.user?.id || 0) }

const STORAGE_ROOT = path.join(process.cwd(), 'storage', 'comparator')

/**
 * Un comparatif est simulé dès qu'au moins une de ses offres n'a pas de
 * provenance réelle. Historiquement, les offres n'avaient AUCUN champ
 * `source` : elles sont donc elles aussi considérées comme simulées.
 */
function runEstSimule(quotes) {
  const liste = Array.isArray(quotes) ? quotes : []
  if (liste.length === 0) return true
  return liste.some((q) => !estOffreReelle(q)) || liste.some((q) => q && q.is_simulation === true)
}

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

    res.json({
      ok: true,
      run_id: rows[0].id,
      quotes,
      summary,
      // Champs portés à la racine pour qu'aucun client ne puisse les manquer.
      is_simulation: true,
      source: 'simulation',
      simulation_notice: SIMULATION_NOTICE,
      client_usable: false,
      created_at: rows[0].created_at,
    })
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

    // Aucun document destiné à un client ne sort d'un comparatif simulé : il
    // porterait des tarifs, des notations et des délais qui n'existent pas.
    if (runEstSimule(quotes)) {
      return res.status(409).json({
        error: 'simulated_export_refused',
        message: MESSAGE_OFFRES_SIMULEES,
        is_simulation: true,
        simulation_notice: SIMULATION_NOTICE,
        client_usable: false,
      })
    }

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

    const { rows } = await pool.query(
      `SELECT id, quotes FROM comparator_runs WHERE id = $1 AND user_id = $2`,
      [run_id, userId]
    )
    if (!rows[0]) return res.status(404).json({ error: 'run_not_found' })

    // Avant : la route insérait une ligne 'queued' dans email_send_log et
    // répondait { ok: true, queued: true } — un succès affiché pour un e-mail
    // jamais envoyé. Désormais : on refuse les comparatifs simulés et on ne
    // déclare « envoyé » que sur un succès explicite du service d'e-mail.
    if (runEstSimule(rows[0].quotes)) {
      return res.status(409).json({
        error: 'simulated_offers_refused',
        message: MESSAGE_OFFRES_SIMULEES,
        is_simulation: true,
        email_sent: false,
      })
    }

    const { sendCommercialEmail } = require('../services/emailService')
    const envoi = await sendCommercialEmail({
      to: email,
      subject: `Votre comparatif assurance COURTIA #${run_id}`,
      text: message || 'Votre comparatif est disponible dans votre espace COURTIA.',
    })

    if (!envoi || !envoi.success) {
      return res.status(envoi?.skipped ? 503 : 502).json({
        error: envoi?.skipped ? 'email_not_configured' : 'email_send_failed',
        message: envoi?.skipped
          ? "L'envoi d'e-mail n'est pas configuré sur cette installation : le comparatif n'a pas été envoyé."
          : "L'envoi du comparatif a échoué. Le comparatif n'a pas été envoyé.",
        email_sent: false,
      })
    }

    res.json({ ok: true, email_sent: true, to: email, provider: envoi.provider || null })
  } catch (err) {
    res.status(500).json({ error: 'send_failed', message: "L'envoi du comparatif a échoué." })
  }
})

module.exports = router
