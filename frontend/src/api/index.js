import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'https://courtia.onrender.com'

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' }
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
  // Support les deux clés localStorage (migration progressive)
  const token = localStorage.getItem('courtia_token') || localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Intercepteur response : détecte 402 et déclenche paywall
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 402) {
      emitPaywall(error.response.data)
    }
    return Promise.reject(error)
  }
)

export default api
