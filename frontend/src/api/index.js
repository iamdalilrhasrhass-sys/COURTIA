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

/**
 * Changement de mot de passe IMPOSÉ — adresse d'arrivée et traitement.
 *
 * POURQUOI (mesure du 21/09/2026 sur les comptes pilotes en production) : le
 * serveur refusait bien toute route métier d'un compte dont le mot de passe
 * temporaire n'avait pas été remplacé — `POST /api/clients` →
 * 403 `changement_mot_de_passe_requis` — mais le cockpit affichait un refus muet
 * écran par écran : le pilote n'avait aucun moyen de savoir quoi faire. Le
 * traitement est ici, en un seul point, plutôt que dans chaque appel.
 */
export const CHEMIN_CHANGEMENT_MOT_DE_PASSE = '/parametres?section=securite'

export function traiterChangementMotDePasseRequis(
  donnees,
  cheminActuel = typeof window !== 'undefined' ? window.location.pathname : '',
  rediriger = (url) => { window.location.href = url }
) {
  if (!donnees || donnees.code !== 'changement_mot_de_passe_requis') return false
  // Déjà sur l'écran de changement : ne pas boucler (le formulaire, lui, ne
  // dépend d'aucune route métier et doit rester atteignable).
  if (String(cheminActuel).startsWith('/parametres')) return false
  rediriger(CHEMIN_CHANGEMENT_MOT_DE_PASSE)
  return true
}

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

    if (error.response && error.response.status === 403) {
      traiterChangementMotDePasseRequis(error.response.data)
    }
    return Promise.reject(error)
  }
)

export default api
