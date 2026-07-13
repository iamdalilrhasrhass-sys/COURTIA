const crypto = require('crypto')
const pool = require('../db')
const { ROLES } = require('../constants/roles')
const {
  PIPELINE_STATUSES,
  TERMINAL_STATUSES,
  normalizeCabinetPayload,
  validateCabinetPayload,
  validateCallResult,
  statusAfterCall,
  cleanText,
} = require('./salesProspectingPolicy')
const { appendSalesAudit } = require('./salesAuditService')

const CABINET_SELECT = `
  SELECT c.*,
         u.username AS assigned_username,
         u.first_name AS assigned_first_name,
         u.last_name AS assigned_last_name,
         l.locked_by, l.locked_until,
         lu.username AS locked_by_username,
         lc.started_at AS last_call_at,
         lc.outcome AS last_call_outcome,
         lc.commercial_id AS last_called_by,
         lcu.username AS last_called_by_username
  FROM sales_cabinets c
  LEFT JOIN users u ON u.id = c.assigned_to
  LEFT JOIN sales_cabinet_locks l ON l.cabinet_id = c.id AND l.locked_until > NOW()
  LEFT JOIN users lu ON lu.id = l.locked_by
  LEFT JOIN LATERAL (
    SELECT sc.started_at, sc.outcome, sc.commercial_id
    FROM sales_calls sc WHERE sc.cabinet_id = c.id
    ORDER BY sc.started_at DESC, sc.id DESC LIMIT 1
  ) lc ON TRUE
  LEFT JOIN users lcu ON lcu.id = lc.commercial_id`

async function withTransaction(work) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await work(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    throw error
  } finally {
    client.release()
  }
}

function httpError(status, code, details = null) {
  const error = new Error(code)
  error.status = status
  error.code = code
  error.details = details
  return error
}

function isSuperAdmin(user) {
  return user?.role === ROLES.SUPER_ADMIN
}

async function assertCabinetAccess(db, cabinetId, user, options = {}) {
  const result = await db.query(
    `SELECT c.*, l.locked_by, l.locked_until, lu.username AS locked_by_username
     FROM sales_cabinets c
     LEFT JOIN sales_cabinet_locks l ON l.cabinet_id = c.id AND l.locked_until > NOW()
     LEFT JOIN users lu ON lu.id = l.locked_by
     WHERE c.id = $1
     ${options.forUpdate ? 'FOR UPDATE OF c' : ''}`,
    [cabinetId]
  )
  const cabinet = result.rows[0]
  if (!cabinet) throw httpError(404, 'cabinet_not_found')
  if (!isSuperAdmin(user) && Number(cabinet.assigned_to) !== Number(user.id)) {
    throw httpError(403, 'cabinet_not_assigned_to_user', {
      assigned: Boolean(cabinet.assigned_to),
      already_in_progress: Boolean(cabinet.locked_by),
    })
  }
  return cabinet
}

function listSort(sort) {
  const allowed = {
    size_asc: 'c.size_score ASC NULLS FIRST, c.id ASC',
    size_desc: 'c.size_score DESC NULLS LAST, c.id ASC',
    department: 'c.department ASC NULLS LAST, c.legal_name ASC',
    region: 'c.region ASC NULLS LAST, c.legal_name ASC',
    commercial: 'u.username ASC NULLS LAST, c.legal_name ASC',
    status: 'c.commercial_status ASC, c.updated_at DESC',
    priority: "CASE c.priority WHEN 'urgente' THEN 1 WHEN 'haute' THEN 2 WHEN 'normale' THEN 3 ELSE 4 END, c.updated_at DESC",
    next_followup: 'c.next_followup_at ASC NULLS LAST, c.id ASC',
    last_call: 'lc.started_at DESC NULLS LAST, c.id ASC',
    updated: 'c.updated_at DESC, c.id DESC',
  }
  return allowed[sort] || allowed.size_asc
}

async function listCabinets(user, query = {}) {
  const params = []
  const conditions = []
  const add = (sql, value) => {
    params.push(value)
    conditions.push(sql.replace('?', `$${params.length}`))
  }

  if (!isSuperAdmin(user)) add('c.assigned_to = ?', user.id)
  if (query.search) {
    add(`(
      c.legal_name ILIKE ? OR c.trade_name ILIKE $${params.length + 1} OR c.siren ILIKE $${params.length + 1}
      OR c.siret ILIKE $${params.length + 1} OR c.orias_number ILIKE $${params.length + 1}
      OR c.phone ILIKE $${params.length + 1} OR c.professional_email ILIKE $${params.length + 1}
      OR c.city ILIKE $${params.length + 1} OR c.department ILIKE $${params.length + 1}
      OR c.region ILIKE $${params.length + 1} OR c.primary_contact_name ILIKE $${params.length + 1}
    )`, `%${String(query.search).slice(0, 120)}%`)
  }
  if (query.status && PIPELINE_STATUSES.includes(query.status)) add('c.commercial_status = ?', query.status)
  if (query.priority) add('c.priority = ?', query.priority)
  if (query.size_category) add('c.size_category = ?', query.size_category)
  if (query.region) add('c.region = ?', query.region)
  if (query.department) add('c.department = ?', query.department)
  if (query.assigned_to && isSuperAdmin(user)) {
    if (query.assigned_to === 'unassigned') conditions.push('c.assigned_to IS NULL')
    else add('c.assigned_to = ?', Number(query.assigned_to))
  }
  if (query.assigned_to_username && isSuperAdmin(user)) add('LOWER(u.username) = ?', String(query.assigned_to_username).trim().toLowerCase())
  if (query.source) add('c.data_source = ?', query.source)
  if (query.interest_level) add('c.interest_level = ?', query.interest_level)
  if (query.is_client === 'true' || query.is_client === true) conditions.push('c.is_client = TRUE')
  if (query.is_client === 'false' || query.is_client === false) conditions.push('c.is_client = FALSE')
  if (query.has_appointment === 'true') conditions.push(`EXISTS (
    SELECT 1 FROM sales_appointments sa WHERE sa.cabinet_id = c.id AND sa.status NOT IN ('annule','realise')
  )`)
  if (query.overdue === 'true') conditions.push(`c.next_followup_at < NOW() AND c.commercial_status = 'a_rappeler'`)
  if (query.uncalled === 'true') conditions.push('NOT EXISTS (SELECT 1 FROM sales_calls sx WHERE sx.cabinet_id = c.id)')

  const page = Math.max(1, Number(query.page) || 1)
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 30))
  const offset = (page - 1) * limit
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const order = listSort(query.sort)
  const count = await pool.query(`SELECT COUNT(*)::int AS total FROM sales_cabinets c LEFT JOIN users u ON u.id = c.assigned_to WHERE ${conditions.length ? conditions.join(' AND ') : 'TRUE'}`, params)
  const rows = await pool.query(
    `${CABINET_SELECT} ${where} ORDER BY ${order} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  )
  return { cabinets: rows.rows, total: count.rows[0]?.total || 0, page, page_size: limit }
}

async function searchCabinetConflicts(user, search) {
  const needle = `%${String(search || '').trim().slice(0, 120)}%`
  if (needle === '%%') return []
  const result = await pool.query(
    `SELECT c.id, c.legal_name, c.trade_name, c.siren, c.siret, c.city, c.department,
            c.commercial_status, c.assigned_to, au.username AS assigned_username,
            c.do_not_contact, c.is_client,
            l.locked_by, l.locked_until, lu.username AS locked_by_username,
            lc.started_at AS last_call_at, lc.outcome AS last_call_outcome,
            lcu.username AS last_called_by_username,
            CASE WHEN $2::boolean OR c.assigned_to = $3 THEN c.phone ELSE NULL END AS phone,
            CASE WHEN $2::boolean OR c.assigned_to = $3 THEN c.professional_email ELSE NULL END AS professional_email
     FROM sales_cabinets c
     LEFT JOIN users au ON au.id = c.assigned_to
     LEFT JOIN sales_cabinet_locks l ON l.cabinet_id = c.id AND l.locked_until > NOW()
     LEFT JOIN users lu ON lu.id = l.locked_by
     LEFT JOIN LATERAL (
       SELECT sc.started_at, sc.outcome, sc.commercial_id FROM sales_calls sc
       WHERE sc.cabinet_id = c.id ORDER BY sc.started_at DESC, sc.id DESC LIMIT 1
     ) lc ON TRUE
     LEFT JOIN users lcu ON lcu.id = lc.commercial_id
     WHERE c.legal_name ILIKE $1 OR c.trade_name ILIKE $1 OR c.siren ILIKE $1 OR c.siret ILIKE $1
        OR c.orias_number ILIKE $1 OR c.city ILIKE $1 OR c.primary_contact_name ILIKE $1
     ORDER BY c.legal_name ASC LIMIT 25`,
    [needle, isSuperAdmin(user), user.id]
  )
  return result.rows
}

async function getCabinetDetail(user, cabinetId) {
  return withTransaction(async (db) => {
    const cabinet = await assertCabinetAccess(db, cabinetId, user)
    const [calls, notes, assignments, statuses, followups, appointments, proposals] = await Promise.all([
      db.query(`SELECT sc.*, u.username, u.first_name, u.last_name FROM sales_calls sc JOIN users u ON u.id=sc.commercial_id WHERE cabinet_id=$1 ORDER BY started_at DESC, id DESC LIMIT 100`, [cabinetId]),
      db.query(`SELECT sn.*, u.username, u.first_name, u.last_name FROM sales_cabinet_notes sn JOIN users u ON u.id=sn.author_id WHERE cabinet_id=$1 ORDER BY created_at DESC, id DESC LIMIT 100`, [cabinetId]),
      db.query(`SELECT sa.*, fu.username AS from_username, tu.username AS to_username, cu.username AS created_by_username FROM sales_cabinet_assignments sa LEFT JOIN users fu ON fu.id=sa.from_user_id LEFT JOIN users tu ON tu.id=sa.to_user_id JOIN users cu ON cu.id=sa.created_by WHERE cabinet_id=$1 ORDER BY created_at DESC, id DESC`, [cabinetId]),
      db.query(`SELECT sh.*, u.username FROM sales_status_history sh JOIN users u ON u.id=sh.changed_by WHERE cabinet_id=$1 ORDER BY created_at DESC, id DESC LIMIT 100`, [cabinetId]),
      db.query(`SELECT sf.*, u.username AS assigned_username FROM sales_followups sf JOIN users u ON u.id=sf.assigned_to WHERE cabinet_id=$1 ORDER BY due_at DESC LIMIT 100`, [cabinetId]),
      db.query(`SELECT sa.*, u.username AS owner_username FROM sales_appointments sa JOIN users u ON u.id=sa.owner_id WHERE cabinet_id=$1 ORDER BY starts_at DESC LIMIT 100`, [cabinetId]),
      db.query(`SELECT sp.*,u.username AS owner_username FROM sales_proposals sp JOIN users u ON u.id=sp.owner_id WHERE cabinet_id=$1 ORDER BY created_at DESC LIMIT 100`, [cabinetId]),
    ])
    return {
      cabinet,
      calls: calls.rows,
      notes: notes.rows,
      assignment_history: assignments.rows,
      status_history: statuses.rows,
      followups: followups.rows,
      appointments: appointments.rows,
      proposals: proposals.rows,
    }
  })
}

async function createCabinet(user, payload, auditContext = {}) {
  const cabinet = normalizeCabinetPayload(payload)
  const errors = validateCabinetPayload(cabinet)
  if (errors.length) throw httpError(422, 'cabinet_validation_failed', errors)
  return withTransaction(async (db) => {
    const fields = Object.keys(cabinet)
    const values = fields.map((key) => cabinet[key])
    const placeholders = values.map((_, index) => `$${index + 1}`)
    const result = await db.query(
      `INSERT INTO sales_cabinets (${fields.join(',')}, created_by, updated_by)
       VALUES (${placeholders.join(',')}, $${values.length + 1}, $${values.length + 2}) RETURNING *`,
      [...values, user.id, user.id]
    )
    const created = result.rows[0]
    await appendSalesAudit({ ...auditContext, actorId: user.id, action: 'cabinet.create', entityType: 'sales_cabinet', entityId: created.id, cabinetId: created.id, metadata: { legal_name: created.legal_name, source: created.data_source } }, db)
    return created
  })
}

async function updateCabinet(user, cabinetId, payload, auditContext = {}) {
  const cabinet = normalizeCabinetPayload(payload)
  const errors = validateCabinetPayload(cabinet)
  if (errors.length) throw httpError(422, 'cabinet_validation_failed', errors)
  return withTransaction(async (db) => {
    const before = await assertCabinetAccess(db, cabinetId, user, { forUpdate: true })
    const fields = Object.keys(cabinet)
    const values = fields.map((key) => cabinet[key])
    const set = fields.map((key, index) => `${key}=$${index + 1}`).join(',')
    const result = await db.query(
      `UPDATE sales_cabinets SET ${set}, updated_by=$${values.length + 1}, updated_at=NOW()
       WHERE id=$${values.length + 2} RETURNING *`,
      [...values, user.id, cabinetId]
    )
    await appendSalesAudit({ ...auditContext, actorId: user.id, action: 'cabinet.update', entityType: 'sales_cabinet', entityId: cabinetId, cabinetId, metadata: { before: { legal_name: before.legal_name, status: before.commercial_status }, after: cabinet } }, db)
    return result.rows[0]
  })
}

async function changeCabinetStatus(user, cabinetId, newStatus, justification, auditContext = {}) {
  if (!PIPELINE_STATUSES.includes(newStatus)) throw httpError(422, 'invalid_pipeline_status')
  return withTransaction(async (db) => {
    const cabinet = await assertCabinetAccess(db, cabinetId, user, { forUpdate: true })
    if (!isSuperAdmin(user) && TERMINAL_STATUSES.has(newStatus) && !cleanText(justification, 1000)) {
      throw httpError(422, 'status_justification_required')
    }
    await db.query(`UPDATE sales_cabinets SET commercial_status=$1::varchar, do_not_contact=CASE WHEN $1::varchar='ne_plus_contacter' THEN TRUE ELSE do_not_contact END, is_client=CASE WHEN $1::varchar IN ('signe','client_actif') THEN TRUE ELSE is_client END, last_action_at=NOW(), updated_by=$2, updated_at=NOW() WHERE id=$3`, [newStatus, user.id, cabinetId])
    await db.query(`INSERT INTO sales_status_history (cabinet_id, changed_by, old_status, new_status, justification) VALUES ($1,$2,$3,$4,$5)`, [cabinetId, user.id, cabinet.commercial_status, newStatus, cleanText(justification, 2000)])
    await appendSalesAudit({ ...auditContext, actorId: user.id, action: 'cabinet.status_change', entityType: 'sales_cabinet', entityId: cabinetId, cabinetId, metadata: { old_status: cabinet.commercial_status, new_status: newStatus, justification } }, db)
    return { id: Number(cabinetId), old_status: cabinet.commercial_status, new_status: newStatus }
  })
}

async function assignCabinets(user, cabinetIds, toUserId, options = {}, auditContext = {}) {
  const ids = Array.from(new Set((cabinetIds || []).map(Number).filter(Number.isInteger))).slice(0, 500)
  if (!ids.length) throw httpError(422, 'cabinet_ids_required')
  const targetId = toUserId === null ? null : Number(toUserId)
  return withTransaction(async (db) => {
    if (targetId !== null) {
      const target = await db.query(`SELECT id, username, role, suspended_at, deleted_at FROM users WHERE id=$1 FOR UPDATE`, [targetId])
      if (!target.rows[0] || target.rows[0].role !== ROLES.PROSPECTEUR || target.rows[0].suspended_at || target.rows[0].deleted_at) {
        throw httpError(422, 'target_must_be_active_prospector')
      }
    }
    const cabinets = await db.query(`SELECT id, assigned_to, commercial_status FROM sales_cabinets WHERE id=ANY($1::bigint[]) ORDER BY id FOR UPDATE`, [ids])
    if (cabinets.rows.length !== ids.length) throw httpError(404, 'one_or_more_cabinets_not_found')
    for (const cabinet of cabinets.rows) {
      const status = targetId === null ? 'non_attribue' : (cabinet.commercial_status === 'non_attribue' ? 'a_contacter' : cabinet.commercial_status)
      await db.query(`UPDATE sales_cabinets SET assigned_to=$1, commercial_status=$2, updated_by=$3, updated_at=NOW() WHERE id=$4`, [targetId, status, user.id, cabinet.id])
      await db.query(`INSERT INTO sales_cabinet_assignments (cabinet_id, from_user_id, to_user_id, assignment_method, assignment_criteria, justification, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7)`, [cabinet.id, cabinet.assigned_to, targetId, options.method || 'manual', JSON.stringify(options.criteria || {}), cleanText(options.justification, 2000), user.id])
      await appendSalesAudit({ ...auditContext, actorId: user.id, action: cabinet.assigned_to && targetId ? 'cabinet.transfer' : 'cabinet.assign', entityType: 'sales_cabinet', entityId: cabinet.id, cabinetId: cabinet.id, metadata: { from_user_id: cabinet.assigned_to, to_user_id: targetId, method: options.method || 'manual' } }, db)
    }
    return { updated: cabinets.rows.length, assigned_to: targetId }
  })
}

async function autoAssignCabinets(user, input = {}, auditContext = {}) {
  const userIds = Array.from(new Set((input.user_ids || []).map(Number).filter(Number.isInteger)))
  if (!userIds.length) throw httpError(422, 'prospector_user_ids_required')
  const limit = Math.min(5000, Math.max(1, Number(input.limit) || 500))
  return withTransaction(async (db) => {
    const users = await db.query(`SELECT id, username FROM users WHERE id=ANY($1::int[]) AND role='prospecteur' AND suspended_at IS NULL AND deleted_at IS NULL ORDER BY id`, [userIds])
    if (users.rows.length !== userIds.length) throw httpError(422, 'all_targets_must_be_active_prospectors')
    const params = [limit]
    const filters = ['c.assigned_to IS NULL', `c.commercial_status='non_attribue'`]
    if (input.region) { params.push(input.region); filters.push(`c.region=$${params.length}`) }
    if (input.department) { params.push(input.department); filters.push(`c.department=$${params.length}`) }
    if (input.size_category) { params.push(input.size_category); filters.push(`c.size_category=$${params.length}`) }
    const cabinets = await db.query(`SELECT c.id, c.assigned_to FROM sales_cabinets c WHERE ${filters.join(' AND ')} ORDER BY c.size_score ASC, c.id ASC LIMIT $1 FOR UPDATE SKIP LOCKED`, params)
    const counts = await db.query(`SELECT assigned_to, COUNT(*)::int AS count FROM sales_cabinets WHERE assigned_to=ANY($1::int[]) GROUP BY assigned_to`, [userIds])
    const countMap = new Map(counts.rows.map((row) => [Number(row.assigned_to), row.count]))
    const targets = users.rows.map((target) => ({ ...target, count: countMap.get(Number(target.id)) || 0 }))
    const distribution = {}
    for (const cabinet of cabinets.rows) {
      targets.sort((a, b) => a.count - b.count || a.id - b.id)
      const target = targets[0]
      await db.query(`UPDATE sales_cabinets SET assigned_to=$1, commercial_status='a_contacter', updated_by=$2, updated_at=NOW() WHERE id=$3`, [target.id, user.id, cabinet.id])
      await db.query(`INSERT INTO sales_cabinet_assignments (cabinet_id, from_user_id, to_user_id, assignment_method, assignment_criteria, justification, created_by) VALUES ($1,NULL,$2,'round_robin',$3,$4,$5)`, [cabinet.id, target.id, JSON.stringify({ region: input.region || null, department: input.department || null, size_category: input.size_category || null }), cleanText(input.justification, 2000), user.id])
      target.count += 1
      distribution[target.username] = (distribution[target.username] || 0) + 1
    }
    await appendSalesAudit({ ...auditContext, actorId: user.id, action: 'cabinet.auto_assign', entityType: 'sales_assignment_batch', entityId: crypto.randomUUID(), metadata: { cabinet_count: cabinets.rows.length, distribution, filters: input } }, db)
    return { updated: cabinets.rows.length, distribution }
  })
}

async function getNextCabinet(user) {
  if (isSuperAdmin(user)) throw httpError(422, 'next_cabinet_reserved_for_prospectors')
  const terminal = Array.from(TERMINAL_STATUSES)
  const result = await pool.query(
    `${CABINET_SELECT}
     WHERE c.assigned_to=$1
       AND c.commercial_status <> ALL($2::varchar[])
       AND c.do_not_contact=FALSE AND c.is_client=FALSE
       AND (c.next_followup_at IS NULL OR c.next_followup_at <= NOW())
       AND (l.locked_by IS NULL OR l.locked_by=$1)
     ORDER BY c.size_score ASC, c.priority='urgente' DESC, c.updated_at ASC, c.id ASC LIMIT 1`,
    [user.id, terminal]
  )
  return result.rows[0] || null
}

async function startCall(user, cabinetId, auditContext = {}) {
  return withTransaction(async (db) => {
    const cabinet = await assertCabinetAccess(db, cabinetId, user, { forUpdate: true })
    if (cabinet.do_not_contact || cabinet.commercial_status === 'ne_plus_contacter') throw httpError(409, 'cabinet_do_not_contact')
    if (cabinet.is_client || ['signe', 'client_actif', 'cabinet_ferme'].includes(cabinet.commercial_status)) throw httpError(409, 'cabinet_not_callable')
    if (cabinet.locked_by && Number(cabinet.locked_by) !== Number(user.id) && new Date(cabinet.locked_until) > new Date()) {
      throw httpError(409, 'cabinet_locked_by_other', { locked_by_username: cabinet.locked_by_username, locked_until: cabinet.locked_until })
    }
    const token = crypto.randomUUID()
    const lock = await db.query(
      `INSERT INTO sales_cabinet_locks (cabinet_id, locked_by, locked_until, lock_token)
       VALUES ($1,$2,NOW()+INTERVAL '15 minutes',$3)
       ON CONFLICT (cabinet_id) DO UPDATE SET
         locked_by=EXCLUDED.locked_by, locked_at=NOW(), locked_until=EXCLUDED.locked_until, lock_token=EXCLUDED.lock_token
       WHERE sales_cabinet_locks.locked_until <= NOW() OR sales_cabinet_locks.locked_by=$2
       RETURNING *`,
      [cabinetId, user.id, token]
    )
    if (!lock.rows[0]) throw httpError(409, 'cabinet_lock_conflict')
    const activeCall = await db.query(`SELECT * FROM sales_calls WHERE cabinet_id=$1 AND commercial_id=$2 AND ended_at IS NULL ORDER BY id DESC LIMIT 1 FOR UPDATE`, [cabinetId, user.id])
    const call = activeCall.rows[0]
      ? await db.query(`UPDATE sales_calls SET lock_token=$1 WHERE id=$2 RETURNING *`, [token, activeCall.rows[0].id])
      : await db.query(`INSERT INTO sales_calls (cabinet_id, commercial_id, lock_token) VALUES ($1,$2,$3) RETURNING *`, [cabinetId, user.id, token])
    await db.query(`UPDATE sales_cabinets SET commercial_status='appel_en_cours', last_action_at=NOW(), updated_by=$1, updated_at=NOW() WHERE id=$2`, [user.id, cabinetId])
    if (!activeCall.rows[0]) await db.query(`INSERT INTO sales_status_history (cabinet_id, changed_by, old_status, new_status, justification) VALUES ($1,$2,$3,'appel_en_cours','Appel démarré')`, [cabinetId, user.id, cabinet.commercial_status])
    await appendSalesAudit({ ...auditContext, actorId: user.id, action: activeCall.rows[0] ? 'call.resume' : 'call.start', entityType: 'sales_call', entityId: call.rows[0].id, cabinetId, metadata: { previous_status: cabinet.commercial_status } }, db)
    return { call: call.rows[0], lock: lock.rows[0] }
  })
}

async function completeCall(user, callId, input, auditContext = {}) {
  const validation = validateCallResult(input)
  if (!validation.valid) throw httpError(422, 'call_result_validation_failed', validation.errors)
  return withTransaction(async (db) => {
    const callResult = await db.query(`SELECT * FROM sales_calls WHERE id=$1 FOR UPDATE`, [callId])
    const call = callResult.rows[0]
    if (!call) throw httpError(404, 'call_not_found')
    if (call.ended_at) throw httpError(409, 'call_already_completed')
    if (!isSuperAdmin(user) && Number(call.commercial_id) !== Number(user.id)) throw httpError(403, 'call_owned_by_other')
    const cabinet = await assertCabinetAccess(db, call.cabinet_id, user, { forUpdate: true })
    const activeLock = await db.query(`SELECT cabinet_id FROM sales_cabinet_locks WHERE cabinet_id=$1 AND locked_by=$2 AND lock_token=$3 AND locked_until>NOW() FOR UPDATE`, [call.cabinet_id, call.commercial_id, call.lock_token])
    if (!activeLock.rows[0]) throw httpError(409, 'call_lock_expired')
    const status = statusAfterCall({ ...input, reached: validation.reached })
    const fields = [
      validation.reached,
      input.outcome,
      cleanText(input.contacted_person_name, 255),
      cleanText(input.contacted_person_role, 160),
      cleanText(input.direct_phone, 40),
      cleanText(input.direct_email, 255)?.toLowerCase() || null,
      input.interest_level || null,
      cleanText(input.identified_need, 3000),
      cleanText(input.comment, 3000),
      input.next_step || null,
      input.callback_decision || null,
      input.callback_at || null,
      cleanText(input.suggested_time, 80),
      cleanText(input.alternate_contact, 255),
      cleanText(input.alternate_phone, 40),
      cleanText(input.alternate_email, 255)?.toLowerCase() || null,
      callId,
    ]
    const updated = await db.query(
      `UPDATE sales_calls SET ended_at=NOW(), reached=$1, outcome=$2, contacted_person_name=$3,
       contacted_person_role=$4, direct_phone=$5, direct_email=$6, interest_level=$7,
       identified_need=$8, comment=$9, next_step=$10, callback_decision=$11, callback_at=$12,
       suggested_time=$13, alternate_contact=$14, alternate_phone=$15, alternate_email=$16
       WHERE id=$17 RETURNING *`,
      fields
    )
    const contactUpdates = []
    const contactValues = []
    const setContact = (column, value) => { if (value) { contactValues.push(value); contactUpdates.push(`${column}=$${contactValues.length}`) } }
    setContact('primary_contact_name', input.contacted_person_name)
    setContact('primary_contact_role', input.contacted_person_role)
    setContact('phone', input.direct_phone)
    setContact('professional_email', input.direct_email?.toLowerCase())
    contactValues.push(status, input.interest_level || null, input.next_step || null, input.callback_at || null, user.id, call.cabinet_id)
    await db.query(
      `UPDATE sales_cabinets SET ${contactUpdates.length ? `${contactUpdates.join(',')},` : ''}
       commercial_status=$${contactValues.length - 5}, interest_level=COALESCE($${contactValues.length - 4}, interest_level),
       next_action=$${contactValues.length - 3}, next_followup_at=$${contactValues.length - 2},
       last_action_at=NOW(), updated_by=$${contactValues.length - 1}, updated_at=NOW()
       WHERE id=$${contactValues.length}`,
      contactValues
    )
    await db.query(`INSERT INTO sales_status_history (cabinet_id, changed_by, old_status, new_status, justification) VALUES ($1,$2,$3,$4,$5)`, [call.cabinet_id, user.id, cabinet.commercial_status, status, cleanText(input.comment, 2000)])
    if (input.callback_decision === 'oui' && input.callback_at) {
      await db.query(`INSERT INTO sales_followups (cabinet_id, assigned_to, created_by, due_at, type, instructions) VALUES ($1,$2,$3,$4,'rappel',$5)`, [call.cabinet_id, cabinet.assigned_to || user.id, user.id, input.callback_at, cleanText(input.comment, 3000)])
    }
    await db.query(`DELETE FROM sales_cabinet_locks WHERE cabinet_id=$1 AND (locked_by=$2 OR $3::boolean=TRUE)`, [call.cabinet_id, user.id, isSuperAdmin(user)])
    await appendSalesAudit({ ...auditContext, actorId: user.id, action: 'call.complete', entityType: 'sales_call', entityId: callId, cabinetId: call.cabinet_id, metadata: { outcome: input.outcome, reached: validation.reached, new_status: status, callback_at: input.callback_at || null } }, db)
    return { call: updated.rows[0], cabinet_status: status }
  })
}

async function releaseLock(user, cabinetId, auditContext = {}) {
  return withTransaction(async (db) => {
    const result = await db.query(`DELETE FROM sales_cabinet_locks WHERE cabinet_id=$1 AND (locked_by=$2 OR $3::boolean=TRUE) RETURNING *`, [cabinetId, user.id, isSuperAdmin(user)])
    if (result.rows[0]) {
      const abandoned = await db.query(
        `UPDATE sales_calls SET ended_at=NOW(),reached=FALSE,outcome='annule',comment='Appel annulé avant qualification'
         WHERE cabinet_id=$1 AND lock_token=$2 AND ended_at IS NULL RETURNING commercial_id`,
        [cabinetId, result.rows[0].lock_token]
      )
      if (abandoned.rows[0]) {
        const cabinet = await db.query(`UPDATE sales_cabinets SET commercial_status='a_contacter',next_action='rappeler',last_action_at=NOW(),updated_by=$1,updated_at=NOW() WHERE id=$2 AND commercial_status='appel_en_cours' RETURNING commercial_status`, [user.id, cabinetId])
        if (cabinet.rows[0]) await db.query(`INSERT INTO sales_status_history (cabinet_id,changed_by,old_status,new_status,justification) VALUES ($1,$2,'appel_en_cours','a_contacter','Appel annulé avant qualification')`, [cabinetId, user.id])
      }
      await appendSalesAudit({ ...auditContext, actorId: user.id, action: 'cabinet.unlock', entityType: 'sales_cabinet_lock', entityId: cabinetId, cabinetId, metadata: { abandoned_call_closed: Boolean(abandoned.rows[0]) } }, db)
    }
    return { released: Boolean(result.rows[0]) }
  })
}

async function addNote(user, cabinetId, input, auditContext = {}) {
  const body = cleanText(input.body, 8000)
  if (!body) throw httpError(422, 'note_body_required')
  return withTransaction(async (db) => {
    await assertCabinetAccess(db, cabinetId, user)
    if (input.supersedes_note_id) {
      const previous = await db.query(`SELECT id, author_id FROM sales_cabinet_notes WHERE id=$1 AND cabinet_id=$2`, [input.supersedes_note_id, cabinetId])
      if (!previous.rows[0]) throw httpError(404, 'note_to_supersede_not_found')
      if (!isSuperAdmin(user) && Number(previous.rows[0].author_id) !== Number(user.id)) throw httpError(403, 'cannot_supersede_other_note')
    }
    const result = await db.query(`INSERT INTO sales_cabinet_notes (cabinet_id, author_id, body, supersedes_note_id) VALUES ($1,$2,$3,$4) RETURNING *`, [cabinetId, user.id, body, input.supersedes_note_id || null])
    await db.query(`UPDATE sales_cabinets SET last_action_at=NOW(), updated_by=$1, updated_at=NOW() WHERE id=$2`, [user.id, cabinetId])
    await appendSalesAudit({ ...auditContext, actorId: user.id, action: input.supersedes_note_id ? 'note.revise' : 'note.create', entityType: 'sales_cabinet_note', entityId: result.rows[0].id, cabinetId, metadata: { supersedes_note_id: input.supersedes_note_id || null } }, db)
    return result.rows[0]
  })
}

async function createFollowup(user, cabinetId, input, auditContext = {}) {
  if (!input.due_at) throw httpError(422, 'followup_due_at_required')
  return withTransaction(async (db) => {
    const cabinet = await assertCabinetAccess(db, cabinetId, user, { forUpdate: true })
    const assignee = isSuperAdmin(user) && input.assigned_to ? Number(input.assigned_to) : Number(cabinet.assigned_to || user.id)
    const result = await db.query(`INSERT INTO sales_followups (cabinet_id, assigned_to, created_by, due_at, type, instructions) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`, [cabinetId, assignee, user.id, input.due_at, cleanText(input.type, 40) || 'rappel', cleanText(input.instructions, 3000)])
    await db.query(`UPDATE sales_cabinets SET commercial_status='a_rappeler', next_followup_at=$1, next_action='rappeler', last_action_at=NOW(), updated_by=$2, updated_at=NOW() WHERE id=$3`, [input.due_at, user.id, cabinetId])
    await db.query(`INSERT INTO sales_status_history (cabinet_id, changed_by, old_status, new_status, justification) VALUES ($1,$2,$3,'a_rappeler',$4)`, [cabinetId, user.id, cabinet.commercial_status, cleanText(input.instructions, 2000)])
    await appendSalesAudit({ ...auditContext, actorId: user.id, action: 'followup.create', entityType: 'sales_followup', entityId: result.rows[0].id, cabinetId, metadata: { due_at: input.due_at, assigned_to: assignee } }, db)
    return result.rows[0]
  })
}

async function createAppointment(user, cabinetId, input, auditContext = {}) {
  const required = ['starts_at', 'attendee_name', 'format']
  const missing = required.filter((field) => !input[field])
  if (missing.length) throw httpError(422, 'appointment_validation_failed', missing)
  if (!['telephone', 'visioconference', 'presentiel'].includes(input.format)) throw httpError(422, 'appointment_format_invalid')
  const eventType = input.event_type === 'demonstration' ? 'demonstration' : 'rendez_vous'
  return withTransaction(async (db) => {
    const cabinet = await assertCabinetAccess(db, cabinetId, user, { forUpdate: true })
    const ownerId = isSuperAdmin(user) && input.owner_id ? Number(input.owner_id) : Number(cabinet.assigned_to || user.id)
    const result = await db.query(
      `INSERT INTO sales_appointments
       (cabinet_id, owner_id, created_by, event_type, starts_at, duration_minutes, attendee_name, format, phone, meeting_url, address, preparation_notes, reminder_minutes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [cabinetId, ownerId, user.id, eventType, input.starts_at, Math.min(480, Math.max(10, Number(input.duration_minutes) || 30)), cleanText(input.attendee_name, 255), input.format, cleanText(input.phone, 40), cleanText(input.meeting_url, 1000), cleanText(input.address, 1000), cleanText(input.preparation_notes, 4000), Math.min(10080, Math.max(0, Number(input.reminder_minutes) || 60))]
    )
    const status = eventType === 'demonstration' ? 'demo_programmee' : 'rdv_programme'
    const prepDue = new Date(Math.max(Date.now(), new Date(input.starts_at).getTime() - 24 * 60 * 60 * 1000)).toISOString()
    await db.query(`INSERT INTO sales_followups (cabinet_id, assigned_to, created_by, due_at, type, instructions) VALUES ($1,$2,$3,$4,'preparation',$5)`, [cabinetId, ownerId, user.id, prepDue, cleanText(input.preparation_notes, 3000) || `Préparer ${eventType === 'demonstration' ? 'la démonstration' : 'le rendez-vous'}`])
    await db.query(`UPDATE sales_cabinets SET commercial_status=$1, next_action=$2, next_followup_at=NULL, last_action_at=NOW(), updated_by=$3, updated_at=NOW() WHERE id=$4`, [status, eventType, user.id, cabinetId])
    await db.query(`INSERT INTO sales_status_history (cabinet_id, changed_by, old_status, new_status, justification) VALUES ($1,$2,$3,$4,$5)`, [cabinetId, user.id, cabinet.commercial_status, status, `${eventType} programmé`])
    await appendSalesAudit({ ...auditContext, actorId: user.id, action: 'appointment.create', entityType: 'sales_appointment', entityId: result.rows[0].id, cabinetId, metadata: { event_type: eventType, starts_at: input.starts_at, owner_id: ownerId } }, db)
    return result.rows[0]
  })
}

async function updateAppointment(user, appointmentId, input, auditContext = {}) {
  return withTransaction(async (db) => {
    const found = await db.query(`SELECT * FROM sales_appointments WHERE id=$1 FOR UPDATE`, [appointmentId])
    const appointment = found.rows[0]
    if (!appointment) throw httpError(404, 'appointment_not_found')
    await assertCabinetAccess(db, appointment.cabinet_id, user)
    if (!isSuperAdmin(user) && Number(appointment.owner_id) !== Number(user.id)) throw httpError(403, 'appointment_owned_by_other')
    const status = input.status || appointment.status
    if (!['planifie','confirme','reporte','annule','realise','absence_prospect','a_reprogrammer'].includes(status)) throw httpError(422, 'appointment_status_invalid')
    if (appointment.event_type === 'demonstration' && status === 'realise') {
      const demoRequired = ['demo_held', 'prospect_interested', 'proposal_required', 'callback_required', 'next_action']
      const missing = demoRequired.filter((field) => input[field] === undefined || input[field] === null || input[field] === '')
      if (missing.length) throw httpError(422, 'demo_report_required', missing)
    }
    const result = await db.query(
      `UPDATE sales_appointments SET status=$1::varchar, starts_at=COALESCE($2::timestamptz,starts_at), preparation_notes=COALESCE($3::text,preparation_notes),
       demo_held=COALESCE($4,demo_held), prospect_interested=COALESCE($5,prospect_interested), proposal_required=COALESCE($6,proposal_required),
       callback_required=COALESCE($7,callback_required), next_action=COALESCE($8,next_action), potential_amount_eur=COALESCE($9,potential_amount_eur),
       signature_probability=COALESCE($10::integer,signature_probability), completed_report_at=CASE WHEN $1::varchar='realise' THEN NOW() ELSE completed_report_at END,
       updated_at=NOW() WHERE id=$11 RETURNING *`,
      [status, input.starts_at || null, cleanText(input.preparation_notes, 4000), input.demo_held ?? null, input.prospect_interested ?? null, input.proposal_required ?? null, input.callback_required ?? null, cleanText(input.next_action, 3000), input.potential_amount_eur ?? null, input.signature_probability ?? null, appointmentId]
    )
    let cabinetStatus = null
    if (status === 'realise' && appointment.event_type === 'demonstration') cabinetStatus = input.proposal_required ? 'proposition_a_envoyer' : 'demo_realisee'
    else if (status === 'annule') cabinetStatus = 'a_rappeler'
    else if (status === 'a_reprogrammer') cabinetStatus = 'rdv_a_programmer'
    if (cabinetStatus) await db.query(`UPDATE sales_cabinets SET commercial_status=$1, next_action=$2, last_action_at=NOW(), updated_by=$3, updated_at=NOW() WHERE id=$4`, [cabinetStatus, cleanText(input.next_action, 120), user.id, appointment.cabinet_id])
    await appendSalesAudit({ ...auditContext, actorId: user.id, action: 'appointment.update', entityType: 'sales_appointment', entityId: appointmentId, cabinetId: appointment.cabinet_id, metadata: { old_status: appointment.status, new_status: status, cabinet_status: cabinetStatus } }, db)
    return result.rows[0]
  })
}

async function createProposal(user, cabinetId, input, auditContext = {}) {
  const status = ['brouillon','a_envoyer','envoyee','negociation','signee','refusee'].includes(input.status) ? input.status : 'brouillon'
  return withTransaction(async (db) => {
    const cabinet = await assertCabinetAccess(db, cabinetId, user, { forUpdate: true })
    const ownerId = isSuperAdmin(user) && input.owner_id ? Number(input.owner_id) : Number(cabinet.assigned_to || user.id)
    const proposal = await db.query(
      `INSERT INTO sales_proposals (cabinet_id,owner_id,created_by,amount_eur,status,subject,notes,document_url,sent_at,signed_at)
       VALUES ($1,$2,$3,$4,$5::varchar,$6,$7,$8,CASE WHEN $5::varchar IN ('envoyee','negociation','signee') THEN NOW() ELSE NULL END,CASE WHEN $5::varchar='signee' THEN NOW() ELSE NULL END)
       RETURNING *`,
      [cabinetId, ownerId, user.id, input.amount_eur ?? null, status, cleanText(input.subject, 255), cleanText(input.notes, 4000), cleanText(input.document_url, 1000)]
    )
    const cabinetStatus = status === 'signee' ? 'signe' : status === 'negociation' ? 'negociation' : status === 'envoyee' ? 'proposition_envoyee' : 'proposition_a_envoyer'
    await db.query(`UPDATE sales_cabinets SET commercial_status=$1::varchar,is_client=CASE WHEN $1::varchar='signe' THEN TRUE ELSE is_client END,next_action=$2,last_action_at=NOW(),updated_by=$3,updated_at=NOW() WHERE id=$4`, [cabinetStatus, status, user.id, cabinetId])
    await db.query(`INSERT INTO sales_status_history (cabinet_id,changed_by,old_status,new_status,justification) VALUES ($1,$2,$3,$4,$5)`, [cabinetId, user.id, cabinet.commercial_status, cabinetStatus, `Proposition ${status}`])
    await appendSalesAudit({ ...auditContext, actorId: user.id, action: 'proposal.create', entityType: 'sales_proposal', entityId: proposal.rows[0].id, cabinetId, metadata: { status, amount_eur: input.amount_eur ?? null } }, db)
    return proposal.rows[0]
  })
}

async function updateProposal(user, proposalId, input, auditContext = {}) {
  if (!['brouillon','a_envoyer','envoyee','negociation','signee','refusee'].includes(input.status)) throw httpError(422, 'proposal_status_invalid')
  return withTransaction(async (db) => {
    const found = await db.query(`SELECT * FROM sales_proposals WHERE id=$1 FOR UPDATE`, [proposalId])
    const proposal = found.rows[0]
    if (!proposal) throw httpError(404, 'proposal_not_found')
    await assertCabinetAccess(db, proposal.cabinet_id, user)
    if (!isSuperAdmin(user) && Number(proposal.owner_id) !== Number(user.id)) throw httpError(403, 'proposal_owned_by_other')
    const result = await db.query(
      `UPDATE sales_proposals SET status=$1::varchar,amount_eur=COALESCE($2::numeric,amount_eur),subject=COALESCE($3::varchar,subject),notes=COALESCE($4::text,notes),document_url=COALESCE($5::text,document_url),sent_at=CASE WHEN $1::varchar IN ('envoyee','negociation','signee') THEN COALESCE(sent_at,NOW()) ELSE sent_at END,signed_at=CASE WHEN $1::varchar='signee' THEN COALESCE(signed_at,NOW()) ELSE signed_at END,updated_at=NOW() WHERE id=$6 RETURNING *`,
      [input.status, input.amount_eur ?? null, cleanText(input.subject, 255), cleanText(input.notes, 4000), cleanText(input.document_url, 1000), proposalId]
    )
    const cabinetStatus = input.status === 'signee' ? 'signe' : input.status === 'negociation' ? 'negociation' : input.status === 'envoyee' ? 'proposition_envoyee' : input.status === 'refusee' ? 'refuse' : 'proposition_a_envoyer'
    await db.query(`UPDATE sales_cabinets SET commercial_status=$1::varchar,is_client=CASE WHEN $1::varchar='signe' THEN TRUE ELSE is_client END,last_action_at=NOW(),updated_by=$2,updated_at=NOW() WHERE id=$3`, [cabinetStatus, user.id, proposal.cabinet_id])
    await appendSalesAudit({ ...auditContext, actorId: user.id, action: 'proposal.update', entityType: 'sales_proposal', entityId: proposalId, cabinetId: proposal.cabinet_id, metadata: { old_status: proposal.status, new_status: input.status, amount_eur: input.amount_eur ?? proposal.amount_eur } }, db)
    return result.rows[0]
  })
}

async function listCalendar(user, query = {}) {
  const params = []
  const conditions = []
  if (!isSuperAdmin(user)) { params.push(user.id); conditions.push(`sa.owner_id=$${params.length}`) }
  if (query.from) { params.push(query.from); conditions.push(`sa.starts_at >= $${params.length}`) }
  if (query.to) { params.push(query.to); conditions.push(`sa.starts_at <= $${params.length}`) }
  if (query.status) { params.push(query.status); conditions.push(`sa.status=$${params.length}`) }
  if (query.event_type) { params.push(query.event_type); conditions.push(`sa.event_type=$${params.length}`) }
  const result = await pool.query(
    `SELECT sa.*, c.legal_name AS cabinet_name, c.city, u.username AS owner_username
     FROM sales_appointments sa JOIN sales_cabinets c ON c.id=sa.cabinet_id JOIN users u ON u.id=sa.owner_id
     ${conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''}
     ORDER BY sa.starts_at ASC LIMIT 1000`,
    params
  )
  const followups = await pool.query(
    `SELECT sf.*, c.legal_name AS cabinet_name, u.username AS assigned_username
     FROM sales_followups sf JOIN sales_cabinets c ON c.id=sf.cabinet_id JOIN users u ON u.id=sf.assigned_to
     ${!isSuperAdmin(user) ? 'WHERE sf.assigned_to=$1' : ''}
     ORDER BY sf.due_at ASC LIMIT 1000`,
    !isSuperAdmin(user) ? [user.id] : []
  )
  return { appointments: result.rows, followups: followups.rows }
}

async function getDashboard(user) {
  const scopeSql = isSuperAdmin(user) ? 'TRUE' : 'c.assigned_to=$1'
  const params = isSuperAdmin(user) ? [] : [user.id]
  const metrics = await pool.query(
    `SELECT
      COUNT(*)::int AS total_cabinets,
      COUNT(*) FILTER (WHERE c.assigned_to IS NULL)::int AS unassigned,
      COUNT(*) FILTER (WHERE au.username='tarek')::int AS assigned_tarek,
      COUNT(*) FILTER (WHERE au.username='ahmed')::int AS assigned_ahmed,
      COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM sales_calls sc WHERE sc.cabinet_id=c.id))::int AS already_called,
      COUNT(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM sales_calls sc WHERE sc.cabinet_id=c.id) AND c.commercial_status <> ALL($${params.length + 1}::varchar[]))::int AS remaining_to_call,
      COUNT(*) FILTER (WHERE c.commercial_status='a_rappeler')::int AS callbacks_scheduled,
      COUNT(*) FILTER (WHERE c.commercial_status='rdv_programme')::int AS appointments_scheduled,
      COUNT(*) FILTER (WHERE c.commercial_status='demo_programmee')::int AS demos_scheduled,
      COUNT(*) FILTER (WHERE c.commercial_status='demo_realisee')::int AS demos_completed,
      COUNT(*) FILTER (WHERE c.commercial_status='proposition_envoyee')::int AS proposals_sent,
      COUNT(*) FILTER (WHERE c.commercial_status IN ('signe','client_actif'))::int AS signatures,
      COUNT(*) FILTER (WHERE c.next_followup_at < NOW() AND c.commercial_status='a_rappeler')::int AS overdue_followups,
      COUNT(*) FILTER (WHERE c.last_action_at < NOW()-INTERVAL '30 days' OR c.last_action_at IS NULL)::int AS stale_cabinets
     FROM sales_cabinets c LEFT JOIN users au ON au.id=c.assigned_to WHERE ${scopeSql}`,
    [...params, Array.from(TERMINAL_STATUSES)]
  )
  const calls = await pool.query(
    `SELECT
      COUNT(*) FILTER (WHERE sc.started_at::date=CURRENT_DATE)::int AS calls_today,
      COUNT(*) FILTER (WHERE sc.started_at>=date_trunc('week',NOW()))::int AS calls_week,
      COUNT(*) FILTER (WHERE sc.started_at>=date_trunc('month',NOW()))::int AS calls_month,
      COUNT(*) FILTER (WHERE sc.reached=TRUE)::int AS reached_calls,
      COUNT(*) FILTER (WHERE sc.outcome='pas_de_reponse')::int AS no_answer_calls,
      COUNT(*)::int AS total_calls
     FROM sales_calls sc JOIN sales_cabinets c ON c.id=sc.cabinet_id WHERE ${scopeSql}`,
    params
  )
  const perUser = await pool.query(
    `SELECT u.id, u.username, u.first_name, u.last_name,
      (SELECT COUNT(*)::int FROM sales_calls sc WHERE sc.commercial_id=u.id AND sc.started_at>=date_trunc('month',NOW())) AS calls,
      (SELECT COUNT(*)::int FROM sales_calls sc WHERE sc.commercial_id=u.id AND sc.started_at>=date_trunc('month',NOW()) AND sc.reached=TRUE) AS reached,
      (SELECT COUNT(*)::int FROM sales_appointments sa WHERE sa.owner_id=u.id AND sa.event_type='rendez_vous') AS appointments,
      (SELECT COUNT(*)::int FROM sales_appointments sa WHERE sa.owner_id=u.id AND sa.event_type='demonstration') AS demonstrations,
      (SELECT COUNT(*)::int FROM sales_cabinets c WHERE c.assigned_to=u.id AND c.commercial_status IN ('signe','client_actif')) AS signatures
     FROM users u WHERE u.role='prospecteur' AND u.deleted_at IS NULL ORDER BY calls DESC, u.username`,
    []
  )
  const hot = await pool.query(
    `SELECT c.id,c.legal_name,c.city,c.interest_level,c.commercial_status,c.next_action,c.next_followup_at,u.username AS assigned_username
     FROM sales_cabinets c LEFT JOIN users u ON u.id=c.assigned_to
     WHERE ${scopeSql} AND (c.interest_level IN ('fort','tres_fort') OR c.commercial_status IN ('interesse','negociation','proposition_envoyee'))
     ORDER BY CASE c.interest_level WHEN 'tres_fort' THEN 1 WHEN 'fort' THEN 2 ELSE 3 END, c.updated_at DESC LIMIT 12`,
    params
  )
  const activity = await pool.query(
    `SELECT sal.id,sal.action,sal.entity_type,sal.entity_id,sal.cabinet_id,sal.metadata,sal.created_at,u.username,c.legal_name AS cabinet_name
     FROM sales_audit_log sal LEFT JOIN users u ON u.id=sal.actor_id LEFT JOIN sales_cabinets c ON c.id=sal.cabinet_id
     ${isSuperAdmin(user) ? '' : 'WHERE sal.actor_id=$1'} ORDER BY sal.id DESC LIMIT 30`,
    params
  )
  const m = metrics.rows[0] || {}
  const c = calls.rows[0] || {}
  const percentage = (numerator, denominator) => denominator ? Math.round((Number(numerator) / Number(denominator)) * 1000) / 10 : 0
  return {
    ...m,
    ...c,
    contact_rate: percentage(c.reached_calls, c.total_calls),
    appointment_rate: percentage(m.appointments_scheduled, c.reached_calls),
    demo_rate: percentage(m.demos_completed, m.demos_scheduled),
    conversion_rate: percentage(m.signatures, m.total_cabinets),
    leaderboard: perUser.rows,
    hot_prospects: hot.rows,
    recent_activity: activity.rows,
  }
}

module.exports = {
  httpError,
  isSuperAdmin,
  listCabinets,
  searchCabinetConflicts,
  getCabinetDetail,
  createCabinet,
  updateCabinet,
  changeCabinetStatus,
  assignCabinets,
  autoAssignCabinets,
  getNextCabinet,
  startCall,
  completeCall,
  releaseLock,
  addNote,
  createFollowup,
  createAppointment,
  updateAppointment,
  createProposal,
  updateProposal,
  listCalendar,
  getDashboard,
  withTransaction,
}
