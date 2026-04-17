const TTL_MS = 4 * 3600 * 1000 // 4 heures

function key(type, clientId) { return `ark_${type}_${clientId}` }

export const arkCache = {
  get(type, clientId) {
    try {
      const raw = localStorage.getItem(key(type, clientId))
      if (!raw) return null
      const { ts, data } = JSON.parse(raw)
      if (Date.now() - ts > TTL_MS) { localStorage.removeItem(key(type, clientId)); return null }
      return data
    } catch { return null }
  },

  set(type, clientId, data) {
    try { localStorage.setItem(key(type, clientId), JSON.stringify({ ts: Date.now(), data })) } catch {}
  },

  invalidate(clientId) {
    try {
      Object.keys(localStorage)
        .filter(k => k.startsWith(`ark_`) && k.endsWith(`_${clientId}`))
        .forEach(k => localStorage.removeItem(k))
    } catch {}
  }
}
