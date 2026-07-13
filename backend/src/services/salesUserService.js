const crypto = require('crypto')
const bcrypt = require('bcryptjs')
const pool = require('../db')
const { sendEmail, getEmailStatus } = require('./emailService')
const { ROLES } = require('../constants/roles')
const { appendSalesAudit } = require('./salesAuditService')
const { httpError, withTransaction } = require('./salesProspectingService')

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase()
}

function normalizeUsername(username) {
  return String(username || '').trim().toLowerCase().replace(/[^a-z0-9._-]/g, '').slice(0, 80)
}

function validateInviteInput(input = {}) {
  const email = normalizeEmail(input.email)
  const username = normalizeUsername(input.username)
  const role = input.role === ROLES.SUPER_ADMIN ? ROLES.SUPER_ADMIN : ROLES.PROSPECTEUR
  const errors = []
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('email_invalid')
  if (username.length < 2) errors.push('username_invalid')
  if (![ROLES.SUPER_ADMIN, ROLES.PROSPECTEUR].includes(role)) errors.push('role_invalid')
  return { email, username, role, errors }
}

async function inviteSalesUser(actor, input, auditContext = {}, options = {}) {
  const normalized = validateInviteInput(input)
  if (normalized.errors.length) throw httpError(422, 'sales_user_validation_failed', normalized.errors)
  const emailStatus = getEmailStatus()
  if (!emailStatus.configured && options.requireEmail !== false) {
    throw httpError(503, 'email_provider_required_for_invitation')
  }
  const firstName = String(input.first_name || input.firstName || normalized.username).trim().slice(0, 100)
  const lastName = String(input.last_name || input.lastName || '').trim().slice(0, 100)
  const resetToken = crypto.randomBytes(32).toString('hex')
  const resetExpires = new Date(Date.now() + 48 * 60 * 60 * 1000)
  const unusablePassword = crypto.randomBytes(64).toString('hex')
  const passwordHash = await bcrypt.hash(unusablePassword, 12)

  const user = await withTransaction(async (db) => {
    const existing = await db.query(`SELECT * FROM users WHERE LOWER(email)=LOWER($1) OR LOWER(username)=LOWER($2) FOR UPDATE`, [normalized.email, normalized.username])
    let result
    if (existing.rows[0]) {
      if (!options.allowExisting && !existing.rows[0].deleted_at) throw httpError(409, 'sales_user_already_exists')
      result = await db.query(
        `UPDATE users SET email=$1,username=$2,first_name=$3,last_name=$4,role=$5,password_hash=$6,
         password_reset_token=$7,password_reset_expires=$8,must_change_password=TRUE,status='active',
         suspended_at=NULL,suspended_reason=NULL,deleted_at=NULL,updated_at=NOW()
         WHERE id=$9 RETURNING id,email,username,first_name,last_name,role,must_change_password,status`,
        [normalized.email, normalized.username, firstName, lastName, normalized.role, passwordHash, resetToken, resetExpires, existing.rows[0].id]
      )
    } else {
      result = await db.query(
        `INSERT INTO users
         (email,username,password_hash,first_name,last_name,role,status,must_change_password,password_reset_token,password_reset_expires,created_at,updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,'active',TRUE,$7,$8,NOW(),NOW())
         RETURNING id,email,username,first_name,last_name,role,must_change_password,status`,
        [normalized.email, normalized.username, passwordHash, firstName, lastName, normalized.role, resetToken, resetExpires]
      )
    }
    const created = result.rows[0]
    await appendSalesAudit({ ...auditContext, actorId: actor?.id || created.id, action: 'user.invite', entityType: 'user', entityId: created.id, metadata: { email: created.email, username: created.username, role: created.role, invitation_refreshed: Boolean(existing.rows[0]) } }, db)
    return created
  })

  const frontendUrl = process.env.FRONTEND_URL || 'https://courtiark.fr'
  const inviteUrl = `${frontendUrl}/reset-password?token=${resetToken}&invite=1`
  let invitationSent = false
  if (emailStatus.status === 'configured') {
    const emailResult = await sendEmail({
      to: user.email,
      subject: 'Courtiark — Activez votre espace de prospection',
      text: `Bonjour ${user.first_name || user.username}, activez votre compte Courtiark et choisissez votre mot de passe : ${inviteUrl}. Ce lien expire dans 48 heures.`,
      html: `<p>Bonjour ${user.first_name || user.username},</p><p>Votre espace de prospection Courtiark est prêt.</p><p><a href="${inviteUrl}">Choisir mon mot de passe et activer mon compte</a></p><p>Ce lien expire dans 48 heures.</p>`,
    })
    invitationSent = Boolean(emailResult?.success)
    if (!invitationSent && options.requireEmail !== false) {
      throw httpError(502, 'invitation_email_delivery_failed', { user_created: true, user_id: user.id })
    }
  }
  return { ...user, invitation_sent: invitationSent }
}

async function listSalesUsers() {
  const result = await pool.query(
    `SELECT u.id,u.email,u.username,u.first_name,u.last_name,u.role,u.status,u.must_change_password,
            u.suspended_at,u.deleted_at,u.last_login_at,u.created_at,
            COUNT(DISTINCT c.id)::int AS assigned_cabinets,
            COUNT(DISTINCT sc.id) FILTER (WHERE sc.started_at::date=CURRENT_DATE)::int AS calls_today
     FROM users u
     LEFT JOIN sales_cabinets c ON c.assigned_to=u.id
     LEFT JOIN sales_calls sc ON sc.commercial_id=u.id
     WHERE u.role IN ('super_admin','prospecteur')
     GROUP BY u.id ORDER BY CASE u.role WHEN 'super_admin' THEN 0 ELSE 1 END,u.username`
  )
  return result.rows
}

async function setSalesUserStatus(actor, userId, input, auditContext = {}) {
  const action = input.action
  if (!['activate', 'suspend', 'delete'].includes(action)) throw httpError(422, 'user_status_action_invalid')
  if (Number(actor.id) === Number(userId) && action !== 'activate') throw httpError(409, 'cannot_disable_own_account')
  return withTransaction(async (db) => {
    const before = await db.query(`SELECT id,email,username,role,status,suspended_at,deleted_at FROM users WHERE id=$1 AND role IN ('super_admin','prospecteur') FOR UPDATE`, [userId])
    if (!before.rows[0]) throw httpError(404, 'sales_user_not_found')
    let result
    if (action === 'activate') {
      result = await db.query(`UPDATE users SET status='active',suspended_at=NULL,suspended_reason=NULL,deleted_at=NULL,updated_at=NOW() WHERE id=$1 RETURNING id,email,username,role,status,suspended_at,deleted_at`, [userId])
    } else if (action === 'suspend') {
      result = await db.query(`UPDATE users SET status='suspended',suspended_at=NOW(),suspended_reason=$2,updated_at=NOW() WHERE id=$1 RETURNING id,email,username,role,status,suspended_at,deleted_at`, [userId, String(input.reason || '').slice(0, 1000) || 'Suspension administrative'])
      await db.query(`DELETE FROM sales_cabinet_locks WHERE locked_by=$1`, [userId])
    } else {
      result = await db.query(`UPDATE users SET status='deleted',deleted_at=NOW(),suspended_at=NOW(),suspended_reason=$2,updated_at=NOW() WHERE id=$1 RETURNING id,email,username,role,status,suspended_at,deleted_at`, [userId, String(input.reason || '').slice(0, 1000) || 'Suppression administrative'])
      await db.query(`DELETE FROM sales_cabinet_locks WHERE locked_by=$1`, [userId])
    }
    await appendSalesAudit({ ...auditContext, actorId: actor.id, action: `user.${action}`, entityType: 'user', entityId: userId, metadata: { before: before.rows[0], after: result.rows[0], reason: input.reason || null } }, db)
    return result.rows[0]
  })
}

module.exports = {
  inviteSalesUser,
  listSalesUsers,
  normalizeEmail,
  normalizeUsername,
  setSalesUserStatus,
  validateInviteInput,
}
