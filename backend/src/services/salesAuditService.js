const crypto = require('crypto')
const pool = require('../db')

function sanitizeMetadata(value, depth = 0) {
  if (depth > 6) return '[MAX_DEPTH]'
  if (Array.isArray(value)) return value.slice(0, 100).map((item) => sanitizeMetadata(item, depth + 1))
  if (!value || typeof value !== 'object') {
    return typeof value === 'string' ? value.slice(0, 2000) : value
  }
  const result = {}
  for (const [key, item] of Object.entries(value)) {
    if (/password|token|secret|authorization|cookie|api.?key/i.test(key)) {
      result[key] = '[REDACTED]'
    } else {
      result[key] = sanitizeMetadata(item, depth + 1)
    }
  }
  return result
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue)
  if (!value || typeof value !== 'object') return value
  return Object.keys(value).sort().reduce((result, key) => {
    result[key] = stableValue(value[key])
    return result
  }, {})
}

function hashEntry(entry) {
  const canonical = JSON.stringify({
    actor_id: entry.actorId || null,
    action: entry.action,
    entity_type: entry.entityType,
    entity_id: entry.entityId ? String(entry.entityId) : null,
    cabinet_id: entry.cabinetId === null || entry.cabinetId === undefined ? null : String(entry.cabinetId),
    metadata: stableValue(entry.metadata || {}),
    ip_address: entry.ipAddress || null,
    previous_hash: entry.previousHash || null,
    created_at: entry.createdAt,
  })
  return crypto.createHash('sha256').update(canonical).digest('hex')
}

async function appendSalesAudit(input, db = pool) {
  if (db === pool) {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      const result = await appendSalesAudit(input, client)
      await client.query('COMMIT')
      return result
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {})
      throw error
    } finally {
      client.release()
    }
  }

  const createdAt = input.createdAt || new Date().toISOString()
  await db.query(`SELECT pg_advisory_xact_lock(1846827583)`)
  const previous = await db.query('SELECT entry_hash FROM sales_audit_log ORDER BY id DESC LIMIT 1')
  const previousHash = previous.rows[0]?.entry_hash || null
  const metadata = sanitizeMetadata(input.metadata || {})
  const entry = {
    actorId: input.actorId || null,
    action: String(input.action || '').slice(0, 100),
    entityType: String(input.entityType || '').slice(0, 80),
    entityId: input.entityId || null,
    cabinetId: input.cabinetId || null,
    metadata,
    ipAddress: input.ipAddress || null,
    previousHash,
    createdAt,
  }
  const entryHash = hashEntry(entry)
  const result = await db.query(
    `INSERT INTO sales_audit_log
       (actor_id, action, entity_type, entity_id, cabinet_id, metadata, ip_address, user_agent, previous_hash, entry_hash, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     RETURNING id, entry_hash, created_at`,
    [
      entry.actorId,
      entry.action,
      entry.entityType,
      entry.entityId ? String(entry.entityId) : null,
      entry.cabinetId,
      JSON.stringify(entry.metadata),
      entry.ipAddress,
      String(input.userAgent || '').slice(0, 500) || null,
      previousHash,
      entryHash,
      createdAt,
    ]
  )
  return result.rows[0]
}

function requestAuditContext(req) {
  return {
    actorId: req.salesUser?.id || req.user?.id || req.user?.userId || null,
    ipAddress: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || null,
    userAgent: req.headers['user-agent'] || null,
  }
}

module.exports = {
  appendSalesAudit,
  hashEntry,
  requestAuditContext,
  sanitizeMetadata,
}
