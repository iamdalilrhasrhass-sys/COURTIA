/**
 * ARK Watch Runner — LOT 7
 * 
 * Coordinateur principal qui :
 * 1. Crée un run dans ark_watch_runs
 * 2. Exécute tous les détecteurs
 * 3. Insère les signaux en bulk (avec dedup ON CONFLICT)
 * 4. Met à jour le run avec les stats
 */

const { runAllDetectors, getDetectorsList } = require('./detectors')

/**
 * Exécute ARK Watch pour un courtier
 * @param {number} brokerId 
 * @param {Pool} pool 
 * @param {Object} options 
 * @returns {Object} Résultat du run
 */
async function runArkWatch(brokerId, pool, options = {}) {
  const startTime = Date.now()
  const { dryRun = false, detectorsFilter = null, runType = 'manual' } = options
  
  let runId = null
  
  try {
    // 1. Créer le run
    if (!dryRun) {
      const runResult = await pool.query(`
        INSERT INTO ark_watch_runs (broker_id, run_type, started_at, status)
        VALUES ($1, $2, NOW(), 'running')
        RETURNING id
      `, [brokerId, runType])
      runId = runResult.rows[0].id
    }
    
    // 2. Exécuter tous les détecteurs
    const detectionResult = await runAllDetectors(brokerId, pool, {
      detectorsFilter,
      timeout: 55000,
      continueOnError: true
    })
    
    // 3. Insérer les signaux en bulk
    let signalsInserted = 0
    
    if (!dryRun && detectionResult.signals.length > 0) {
      // Batch insert avec ON CONFLICT DO NOTHING (dedup)
      for (const signal of detectionResult.signals) {
        try {
          const insertResult = await pool.query(`
            INSERT INTO ark_watch_signals (
              broker_id, client_id, quote_id, signal_type, severity, score,
              title, description, suggested_action, estimated_value,
              status, detected_at, dedup_key, metadata
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'new', NOW(), $11, $12)
            ON CONFLICT (broker_id, dedup_key) DO NOTHING
            RETURNING id
          `, [
            brokerId,
            signal.client_id || null,
            signal.quote_id || null,
            signal.signal_type,
            signal.severity || 'medium',
            signal.score || 50,
            signal.title,
            signal.description,
            signal.suggested_action,
            signal.estimated_value || 0,
            signal.dedup_key,
            JSON.stringify(signal.metadata || {})
          ])
          
          if (insertResult.rowCount > 0) {
            signalsInserted++
          }
        } catch (insertErr) {
          // Log mais continue (erreur possible sur FK)
          console.warn(`[ARK Watch] Signal insert error: ${insertErr.message}`)
        }
      }
    }
    
    const durationMs = Date.now() - startTime
    
    // 4. Mettre à jour le run
    if (!dryRun && runId) {
      await pool.query(`
        UPDATE ark_watch_runs
        SET 
          completed_at = NOW(),
          status = $1,
          signals_detected = $2,
          signals_by_type = $3,
          errors = $4,
          error_details = $5,
          duration_ms = $6
        WHERE id = $7
      `, [
        detectionResult.errors.length > 0 ? 'completed_with_errors' : 'completed',
        signalsInserted,
        JSON.stringify(detectionResult.stats.byType),
        detectionResult.errors.length,
        JSON.stringify(detectionResult.errors),
        durationMs,
        runId
      ])
    }
    
    return {
      success: true,
      runId,
      brokerId,
      signalsDetected: detectionResult.signals.length,
      signalsInserted,
      duplicatesSkipped: detectionResult.signals.length - signalsInserted,
      byType: detectionResult.stats.byType,
      bySeverity: detectionResult.stats.bySeverity,
      errors: detectionResult.errors,
      duration_ms: durationMs,
      dryRun
    }
    
  } catch (err) {
    const durationMs = Date.now() - startTime
    
    // Marquer le run comme échoué
    if (!dryRun && runId) {
      await pool.query(`
        UPDATE ark_watch_runs
        SET 
          completed_at = NOW(),
          status = 'failed',
          errors = 1,
          error_details = $1,
          duration_ms = $2
        WHERE id = $3
      `, [JSON.stringify([{ error: err.message, fatal: true }]), durationMs, runId])
    }
    
    return {
      success: false,
      runId,
      brokerId,
      error: err.message,
      duration_ms: durationMs,
      dryRun
    }
  }
}

/**
 * Exécute ARK Watch pour tous les courtiers actifs
 * @param {Pool} pool 
 * @param {Object} options 
 * @returns {Object} Résultats agrégés
 */
async function runAllBrokers(pool, options = {}) {
  const { dryRun = false, limit = null, runType = 'cron' } = options
  const startTime = Date.now()
  
  // Récupérer tous les courtiers actifs avec au moins 1 client
  let sql = `
    SELECT DISTINCT u.id 
    FROM users u
    JOIN clients c ON c.courtier_id = u.id
    WHERE u.id > 0
    ORDER BY u.id
  `
  if (limit) {
    sql += ` LIMIT ${parseInt(limit)}`
  }
  
  const brokersResult = await pool.query(sql)
  const brokers = brokersResult.rows
  
  const results = {
    totalBrokers: brokers.length,
    completed: 0,
    failed: 0,
    totalSignals: 0,
    totalInserted: 0,
    byBroker: {},
    errors: []
  }
  
  for (const broker of brokers) {
    try {
      const runResult = await runArkWatch(broker.id, pool, { dryRun, runType })
      
      results.byBroker[broker.id] = {
        success: runResult.success,
        signalsDetected: runResult.signalsDetected || 0,
        signalsInserted: runResult.signalsInserted || 0,
        duration_ms: runResult.duration_ms
      }
      
      if (runResult.success) {
        results.completed++
        results.totalSignals += runResult.signalsDetected || 0
        results.totalInserted += runResult.signalsInserted || 0
      } else {
        results.failed++
        results.errors.push({
          broker_id: broker.id,
          error: runResult.error
        })
      }
    } catch (err) {
      results.failed++
      results.errors.push({
        broker_id: broker.id,
        error: err.message
      })
      results.byBroker[broker.id] = {
        success: false,
        error: err.message
      }
    }
  }
  
  results.duration_ms = Date.now() - startTime
  results.dryRun = dryRun
  
  return results
}

/**
 * Obtient les statistiques des signaux pour un courtier
 * @param {number} brokerId 
 * @param {Pool} pool 
 * @returns {Object} Stats
 */
async function getSignalStats(brokerId, pool) {
  const result = await pool.query(`
    SELECT
      COUNT(*) FILTER (WHERE status = 'new') AS new_count,
      COUNT(*) FILTER (WHERE status = 'acknowledged') AS acknowledged_count,
      COUNT(*) FILTER (WHERE status = 'resolved') AS resolved_count,
      COUNT(*) FILTER (WHERE severity = 'high' AND status = 'new') AS high_priority,
      COUNT(*) FILTER (WHERE severity = 'medium' AND status = 'new') AS medium_priority,
      COUNT(*) FILTER (WHERE severity = 'low' AND status = 'new') AS low_priority,
      COALESCE(SUM(estimated_value) FILTER (WHERE status = 'new'), 0) AS total_estimated_value,
      COUNT(DISTINCT signal_type) AS distinct_types,
      COUNT(DISTINCT client_id) AS distinct_clients
    FROM ark_watch_signals
    WHERE broker_id = $1
  `, [brokerId])
  
  const row = result.rows[0]
  
  return {
    new: parseInt(row.new_count || 0),
    acknowledged: parseInt(row.acknowledged_count || 0),
    resolved: parseInt(row.resolved_count || 0),
    byPriority: {
      high: parseInt(row.high_priority || 0),
      medium: parseInt(row.medium_priority || 0),
      low: parseInt(row.low_priority || 0)
    },
    totalEstimatedValue: parseFloat(row.total_estimated_value || 0),
    distinctTypes: parseInt(row.distinct_types || 0),
    distinctClients: parseInt(row.distinct_clients || 0)
  }
}

/**
 * Génère le Morning Brief pour un courtier
 * @param {number} brokerId 
 * @param {Pool} pool 
 * @returns {Object} Morning brief
 */
async function generateMorningBrief(brokerId, pool) {
  // Stats générales
  const stats = await getSignalStats(brokerId, pool)
  
  // Top 10 signaux prioritaires
  const signalsResult = await pool.query(`
    SELECT 
      s.*,
      c.first_name, c.last_name, c.company_name, c.email
    FROM ark_watch_signals s
    LEFT JOIN clients c ON s.client_id = c.id
    WHERE s.broker_id = $1 AND s.status = 'new'
    ORDER BY 
      CASE s.severity 
        WHEN 'high' THEN 1 
        WHEN 'medium' THEN 2 
        ELSE 3 
      END,
      s.score DESC,
      s.detected_at DESC
    LIMIT 10
  `, [brokerId])
  
  const topSignals = signalsResult.rows.map(row => ({
    id: row.id,
    type: row.signal_type,
    severity: row.severity,
    score: row.score,
    title: row.title,
    description: row.description,
    suggested_action: row.suggested_action,
    estimated_value: parseFloat(row.estimated_value || 0),
    client: row.client_id ? {
      id: row.client_id,
      name: row.company_name || `${row.first_name || ''} ${row.last_name || ''}`.trim()
    } : null,
    detected_at: row.detected_at
  }))
  
  // Signaux par type
  const byTypeResult = await pool.query(`
    SELECT signal_type, COUNT(*) AS count
    FROM ark_watch_signals
    WHERE broker_id = $1 AND status = 'new'
    GROUP BY signal_type
    ORDER BY count DESC
  `, [brokerId])
  
  // Dernier run
  const lastRunResult = await pool.query(`
    SELECT * FROM ark_watch_runs
    WHERE broker_id = $1
    ORDER BY started_at DESC
    LIMIT 1
  `, [brokerId])
  
  return {
    generated_at: new Date().toISOString(),
    summary: {
      total_signals: stats.new,
      high_priority: stats.byPriority.high,
      potential_value: stats.totalEstimatedValue,
      distinct_clients: stats.distinctClients
    },
    top_signals: topSignals,
    by_type: byTypeResult.rows.reduce((acc, row) => {
      acc[row.signal_type] = parseInt(row.count)
      return acc
    }, {}),
    last_run: lastRunResult.rows[0] ? {
      id: lastRunResult.rows[0].id,
      status: lastRunResult.rows[0].status,
      signals_detected: lastRunResult.rows[0].signals_detected,
      completed_at: lastRunResult.rows[0].completed_at
    } : null
  }
}

module.exports = {
  runArkWatch,
  runAllBrokers,
  getSignalStats,
  generateMorningBrief,
  getDetectorsList
}
