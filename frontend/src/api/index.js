import axios from 'axios'
import {
  buildApiUrl,
  clearStoredSession,
  getAuthToken,
  isAuthScreen,
  shouldClearSessionOnUnauthorized,
} from './sessionPolicy'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  headers: { 'Content-Type': 'application/json' },
  timeout: 20000
})

// Event bus minimaliste pour les paywalls (évite d'importer un store dans un intercepteur)
const paywallListeners = []

export const onPaywallTriggered = (fn) => {
  paywallListeners.push(fn)
  return () => {
    const i = paywallListeners.indexOf(fn)
    if (i >= 0) paywallListeners.splice(i, 1)
  }
}

const emitPaywall = (payload) => paywallListeners.forEach(fn => fn(payload))

// Intercepteur request : attache le JWT
api.interceptors.request.use((config) => {
  config.url = buildApiUrl(config.url || '', API_BASE)

  // Support les deux clés localStorage (migration progressive)
  const token = getAuthToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Intercepteur response : gère les erreurs (401, 402)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const shouldClearSession = shouldClearSessionOnUnauthorized(
        error.config?.url,
        error.response?.data
      )

      if (shouldClearSession) {
        clearStoredSession()
        if (!isAuthScreen()) {
          window.location.href = '/login?reason=expired'
        }
      }
    }

    if (error.response && error.response.status === 402) {
      emitPaywall(error.response.data)
    }
    return Promise.reject(error)
  }
)

export default api
