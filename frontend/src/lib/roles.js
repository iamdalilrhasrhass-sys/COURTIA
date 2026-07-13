export const ROLES = Object.freeze({
  SUPER_ADMIN: 'super_admin',
  OWNER: 'owner',
  MANAGER: 'manager',
  BROKER: 'broker',
  ASSISTANT: 'assistant',
  VIEWER: 'viewer',
  ADMIN: 'admin',
  PROSPECTEUR: 'prospecteur',
})

const ADMIN_ROLES = new Set([
  ROLES.SUPER_ADMIN,
  ROLES.ADMIN,
  ROLES.OWNER,
  ROLES.MANAGER,
])

export function normalizeRole(role) {
  return String(role || '').trim().toLowerCase()
}

export function isAdminRole(role) {
  return ADMIN_ROLES.has(normalizeRole(role))
}

export function isProspectorRole(role) {
  return normalizeRole(role) === ROLES.PROSPECTEUR
}

export function isSalesRole(role) {
  const normalized = normalizeRole(role)
  return normalized === ROLES.SUPER_ADMIN || normalized === ROLES.PROSPECTEUR
}
