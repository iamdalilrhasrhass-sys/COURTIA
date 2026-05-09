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

module.exports = {
  router,
  saveCommissionForContract,
}
