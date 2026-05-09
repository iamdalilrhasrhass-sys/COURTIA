const express = require('express')
const { verifyToken } = require('../middleware/auth')
const {
  normalizeString,
  sanitizeDemoRequestPayload,
  validateDemoRequestPayload,
} = require('../services/demoRequestService')
const { isAdminRole } = require('../constants/roles')

const router = express.Router()

const ALLOWED_EVENT_NAMES = new Set([
  'click_demo_cta',
  'submit_demo_request',
  'click_pricing',
  'open_video',
])

function requireAdmin(req, res, next) {
  const role = String(req.user?.role || '').toLowerCase()
  if (!isAdminRole(role)) {
    return res.status(403).json({ error: 'Admin access required' })
  }
  return next()
}

async function ensureDemoRequestsTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS demo_requests (
      id SERIAL PRIMARY KEY,
      first_name TEXT,
      last_name TEXT,
      company_name TEXT,
      email TEXT NOT NULL,
      phone TEXT,
      city TEXT,
      team_size TEXT,
      current_tools TEXT,
      wants_google_calendar BOOLEAN DEFAULT false,
      wants_whatsapp BOOLEAN DEFAULT false,
      wants_email_sync BOOLEAN DEFAULT false,
      message TEXT,
      consent BOOLEAN DEFAULT false,
      source TEXT DEFAULT 'landing',
      status TEXT DEFAULT 'a_contacter',
      opt_out BOOLEAN DEFAULT false,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `)

  await pool.query('CREATE INDEX IF NOT EXISTS idx_demo_requests_created_at ON demo_requests(created_at DESC);')
  await pool.query('CREATE INDEX IF NOT EXISTS idx_demo_requests_status ON demo_requests(status);')
  await pool.query('CREATE INDEX IF NOT EXISTS idx_demo_requests_email ON demo_requests(email);')
  await pool.query('ALTER TABLE demo_requests ADD COLUMN IF NOT EXISTS current_tools TEXT;')
  await pool.query('ALTER TABLE demo_requests ADD COLUMN IF NOT EXISTS wants_google_calendar BOOLEAN DEFAULT false;')
  await pool.query('ALTER TABLE demo_requests ADD COLUMN IF NOT EXISTS wants_whatsapp BOOLEAN DEFAULT false;')
  await pool.query('ALTER TABLE demo_requests ADD COLUMN IF NOT EXISTS wants_email_sync BOOLEAN DEFAULT false;')
}

async function ensureMarketingEventsTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS marketing_events (
      id SERIAL PRIMARY KEY,
      event_name TEXT NOT NULL,
      source TEXT DEFAULT 'landing',
      page_path TEXT,
      user_agent TEXT,
      payload JSONB,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `)

  await pool.query('CREATE INDEX IF NOT EXISTS idx_marketing_events_name_created ON marketing_events(event_name, created_at DESC);')
}

router.post('/demo-request', async (req, res) => {
  try {
    const pool = req.app.locals.pool
    await ensureDemoRequestsTable(pool)

    const payload = sanitizeDemoRequestPayload(req.body || {})
    const validation = validateDemoRequestPayload(payload)
    if (!validation.valid) {
      return res.status(400).json({
        error: 'demo_request_invalid',
        details: validation.errors,
      })
    }

    const insert = await pool.query(
      `INSERT INTO demo_requests (
         first_name, last_name, company_name, email, phone, city, team_size,
         current_tools, wants_google_calendar, wants_whatsapp, wants_email_sync,
         message, consent, source
       )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING id, first_name, last_name, company_name, email, city, team_size, current_tools,
                 wants_google_calendar, wants_whatsapp, wants_email_sync, status, source, created_at`,
      [
        payload.first_name,
        payload.last_name,
        payload.company_name,
        payload.email,
        payload.phone,
        payload.city,
        payload.team_size,
        payload.current_tools,
        payload.wants_google_calendar,
        payload.wants_whatsapp,
        payload.wants_email_sync,
        payload.message,
        payload.consent,
        payload.source,
      ]
    )

    return res.status(201).json({
      success: true,
      lead: insert.rows[0],
      message: 'Demande de démo reçue. Notre équipe vous recontacte rapidement.',
    })
  } catch (err) {
    console.error('[LEADS] POST /demo-request error:', err.message)
    return res.status(500).json({ error: 'demo_request_failed', details: 'Impossible d\'enregistrer la demande de démo.' })
  }
})

router.post('/events', async (req, res) => {
  try {
    const eventName = normalizeString(req.body?.event_name, 80)
    if (!ALLOWED_EVENT_NAMES.has(eventName)) {
      return res.status(400).json({ error: 'invalid_event', details: 'Événement marketing non autorisé.' })
    }

    const pool = req.app.locals.pool
    await ensureMarketingEventsTable(pool)

    await pool.query(
      `INSERT INTO marketing_events (event_name, source, page_path, user_agent, payload)
       VALUES ($1, $2, $3, $4, $5::jsonb)`,
      [
        eventName,
        normalizeString(req.body?.source || 'landing', 80) || 'landing',
        normalizeString(req.body?.page_path || '', 255) || null,
        normalizeString(req.headers['user-agent'] || '', 500) || null,
        JSON.stringify(req.body?.payload || {}),
      ]
    )

    return res.json({ success: true })
  } catch (err) {
    console.error('[LEADS] POST /events error:', err.message)
    return res.status(500).json({ error: 'event_tracking_failed' })
  }
})

router.get('/demo-requests', verifyToken, requireAdmin, async (req, res) => {
  try {
    const pool = req.app.locals.pool
    await ensureDemoRequestsTable(pool)

    const status = normalizeString(req.query?.status, 40)
    const priority = normalizeString(req.query?.priority, 1)
    const page = Math.max(Number.parseInt(req.query?.page, 10) || 1, 1)
    const limit = Math.min(Math.max(Number.parseInt(req.query?.limit, 10) || 50, 1), 200)
    const offset = (page - 1) * limit

    const where = []
    const params = []

    if (status && status !== 'tous') {
      params.push(status)
      where.push(`status = $${params.length}`)
    }

    if (priority) {
      params.push(priority)
      where.push(`
        CASE
          WHEN team_size ILIKE '%10-20%' OR team_size ILIKE '%11-20%' THEN 'A'
          WHEN team_size ILIKE '%6-10%' OR team_size ILIKE '%3-5%' THEN 'B'
          ELSE 'C'
        END = $${params.length}
      `)
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : ''

    const rows = await pool.query(
      `SELECT id, first_name, last_name, company_name, email, phone, city, team_size,
              current_tools, wants_google_calendar, wants_whatsapp, wants_email_sync,
              message, consent, source, status, opt_out, notes, created_at, updated_at,
              CASE
                WHEN team_size ILIKE '%10-20%' OR team_size ILIKE '%11-20%' THEN 'A'
                WHEN team_size ILIKE '%6-10%' OR team_size ILIKE '%3-5%' THEN 'B'
                ELSE 'C'
              END AS priority
       FROM demo_requests
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${params.length + 1}
       OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    )

    const totalRes = await pool.query(
      `SELECT COUNT(*)::int AS total FROM demo_requests ${whereClause}`,
      params
    )

    return res.json({
      page,
      limit,
      total: totalRes.rows[0]?.total || 0,
      rows: rows.rows,
    })
  } catch (err) {
    console.error('[LEADS] GET /demo-requests error:', err.message)
    return res.status(500).json({ error: 'demo_requests_fetch_failed' })
  }
})

router.patch('/demo-requests/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const pool = req.app.locals.pool
    await ensureDemoRequestsTable(pool)

    const id = Number.parseInt(req.params.id, 10)
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: 'invalid_id' })
    }

    const allowedStatuses = new Set(['a_contacter', 'contacte', 'demo_prevue', 'gagne', 'perdu'])
    const nextStatus = normalizeString(req.body?.status, 40)
    const notes = normalizeString(req.body?.notes, 1200)
    const optOut = req.body?.opt_out

    const updates = []
    const params = []

    if (nextStatus) {
      if (!allowedStatuses.has(nextStatus)) {
        return res.status(400).json({ error: 'invalid_status' })
      }
      params.push(nextStatus)
      updates.push(`status = $${params.length}`)
    }

    if (typeof optOut === 'boolean') {
      params.push(optOut)
      updates.push(`opt_out = $${params.length}`)
    }

    if (notes) {
      params.push(notes)
      updates.push(`notes = $${params.length}`)
    }

    if (!updates.length) {
      return res.status(400).json({ error: 'no_updates' })
    }

    params.push(id)

    const updated = await pool.query(
      `UPDATE demo_requests
       SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $${params.length}
       RETURNING id, first_name, last_name, company_name, email, status, opt_out, notes, updated_at`,
      params
    )

    if (!updated.rowCount) {
      return res.status(404).json({ error: 'demo_request_not_found' })
    }

    return res.json({ success: true, row: updated.rows[0] })
  } catch (err) {
    console.error('[LEADS] PATCH /demo-requests/:id error:', err.message)
    return res.status(500).json({ error: 'demo_request_update_failed' })
  }
})

router.get('/demo-requests/export', verifyToken, requireAdmin, async (req, res) => {
  try {
    const pool = req.app.locals.pool
    await ensureDemoRequestsTable(pool)

    const rows = await pool.query(
      `SELECT id, first_name, last_name, company_name, email, phone, city, team_size,
              current_tools, wants_google_calendar, wants_whatsapp, wants_email_sync,
              status, source, consent, opt_out, created_at, updated_at
       FROM demo_requests
       ORDER BY created_at DESC`
    )

    const header = [
      'id', 'first_name', 'last_name', 'company_name', 'email', 'phone', 'city', 'team_size',
      'current_tools', 'wants_google_calendar', 'wants_whatsapp', 'wants_email_sync',
      'status', 'source', 'consent', 'opt_out', 'created_at', 'updated_at'
    ]

    const csvRows = rows.rows.map((row) => {
      return header.map((key) => {
        const value = row[key] == null ? '' : String(row[key])
        return `"${value.replace(/"/g, '""')}"`
      }).join(',')
    })

    const csv = `${header.join(',')}\n${csvRows.join('\n')}\n`

    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="courtia-demo-requests-${new Date().toISOString().slice(0, 10)}.csv"`)

    return res.send(csv)
  } catch (err) {
    console.error('[LEADS] GET /demo-requests/export error:', err.message)
    return res.status(500).json({ error: 'demo_requests_export_failed' })
  }
})

module.exports = router
