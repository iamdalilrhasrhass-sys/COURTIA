/**
 * Routes Reporting Avancé — LOT 20
 * Dashboard analytics personnalisable + exports CSV/PDF
 */

const express = require('express')
const router = express.Router()
const verifyToken = require('../middleware/authMiddleware')
const { captureException } = require('../sentry')
const PDFDocument = require('pdfkit')

// GET /api/reporting/overview — KPIs globaux
router.get('/overview', verifyToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool
    const userId = req.user?.id || req.user?.userId
    const { period = '30d' } = req.query

    const days = period === '7d' ? 7 : period === '90d' ? 90 : period === '1y' ? 365 : 30

    const [clientsRes, contractsRes, quotesRes, oppRes, arkRes, signaturesRes] = await Promise.all([
      pool.query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE created_at >= NOW() - $2::interval) as new FROM clients WHERE user_id = $1', [userId, `${days} days`]),
      pool.query(`
        SELECT
          COUNT(*) as total,
          COALESCE(SUM(prime_annuelle), 0) as total_value,
          COUNT(*) FILTER (WHERE date_echeance BETWEEN NOW() AND NOW() + INTERVAL '90 days') as expiring_90d
        FROM contracts WHERE client_id IN (SELECT id FROM clients WHERE user_id = $1)
      `, [userId]),
      pool.query(`
        SELECT
          COUNT(*) as total,
          COALESCE(SUM(montant), 0) as total_value,
          COUNT(*) FILTER (WHERE statut = 'accepte') as won,
          COUNT(*) FILTER (WHERE created_at >= NOW() - $2::interval) as new
        FROM quotes WHERE user_id = $1
      `, [userId, `${days} days`]),
      pool.query(`
        SELECT
          COUNT(*) as total,
          COALESCE(SUM(valeur_estimee), 0) as total_value,
          COUNT(*) FILTER (WHERE statut = 'gagne') as won
        FROM opportunities WHERE user_id = $1
      `, [userId]),
      pool.query(`
        SELECT
          COUNT(*) as total_signals,
          COALESCE(AVG(CASE WHEN type = 'ark_score' THEN CAST(data->>'score' AS DECIMAL) END), 75) as avg_ark_score
        FROM ark_signals WHERE user_id = $1 AND created_at >= NOW() - $2::interval
      `, [userId, `${days} days`]),
      pool.query(`
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'signed') as signed
        FROM signature_requests WHERE user_id = $1
      `, [userId])
    ])

    const clients = clientsRes.rows[0]
    const contracts = contractsRes.rows[0]
    const quotes = quotesRes.rows[0]
    const opportunities = oppRes.rows[0]
    const arkMetrics = arkRes.rows[0]
    const signatures = signaturesRes.rows[0]

    res.json({
      period,
      kpis: {
        clients: {
          total: parseInt(clients.total) || 0,
          new: parseInt(clients.new) || 0,
        },
        contracts: {
          total: parseInt(contracts.total) || 0,
          totalValue: parseFloat(contracts.total_value) || 0,
          expiring90d: parseInt(contracts.expiring_90d) || 0,
        },
        quotes: {
          total: parseInt(quotes.total) || 0,
          totalValue: parseFloat(quotes.total_value) || 0,
          won: parseInt(quotes.won) || 0,
          new: parseInt(quotes.new) || 0,
          conversionRate: quotes.total > 0 ? Math.round((quotes.won / quotes.total) * 100) : 0,
        },
        opportunities: {
          total: parseInt(opportunities.total) || 0,
          totalValue: parseFloat(opportunities.total_value) || 0,
          won: parseInt(opportunities.won) || 0,
        },
        ark: {
          totalSignals: parseInt(arkMetrics.total_signals) || 0,
          avgScore: Math.round(parseFloat(arkMetrics.avg_ark_score) || 75),
        },
        signatures: {
          total: parseInt(signatures.total) || 0,
          signed: parseInt(signatures.signed) || 0,
          rate: signatures.total > 0 ? Math.round((signatures.signed / signatures.total) * 100) : 0,
        },
      },
    })
  } catch (err) {
    console.error('[Reporting] overview error:', err)
    captureException(err)
    res.status(500).json({ error: err.message })
  }
})

// GET /api/reporting/clients/evolution — Courbe de croissance clients
router.get('/clients/evolution', verifyToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool
    const userId = req.user?.id || req.user?.userId
    const { period = '30d' } = req.query

    const days = period === '7d' ? 7 : period === '90d' ? 90 : period === '1y' ? 365 : 30

    const result = await pool.query(`
      SELECT
        DATE_TRUNC('day', created_at) as date,
        COUNT(*) as count
      FROM clients
      WHERE user_id = $1 AND created_at >= NOW() - $2::interval
      GROUP BY DATE_TRUNC('day', created_at)
      ORDER BY date
    `, [userId, `${days} days`])

    const cumulativeResult = await pool.query(`
      SELECT COUNT(*) as total FROM clients WHERE user_id = $1 AND created_at < NOW() - $2::interval
    `, [userId, `${days} days`])

    let cumulative = parseInt(cumulativeResult.rows[0].total) || 0

    const evolution = result.rows.map(row => {
      cumulative += parseInt(row.count)
      return {
        date: row.date,
        new: parseInt(row.count),
        cumulative,
      }
    })

    res.json({ period, evolution })
  } catch (err) {
    console.error('[Reporting] clients evolution error:', err)
    captureException(err)
    res.status(500).json({ error: err.message })
  }
})

// GET /api/reporting/revenue/forecast — Prévisions CA
router.get('/revenue/forecast', verifyToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool
    const userId = req.user?.id || req.user?.userId

    const [currentRes, renewalsRes, oppRes] = await Promise.all([
      pool.query(`
        SELECT COALESCE(SUM(prime_annuelle), 0) as current_arr
        FROM contracts
        WHERE client_id IN (SELECT id FROM clients WHERE user_id = $1)
        AND (date_fin IS NULL OR date_fin > NOW())
      `, [userId]),
      pool.query(`
        SELECT
          COALESCE(SUM(CASE WHEN date_echeance BETWEEN NOW() AND NOW() + INTERVAL '30 days' THEN prime_annuelle END), 0) as next_30d,
          COALESCE(SUM(CASE WHEN date_echeance BETWEEN NOW() AND NOW() + INTERVAL '90 days' THEN prime_annuelle END), 0) as next_90d
        FROM contracts
        WHERE client_id IN (SELECT id FROM clients WHERE user_id = $1)
      `, [userId]),
      pool.query(`
        SELECT COALESCE(SUM(valeur_estimee), 0) as pipeline_value
        FROM opportunities
        WHERE user_id = $1 AND statut IN ('nouveau', 'en_cours', 'chaud')
      `, [userId])
    ])

    const currentArr = parseFloat(currentRes.rows[0].current_arr) || 0
    const renewals30d = parseFloat(renewalsRes.rows[0].next_30d) || 0
    const renewals90d = parseFloat(renewalsRes.rows[0].next_90d) || 0
    const pipelineValue = parseFloat(oppRes.rows[0].pipeline_value) || 0

    res.json({
      currentARR: currentArr,
      projectedARR: currentArr + (pipelineValue * 0.3),
      renewals: {
        next30d: renewals30d,
        next90d: renewals90d,
      },
      pipeline: {
        totalValue: pipelineValue,
        weightedValue: pipelineValue * 0.3,
      },
      growth: {
        monthlyTarget: currentArr * 1.05,
        quarterlyTarget: currentArr * 1.15,
      },
    })
  } catch (err) {
    console.error('[Reporting] revenue forecast error:', err)
    captureException(err)
    res.status(500).json({ error: err.message })
  }
})

// GET /api/reporting/ark-performance — Métriques ARK
router.get('/ark-performance', verifyToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool
    const userId = req.user?.id || req.user?.userId
    const { period = '30d' } = req.query

    const days = period === '7d' ? 7 : period === '90d' ? 90 : period === '1y' ? 365 : 30

    const [signalsRes, actionsRes, scoresRes] = await Promise.all([
      pool.query(`
        SELECT
          type,
          COUNT(*) as count
        FROM ark_signals
        WHERE user_id = $1 AND created_at >= NOW() - $2::interval
        GROUP BY type
      `, [userId, `${days} days`]),
      pool.query(`
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE completed = true) as completed
        FROM ark_actions
        WHERE user_id = $1 AND created_at >= NOW() - $2::interval
      `, [userId, `${days} days`]),
      pool.query(`
        SELECT
          AVG(ark_score) as avg_score,
          MIN(ark_score) as min_score,
          MAX(ark_score) as max_score,
          COUNT(*) FILTER (WHERE ark_score >= 80) as excellent,
          COUNT(*) FILTER (WHERE ark_score >= 60 AND ark_score < 80) as good,
          COUNT(*) FILTER (WHERE ark_score < 60) as needs_attention
        FROM clients
        WHERE user_id = $1 AND ark_score IS NOT NULL
      `, [userId])
    ])

    const signalsByType = {}
    signalsRes.rows.forEach(r => { signalsByType[r.type] = parseInt(r.count) })

    const actions = actionsRes.rows[0]
    const scores = scoresRes.rows[0]

    res.json({
      period,
      signals: {
        total: Object.values(signalsByType).reduce((a, b) => a + b, 0),
        byType: signalsByType,
      },
      actions: {
        total: parseInt(actions.total) || 0,
        completed: parseInt(actions.completed) || 0,
        completionRate: actions.total > 0 ? Math.round((actions.completed / actions.total) * 100) : 0,
      },
      scores: {
        average: Math.round(parseFloat(scores.avg_score) || 75),
        min: Math.round(parseFloat(scores.min_score) || 0),
        max: Math.round(parseFloat(scores.max_score) || 100),
        distribution: {
          excellent: parseInt(scores.excellent) || 0,
          good: parseInt(scores.good) || 0,
          needsAttention: parseInt(scores.needs_attention) || 0,
        },
      },
    })
  } catch (err) {
    console.error('[Reporting] ark performance error:', err)
    captureException(err)
    res.status(500).json({ error: err.message })
  }
})

// GET /api/reporting/products — Répartition par type de produit
router.get('/products', verifyToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool
    const userId = req.user?.id || req.user?.userId

    const result = await pool.query(`
      SELECT
        COALESCE(type_contrat, 'autre') as product_type,
        COUNT(*) as count,
        COALESCE(SUM(prime_annuelle), 0) as total_premium
      FROM contracts
      WHERE client_id IN (SELECT id FROM clients WHERE user_id = $1)
      GROUP BY type_contrat
      ORDER BY total_premium DESC
    `, [userId])

    res.json({
      products: result.rows.map(r => ({
        type: r.product_type,
        count: parseInt(r.count),
        totalPremium: parseFloat(r.total_premium),
      })),
    })
  } catch (err) {
    console.error('[Reporting] products error:', err)
    captureException(err)
    res.status(500).json({ error: err.message })
  }
})

// GET /api/reporting/export/csv — Export données CSV
router.get('/export/csv', verifyToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool
    const userId = req.user?.id || req.user?.userId
    const { type = 'clients' } = req.query

    let data = []
    let headers = []

    if (type === 'clients') {
      const result = await pool.query(`
        SELECT
          c.first_name, c.last_name, c.email, c.phone,
          c.ark_score,
          COUNT(ct.id) as contracts_count,
          COALESCE(SUM(ct.prime_annuelle), 0) as total_premium,
          c.created_at
        FROM clients c
        LEFT JOIN contracts ct ON ct.client_id = c.id
        WHERE c.user_id = $1
        GROUP BY c.id
        ORDER BY c.last_name
      `, [userId])
      headers = ['Prénom', 'Nom', 'Email', 'Téléphone', 'Score ARK', 'Contrats', 'Prime totale', 'Créé le']
      data = result.rows.map(r => [
        r.first_name, r.last_name, r.email, r.phone,
        r.ark_score, r.contracts_count, r.total_premium,
        r.created_at ? new Date(r.created_at).toLocaleDateString('fr-FR') : ''
      ])
    } else if (type === 'contracts') {
      const result = await pool.query(`
        SELECT
          c.first_name || ' ' || c.last_name as client_name,
          ct.numero_contrat, ct.type_contrat, ct.compagnie,
          ct.prime_annuelle, ct.date_effet, ct.date_echeance
        FROM contracts ct
        JOIN clients c ON ct.client_id = c.id
        WHERE c.user_id = $1
        ORDER BY ct.date_echeance
      `, [userId])
      headers = ['Client', 'N° Contrat', 'Type', 'Compagnie', 'Prime', 'Date effet', 'Échéance']
      data = result.rows.map(r => [
        r.client_name, r.numero_contrat, r.type_contrat, r.compagnie,
        r.prime_annuelle,
        r.date_effet ? new Date(r.date_effet).toLocaleDateString('fr-FR') : '',
        r.date_echeance ? new Date(r.date_echeance).toLocaleDateString('fr-FR') : ''
      ])
    }

    const csv = [headers.join(';'), ...data.map(row => row.join(';'))].join('\n')

    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="export_${type}_${Date.now()}.csv"`)
    res.send('﻿' + csv)
  } catch (err) {
    console.error('[Reporting] export CSV error:', err)
    captureException(err)
    res.status(500).json({ error: err.message })
  }
})

// GET /api/reporting/export/pdf — Rapport PDF
router.get('/export/pdf', verifyToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool
    const userId = req.user?.id || req.user?.userId
    const user = req.user

    const [clientsRes, contractsRes, statsRes] = await Promise.all([
      pool.query('SELECT COUNT(*) as total FROM clients WHERE user_id = $1', [userId]),
      pool.query(`
        SELECT COUNT(*) as total, COALESCE(SUM(prime_annuelle), 0) as total_premium
        FROM contracts WHERE client_id IN (SELECT id FROM clients WHERE user_id = $1)
      `, [userId]),
      pool.query(`
        SELECT AVG(ark_score) as avg_score FROM clients WHERE user_id = $1 AND ark_score IS NOT NULL
      `, [userId])
    ])

    const doc = new PDFDocument({ margin: 50 })
    const buffers = []
    doc.on('data', buffers.push.bind(buffers))
    doc.on('end', () => {
      const pdf = Buffer.concat(buffers)
      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', `attachment; filename="rapport_courtia_${Date.now()}.pdf"`)
      res.send(pdf)
    })

    doc.fontSize(24).fillColor('#6366f1').text('COURTIA', { align: 'center' })
    doc.fontSize(16).fillColor('#333').text('Rapport de Performance', { align: 'center' })
    doc.moveDown()
    doc.fontSize(10).fillColor('#666').text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, { align: 'center' })
    doc.moveDown(2)

    doc.fontSize(14).fillColor('#6366f1').text('Synthèse du Portefeuille')
    doc.moveDown()
    doc.fontSize(12).fillColor('#333')
    doc.text(`Nombre de clients : ${clientsRes.rows[0].total}`)
    doc.text(`Nombre de contrats : ${contractsRes.rows[0].total}`)
    doc.text(`Prime totale annuelle : ${parseFloat(contractsRes.rows[0].total_premium).toLocaleString('fr-FR')} EUR`)
    doc.text(`Score ARK moyen : ${Math.round(parseFloat(statsRes.rows[0].avg_score) || 75)} / 100`)
    doc.moveDown(2)

    doc.fontSize(10).fillColor('#999').text('Ce rapport a été généré automatiquement par COURTIA - Plateforme ARK pour courtiers en assurance.', { align: 'center' })

    doc.end()
  } catch (err) {
    console.error('[Reporting] export PDF error:', err)
    captureException(err)
    res.status(500).json({ error: err.message })
  }
})

module.exports = router