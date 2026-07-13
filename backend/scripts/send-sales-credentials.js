require('dotenv').config()

const bcrypt = require('bcryptjs')
const crypto = require('crypto')
const pool = require('../src/db')
const { ROLES } = require('../src/constants/roles')
const { sendEmail, getEmailStatus } = require('../src/services/emailService')
const { appendSalesAudit } = require('../src/services/salesAuditService')

const ACCOUNT_DEFINITIONS = [
  { username: 'boss', role: ROLES.SUPER_ADMIN, firstName: 'Boss', envKey: 'BOSS_EMAIL' },
  { username: 'tarek', role: ROLES.PROSPECTEUR, firstName: 'Tarek', envKey: 'TAREK_EMAIL' },
  { username: 'ahmed', role: ROLES.PROSPECTEUR, firstName: 'Ahmed', envKey: 'AHMED_EMAIL' },
]

function generateTemporaryPassword() {
  return `${crypto.randomBytes(18).toString('base64url')}!9aA`
}

function configuredAccounts(env = process.env) {
  return ACCOUNT_DEFINITIONS
    .map((account) => ({ ...account, email: String(env[account.envKey] || '').trim().toLowerCase() }))
    .filter((account) => account.email)
}

async function upsertAccount(account, password, resetToken, resetExpires) {
  const passwordHash = await bcrypt.hash(password, 12)
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const existing = await client.query(
      `SELECT id,email,username,role FROM users
       WHERE LOWER(email)=LOWER($1) OR LOWER(username)=LOWER($2)
       ORDER BY CASE WHEN LOWER(username)=LOWER($2) THEN 0 ELSE 1 END
       LIMIT 1 FOR UPDATE`,
      [account.email, account.username]
    )
    let result
    if (existing.rows[0]) {
      result = await client.query(
        `UPDATE users SET email=$1,username=$2,first_name=$3,role=$4,password_hash=$5,
         password_reset_token=$6,password_reset_expires=$7,must_change_password=TRUE,
         status='active',suspended_at=NULL,suspended_reason=NULL,deleted_at=NULL,updated_at=NOW()
         WHERE id=$8 RETURNING id,email,username,first_name,role,status,must_change_password`,
        [account.email, account.username, account.firstName, account.role, passwordHash, resetToken, resetExpires, existing.rows[0].id]
      )
    } else {
      result = await client.query(
        `INSERT INTO users
         (email,username,password_hash,first_name,last_name,role,status,must_change_password,
          password_reset_token,password_reset_expires,created_at,updated_at)
         VALUES ($1,$2,$3,$4,'',$5,'active',TRUE,$6,$7,NOW(),NOW())
         RETURNING id,email,username,first_name,role,status,must_change_password`,
        [account.email, account.username, passwordHash, account.firstName, account.role, resetToken, resetExpires]
      )
    }
    const user = result.rows[0]
    await appendSalesAudit({
      actorId: user.id,
      action: 'user.credentials_issued',
      entityType: 'user',
      entityId: user.id,
      metadata: {
        username: user.username,
        role: user.role,
        invitation_refreshed: Boolean(existing.rows[0]),
        password_exposed_in_logs: false,
      },
    }, client)
    await client.query('COMMIT')
    return user
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

async function sendCredentials(account) {
  const password = generateTemporaryPassword()
  const resetToken = crypto.randomBytes(32).toString('hex')
  const resetExpires = new Date(Date.now() + 48 * 60 * 60 * 1000)
  const user = await upsertAccount(account, password, resetToken, resetExpires)
  const frontendUrl = String(process.env.FRONTEND_URL || 'https://app.courtiark.fr').replace(/\/$/, '')
  const loginUrl = `${frontendUrl}/login`
  const activationUrl = `${frontendUrl}/reset-password?token=${resetToken}&invite=1`
  const result = await sendEmail({
    to: user.email,
    subject: 'Courtiark — Vos accès au CRM de prospection',
    text: [
      `Bonjour ${user.first_name || user.username},`,
      '',
      'Votre accès au CRM de prospection Courtiark est prêt.',
      `Identifiant : ${user.username}`,
      `Mot de passe temporaire : ${password}`,
      `Connexion : ${loginUrl}`,
      '',
      `Pour choisir immédiatement votre mot de passe définitif : ${activationUrl}`,
      'Le lien de changement expire dans 48 heures.',
    ].join('\n'),
    html: `<p>Bonjour ${user.first_name || user.username},</p>
      <p>Votre accès au CRM de prospection Courtiark est prêt.</p>
      <p><strong>Identifiant :</strong> ${user.username}<br>
      <strong>Mot de passe temporaire :</strong> <code>${password}</code></p>
      <p><a href="${loginUrl}">Se connecter à Courtiark</a></p>
      <p><a href="${activationUrl}">Choisir mon mot de passe définitif</a></p>
      <p>Le lien de changement expire dans 48 heures.</p>`,
  })
  if (!result?.success) {
    const error = new Error(`credential_email_failed:${account.username}`)
    error.code = 'credential_email_failed'
    throw error
  }
  return { username: user.username, email: user.email, role: user.role, provider: result.provider, messageId: result.id || null }
}

async function run() {
  const emailStatus = getEmailStatus()
  if (!emailStatus.configured) throw new Error('email_provider_required')
  const accounts = configuredAccounts()
  if (!accounts.length) throw new Error('BOSS_EMAIL, TAREK_EMAIL ou AHMED_EMAIL requis')
  const results = []
  for (const account of accounts) results.push(await sendCredentials(account))
  console.table(results.map(({ messageId: _messageId, ...result }) => ({ ...result, sent: true })))
  console.log('Les mots de passe temporaires ont été envoyés sans être affichés ni enregistrés en clair.')
}

if (require.main === module) {
  run()
    .catch((error) => {
      console.error(`Envoi impossible : ${error.code || error.message}`)
      process.exitCode = 1
    })
    .finally(() => pool.end())
}

module.exports = { configuredAccounts, generateTemporaryPassword }
