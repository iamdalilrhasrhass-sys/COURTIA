/**
 * Orchestrateur des détecteurs ARK Watch — LOT 7
 * 
 * Charge et exécute tous les détecteurs pour un courtier donné.
 */

const hamon = require('./hamon')
const chatel = require('./chatel')
const silence = require('./silence')
const echeance = require('./echeance')
const documentsExpired = require('./documentsExpired')
const documentsMissing = require('./documentsMissing')
const crossSell = require('./crossSell')
const reconquete = require('./reconquete')

// Liste ordonnée des détecteurs (priorité : SQL pur d'abord, IA ensuite)
const DETECTORS = [
  hamon,
  chatel,
  echeance,
  silence,
  documentsExpired,
  documentsMissing,
  crossSell,
  reconquete
]

/**
 * Exécute tous les détecteurs pour un courtier
 * @param {number} brokerId 
 * @param {Pool} pool 
 * @param {Object} options 
 * @returns {Object} Résultats de détection
 */
async function runAllDetectors(brokerId, pool, options = {}) {
  const {
    detectorsFilter = null, // Array de codes pour filtrer (null = tous)
    timeout = 55000,        // Timeout par détecteur (ms)
    continueOnError = true  // Continuer si un détecteur échoue
  } = options
  
  const results = {
    signals: [],
    byDetector: {},
    errors: [],
    stats: {
      total: 0,
      byType: {},
      bySeverity: { high: 0, medium: 0, low: 0 }
    }
  }
  
  const detectorsToRun = detectorsFilter
    ? DETECTORS.filter(d => detectorsFilter.includes(d.code))
    : DETECTORS
  
  for (const detector of detectorsToRun) {
    const startTime = Date.now()
    
    try {
      // Timeout protection
      const signals = await Promise.race([
        detector.run(brokerId, pool),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error(`Timeout ${timeout}ms`)), timeout)
        )
      ])
      
      const duration = Date.now() - startTime
      
      // Enrichir les signaux avec les infos du détecteur
      const enrichedSignals = (signals || []).map(signal => ({
        ...signal,
        signal_type: detector.code,
        severity: signal.severity || detector.severity || 'medium'
      }))
      
      results.signals.push(...enrichedSignals)
      results.byDetector[detector.code] = {
        count: enrichedSignals.length,
        duration_ms: duration,
        status: 'success'
      }
      
      // Stats
      results.stats.total += enrichedSignals.length
      results.stats.byType[detector.code] = enrichedSignals.length
      for (const sig of enrichedSignals) {
        const sev = sig.severity || 'medium'
        results.stats.bySeverity[sev] = (results.stats.bySeverity[sev] || 0) + 1
      }
      
    } catch (err) {
      const duration = Date.now() - startTime
      
      results.errors.push({
        detector: detector.code,
        error: err.message,
        duration_ms: duration
      })
      
      results.byDetector[detector.code] = {
        count: 0,
        duration_ms: duration,
        status: 'error',
        error: err.message
      }
      
      if (!continueOnError) {
        throw err
      }
    }
  }
  
  return results
}

/**
 * Obtient la liste des détecteurs disponibles
 * @returns {Array} Détecteurs
 */
function getDetectorsList() {
  return DETECTORS.map(d => ({
    code: d.code,
    name: d.name,
    severity: d.severity
  }))
}

module.exports = {
  DETECTORS,
  runAllDetectors,
  getDetectorsList,
  // Export individuel pour tests
  detectors: {
    hamon,
    chatel,
    silence,
    echeance,
    documentsExpired,
    documentsMissing,
    crossSell,
    reconquete
  }
}
