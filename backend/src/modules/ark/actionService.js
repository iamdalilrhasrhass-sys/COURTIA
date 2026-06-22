const pool = require('../../db')
const { assertExecutable } = require('./policy')
const { emitEvent } = require('./events')

async function createAction(tenantId, action) {
  const { rows } = await pool.query(
    `INSERT INTO ai_actions
       (tenant_id, client_id, dossier_id, agent_key, action_type, title, rationale, payload, priority, requires_approval, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11)
     RETURNING *`,
    [
      String(tenantId),
      action.client_id ? String(action.client_id) : null,
      action.dossier_id ? String(action.dossier_id) : null,
      action.agent_key || 'ark',
      action.action_type,
      action.title,
      action.rationale || null,
      JSON.stringify(action.payload || {}),
      action.priority || 'medium',
      action.requires_approval !== false,
      action.expires_at || null,
    ],
  )

  await emitEvent({
    tenantId,
    aggregateType: 'action',
    aggregateId: rows[0].id,
    eventType: 'action.created',
    actorType: 'ark',
    payload: { action_type: rows[0].action_type, title: rows[0].title },
  })

  return rows[0]
}

async function listPendingActions(tenantId, limit = 20) {
  const { rows } = await pool.query(
    `SELECT a.*, c.first_name, c.last_name
       FROM ai_actions a
       LEFT JOIN clients c ON c.id::text = a.client_id
      WHERE a.tenant_id = $1
        AND a.status = 'pending'
        AND (a.expires_at IS NULL OR a.expires_at > NOW())
      ORDER BY
        CASE a.priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
        a.created_at DESC
      LIMIT $2`,
    [String(tenantId), limit],
  )
  return rows
}

async function approveAction(tenantId, actionId, actorId) {
  const { rows } = await pool.query(
    `UPDATE ai_actions
        SET status = 'approved', approved_by = $1, approved_at = NOW()
      WHERE id = $2 AND tenant_id = $3 AND status = 'pending'
      RETURNING *`,
    [String(actorId), actionId, String(tenantId)],
  )
  if (!rows[0]) return null

  await emitEvent({
    tenantId,
    aggregateType: 'action',
    aggregateId: actionId,
    eventType: 'action.approved',
    actorType: 'human',
    actorId,
    payload: { action_type: rows[0].action_type },
  })

  return rows[0]
}

async function rejectAction(tenantId, actionId, actorId, reason = null) {
  const { rows } = await pool.query(
    `UPDATE ai_actions
        SET status = 'rejected', result = jsonb_build_object('reason', $1::text)
      WHERE id = $2 AND tenant_id = $3 AND status IN ('pending','approved')
      RETURNING *`,
    [reason, actionId, String(tenantId)],
  )
  if (!rows[0]) return null

  await emitEvent({
    tenantId,
    aggregateType: 'action',
    aggregateId: actionId,
    eventType: 'action.rejected',
    actorType: 'human',
    actorId,
    payload: { reason },
  })

  return rows[0]
}

async function executeAction(tenantId, actionId, actorId, dispatch = null) {
  const selected = await pool.query(
    'SELECT * FROM ai_actions WHERE id = $1 AND tenant_id = $2',
    [actionId, String(tenantId)],
  )
  const action = selected.rows[0]
  if (!action) return null

  assertExecutable(action)

  const result = await executeSideEffect(action, tenantId, dispatch)
  const updated = await pool.query(
    `UPDATE ai_actions
        SET status = 'executed', executed_at = NOW(), result = $1::jsonb
      WHERE id = $2
      RETURNING *`,
    [JSON.stringify(result), actionId],
  )

  await emitEvent({
    tenantId,
    aggregateType: 'action',
    aggregateId: actionId,
    eventType: 'action.executed',
    actorType: 'human',
    actorId,
    payload: { action_type: action.action_type, result },
  })

  return updated.rows[0]
}

async function executeSideEffect(action, tenantId, dispatch = null) {
  const runner = dispatch || require('./actionDispatch').buildDispatch(tenantId)
  return runner(action)
}

module.exports = {
  createAction,
  listPendingActions,
  approveAction,
  rejectAction,
  executeAction,
}
