const express = require('express')
const {
  upsertCommission,
  listCommissions,
  importCommissionsCsv,
  getCommissionStats,
} = require('../services/commissionService')
const { requireCabinetFeature } = require('../middleware/cabinetAccess')

const router = express.Router()

router.use(requireCabinetFeature('v1_commissions'))

async function saveCommissionForContract(req, res) {
  try {
    const row = await upsertCommission(req.app.locals.pool, req.user, req.params.id, req.body)
    res.status(201).json(row)
  } catch (err) {
    const status = err.statusCode || (err.message === 'invalid_period' || err.message === 'insurer_required' ? 400 : 500)
    res.status(status).json({
      error: err.message || 'commission_save_failed',
      message: status === 404
        ? 'Contrat introuvable ou non rattaché à votre cabinet.'
        : 'Impossible d’enregistrer cette commission.',
    })
  }
}

router.get('/', async (req, res) => {
  try {
    const rows = await listCommissions(req.app.locals.pool, req.user, req.query)
    res.json({ data: rows, total: rows.length })
  } catch (err) {
    res.status(err.statusCode || 500).json({
      error: err.message || 'commissions_unavailable',
      message: 'Impossible de charger les commissions pour le moment.',
    })
  }
})

router.get('/stats', async (req, res) => {
  try {
    const stats = await getCommissionStats(req.app.locals.pool, req.user, req.query)
    res.json(stats)
  } catch (err) {
    res.status(err.statusCode || 500).json({
      error: err.message || 'commission_stats_unavailable',
      message: 'Impossible de calculer les statistiques commissions.',
    })
  }
})

router.post('/import', async (req, res) => {
  try {
    const csv = req.body?.csv || req.body?.content || ''
    if (!csv) {
      return res.status(400).json({ error: 'csv_required', message: 'Ajoutez un contenu CSV à importer.' })
    }
    const report = await importCommissionsCsv(req.app.locals.pool, req.user, csv)
    res.status(201).json(report)
  } catch (err) {
    res.status(err.statusCode || 500).json({
      error: err.message || 'commission_import_failed',
      message: 'Import commissions impossible pour le moment.',
    })
  }
})

router.post('/contracts/:id', saveCommissionForContract)

// LOT 22 — Commissions Auto + Rapprochement
const commissionsAutoService = require('../services/commissionsAutoService')

// Liste des règles de commission
router.get('/rules', async (req, res) => {
  try {
    const rules = await commissionsAutoService.listRules(req.app.locals.pool, req.user.id || req.user.userId)
    res.json({ data: rules, total: rules.length })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Créer/modifier une règle
router.post('/rules', async (req, res) => {
  try {
    const rule = await commissionsAutoService.upsertRule(req.app.locals.pool, req.user.id || req.user.userId, req.body)
    res.status(201).json(rule)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Calcul automatique pour un contrat
router.post('/calculate/:contractId', async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId
    const { period } = req.body

    if (!period) {
      return res.status(400).json({ error: 'period requis (ex: "2026-05" ou { year: 2026, month: 5 })' })
    }

    const result = await commissionsAutoService.calculateCommission(
      req.app.locals.pool,
      userId,
      parseInt(req.params.contractId, 10),
      period
    )
    res.json(result)
  } catch (err) {
    res.status(err.message === 'Contrat introuvable' ? 404 : 500).json({ error: err.message })
  }
})

// Calcul batch pour une période
router.post('/calculate-period', async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId
    const { period } = req.body

    if (!period) {
      return res.status(400).json({ error: 'period requis' })
    }

    const result = await commissionsAutoService.calculatePeriodCommissions(
      req.app.locals.pool,
      userId,
      period
    )
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Rapprochement mensuel
router.get('/reconcile/:year/:month', async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId
    const year = parseInt(req.params.year, 10)
    const month = parseInt(req.params.month, 10)

    const result = await commissionsAutoService.reconcileMonth(
      req.app.locals.pool,
      userId,
      year,
      month
    )
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Générer relevé PDF
router.get('/statement/:year/:month/pdf', async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId
    const year = parseInt(req.params.year, 10)
    const month = parseInt(req.params.month, 10)

    const result = await commissionsAutoService.generateStatement(
      req.app.locals.pool,
      userId,
      year,
      month
    )

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`)
    res.send(result.pdf)
  } catch (err) {
    console.error('[Commissions PDF] Erreur:', err.message)
    res.status(500).json({ error: err.message })
  }
})

module.exports = {
  router,
  saveCommissionForContract,
}
