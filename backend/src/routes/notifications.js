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
  await pool.query("ALTER TABLE notifications ADD COLUMN IF NOT EXISTS channel TEXT NOT NULL DEFAULT 'in_app';")
  await pool.query('ALTER TABLE notifications ADD COLUMN IF NOT EXISTS kind TEXT;')
  await pool.query('UPDATE notifications SET kind = COALESCE(kind, type) WHERE kind IS NULL;')
  await pool.query('CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);')
  await pool.query('CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read_at);')
}

/**
 * Préférences de notification — persistance réelle (correction 2026-09-20).
 *
 * L'écran Paramètres > Notifications affichait « Préférence sauvegardée. » sans
 * le moindre appel réseau : le cabinet croyait avoir choisi ses alertes, rien
 * n'était enregistré et la page repartait des valeurs par défaut au rechargement.
 * Les colonnes existent déjà (`user_notification_prefs`, migration 021) ;
 * `product_news_enabled` est ajoutée par une migration additive dédiée
 * (110_notification_preferences_produit.sql) et créée ici si besoin, comme pour
 * `notifications`.
 */
const PREF_DEFAULTS = {
  in_app_enabled: true,
  email_enabled: true,
  whatsapp_enabled: false,
  morning_brief_enabled: true,
  overdue_tasks_enabled: true,
  contract_expiry_enabled: true,
  product_news_enabled: false,
}

const PREF_COLUMNS = Object.keys(PREF_DEFAULTS)

async function ensurePreferencesTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_notification_prefs (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      in_app_enabled BOOLEAN NOT NULL DEFAULT TRUE,
      email_enabled BOOLEAN NOT NULL DEFAULT TRUE,
      whatsapp_enabled BOOLEAN NOT NULL DEFAULT FALSE,
      morning_brief_enabled BOOLEAN NOT NULL DEFAULT TRUE,
      overdue_tasks_enabled BOOLEAN NOT NULL DEFAULT TRUE,
      contract_expiry_enabled BOOLEAN NOT NULL DEFAULT TRUE,
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `)
  await pool.query(
    'ALTER TABLE user_notification_prefs ADD COLUMN IF NOT EXISTS product_news_enabled BOOLEAN NOT NULL DEFAULT FALSE;'
  )
  await pool.query(
    'ALTER TABLE user_notification_prefs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();'
  )
}

function selectPreferenceColumns(alias = '') {
  const prefix = alias ? `${alias}.` : ''
  return PREF_COLUMNS.map((col) => `${prefix}${col}`).join(', ')
}

function normalizePreferences(row = {}) {
  const prefs = {}
  PREF_COLUMNS.forEach((col) => {
    prefs[col] = typeof row[col] === 'boolean' ? row[col] : PREF_DEFAULTS[col]
  })
  return prefs
}

// GET /api/notifications/preferences — ce qui est réellement enregistré.
router.get('/preferences', verifyToken, async (req, res) => {
  try {
    const userId = getUserId(req)
    if (!userId) return res.status(401).json({ error: 'auth_required' })
    const pool = req.app.locals.pool
    await ensurePreferencesTable(pool)

    const rows = await pool.query(
      `SELECT ${selectPreferenceColumns()}, updated_at FROM user_notification_prefs WHERE user_id = $1`,
      [userId]
    )

    // Aucune ligne : l'utilisateur n'a jamais enregistré de préférences. On
    // répond les valeurs par défaut en le disant (`stored: false`) — l'écran
    // n'affiche jamais un choix que le cabinet n'a pas fait.
    return res.json({
      success: true,
      stored: rows.rows.length > 0,
      preferences: normalizePreferences(rows.rows[0] || {}),
      updated_at: rows.rows[0]?.updated_at || null,
    })
  } catch (err) {
    console.error('[NOTIFICATIONS] GET /preferences error:', err.message)
    return res.status(500).json({ error: 'preferences_fetch_failed', message: 'Lecture des préférences impossible.' })
  }
})

// PUT /api/notifications/preferences — enregistre et renvoie l'état confirmé.
router.put('/preferences', verifyToken, async (req, res) => {
  try {
    const userId = getUserId(req)
    if (!userId) return res.status(401).json({ error: 'auth_required' })
    const pool = req.app.locals.pool
    await ensurePreferencesTable(pool)

    const body = req.body && typeof req.body === 'object' ? req.body : {}
    const misesAJour = {}
    const invalides = []
    PREF_COLUMNS.forEach((col) => {
      if (!Object.prototype.hasOwnProperty.call(body, col)) return
      if (typeof body[col] !== 'boolean') {
        invalides.push(col)
        return
      }
      misesAJour[col] = body[col]
    })

    if (invalides.length) {
      return res.status(400).json({
        error: 'validation_error',
        message: `Préférence invalide (booléen attendu) : ${invalides.join(', ')}.`,
        champs: invalides,
      })
    }
    const colonnes = Object.keys(misesAJour)
    if (!colonnes.length) {
      return res.status(400).json({ error: 'validation_error', message: 'Aucune préférence reconnue dans la requête.' })
    }

    const insertCols = ['user_id', ...colonnes]
    const placeholders = insertCols.map((_, i) => `$${i + 1}`).join(', ')
    const updateSet = colonnes.map((col) => `${col} = EXCLUDED.${col}`).join(', ')

    const result = await pool.query(
      `INSERT INTO user_notification_prefs (${insertCols.join(', ')})
       VALUES (${placeholders})
       ON CONFLICT (user_id)
       DO UPDATE SET ${updateSet}, updated_at = NOW()
       RETURNING ${selectPreferenceColumns()}, updated_at`,
      [userId, ...colonnes.map((col) => misesAJour[col])]
    )

    return res.json({
      success: true,
      stored: true,
      preferences: normalizePreferences(result.rows[0] || {}),
      updated_at: result.rows[0]?.updated_at || null,
    })
  } catch (err) {
    console.error('[NOTIFICATIONS] PUT /preferences error:', err.message)
    return res.status(500).json({ error: 'preferences_update_failed', message: 'Enregistrement des préférences impossible.' })
  }
})

router.get('/', verifyToken, async (req, res) => {
  try {
    const userId = getUserId(req)
    if (!userId) return res.status(401).json({ error: 'auth_required' })
    const pool = req.app.locals.pool
    await ensureNotificationsTable(pool)

    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 50, 1), 200)
    const rows = await pool.query(
      `SELECT id, type, COALESCE(kind, type) AS kind, channel, title, body, severity, link, metadata, read_at, created_at
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
