import api from './index'
import { clearStoredSession, getAuthToken } from './sessionPolicy'

const USER_CACHE_TTL_MS = Number(import.meta.env.VITE_SESSION_USER_CACHE_TTL_MS || 60_000)
const USER_429_COOLDOWN_MS = Number(import.meta.env.VITE_AUTH_ME_BACKOFF_MS || 45_000)

let cachedUser = null
let cachedAt = 0
let cooldownUntil = 0
let inFlight = null

function now() {
  return Date.now()
}

function readStoredUser() {
  try {
    const raw = localStorage.getItem('courtia_user') || localStorage.getItem('user')
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function persistUser(user) {
  if (!user || typeof user !== 'object') return
  localStorage.setItem('courtia_user', JSON.stringify(user))
  localStorage.setItem('user', JSON.stringify(user))
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('profileUpdated'))
  }
}

function getCachedOrStoredUser() {
  if (cachedUser) return cachedUser
  const stored = readStoredUser()
  if (stored) {
    cachedUser = stored
    cachedAt = now()
    return stored
  }
  return null
}

export function primeSessionUserCache(user) {
  if (!user || typeof user !== 'object') return
  cachedUser = user
  cachedAt = now()
  cooldownUntil = 0
  persistUser(user)
}

export function resetSessionUserCache() {
  cachedUser = null
  cachedAt = 0
  cooldownUntil = 0
  inFlight = null
}

export function isSessionUserCoolingDown() {
  return now() < cooldownUntil
}

export async function getSessionUser(options = {}) {
  const { force = false, allowStaleOn429 = true } = options
  const authToken = getAuthToken()

  if (!authToken) {
    resetSessionUserCache()
    return null
  }

  const currentTime = now()
  if (!force && cachedUser && (currentTime - cachedAt) < USER_CACHE_TTL_MS) {
    return cachedUser
  }

  if (!force && currentTime < cooldownUntil) {
    return getCachedOrStoredUser()
  }

  if (inFlight) return inFlight

  inFlight = api.get('/auth/me')
    .then((response) => {
      const freshUser = response?.data || null
      if (freshUser) {
        cachedUser = freshUser
        cachedAt = now()
        cooldownUntil = 0
        persistUser(freshUser)
      }
      return freshUser
    })
    .catch((error) => {
      const status = error?.response?.status

      if (status === 401 || status === 403) {
        resetSessionUserCache()
        clearStoredSession()
        throw error
      }

      if (status === 429) {
        cooldownUntil = now() + USER_429_COOLDOWN_MS
        const fallbackUser = getCachedOrStoredUser()
        if (allowStaleOn429 && fallbackUser) {
          return fallbackUser
        }
      }

      const fallbackUser = getCachedOrStoredUser()
      if (fallbackUser && !force) {
        return fallbackUser
      }

      throw error
    })
    .finally(() => {
      inFlight = null
    })

  return inFlight
}
