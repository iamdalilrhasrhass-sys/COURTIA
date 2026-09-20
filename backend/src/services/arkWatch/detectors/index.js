/**
 * Orchestrateur des détecteurs ARK Watch — LOT 7
 * 
 * Charge et exécute tous les détecteurs pour un courtier donné.
 *
 * ════════════════════════════════════════════════════════════════════════════
 * LE MARCHÉ DU CABINET DÉCIDE QUELLES RÈGLES S'APPLIQUENT (défaut P1 CH-016)
 * ════════════════════════════════════════════════════════════════════════════
 * POURQUOI : `hamon` et `chatel` appliquent des LOIS FRANÇAISES. Elles étaient
 * exécutées pour TOUS les cabinets, donc aussi pour un cabinet établi en
 * Suisse, qui recevait des signaux « Loi Hamon : Auto résiliable » et
 * « Préavis Chatel : relance à envoyer avant le … ». Ces signaux présentent au
 * courtier une obligation et un droit de résiliation qui ne sont pas ceux de
 * son marché : il appelle son client sur un fondement inexistant.
 *
 * COMMENT : chaque détecteur peut déclarer `marches: ['FR']` (liste des marchés
 * où la règle a un sens juridique). Une liste ABSENTE signifie « tous les
 * marchés » : les détecteurs qui ne citent aucune loi (échéance, silence,
 * documents manquants, cross-sell, reconquête) ne sont donc pas touchés, et le
 * marché français garde EXACTEMENT ses huit règles.
 *
 * Un détecteur désactivé n'est JAMAIS retiré en silence : il apparaît dans
 * `results.desactives` (code, nom, motif) et dans `results.byDetector` avec le
 * statut « desactive_hors_marche ». Un écran peut donc dire au courtier
 * « 2 règles du marché français ne s'appliquent pas à votre cabinet » plutôt
 * que de laisser croire que rien n'a été vérifié.
 *
 * AUCUNE règle suisse de remplacement n'est inventée : il n'existe pas
 * d'équivalent validé de ces deux lois.
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

/** Ramène une valeur libre vers un code marché connu ('FR' par défaut). */
function normaliserMarche(marche) {
  return String(marche || '').trim().toUpperCase() === 'CH' ? 'CH' : 'FR'
}

/**
 * Ce détecteur s'applique-t-il à ce marché ?
 * Un détecteur sans liste `marches` s'applique partout (comportement historique).
 */
function applicable(detector, marche) {
  const marches = detector && detector.marches
  if (!Array.isArray(marches) || marches.length === 0) return true
  return marches.map(normaliserMarche).includes(normaliserMarche(marche))
}

/** Motif lisible du refus, jamais vide (un détecteur muet serait opaque). */
function motifDesactivation(detector) {
  return detector.motifHorsMarche
    || `Règle réservée au(x) marché(s) ${(detector.marches || []).join(', ')}.`
}

/**
 * Exécute tous les détecteurs pour un courtier
 * @param {number} brokerId 
 * @param {Pool} pool 
 * @param {Object} options  { detectorsFilter, timeout, continueOnError, marche }
 * @returns {Object} Résultats de détection
 */
async function runAllDetectors(brokerId, pool, options = {}) {
  const {
    detectorsFilter = null, // Array de codes pour filtrer (null = tous)
    timeout = 55000,        // Timeout par détecteur (ms)
    continueOnError = true, // Continuer si un détecteur échoue
    marche = 'FR'           // Marché du CABINET (jamais celui du développeur)
  } = options

  const marcheCabinet = normaliserMarche(marche)

  const results = {
    marche: marcheCabinet,
    signals: [],
    byDetector: {},
    desactives: [],
    errors: [],
    stats: {
      total: 0,
      byType: {},
      bySeverity: { high: 0, medium: 0, low: 0 }
    }
  }

  // Deux motifs d'exclusion, distincts : le filtre EXPLICITE de l'appelant
  // (`detectorsFilter`) et le MARCHÉ du cabinet. Les confondre ferait croire à
  // un détecteur « demandé puis ignoré ».
  const demandes = detectorsFilter
    ? DETECTORS.filter(d => detectorsFilter.includes(d.code))
    : DETECTORS
  const detectorsToRun = demandes.filter(d => applicable(d, marcheCabinet))

  for (const detector of demandes) {
    if (applicable(detector, marcheCabinet)) continue
    const motif = motifDesactivation(detector)
    results.desactives.push({ code: detector.code, name: detector.name, marche: marcheCabinet, motif })
    results.byDetector[detector.code] = {
      count: 0,
      duration_ms: 0,
      status: 'desactive_hors_marche',
      motif,
    }
  }
  
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
 * @param {string} [marche] marché du cabinet ('FR' par défaut) : permet à un
 *   écran de savoir quelles règles s'appliquent réellement à ce cabinet.
 * @returns {Array} Détecteurs
 */
function getDetectorsList(marche = 'FR') {
  const marcheCabinet = normaliserMarche(marche)
  return DETECTORS.map(d => ({
    code: d.code,
    name: d.name,
    severity: d.severity,
    marche: marcheCabinet,
    // `actif` dit la vérité : un détecteur de loi française n'est PAS actif pour
    // un cabinet suisse, et l'écran peut le montrer au lieu de laisser croire
    // que la vérification a eu lieu.
    actif: applicable(d, marcheCabinet),
    ...(Array.isArray(d.marches) ? { marches: d.marches } : {}),
    ...(applicable(d, marcheCabinet) ? {} : { motif: motifDesactivation(d) }),
  }))
}

module.exports = {
  DETECTORS,
  runAllDetectors,
  getDetectorsList,
  normaliserMarche,
  applicable,
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
