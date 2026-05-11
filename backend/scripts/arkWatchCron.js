#!/usr/bin/env node
/**
 * ARK Watch Cron Script — LOT 7
 * 
 * Script standalone pour exécuter ARK Watch sur tous les courtiers.
 * 
 * USAGE:
 *   node scripts/arkWatchCron.js              # Exécution normale
 *   node scripts/arkWatchCron.js --dry-run    # Mode dry-run (pas d'INSERT)
 *   node scripts/arkWatchCron.js --limit=10   # Limiter à N courtiers
 * 
 * CRONTAB SUGGÉRÉE (06h00 Europe/Paris, tous les jours):
 *   0 6 * * * cd /srv/courtia/backend && node scripts/arkWatchCron.js >> /var/log/arkwatch.log 2>&1
 * 
 * PM2:
 *   pm2 start scripts/arkWatchCron.js --name arkwatch-cron --cron "0 6 * * *" --no-autorestart
 * 
 * EXIT CODES:
 *   0 = Succès complet
 *   1 = Erreur(s) partielle(s) ou échec
 */

require('dotenv').config()

const pool = require('../src/db')
const { runAllBrokers } = require('../src/services/arkWatch')

// =============================================================================
// PARSING ARGUMENTS
// =============================================================================

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const limitArg = args.find(a => a.startsWith('--limit='))
const limit = limitArg ? parseInt(limitArg.split('=')[1]) : null

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  const startTime = Date.now()
  const startDate = new Date().toISOString()
  
  console.log('═══════════════════════════════════════════════════════════════')
  console.log(`[ARK Watch Cron] Démarrage — ${startDate}`)
  console.log(`[ARK Watch Cron] Mode: ${dryRun ? 'DRY-RUN' : 'PRODUCTION'}`)
  if (limit) console.log(`[ARK Watch Cron] Limite: ${limit} courtiers`)
  console.log('═══════════════════════════════════════════════════════════════')
  
  try {
    // Test connexion DB
    await pool.query('SELECT 1')
    console.log('[ARK Watch Cron] Connexion DB: OK')
    
    // Exécuter ARK Watch pour tous les courtiers
    const results = await runAllBrokers(pool, {
      dryRun,
      limit,
      runType: 'cron'
    })
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2)
    
    console.log('')
    console.log('═══════════════════════════════════════════════════════════════')
    console.log('[ARK Watch Cron] RÉSULTATS')
    console.log('═══════════════════════════════════════════════════════════════')
    console.log(`  Courtiers traités   : ${results.totalBrokers}`)
    console.log(`  Succès              : ${results.completed}`)
    console.log(`  Échecs              : ${results.failed}`)
    console.log(`  Signaux détectés    : ${results.totalSignals}`)
    console.log(`  Signaux insérés     : ${results.totalInserted}`)
    console.log(`  Durée totale        : ${duration}s`)
    console.log('═══════════════════════════════════════════════════════════════')
    
    if (results.errors.length > 0) {
      console.log('')
      console.log('[ARK Watch Cron] ERREURS:')
      for (const err of results.errors.slice(0, 10)) {
        console.log(`  - Broker ${err.broker_id}: ${err.error}`)
      }
      if (results.errors.length > 10) {
        console.log(`  ... et ${results.errors.length - 10} autres erreurs`)
      }
    }
    
    // Détail par courtier (si verbose ou peu de courtiers)
    if (results.totalBrokers <= 20 || args.includes('--verbose')) {
      console.log('')
      console.log('[ARK Watch Cron] DÉTAIL PAR COURTIER:')
      for (const [brokerId, data] of Object.entries(results.byBroker)) {
        const status = data.success ? '✓' : '✗'
        const signals = data.success ? `${data.signalsDetected} détectés, ${data.signalsInserted} insérés` : data.error
        console.log(`  ${status} Broker ${brokerId}: ${signals} (${data.duration_ms || 0}ms)`)
      }
    }
    
    console.log('')
    console.log(`[ARK Watch Cron] Terminé — ${new Date().toISOString()}`)
    
    // Exit code
    if (results.failed > 0 && results.failed >= results.completed) {
      console.log('[ARK Watch Cron] EXIT: 1 (majorité d\'échecs)')
      process.exit(1)
    }
    
    console.log('[ARK Watch Cron] EXIT: 0 (succès)')
    process.exit(0)
    
  } catch (err) {
    console.error('')
    console.error('[ARK Watch Cron] ERREUR FATALE:', err.message)
    console.error(err.stack)
    console.error('[ARK Watch Cron] EXIT: 1')
    process.exit(1)
  }
}

// =============================================================================
// LAUNCH
// =============================================================================

main()
