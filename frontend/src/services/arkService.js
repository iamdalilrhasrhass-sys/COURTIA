/**
 * arkService.js — LOT 2
 * Service API pour toutes les interactions ARK
 */

import { buildApiUrl } from '../api/sessionPolicy'

const API_URL = import.meta.env.VITE_API_URL || '/api'

function getToken() {
  return localStorage.getItem('courtia_token') || localStorage.getItem('token')
}

async function arkFetch(endpoint, options = {}) {
  const token = getToken()
  if (!token) throw new Error('Token manquant')

  const response = await fetch(buildApiUrl(endpoint, API_URL), {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers
    }
  })

  const data = await response.json()

  if (!response.ok) {
    const error = new Error(data.error?.message || data.error || 'Erreur ARK')
    error.code = data.error?.code || 'ARK_ERROR'
    error.status = response.status
    throw error
  }

  return data
}

// ═══════════════════════════════════════════════════════════════════════════
// Chat ARK existant
// ═══════════════════════════════════════════════════════════════════════════

export async function callArkAI(clientData, userMessage, token) {
  try {
    const response = await fetch(buildApiUrl('/ark/chat'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        clientData,
        userMessage
      })
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`)
    }

    const data = await response.json()
    return data.response || data.reply
  } catch (error) {
    console.error('ARK API Error:', error)
    throw error
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Nouvelles fonctions LOT 2
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Exécuter une action ARK générique
 */
export async function callArkAction(action, context = {}, params = {}) {
  return arkFetch('/ark/actions', {
    method: 'POST',
    body: JSON.stringify({ action, context, params })
  })
}

/**
 * Obtenir le brief d'un client
 */
export async function getClientBrief(clientId) {
  return arkFetch(`/ark/client/${clientId}/brief`)
}

/**
 * Obtenir les recommandations pour un client
 */
export async function getClientRecommendations(clientId) {
  return arkFetch(`/ark/client/${clientId}/recommendations`)
}

/**
 * Analyser les documents d'un client
 */
export async function analyzeClientDocuments(clientId, documents) {
  return arkFetch(`/ark/client/${clientId}/documents-analysis`, {
    method: 'POST',
    body: JSON.stringify({ documents })
  })
}

/**
 * Obtenir les meilleures actions pour un client
 */
export async function getClientNextBestActions(clientId) {
  return arkFetch(`/ark/client/${clientId}/next-best-actions`)
}

/**
 * Assistant devis pour un client
 */
export async function getQuoteAssistant(clientId, quoteData) {
  return arkFetch(`/ark/client/${clientId}/quote-assistant`, {
    method: 'POST',
    body: JSON.stringify({ quoteData })
  })
}

/**
 * Obtenir le Morning Brief
 */
export async function getMorningBrief() {
  return arkFetch('/ark/morning-brief', { method: 'POST' })
}

/**
 * Vérifier la conformité
 */
export async function checkCompliance(clientId, contractData) {
  return arkFetch('/ark/compliance-check', {
    method: 'POST',
    body: JSON.stringify({ clientId, contractData })
  })
}

/**
 * Obtenir la santé du portefeuille
 */
export async function getPortfolioHealth() {
  return arkFetch('/ark/portfolio-health')
}

/**
 * Générer du contenu (email, sms, script)
 */
export async function generateContent(type, context) {
  return arkFetch('/ark/generate', {
    method: 'POST',
    body: JSON.stringify({ type, context })
  })
}

/**
 * Obtenir les suggestions selon le contexte de la page
 */
export async function getContextSuggestions(page, options = {}) {
  const params = new URLSearchParams({
    page,
    ...(options.clientId && { clientId: options.clientId }),
    ...(options.quoteId && { quoteId: options.quoteId }),
    ...(options.taskId && { taskId: options.taskId })
  })
  return arkFetch(`/ark/context-suggestions?${params}`)
}

/**
 * Obtenir l'historique des conversations ARK d'un client
 */
export async function getArkHistory(clientId) {
  return arkFetch(`/ark/history/${clientId}`)
}

/**
 * Obtenir le budget ARK
 */
export async function getArkBudget() {
  return arkFetch('/ark/budget')
}

// Export par défaut pour compatibilité
export default {
  callArkAI,
  callArkAction,
  getClientBrief,
  getClientRecommendations,
  analyzeClientDocuments,
  getClientNextBestActions,
  getQuoteAssistant,
  getMorningBrief,
  checkCompliance,
  getPortfolioHealth,
  generateContent,
  getContextSuggestions,
  getArkHistory,
  getArkBudget
}
