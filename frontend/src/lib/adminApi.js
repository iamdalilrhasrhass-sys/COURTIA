import { buildApiUrl, getAuthToken } from '../api/sessionPolicy'

const API_URL = import.meta.env.VITE_API_URL || '/api'

export function getCourtiaAdminToken() {
  return getAuthToken()
}

function normalizePath(path = '') {
  const p = String(path || '')
  return p.startsWith('/') ? p : `/${p}`
}

export function adminFetch(path, options = {}) {
  const token = getCourtiaAdminToken()
  const target = buildApiUrl(`/admin/super${normalizePath(path)}`, API_URL)

  return fetch(target, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  })
}

export function publicApiFetch(path, options = {}) {
  const token = getCourtiaAdminToken()
  const target = buildApiUrl(path, API_URL)

  return fetch(target, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  })
}
