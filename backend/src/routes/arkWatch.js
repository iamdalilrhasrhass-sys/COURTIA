/**
 * Routes ARK Watch — LOT 7
 * 
 * Surveillance proactive du portefeuille courtier.
 * 
 * Routes:
 * - GET    /api/ark-watch/signals         Liste des signaux (filtres)
 * - GET    /api/ark-watch/signals/:id     Détail d'un signal
 * - POST   /api/ark-watch/signals/:id/acknowledge  Marquer comme vu
 * - POST   /api/ark-watch/signals/:id/resolve      Marquer comme résolu
 * - DELETE /api/ark-watch/signals/:id     Supprimer (dismiss)
 * - POST   /api/ark-watch/run             Déclencher manuellement
 * - GET    /api/ark-watch/stats           KPIs du courtier
 * - GET    /api/ark-watch/morning-brief   Briefing matinal
 * - GET    /api/ark-watch/runs            Historique des runs
 * - GET    /api/ark-watch/detectors       Liste des détecteurs disponibles
 */

const express = require('express')
const router = express.Router()
const pool = require('../db')
const logger = require('../lib/logger')
const {
  runArkWatch,
  getSignalStats,
  generateMorningBrief,
  getDetectorsList
} = require('../services/arkWatch')

// =============================================================================
// GET /api/ark-watch/signals — Liste des signaux
// =============================================================================

router.get('/signals', async (req, res) => {
  try {
    const brokerId = req.user.id
    const {
      status,
      severity,
      type,
      client_id,
      date_from,
      date_to,
      limit = 50,
      offset = 0,
      sort = 'priority' // priority | date | score
    } = req.query
    
    let sql = `
      SELECT 
        s.*,
        c.first_name AS client_first_name,
        c.last_name AS client_last_name,
        c.company_name AS client_company,
        c.email AS client_email
      FROM ark_watch_signals s
      LEFT JOIN clients c ON s.client_id = c.id
      WHERE s.broker_id = $1
    `
    const params = [brokerId]
    let paramIndex = 2
    
    if (status) {
      sql += ` AND s.status = $${paramIndex++}`
      params.push(status)
    }
    
    if (severity) {
      sql += ` AND s.severity = $${paramIndex++}`
      params.push(severity)
    }
    
    if (type) {
      sql += ` AND s.signal_type = $${paramIndex++}`
      params.push(type)
    }
    
    if (client_id) {
      sql += ` AND s.client_id = $${paramIndex++}`
      params.push(parseInt(client_id))
    }
    
    if (date_from) {
      sql += ` AND s.detected_at >= $${paramIndex++}`
      params.push(date_from)
    }
    
    if (date_to) {
      sql += ` AND s.detected_at <= $${paramIndex++}`
      params.push(date_to)
    }
    
    // Tri
    if (sort === 'priority') {
      sql += ` ORDER BY 
        CASE s.severity WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
        s.score DESC, s.detected_at DESC`
    } else if (sort === 'date') {
      sql += ` ORDER BY s.detected_at DESC`
    } else if (sort === 'score') {
      sql += ` ORDER BY s.score DESC, s.detected_at DESC`
    }
    
    sql += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`
    params.push(parseInt(limit), parseInt(offset))
    
    const result = await pool.query(sql, params)
    
    // Comptage total
    let countSql = `
      SELECT COUNT(*) FROM ark_watch_signals s WHERE s.broker_id = $1
    `
    const countParams = [brokerId]
    let countIndex = 2
    
    if (status) {
      countSql += ` AND s.status = $${countIndex++}`
      countParams.push(status)
    }
    if (severity) {
      countSql += ` AND s.severity = $${countIndex++}`
      countParams.push(severity)
    }
    if (type) {
      countSql += ` AND s.signal_type = $${countIndex++}`
      countParams.push(type)
    }
    
    const countResult = await pool.query(countSql, countParams)
    
    res.json({
      signals: result.rows.map(formatSignal),
      total: parseInt(countResult.rows[0].count),
      limit: parseInt(limit),
      offset: parseInt(offset)
    })
    
  } catch (err) {
    logger.error({ error: err.message }, 'ARK Watch signals list error')
    res.status(500).json({ error: 'Erreur serveur', details: err.message })
  }
})

// =============================================================================
// GET /api/ark-watch/signals/:id — Détail d'un signal
// =============================================================================

router.get('/signals/:id', async (req, res) => {
  try {
    const brokerId = req.user.id
    const signalId = parseInt(req.params.id)
    
    const result = await pool.query(`
      SELECT 
        s.*,
        c.first_name AS client_first_name,
        c.last_name AS client_last_name,
        c.company_name AS client_company,
        c.email AS client_email,
        c.phone AS client_phone,
        c.type AS client_type
      FROM ark_watch_signals s
      LEFT JOIN clients c ON s.client_id = c.id
      WHERE s.id = $1 AND s.broker_id = $2
    `, [signalId, brokerId])
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Signal non trouvé' })
    }
    
    res.json(formatSignal(result.rows[0], true))
    
  } catch (err) {
    logger.error({ error: err.message }, 'ARK Watch signal detail error')
    res.status(500).json({ error: 'Erreur serveur', details: err.message })
  }
})

// =============================================================================
// POST /api/ark-watch/signals/:id/acknowledge — Marquer comme vu
// =============================================================================

router.post('/signals/:id/acknowledge', async (req, res) => {
  try {
    const brokerId = req.user.id
    const signalId = parseInt(req.params.id)
    
    const result = await pool.query(`
      UPDATE ark_watch_signals
      SET status = 'acknowledged', acknowledged_at = NOW()
      WHERE id = $1 AND broker_id = $2 AND status = 'new'
      RETURNING *
    `, [signalId, brokerId])
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Signal non trouvé ou déjà traité' })
    }
    
    res.json({ success: true, signal: formatSignal(result.rows[0]) })
    
  } catch (err) {
    logger.error({ error: err.message }, 'ARK Watch acknowledge error')
    res.status(500).json({ error: 'Erreur serveur', details: err.message })
  }
})

// =============================================================================
// POST /api/ark-watch/signals/:id/resolve — Marquer comme résolu
// =============================================================================

router.post('/signals/:id/resolve', async (req, res) => {
  try {
    const brokerId = req.user.id
    const signalId = parseInt(req.params.id)
    const { resolution_note } = req.body
    
    const result = await pool.query(`
      UPDATE ark_watch_signals
      SET 
        status = 'resolved', 
        resolved_at = NOW(),
        metadata = metadata || $3
      WHERE id = $1 AND broker_id = $2 AND status IN ('new', 'acknowledged')
      RETURNING *
    `, [signalId, brokerId, JSON.stringify({ resolution_note })])
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Signal non trouvé ou déjà résolu' })
    }
    
    res.json({ success: true, signal: formatSignal(result.rows[0]) })
    
  } catch (err) {
    logger.error({ error: err.message }, 'ARK Watch resolve error')
    res.status(500).json({ error: 'Erreur serveur', details: err.message })
  }
})

// =============================================================================
// DELETE /api/ark-watch/signals/:id — Supprimer (dismiss)
// =============================================================================

router.delete('/signals/:id', async (req, res) => {
  try {
    const brokerId = req.user.id
    const signalId = parseInt(req.params.id)
    
    const result = await pool.query(`
      DELETE FROM ark_watch_signals
      WHERE id = $1 AND broker_id = $2
      RETURNING id
    `, [signalId, brokerId])
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Signal non trouvé' })
    }
    
    res.json({ success: true, deleted_id: signalId })
    
  } catch (err) {
    logger.error({ error: err.message }, 'ARK Watch delete error')
    res.status(500).json({ error: 'Erreur serveur', details: err.message })
  }
})

// =============================================================================
// POST /api/ark-watch/run — Déclencher manuellement
// =============================================================================

router.post('/run', async (req, res) => {
  try {
    const brokerId = req.user.id
    const { detectors_filter, dry_run = false } = req.body
    
    const runResult = await runArkWatch(brokerId, pool, {
      detectorsFilter: detectors_filter || null,
      dryRun: dry_run,
      runType: 'manual'
    })
    
    res.json(runResult)
    
  } catch (err) {
    logger.error({ error: err.message }, 'ARK Watch run error')
    res.status(500).json({ error: 'Erreur serveur', details: err.message })
  }
})

// =============================================================================
// GET /api/ark-watch/stats — KPIs du courtier
// =============================================================================

router.get('/stats', async (req, res) => {
  try {
    const brokerId = req.user.id
    const stats = await getSignalStats(brokerId, pool)
    res.json(stats)
  } catch (err) {
    logger.error({ error: err.message }, 'ARK Watch stats error')
    res.status(500).json({ error: 'Erreur serveur', details: err.message })
  }
})

// =============================================================================
// GET /api/ark-watch/morning-brief — Briefing matinal
// =============================================================================

router.get('/morning-brief', async (req, res) => {
  try {
    const brokerId = req.user.id
    const brief = await generateMorningBrief(brokerId, pool)
    res.json(brief)
  } catch (err) {
    logger.error({ error: err.message }, 'ARK Watch morning brief error')
    res.status(500).json({ error: 'Erreur serveur', details: err.message })
  }
})

// =============================================================================
// GET /api/ark-watch/runs — Historique des runs
// =============================================================================

router.get('/runs', async (req, res) => {
  try {
    const brokerId = req.user.id
    const { limit = 20, offset = 0 } = req.query
    
    const result = await pool.query(`
      SELECT * FROM ark_watch_runs
      WHERE broker_id = $1
      ORDER BY started_at DESC
      LIMIT $2 OFFSET $3
    `, [brokerId, parseInt(limit), parseInt(offset)])
    
    res.json({
      runs: result.rows,
      limit: parseInt(limit),
      offset: parseInt(offset)
    })
    
  } catch (err) {
    logger.error({ error: err.message }, 'ARK Watch runs error')
    res.status(500).json({ error: 'Erreur serveur', details: err.message })
  }
})

// =============================================================================
// GET /api/ark-watch/detectors — Liste des détecteurs disponibles
// =============================================================================

router.get('/detectors', async (req, res) => {
  try {
    const detectors = getDetectorsList()
    res.json({ detectors })
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur', details: err.message })
  }
})

// =============================================================================
// HELPERS
// =============================================================================

function formatSignal(row, detailed = false) {
  const signal = {
    id: row.id,
    type: row.signal_type,
    severity: row.severity,
    score: row.score,
    title: row.title,
    description: row.description,
    suggested_action: row.suggested_action,
    estimated_value: parseFloat(row.estimated_value || 0),
    status: row.status,
    detected_at: row.detected_at,
    acknowledged_at: row.acknowledged_at,
    resolved_at: row.resolved_at,
    client: row.client_id ? {
      id: row.client_id,
      name: row.client_company || `${row.client_first_name || ''} ${row.client_last_name || ''}`.trim(),
      email: row.client_email
    } : null
  }
  
  if (detailed) {
    signal.quote_id = row.quote_id
    signal.metadata = row.metadata || {}
    signal.dedup_key = row.dedup_key
    if (row.client_phone) signal.client.phone = row.client_phone
    if (row.client_type) signal.client.type = row.client_type
  }
  
  return signal
}

module.exports = router
