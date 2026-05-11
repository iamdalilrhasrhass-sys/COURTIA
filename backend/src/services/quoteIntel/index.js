/**
 * LOT 11 — Quote Intelligence: Module Index
 * Exporte tous les services quoteIntel
 * 
 * @module quoteIntel
 */

const briefBuilder = require('./briefBuilder')
const pieceChecker = require('./pieceChecker')
const dispatcher = require('./dispatcher')

module.exports = {
  // Brief Builder
  buildBrief: briefBuilder.buildBrief,
  buildBriefsBatch: briefBuilder.buildBriefsBatch,
  saveBrief: briefBuilder.saveBrief,
  getProviderIntel: briefBuilder.getProviderIntel,
  getQuoteRequestDetails: briefBuilder.getQuoteRequestDetails,
  
  // Piece Checker
  checkPieces: pieceChecker.checkPieces,
  checkPiecesBatch: pieceChecker.checkPiecesBatch,
  normalizeDocType: pieceChecker.normalizeDocType,
  getDocumentLabel: pieceChecker.getDocumentLabel,
  
  // Dispatcher
  BRIEF_STATUS: dispatcher.BRIEF_STATUS,
  markReady: dispatcher.markReady,
  sendBrief: dispatcher.sendBrief,
  sendBriefsBatch: dispatcher.sendBriefsBatch,
  cancelBrief: dispatcher.cancelBrief,
  recordProviderResponse: dispatcher.recordProviderResponse,
  getDispatchStats: dispatcher.getDispatchStats
}
