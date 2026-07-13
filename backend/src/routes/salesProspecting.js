const express = require('express')
const multer = require('multer')
const pool = require('../db')
const { requireSalesAccess, requireSalesSuperAdmin } = require('../middleware/salesAccess')
const {
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
} = require('../services/salesProspectingService')
const { previewImport, commitImport, rollbackImport, listImports } = require('../services/salesImportService')
const { inviteSalesUser, listSalesUsers, setSalesUserStatus } = require('../services/salesUserService')
const { appendSalesAudit, hashEntry, requestAuditContext } = require('../services/salesAuditService')

const router = express.Router()
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!/\.(csv|xlsx|xls)$/i.test(file.originalname || '')) {
      const error = new Error('import_file_type_invalid')
      error.status = 422
      return callback(error)
    }
    callback(null, true)
  },
})

router.use(requireSalesAccess)

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next)
}

router.get('/me', (req, res) => {
  const user = req.salesUser
  res.json({
    id: user.id,
    email: user.email,
    username: user.username,
    first_name: user.first_name,
    last_name: user.last_name,
    role: user.role,
    must_change_password: user.must_change_password,
  })
})

router.get('/dashboard', asyncRoute(async (req, res) => {
  res.json(await getDashboard(req.salesUser))
}))

router.get('/cabinets/search', asyncRoute(async (req, res) => {
  const cabinets = await searchCabinetConflicts(req.salesUser, req.query.q)
  res.json({ cabinets })
}))

router.get('/cabinets/next', asyncRoute(async (req, res) => {
  res.json({ cabinet: await getNextCabinet(req.salesUser) })
}))

router.get('/cabinets', asyncRoute(async (req, res) => {
  res.json(await listCabinets(req.salesUser, req.query))
}))

router.post('/cabinets', requireSalesSuperAdmin, asyncRoute(async (req, res) => {
  const cabinet = await createCabinet(req.salesUser, req.body, requestAuditContext(req))
  res.status(201).json({ cabinet })
}))

router.get('/cabinets/:id', asyncRoute(async (req, res) => {
  const detail = await getCabinetDetail(req.salesUser, Number(req.params.id))
  await appendSalesAudit({ ...requestAuditContext(req), action: 'cabinet.view', entityType: 'sales_cabinet', entityId: req.params.id, cabinetId: Number(req.params.id), metadata: {} }).catch(() => {})
  res.json(detail)
}))

router.put('/cabinets/:id', asyncRoute(async (req, res) => {
  const cabinet = await updateCabinet(req.salesUser, Number(req.params.id), req.body, requestAuditContext(req))
  res.json({ cabinet })
}))

router.patch('/cabinets/:id/status', asyncRoute(async (req, res) => {
  res.json(await changeCabinetStatus(req.salesUser, Number(req.params.id), req.body.status, req.body.justification, requestAuditContext(req)))
}))

router.post('/cabinets/assign', requireSalesSuperAdmin, asyncRoute(async (req, res) => {
  res.json(await assignCabinets(req.salesUser, req.body.cabinet_ids, req.body.to_user_id ?? null, {
    method: req.body.method || 'manual',
    criteria: req.body.criteria || {},
    justification: req.body.justification,
  }, requestAuditContext(req)))
}))

router.post('/cabinets/auto-assign', requireSalesSuperAdmin, asyncRoute(async (req, res) => {
  res.json(await autoAssignCabinets(req.salesUser, req.body, requestAuditContext(req)))
}))

router.post('/cabinets/:id/calls/start', asyncRoute(async (req, res) => {
  res.status(201).json(await startCall(req.salesUser, Number(req.params.id), requestAuditContext(req)))
}))

router.post('/calls/:id/complete', asyncRoute(async (req, res) => {
  res.json(await completeCall(req.salesUser, Number(req.params.id), req.body, requestAuditContext(req)))
}))

router.delete('/cabinets/:id/lock', asyncRoute(async (req, res) => {
  res.json(await releaseLock(req.salesUser, Number(req.params.id), requestAuditContext(req)))
}))

router.post('/cabinets/:id/notes', asyncRoute(async (req, res) => {
  res.status(201).json({ note: await addNote(req.salesUser, Number(req.params.id), req.body, requestAuditContext(req)) })
}))

router.post('/cabinets/:id/followups', asyncRoute(async (req, res) => {
  res.status(201).json({ followup: await createFollowup(req.salesUser, Number(req.params.id), req.body, requestAuditContext(req)) })
}))

router.post('/cabinets/:id/appointments', asyncRoute(async (req, res) => {
  res.status(201).json({ appointment: await createAppointment(req.salesUser, Number(req.params.id), req.body, requestAuditContext(req)) })
}))

router.patch('/appointments/:id', asyncRoute(async (req, res) => {
  res.json({ appointment: await updateAppointment(req.salesUser, Number(req.params.id), req.body, requestAuditContext(req)) })
}))

router.post('/cabinets/:id/proposals', asyncRoute(async (req, res) => {
  res.status(201).json({ proposal: await createProposal(req.salesUser, Number(req.params.id), req.body, requestAuditContext(req)) })
}))

router.patch('/proposals/:id', asyncRoute(async (req, res) => {
  res.json({ proposal: await updateProposal(req.salesUser, Number(req.params.id), req.body, requestAuditContext(req)) })
}))

router.get('/calendar', asyncRoute(async (req, res) => {
  res.json(await listCalendar(req.salesUser, req.query))
}))

router.get('/users', requireSalesSuperAdmin, asyncRoute(async (_req, res) => {
  res.json({ users: await listSalesUsers() })
}))

router.post('/users/invite', requireSalesSuperAdmin, asyncRoute(async (req, res) => {
  const user = await inviteSalesUser(req.salesUser, req.body, requestAuditContext(req), { allowExisting: false, requireEmail: true })
  res.status(201).json({ user })
}))

router.patch('/users/:id/status', requireSalesSuperAdmin, asyncRoute(async (req, res) => {
  res.json({ user: await setSalesUserStatus(req.salesUser, Number(req.params.id), req.body, requestAuditContext(req)) })
}))

router.post('/imports/preview', requireSalesSuperAdmin, upload.single('file'), asyncRoute(async (req, res) => {
  let mapping
  try { mapping = req.body.mapping ? JSON.parse(req.body.mapping) : undefined } catch { mapping = undefined }
  const result = await previewImport(req.salesUser, req.file, { source: req.body.source, source_label: req.body.source_label, mapping }, requestAuditContext(req))
  res.status(201).json(result)
}))

router.post('/imports/:id/commit', requireSalesSuperAdmin, asyncRoute(async (req, res) => {
  res.json(await commitImport(req.salesUser, Number(req.params.id), req.body, requestAuditContext(req)))
}))

router.post('/imports/:id/rollback', requireSalesSuperAdmin, asyncRoute(async (req, res) => {
  res.json(await rollbackImport(req.salesUser, Number(req.params.id), requestAuditContext(req)))
}))

router.get('/imports', requireSalesSuperAdmin, asyncRoute(async (_req, res) => {
  res.json({ imports: await listImports() })
}))

router.get('/audit', requireSalesSuperAdmin, asyncRoute(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1)
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50))
  const params = []
  const filters = []
  if (req.query.actor_id) { params.push(Number(req.query.actor_id)); filters.push(`sal.actor_id=$${params.length}`) }
  if (req.query.cabinet_id) { params.push(Number(req.query.cabinet_id)); filters.push(`sal.cabinet_id=$${params.length}`) }
  if (req.query.action) { params.push(`%${String(req.query.action).slice(0, 100)}%`); filters.push(`sal.action ILIKE $${params.length}`) }
  if (req.query.from) { params.push(req.query.from); filters.push(`sal.created_at >= $${params.length}`) }
  if (req.query.to) { params.push(req.query.to); filters.push(`sal.created_at <= $${params.length}`) }
  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : ''
  const count = await pool.query(`SELECT COUNT(*)::int AS total FROM sales_audit_log sal ${where}`, params)
  const logs = await pool.query(
    `SELECT sal.*,u.username,u.email,c.legal_name AS cabinet_name
     FROM sales_audit_log sal LEFT JOIN users u ON u.id=sal.actor_id LEFT JOIN sales_cabinets c ON c.id=sal.cabinet_id
     ${where} ORDER BY sal.id DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, (page - 1) * limit]
  )
  res.json({ logs: logs.rows, total: count.rows[0]?.total || 0, page, page_size: limit })
}))

router.get('/audit/verify', requireSalesSuperAdmin, asyncRoute(async (_req, res) => {
  const result = await pool.query(`SELECT * FROM sales_audit_log ORDER BY id ASC LIMIT 100000`)
  let previousHash = null
  let brokenAt = null
  for (const row of result.rows) {
    const expected = hashEntry({
      actorId: row.actor_id,
      action: row.action,
      entityType: row.entity_type,
      entityId: row.entity_id,
      cabinetId: row.cabinet_id,
      metadata: row.metadata || {},
      ipAddress: row.ip_address || null,
      previousHash,
      createdAt: new Date(row.created_at).toISOString(),
    })
    if (row.previous_hash !== previousHash || row.entry_hash !== expected) { brokenAt = row.id; break }
    previousHash = row.entry_hash
  }
  res.json({ valid: brokenAt === null, checked: result.rows.length, broken_at: brokenAt })
}))

router.use((error, _req, res, next) => {
  if (res.headersSent) return next(error)
  const status = error.status || (error.code === 'LIMIT_FILE_SIZE' ? 413 : 500)
  if (status >= 500) console.error('Sales prospecting error:', error)
  res.status(status).json({ error: error.code || error.message || 'sales_prospecting_error', details: error.details || null })
})

module.exports = router
