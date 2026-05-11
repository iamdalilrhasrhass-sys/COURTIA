const crypto = require('crypto')

const CABINET_ROLES = Object.freeze({
  OWNER: 'owner',
  MANAGER: 'manager',
  BROKER: 'broker',
  ASSISTANT: 'assistant',
  VIEWER: 'viewer',
  SUPER_ADMIN: 'super_admin',
})

const ROLE_ORDER = Object.freeze({
  viewer: 10,
  assistant: 20,
  broker: 30,
  manager: 40,
  owner: 50,
  super_admin: 100,
})

const ONBOARDING_STEP_COLUMNS = Object.freeze({
  profile: 'step_profile_done',
  import: 'step_import_done',
  google: 'step_google_done',
  first_client: 'step_first_client_done',
  first_brief: 'step_first_brief_done',
})

const ONBOARDING_STEPS = Object.freeze(Object.keys(ONBOARDING_STEP_COLUMNS))

function normalizeCabinetRole(role) {
  const normalized = String(role || '').trim().toLowerCase()
  if (normalized === 'admin') return CABINET_ROLES.MANAGER
  if (normalized === 'superadmin') return CABINET_ROLES.SUPER_ADMIN
  if (!Object.values(CABINET_ROLES).includes(normalized)) {
    throw new Error('invalid_role')
  }
  return normalized
}

function roleRank(role) {
  return ROLE_ORDER[normalizeCabinetRole(role)] || 0
}

function hasRoleAtLeast(actualRole, requiredRole) {
  return roleRank(actualRole) >= roleRank(requiredRole)
}

function hashInviteToken(token) {
  return crypto.createHash('sha256').update(String(token || '')).digest('hex')
}

function createHttpError(code, status, message) {
  const err = new Error(message || code)
  err.code = code
  err.status = status
  return err
}

function getSafeUserId(userOrId) {
  if (typeof userOrId === 'number') return userOrId
  const id = Number(userOrId?.id || userOrId?.userId || 0)
  return Number.isFinite(id) && id > 0 ? id : null
}

async function getPrimaryMembership(pool, userId) {
  const result = await pool.query(
    `SELECT cm.*, c.name AS cabinet_name, c.orias_number
     FROM cabinet_members cm
     JOIN cabinets c ON c.id = cm.cabinet_id
     WHERE cm.user_id = $1 AND cm.removed_at IS NULL
     ORDER BY cm.created_at ASC
     LIMIT 1`,
    [userId]
  )
  return result.rows[0] || null
}

async function ensureUserCabinet(pool, userOrId, profile = {}) {
  const userId = getSafeUserId(userOrId)
  if (!userId) throw createHttpError('AUTH_REQUIRED', 401, 'Utilisateur requis')

  const existing = await getPrimaryMembership(pool, userId)
  if (existing) return existing

  const cabinetName = String(profile.cabinet || profile.cabinet_name || '').trim() || 'Cabinet COURTIA'
  const orias = String(profile.orias || profile.orias_number || '').trim() || null

  const cabinetResult = await pool.query(
    `INSERT INTO cabinets (name, created_by, orias_number, created_at, updated_at)
     VALUES ($1, $2, $3, NOW(), NOW())
     RETURNING id, name, created_by, orias_number`,
    [cabinetName, userId, orias]
  )
  const cabinet = cabinetResult.rows[0]

  const memberResult = await pool.query(
    `INSERT INTO cabinet_members (cabinet_id, user_id, role, created_at)
     VALUES ($1, $2, $3, NOW())
     RETURNING id, cabinet_id, user_id, role, created_at`,
    [cabinet.id, userId, CABINET_ROLES.OWNER]
  )

  return {
    ...memberResult.rows[0],
    cabinet_name: cabinet.name,
    orias_number: cabinet.orias_number || '',
  }
}

async function getMembership(pool, userOrId, cabinetId) {
  const userId = getSafeUserId(userOrId)
  if (!userId || !cabinetId) return null
  const result = await pool.query(
    `SELECT * FROM cabinet_members
     WHERE user_id = $1 AND cabinet_id = $2 AND removed_at IS NULL
     LIMIT 1`,
    [userId, cabinetId]
  )
  return result.rows[0] || null
}

async function requireRoleForCabinet(pool, userOrId, cabinetId, allowedRoles = []) {
  const platformRole = String(userOrId?.role || '').trim().toLowerCase()
  if (platformRole === CABINET_ROLES.SUPER_ADMIN) return { role: CABINET_ROLES.SUPER_ADMIN, cabinet_id: cabinetId }

  const membership = await getMembership(pool, userOrId, cabinetId)
  if (!membership) throw createHttpError('CABINET_ACCESS_DENIED', 403, 'Accès cabinet refusé')

  const normalizedAllowed = allowedRoles.map(normalizeCabinetRole)
  if (normalizedAllowed.length > 0 && !normalizedAllowed.includes(normalizeCabinetRole(membership.role))) {
    throw createHttpError('FORBIDDEN_ROLE', 403, 'Rôle insuffisant')
  }
  return membership
}

async function createInvitation(pool, { actorUserId, email, role, frontendUrl }) {
  const actorMembership = await ensureUserCabinet(pool, actorUserId)
  if (normalizeCabinetRole(actorMembership.role) !== CABINET_ROLES.OWNER) {
    throw createHttpError('FORBIDDEN_ROLE', 403, 'Seul le propriétaire du cabinet peut inviter un membre')
  }

  const normalizedRole = normalizeCabinetRole(role)
  if (normalizedRole === CABINET_ROLES.SUPER_ADMIN) {
    throw createHttpError('INVALID_INVITE_ROLE', 400, 'Le rôle super_admin ne peut pas être invité dans un cabinet')
  }

  const normalizedEmail = String(email || '').trim().toLowerCase()
  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    throw createHttpError('INVALID_EMAIL', 400, 'Email invitation invalide')
  }

  const rawToken = crypto.randomBytes(32).toString('hex')
  const tokenHash = hashInviteToken(rawToken)
  const tokenPreview = `${rawToken.slice(0, 6)}...${rawToken.slice(-4)}`
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  const result = await pool.query(
    `INSERT INTO cabinet_invitations (cabinet_id, email, role, token_hash, token_preview, invited_by, expires_at, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
     RETURNING id, cabinet_id, email, role, token_hash, token_preview, invited_by, expires_at, accepted_at, created_at`,
    [actorMembership.cabinet_id, normalizedEmail, normalizedRole, tokenHash, tokenPreview, actorUserId, expiresAt]
  )

  const baseUrl = String(frontendUrl || process.env.FRONTEND_URL || 'https://app.courtiark.fr').replace(/\/$/, '')
  return {
    invitation: result.rows[0],
    rawToken,
    inviteLink: `${baseUrl}/invite/${rawToken}`,
  }
}

async function getInvitationByToken(pool, token) {
  const tokenHash = hashInviteToken(token)
  const result = await pool.query(
    `SELECT ci.*, c.name AS cabinet_name
     FROM cabinet_invitations ci
     JOIN cabinets c ON c.id = ci.cabinet_id
     WHERE ci.token_hash = $1
     LIMIT 1`,
    [tokenHash]
  )
  return result.rows[0] || null
}

async function acceptInvitation(pool, { token, userId }) {
  const invite = await getInvitationByToken(pool, token)
  if (!invite) throw createHttpError('INVITE_NOT_FOUND', 404, 'Invitation introuvable')
  if (invite.accepted_at) throw createHttpError('INVITE_ALREADY_ACCEPTED', 409, 'Invitation déjà acceptée')
  if (new Date(invite.expires_at).getTime() < Date.now()) {
    throw createHttpError('INVITE_EXPIRED', 410, 'Invitation expirée')
  }

  const existingMembership = await getMembership(pool, userId, invite.cabinet_id)
  const membership = existingMembership || (await pool.query(
    `INSERT INTO cabinet_members (cabinet_id, user_id, role, created_at)
     VALUES ($1, $2, $3, NOW())
     RETURNING id, cabinet_id, user_id, role, created_at`,
    [invite.cabinet_id, userId, normalizeCabinetRole(invite.role)]
  )).rows[0]

  await pool.query(
    `UPDATE cabinet_invitations SET accepted_at = NOW(), accepted_by = $1 WHERE id = $2 RETURNING id`,
    [userId, invite.id]
  )

  return { invitation: { ...invite, accepted_at: new Date().toISOString() }, membership }
}

async function getOnboardingProgress(pool, cabinetId) {
  const result = await pool.query(
    `SELECT * FROM onboarding_progress WHERE cabinet_id = $1 LIMIT 1`,
    [cabinetId]
  )
  if (result.rows[0]) return result.rows[0]

  const created = await pool.query(
    `INSERT INTO onboarding_progress (cabinet_id, updated_at)
     VALUES ($1, NOW())
     RETURNING *`,
    [cabinetId]
  )
  return created.rows[0]
}

async function markOnboardingStep(pool, cabinetId, step) {
  const column = ONBOARDING_STEP_COLUMNS[String(step || '')]
  if (!column) throw createHttpError('INVALID_ONBOARDING_STEP', 400, 'Étape onboarding inconnue')
  const completionCondition = Object.values(ONBOARDING_STEP_COLUMNS)
    .map((stepColumn) => (stepColumn === column ? 'TRUE' : `${stepColumn} = TRUE`))
    .join(' AND ')

  await getOnboardingProgress(pool, cabinetId)
  const result = await pool.query(
    `UPDATE onboarding_progress
     SET ${column} = TRUE,
         updated_at = NOW(),
         completed_at = CASE
           WHEN ${completionCondition}
           THEN COALESCE(completed_at, NOW())
           ELSE completed_at
         END
     WHERE cabinet_id = $1
     RETURNING *`,
    [cabinetId]
  )

  if (!result.rows[0]) return getOnboardingProgress(pool, cabinetId)
  return result.rows[0]
}

function sanitizeInvitation(invitation) {
  if (!invitation) return null
  const { token_hash, ...safe } = invitation
  return safe
}

module.exports = {
  CABINET_ROLES,
  ONBOARDING_STEPS,
  ONBOARDING_STEP_COLUMNS,
  normalizeCabinetRole,
  hasRoleAtLeast,
  hashInviteToken,
  getSafeUserId,
  ensureUserCabinet,
  getMembership,
  requireRoleForCabinet,
  createInvitation,
  getInvitationByToken,
  acceptInvitation,
  getOnboardingProgress,
  markOnboardingStep,
  sanitizeInvitation,
}
