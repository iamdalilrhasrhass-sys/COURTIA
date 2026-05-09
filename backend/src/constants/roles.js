const ROLES = Object.freeze({
  SUPER_ADMIN: 'super_admin',
  OWNER: 'owner',
  MANAGER: 'manager',
  BROKER: 'broker',
  ASSISTANT: 'assistant',
  VIEWER: 'viewer',
  ADMIN: 'admin',
})

const ADMIN_ROLES = new Set([ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.OWNER, ROLES.MANAGER])

function normalizeRole(role) {
  const normalized = String(role || '').trim().toLowerCase()
  // Compat legacy values used in older seeds/tokens.
  if (normalized === 'superadmin') return ROLES.SUPER_ADMIN
  return normalized
}

function isAdminRole(role) {
  return ADMIN_ROLES.has(normalizeRole(role))
}

module.exports = {
  ROLES,
  ADMIN_ROLES,
  normalizeRole,
  isAdminRole,
}
