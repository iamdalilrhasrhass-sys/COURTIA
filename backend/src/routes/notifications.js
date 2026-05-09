const express = require('express')
const { verifyToken } = require('../middleware/auth')

const router = express.Router()

function getUserId(req) {
  return req.user?.id || req.user?.userId || null
}

async function ensureNotificationsTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT,
      severity TEXT DEFAULT 'info',
      link TEXT,
      metadata JSONB DEFAULT '{}'::jsonb,
      read_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `)
  await pool.query('CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);')
  await pool.query('CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read_at);')
}

router.get('/', verifyToken, async (req, res) => {
  try {
    const userId = getUserId(req)
    if (!userId) return res.status(401).json({ error: 'auth_required' })
    const pool = req.app.locals.pool
    await ensureNotificationsTable(pool)

    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 50, 1), 200)
    const rows = await pool.query(
      `SELECT id, type, title, body, severity, link, metadata, read_at, created_at
       FROM notifications
       WHERE user_id=$1
       ORDER BY created_at DESC
       LIMIT $2`,
      [userId, limit]
    )

    const unreadRes = await pool.query(
      'SELECT COUNT(*)::int AS unread FROM notifications WHERE user_id=$1 AND read_at IS NULL',
      [userId]
    )

    return res.json({
      success: true,
      unread: unreadRes.rows[0]?.unread || 0,
      rows: rows.rows,
    })
  } catch (err) {
    console.error('[NOTIFICATIONS] GET error:', err.message)
    return res.status(500).json({ error: 'notifications_fetch_failed' })
  }
})

router.post('/:id/read', verifyToken, async (req, res) => {
  try {
    const userId = getUserId(req)
    if (!userId) return res.status(401).json({ error: 'auth_required' })
    const pool = req.app.locals.pool
    await ensureNotificationsTable(pool)

    const id = Number.parseInt(req.params.id, 10)
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: 'invalid_id' })
    }

    const updated = await pool.query(
      `UPDATE notifications
       SET read_at = COALESCE(read_at, NOW())
       WHERE id=$1 AND user_id=$2
       RETURNING id, read_at`,
      [id, userId]
    )
    if (!updated.rowCount) return res.status(404).json({ error: 'notification_not_found' })

    return res.json({ success: true, row: updated.rows[0] })
  } catch (err) {
    console.error('[NOTIFICATIONS] POST /:id/read error:', err.message)
    return res.status(500).json({ error: 'notification_update_failed' })
  }
})

router.post('/read-all', verifyToken, async (req, res) => {
  try {
    const userId = getUserId(req)
    if (!userId) return res.status(401).json({ error: 'auth_required' })
    const pool = req.app.locals.pool
    await ensureNotificationsTable(pool)

    const result = await pool.query(
      `UPDATE notifications
       SET read_at = COALESCE(read_at, NOW())
       WHERE user_id=$1 AND read_at IS NULL`,
      [userId]
    )

    return res.json({ success: true, updated: result.rowCount || 0 })
  } catch (err) {
    console.error('[NOTIFICATIONS] POST /read-all error:', err.message)
    return res.status(500).json({ error: 'notifications_mark_all_failed' })
  }
})

module.exports = router
