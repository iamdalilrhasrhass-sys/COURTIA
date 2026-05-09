const pool = require('../db')
const { redactValue } = require('./redaction')

function extractIp(req) {
  const forwarded = req?.headers?.['x-forwarded-for']
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim()
  }
  return req?.ip || null
}

async function logAudit({
  cabinetId = null,
  userId = null,
  entityType,
  entityId,
  action,
  metadata = {},
  req = null,
}) {
  if (!entityType || !entityId || !action) {
    throw new Error('audit_log_missing_required_fields')
  }

  const redactedMetadata = redactValue(metadata)
  const result = await pool.query(
    `INSERT INTO audit_log
      (cabinet_id, user_id, entity_type, entity_id, action, metadata, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, NULLIF($7, '')::inet, $8)
     RETURNING id, created_at`,
    [
      cabinetId,
      userId,
      entityType,
      String(entityId),
      action,
      JSON.stringify(redactedMetadata),
      extractIp(req),
      req?.headers?.['user-agent'] ? String(req.headers['user-agent']).slice(0, 300) : null,
    ]
  )
  return result.rows[0]
}

module.exports = {
  logAudit,
}
