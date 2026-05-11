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

// ─── LOT VIBE — Barèmes commissions (catalogue compagnies) ─────────────────

const DEFAULT_BAREMES = {
  Aurora:  { Auto: 12, Habitation: 14, Santé: 8,  Prévoyance: 18, 'RC Pro': 16, 'Flotte Auto': 11, MRH: 13, Cyber: 20, Décennale: 15, PJ: 22 },
  Novalia: { Auto: 11, Habitation: 13, Santé: 9,  Prévoyance: 17, 'RC Pro': 15, 'Flotte Auto': 12, MRH: 14, Cyber: 19, Décennale: 14, PJ: 20 },
  Helios:  { Auto: 10, Habitation: 15, Santé: 7,  Prévoyance: 16, 'RC Pro': 14, 'Flotte Auto': 10, MRH: 12, Cyber: 18, Décennale: 13, PJ: 19 },
  Serenis: { Auto: 13, Habitation: 12, Santé: 10, Prévoyance: 19, 'RC Pro': 17, 'Flotte Auto': 13, MRH: 15, Cyber: 21, Décennale: 16, PJ: 23 },
  Atlas:   { Auto: 12, Habitation: 13, Santé: 8,  Prévoyance: 17, 'RC Pro': 18, 'Flotte Auto': 12, MRH: 14, Cyber: 22, Décennale: 15, PJ: 21 },
  Oria:    { Auto: 11, Habitation: 14, Santé: 9,  Prévoyance: 16, 'RC Pro': 15, 'Flotte Auto': 11, MRH: 13, Cyber: 19, Décennale: 14, PJ: 20 },
  Nivalis: { Auto: 12, Habitation: 13, Santé: 8,  Prévoyance: 18, 'RC Pro': 16, 'Flotte Auto': 12, MRH: 14, Cyber: 20, Décennale: 17, PJ: 22 },
  Solenys: { Auto: 10, Habitation: 12, Santé: 10, Prévoyance: 15, 'RC Pro': 13, 'Flotte Auto': 9,  MRH: 11, Cyber: 17, Décennale: 12, PJ: 18 },
}

router.get('/baremes', async (req, res) => {
  try {
    const pool = req.app.locals.pool
    let rows = []
    try {
      const r = await pool.query(
        `SELECT compagnie, produit, rate_percent, rate_recurring_percent
         FROM commission_baremes
         WHERE is_active = true AND user_id IS NULL AND cabinet_id IS NULL
         ORDER BY compagnie, produit`
      )
      rows = r.rows || []
    } catch (_) {
      rows = []
    }

    // Fallback : si la table n'existe pas ou est vide, on renvoie le catalogue par défaut
    if (!rows.length) {
      rows = Object.entries(DEFAULT_BAREMES).flatMap(([compagnie, produits]) =>
        Object.entries(produits).map(([produit, rate]) => ({
          compagnie,
          produit,
          rate_percent: rate,
          rate_recurring_percent: Number((rate * 0.6).toFixed(1)),
        }))
      )
    }

    res.json({ data: rows, total: rows.length })
  } catch (err) {
    res.status(500).json({ error: err.message, message: 'Impossible de récupérer les barèmes.' })
  }
})

router.post('/calculator', async (req, res) => {
  try {
    const { compagnie, produit, prime_annuelle, recurrence } = req.body || {}
    if (!compagnie || !produit) {
      return res.status(400).json({ error: 'compagnie_produit_required' })
    }
    const rate = DEFAULT_BAREMES[compagnie]?.[produit] ?? null
    if (rate === null) {
      return res.status(404).json({ error: 'bareme_not_found', message: `Pas de barème pour ${compagnie} / ${produit}` })
    }
    const factor = recurrence === 'recurring' ? 0.6 : 1
    const prime = Number(prime_annuelle || 0)
    const commission = (prime * rate * factor) / 100
    res.json({
      compagnie,
      produit,
      rate_percent: rate,
      effective_rate_percent: Number((rate * factor).toFixed(3)),
      prime_annuelle: prime,
      commission_annuelle: Number(commission.toFixed(2)),
      commission_mensuelle: Number((commission / 12).toFixed(2)),
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = {
  router,
  saveCommissionForContract,
}
