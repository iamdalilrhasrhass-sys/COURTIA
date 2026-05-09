const API_URL = import.meta.env.VITE_API_URL || '/api'

import {
  buildApiUrl,
  clearStoredSession,
  getAuthToken,
  shouldClearSessionOnUnauthorized
} from '../api/sessionPolicy'

function getToken() {
  return getAuthToken()
}

function buildHeaders() {
  const token = getToken()
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  }
}

async function handleResponse(res) {
  if (res.status === 401) {
    const body = await res.clone().json().catch(() => ({}))

    if (shouldClearSessionOnUnauthorized(res.url, body)) {
      clearStoredSession()
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        window.location.href = '/login?reason=expired'
      }
      throw new Error('Session expirée — veuillez vous reconnecter')
    }

    throw new Error(body.message || body.error || 'Accès refusé sur ce module COURTIA.')
  }
  if (!res.ok) {
    let errMsg = `HTTP ${res.status}`
    try {
      const body = await res.json()
      errMsg = body.error || body.message || errMsg
    } catch {
      // ignore parse errors
    }
    throw new Error(errMsg)
  }
  const text = await res.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

export async function apiGet(path) {
  const res = await fetch(buildApiUrl(path, API_URL), {
    method: 'GET',
    headers: buildHeaders()
  })
  return handleResponse(res)
}

export async function apiPost(path, body) {
  const res = await fetch(buildApiUrl(path, API_URL), {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(body)
  })
  return handleResponse(res)
}

export async function apiPut(path, body) {
  const res = await fetch(buildApiUrl(path, API_URL), {
    method: 'PUT',
    headers: buildHeaders(),
    body: JSON.stringify(body)
  })
  return handleResponse(res)
}

export async function apiDelete(path) {
  const res = await fetch(buildApiUrl(path, API_URL), {
    method: 'DELETE',
    headers: buildHeaders()
  })
  return handleResponse(res)
}
