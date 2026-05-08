const API_URL = import.meta.env.VITE_API_URL || ''

export const ADMIN_API_BASE = `${API_URL}/api/admin/super`

export function getCourtiaAdminToken() {
  return localStorage.getItem('courtia_token') || localStorage.getItem('token')
}

export function adminFetch(path, options = {}) {
  const token = getCourtiaAdminToken()

  return fetch(`${ADMIN_API_BASE}${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  })
}

export function publicApiFetch(path, options = {}) {
  const token = getCourtiaAdminToken()

  return fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  })
}
