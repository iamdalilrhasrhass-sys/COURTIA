const pool = require('../../db')

const VALID_ACTORS = new Set(['human', 'ark', 'system', 'client'])

async function emitEvent({ tenantId, aggregateType, aggregateId, eventType, actorType, actorId = null, payload = {} }, db = null) {
  if (!tenantId) throw new Error('emitEvent: tenantId requis')
  if (!aggregateType || !aggregateId) throw new Error('emitEvent: aggregateType et aggregateId requis')
  if (!eventType) throw new Error('emitEvent: eventType requis')
  if (!VALID_ACTORS.has(actorType)) {
    throw new Error(`emitEvent: actorType invalide "${actorType}"`)
  }

  const runner = db || pool
  const { rows } = await runner.query(
    `INSERT INTO events
       (tenant_id, aggregate_type, aggregate_id, event_type, actor_type, actor_id, payload)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
     RETURNING *`,
    [String(tenantId), aggregateType, String(aggregateId), eventType, actorType, actorId ? String(actorId) : null, JSON.stringify(payload)],
  )
  return rows[0]
}

async function getTimeline(tenantId, aggregateType, aggregateId) {
  const { rows } = await pool.query(
    `SELECT id, event_type, actor_type, actor_id, payload, occurred_at, seq
       FROM events
      WHERE tenant_id = $1 AND aggregate_type = $2 AND aggregate_id = $3
      ORDER BY seq ASC`,
    [String(tenantId), aggregateType, String(aggregateId)],
  )
  return rows
}

async function getRecentEvents(tenantId, limit = 50) {
  const { rows } = await pool.query(
    `SELECT id, aggregate_type, aggregate_id, event_type, actor_type, actor_id, payload, occurred_at
       FROM events
      WHERE tenant_id = $1
      ORDER BY seq DESC
      LIMIT $2`,
    [String(tenantId), limit],
  )
  return rows
}

module.exports = { emitEvent, getTimeline, getRecentEvents }
