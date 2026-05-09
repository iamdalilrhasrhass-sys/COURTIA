const SESSION_AUTH_PATHS = ['/auth/me', '/auth/verify', '/auth/refresh']

const SESSION_ERROR_PATTERNS = [
  /token expired/i,
  /invalid token/i,
  /invalid or expired token/i,
  /no authorization header/i,
  /invalid authorization header/i,
  /user_not_found/i,
  /utilisateur non trouvé/i,
  /non_authentifi/i,
  /authentification requise/i
]

function getRequestPath(requestUrl = '') {
  try {
    const url = new URL(requestUrl, window.location.origin)
    return url.pathname
  } catch {
    return String(requestUrl || '')
  }
}

const ABSOLUTE_URL_RE = /^https?:\/\//i

export function normalizeApiBase(baseUrl = import.meta.env.VITE_API_URL || '/api') {
  const base = String(baseUrl || '').trim()
  if (!base || base === '/api') return ''

  return base
    .replace(/\/+$/, '')
    .replace(/\/api$/, '')
}

export function getAuthToken(read = (key) => localStorage.getItem(key)) {
  return read('courtia_token') || read('token') || ''
}

export function clearStoredSession(storage = localStorage) {
  const storages = [storage]
  if (typeof window !== 'undefined' && storage === localStorage && window.sessionStorage) {
    storages.push(window.sessionStorage)
  }

  storages.forEach((target) => {
    target.removeItem('courtia_token')
    target.removeItem('token')
    target.removeItem('courtia_user')
    target.removeItem('user')
  })
}

export function buildApiUrl(path, baseUrl = import.meta.env.VITE_API_URL || '/api') {
  const targetRaw = String(path || '').trim()
  if (!targetRaw) {
    const normalizedBase = normalizeApiBase(baseUrl)
    return normalizedBase ? `${normalizedBase}/api` : '/api'
  }

  if (ABSOLUTE_URL_RE.test(targetRaw)) return targetRaw

  let target = targetRaw.startsWith('/') ? targetRaw : `/${targetRaw}`

  // collapse accidental double slashes in path (excluding protocol handled above)
  target = target.replace(/\/{2,}/g, '/')

  if (!target.startsWith('/api/')) {
    if (target === '/api') {
      target = '/api'
    } else {
      target = `/api${target}`
    }
  }

  const normalizedBase = normalizeApiBase(baseUrl)
  return normalizedBase ? `${normalizedBase}${target}` : target
}

export function shouldClearSessionOnUnauthorized(requestUrl = '', responseData = {}) {
  const path = getRequestPath(requestUrl)
  if (SESSION_AUTH_PATHS.some((authPath) => path.endsWith(authPath) || path.endsWith(`/api${authPath}`))) {
    return true
  }

  const message = [
    responseData?.error,
    responseData?.message,
    responseData?.details
  ].filter(Boolean).join(' ')

  return SESSION_ERROR_PATTERNS.some((pattern) => pattern.test(message))
}

export function isAuthScreen(pathname = window.location.pathname) {
  return pathname === '/login' || pathname === '/register'
}
