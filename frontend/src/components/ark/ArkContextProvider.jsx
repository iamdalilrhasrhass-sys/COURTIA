/**
 * ArkContextProvider — LOT 2
 * Fournit le contexte ARK global à toute l'application
 */

import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { buildApiUrl } from '../../api/sessionPolicy'

const ArkContext = createContext(null)

const API_URL = import.meta.env.VITE_API_URL || '/api'

function getToken() {
  return localStorage.getItem('courtia_token') || localStorage.getItem('token')
}

export function ArkContextProvider({ children }) {
  // Contexte courant (page, IDs, etc.)
  const [currentContext, setCurrentContext] = useState({
    page: null,
    clientId: null,
    quoteId: null,
    taskId: null
  })

  // Suggestions ARK pour le contexte actuel
  const [suggestions, setSuggestions] = useState([])

  // Historique des actions ARK récentes
  const [history, setHistory] = useState([])

  // État de chargement
  const [isLoading, setIsLoading] = useState(false)

  // Dernière erreur
  const [lastError, setLastError] = useState(null)

  // Panel ouvert/fermé
  const [isPanelOpen, setIsPanelOpen] = useState(false)

  // Mettre à jour le contexte
  const setContext = useCallback((newContext) => {
    setCurrentContext(prev => ({
      ...prev,
      ...newContext
    }))
  }, [])

  // Appeler une action ARK
  const callArk = useCallback(async (action, params = {}) => {
    const token = getToken()
    if (!token) {
      setLastError({ code: 'AUTH_REQUIRED', message: 'Token manquant' })
      return null
    }

    setIsLoading(true)
    setLastError(null)

    try {
      const response = await fetch(buildApiUrl('/ark/actions', API_URL), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action,
          context: currentContext,
          params
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error?.message || 'Erreur ARK')
      }

      // Ajouter à l'historique
      setHistory(prev => [
        { action, params, result: data, timestamp: new Date().toISOString() },
        ...prev.slice(0, 9) // Garder 10 dernières actions
      ])

      return data
    } catch (err) {
      setLastError({ code: 'API_ERROR', message: err.message })
      return null
    } finally {
      setIsLoading(false)
    }
  }, [currentContext])

  // Charger les suggestions selon le contexte
  const fetchSuggestions = useCallback(async () => {
    const token = getToken()
    if (!token || !currentContext.page) return

    try {
      const params = new URLSearchParams({
        page: currentContext.page,
        ...(currentContext.clientId && { clientId: currentContext.clientId }),
        ...(currentContext.quoteId && { quoteId: currentContext.quoteId })
      })

      const response = await fetch(
        buildApiUrl(`/ark/context-suggestions?${params}`, API_URL),
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      )

      if (response.ok) {
        const data = await response.json()
        setSuggestions(data.data?.suggestions || [])
      }
    } catch (err) {
      console.warn('[ARK] Failed to fetch suggestions:', err)
    }
  }, [currentContext])

  // Recharger les suggestions quand le contexte change
  useEffect(() => {
    if (currentContext.page) {
      fetchSuggestions()
    }
  }, [currentContext.page, currentContext.clientId, fetchSuggestions])

  // Ouvrir/fermer le panel
  const openPanel = useCallback(() => setIsPanelOpen(true), [])
  const closePanel = useCallback(() => setIsPanelOpen(false), [])
  const togglePanel = useCallback(() => setIsPanelOpen(prev => !prev), [])

  const value = {
    // État
    currentContext,
    suggestions,
    history,
    isLoading,
    lastError,
    isPanelOpen,

    // Actions
    setContext,
    callArk,
    fetchSuggestions,
    openPanel,
    closePanel,
    togglePanel
  }

  return (
    <ArkContext.Provider value={value}>
      {children}
    </ArkContext.Provider>
  )
}

// Hook pour utiliser le contexte ARK
export function useArk() {
  const context = useContext(ArkContext)
  if (!context) {
    throw new Error('useArk must be used within ArkContextProvider')
  }
  return context
}

// Hook pour mettre à jour le contexte depuis une page
export function useArkPage(page, options = {}) {
  const { setContext } = useArk()

  useEffect(() => {
    setContext({
      page,
      clientId: options.clientId || null,
      quoteId: options.quoteId || null,
      taskId: options.taskId || null
    })
  }, [page, options.clientId, options.quoteId, options.taskId, setContext])
}

export default ArkContextProvider