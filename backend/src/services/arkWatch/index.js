/**
 * ARK Watch — Module principal LOT 7
 * 
 * Surveillance proactive du portefeuille courtier.
 * Différenciateur #1 COURTIA.
 */

const {
  runArkWatch,
  runAllBrokers,
  getSignalStats,
  generateMorningBrief,
  getDetectorsList
} = require('./runner')

const { DETECTORS, runAllDetectors, detectors } = require('./detectors')

module.exports = {
  // Runner principal
  runArkWatch,
  runAllBrokers,
  
  // Stats et briefing
  getSignalStats,
  generateMorningBrief,
  
  // Détecteurs
  DETECTORS,
  runAllDetectors,
  getDetectorsList,
  detectors
}
