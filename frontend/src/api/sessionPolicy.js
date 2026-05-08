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

export function getAuthToken(read = (key) => localStorage.getItem(key)) {
  return read('courtia_token') || read('token') || ''
}

export function clearStoredSession(storage = localStorage) {
  storage.removeItem('courtia_token')
  storage.removeItem('token')
  storage.removeItem('courtia_user')
  storage.removeItem('user')
}

export function buildApiUrl(path, baseUrl = import.meta.env.VITE_API_URL || '/api') {
  const base = String(baseUrl || '').replace(/\/$/, '')
  let target = String(path || '')
  target = target.startsWith('/') ? target : `/${target}`

  if (!base) return target
  if (base.endsWith('/api') && target.startsWith('/api/')) {
    target = target.replace(/^\/api/, '')
  }

  return `${base}${target}`
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
