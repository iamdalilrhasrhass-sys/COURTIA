/**
 * Routes Comptabilité / FEC
 * LOT 22 — Export comptable format DGFIP
 */

const express = require('express')
const router = express.Router()
const verifyToken = require('../middleware/authMiddleware')
const fecService = require('../services/fecService')

router.use(verifyToken)

/**
 * Génère et télécharge le fichier FEC
 */
router.get('/fec', async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId
    const { start, end, year } = req.query

    let startDate, endDate

    if (year) {
      // Export année complète
      startDate = new Date(parseInt(year, 10), 0, 1)
      endDate = new Date(parseInt(year, 10), 11, 31)
    } else if (start && end) {
      startDate = new Date(start)
      endDate = new Date(end)
    } else {
      // Par défaut : année en cours
      const now = new Date()
      startDate = new Date(now.getFullYear(), 0, 1)
      endDate = new Date(now.getFullYear(), 11, 31)
    }

    const fec = await fecService.generateFEC(req.app.locals.pool, userId, startDate, endDate)

    // Headers pour téléchargement
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="${fec.filename}"`)
    res.send(fec.content)
  } catch (err) {
    console.error('[FEC] Erreur génération:', err.message)
    res.status(500).json({ error: err.message })
  }
})

/**
 * Résumé comptable annuel
 */
router.get('/summary/:year', async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId
    const year = parseInt(req.params.year, 10) || new Date().getFullYear()

    const summary = await fecService.getAccountingSummary(req.app.locals.pool, userId, year)
    res.json(summary)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * Bilan simplifié
 */
router.get('/balance/:year', async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId
    const year = parseInt(req.params.year, 10) || new Date().getFullYear()

    const balance = await fecService.getBalance(req.app.locals.pool, userId, year)
    res.json(balance)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * Génère les écritures comptables depuis les commissions
 */
router.post('/generate-from-commissions', async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId
    const { startDate, endDate } = req.body

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate et endDate requis' })
    }

    const result = await fecService.generateEntriesFromCommissions(
      req.app.locals.pool,
      userId,
      new Date(startDate),
      new Date(endDate)
    )

    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * Liste les écritures comptables
 */
router.get('/entries', async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId
    const { year, month, journal, limit = 100, offset = 0 } = req.query

    let query = `
      SELECT * FROM accounting_entries
      WHERE user_id = $1
    `
    const params = [userId]

    if (year) {
      params.push(parseInt(year, 10))
      query += ` AND EXTRACT(YEAR FROM ecriture_date) = $${params.length}`
    }

    if (month) {
      params.push(parseInt(month, 10))
      query += ` AND EXTRACT(MONTH FROM ecriture_date) = $${params.length}`
    }

    if (journal) {
      params.push(journal)
      query += ` AND journal_code = $${params.length}`
    }

    query += ` ORDER BY ecriture_date DESC, ecriture_num DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`
    params.push(parseInt(limit, 10), parseInt(offset, 10))

    const result = await req.app.locals.pool.query(query, params)

    res.json({ 
      data: result.rows.map(r => ({
        ...r,
        debit_eur: fecService.centsToEuros ? fecService.centsToEuros(r.debit_cents) : r.debit_cents / 100,
        credit_eur: fecService.centsToEuros ? fecService.centsToEuros(r.credit_cents) : r.credit_cents / 100
      })),
      total: result.rows.length 
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * Ajoute une écriture comptable manuelle
 */
router.post('/entries', async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId
    const entry = await fecService.createAccountingEntry(req.app.locals.pool, userId, req.body)
    res.status(201).json(entry)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
