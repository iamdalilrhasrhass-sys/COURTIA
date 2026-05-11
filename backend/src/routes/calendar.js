/**
 * Routes Calendrier — LOT 20
 * Sync Google Calendar pour relances et RDV
 */

const express = require('express')
const router = express.Router()
const calendarService = require('../services/calendarService')
const verifyToken = require('../middleware/authMiddleware')
const { captureException } = require('../sentry')

// POST /api/calendar/events — Crée un événement
router.post('/events', verifyToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool
    const userId = req.user?.id || req.user?.userId
    const { title, date, clientId, clientEmail, description, location, durationMinutes } = req.body

    if (!title || !date) {
      return res.status(400).json({ error: 'Titre et date requis' })
    }

    // Récupérer les tokens Google de l'utilisateur
    const tokenRes = await pool.query(
      `SELECT google_access_token, google_refresh_token FROM users WHERE id = $1`,
      [userId]
    )
    const tokens = {
      access_token: tokenRes.rows[0]?.google_access_token,
      refresh_token: tokenRes.rows[0]?.google_refresh_token,
    }

    // Récupérer l'email du client si clientId fourni
    let email = clientEmail
    if (clientId && !email) {
      const clientRes = await pool.query('SELECT email FROM clients WHERE id = $1 AND user_id = $2', [clientId, userId])
      email = clientRes.rows[0]?.email
    }

    // Créer l'événement Google Calendar
    const result = await calendarService.createEvent(title, date, email, description, {
      tokens,
      location,
      durationMinutes,
    })

    // Sauvegarder en base
    const insertRes = await pool.query(
      `INSERT INTO calendar_events
        (user_id, client_id, google_event_id, title, description, event_date, end_date, event_type, location, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
       RETURNING *`,
      [
        userId,
        clientId || null,
        result.eventId,
        title,
        description || null,
        new Date(date),
        new Date(new Date(date).getTime() + (durationMinutes || 60) * 60 * 1000),
        'rdv',
        location || null,
      ]
    )

    res.json({
      success: true,
      mock: result.mock || false,
      event: insertRes.rows[0],
      googleLink: result.htmlLink,
    })
  } catch (err) {
    console.error('[Calendar] create event error:', err)
    captureException(err)
    res.status(500).json({ error: err.message })
  }
})

// GET /api/calendar/events — Liste les événements
router.get('/events', verifyToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool
    const userId = req.user?.id || req.user?.userId
    const { start, end, source = 'all' } = req.query

    const startDate = start ? new Date(start) : new Date()
    const endDate = end ? new Date(end) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

    // Récupérer les tokens Google
    const tokenRes = await pool.query(
      `SELECT google_access_token, google_refresh_token FROM users WHERE id = $1`,
      [userId]
    )
    const tokens = {
      access_token: tokenRes.rows[0]?.google_access_token,
      refresh_token: tokenRes.rows[0]?.google_refresh_token,
    }

    let events = []

    // Événements de la base locale
    if (source === 'all' || source === 'local') {
      const localRes = await pool.query(
        `SELECT ce.*, c.first_name as client_first_name, c.last_name as client_last_name
         FROM calendar_events ce
         LEFT JOIN clients c ON ce.client_id = c.id
         WHERE ce.user_id = $1 AND ce.event_date >= $2 AND ce.event_date <= $3
         ORDER BY ce.event_date`,
        [userId, startDate, endDate]
      )
      events = localRes.rows.map(e => ({
        id: e.id,
        googleEventId: e.google_event_id,
        title: e.title,
        description: e.description,
        start: e.event_date,
        end: e.end_date,
        location: e.location,
        eventType: e.event_type,
        clientId: e.client_id,
        clientName: e.client_first_name ? `${e.client_first_name} ${e.client_last_name}` : null,
        source: 'local',
      }))
    }

    // Synchroniser avec Google Calendar si tokens disponibles
    if ((source === 'all' || source === 'google') && tokens.access_token) {
      try {
        const googleResult = await calendarService.listEvents(startDate, endDate, { tokens })
        if (!googleResult.mock) {
          const googleEvents = googleResult.events.map(e => ({
            id: `google_${e.id}`,
            googleEventId: e.id,
            title: e.title,
            description: e.description,
            start: e.start,
            end: e.end,
            location: e.location,
            attendees: e.attendees,
            htmlLink: e.htmlLink,
            source: 'google',
          }))

          // Fusionner (éviter les doublons)
          const localGoogleIds = new Set(events.map(e => e.googleEventId).filter(Boolean))
          googleEvents.forEach(ge => {
            if (!localGoogleIds.has(ge.googleEventId)) {
              events.push(ge)
            }
          })
        }
      } catch (err) {
        console.warn('[Calendar] Google sync failed:', err.message)
      }
    }

    // Trier par date
    events.sort((a, b) => new Date(a.start) - new Date(b.start))

    res.json({
      events,
      period: { start: startDate, end: endDate },
      googleConnected: Boolean(tokens.access_token),
    })
  } catch (err) {
    console.error('[Calendar] list events error:', err)
    captureException(err)
    res.status(500).json({ error: err.message })
  }
})

// GET /api/calendar/events/today — Événements du jour
router.get('/events/today', verifyToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool
    const userId = req.user?.id || req.user?.userId

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const result = await pool.query(
      `SELECT ce.*, c.first_name as client_first_name, c.last_name as client_last_name
       FROM calendar_events ce
       LEFT JOIN clients c ON ce.client_id = c.id
       WHERE ce.user_id = $1 AND ce.event_date >= $2 AND ce.event_date < $3
       ORDER BY ce.event_date`,
      [userId, today, tomorrow]
    )

    res.json({
      events: result.rows.map(e => ({
        id: e.id,
        title: e.title,
        description: e.description,
        start: e.event_date,
        end: e.end_date,
        location: e.location,
        eventType: e.event_type,
        clientName: e.client_first_name ? `${e.client_first_name} ${e.client_last_name}` : null,
      })),
      date: today,
    })
  } catch (err) {
    console.error('[Calendar] today events error:', err)
    captureException(err)
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/calendar/events/:id — Supprime un événement
router.delete('/events/:id', verifyToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool
    const userId = req.user?.id || req.user?.userId
    const { id } = req.params

    const eventRes = await pool.query(
      'SELECT * FROM calendar_events WHERE id = $1 AND user_id = $2',
      [id, userId]
    )

    if (eventRes.rows.length === 0) {
      return res.status(404).json({ error: 'Événement non trouvé' })
    }

    const event = eventRes.rows[0]

    // Supprimer de Google Calendar si possible
    if (event.google_event_id) {
      const tokenRes = await pool.query(
        'SELECT google_access_token, google_refresh_token FROM users WHERE id = $1',
        [userId]
      )
      const tokens = {
        access_token: tokenRes.rows[0]?.google_access_token,
        refresh_token: tokenRes.rows[0]?.google_refresh_token,
      }

      try {
        await calendarService.deleteEvent(event.google_event_id, { tokens })
      } catch (err) {
        console.warn('[Calendar] Google delete failed:', err.message)
      }
    }

    // Supprimer de la base
    await pool.query('DELETE FROM calendar_events WHERE id = $1', [id])

    res.json({ success: true })
  } catch (err) {
    console.error('[Calendar] delete event error:', err)
    captureException(err)
    res.status(500).json({ error: err.message })
  }
})

// PUT /api/calendar/events/:id — Met à jour un événement
router.put('/events/:id', verifyToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool
    const userId = req.user?.id || req.user?.userId
    const { id } = req.params
    const { title, date, description, location, durationMinutes } = req.body

    const eventRes = await pool.query(
      'SELECT * FROM calendar_events WHERE id = $1 AND user_id = $2',
      [id, userId]
    )

    if (eventRes.rows.length === 0) {
      return res.status(404).json({ error: 'Événement non trouvé' })
    }

    const event = eventRes.rows[0]

    // Mettre à jour Google Calendar si possible
    if (event.google_event_id) {
      const tokenRes = await pool.query(
        'SELECT google_access_token, google_refresh_token FROM users WHERE id = $1',
        [userId]
      )
      const tokens = {
        access_token: tokenRes.rows[0]?.google_access_token,
        refresh_token: tokenRes.rows[0]?.google_refresh_token,
      }

      try {
        await calendarService.updateEvent(event.google_event_id, {
          title, date, description, location, durationMinutes,
        }, { tokens })
      } catch (err) {
        console.warn('[Calendar] Google update failed:', err.message)
      }
    }

    // Mettre à jour en base
    const updateRes = await pool.query(
      `UPDATE calendar_events
       SET title = COALESCE($1, title),
           event_date = COALESCE($2, event_date),
           description = COALESCE($3, description),
           location = COALESCE($4, location),
           updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [title, date ? new Date(date) : null, description, location, id]
    )

    res.json({ success: true, event: updateRes.rows[0] })
  } catch (err) {
    console.error('[Calendar] update event error:', err)
    captureException(err)
    res.status(500).json({ error: err.message })
  }
})

// GET /api/calendar/auth-url — URL pour autoriser Google Calendar
router.get('/auth-url', verifyToken, (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId
    const authUrl = calendarService.getAuthUrl(JSON.stringify({ userId }))
    res.json({ authUrl })
  } catch (err) {
    console.error('[Calendar] auth URL error:', err)
    captureException(err)
    res.status(500).json({ error: err.message })
  }
})

// GET /api/calendar/callback — Callback OAuth Google
router.get('/callback', async (req, res) => {
  try {
    const { code, state } = req.query
    const pool = req.app.locals.pool

    if (!code) {
      return res.status(400).json({ error: 'Code manquant' })
    }

    const tokens = await calendarService.getTokensFromCode(code)

    // Récupérer userId du state
    let userId
    try {
      const stateData = JSON.parse(state || '{}')
      userId = stateData.userId
    } catch (e) {
      return res.status(400).json({ error: 'State invalide' })
    }

    if (userId) {
      await pool.query(
        `UPDATE users SET google_access_token = $1, google_refresh_token = COALESCE($2, google_refresh_token) WHERE id = $3`,
        [tokens.access_token, tokens.refresh_token, userId]
      )
    }

    res.redirect('/parametres?google=connected')
  } catch (err) {
    console.error('[Calendar] callback error:', err)
    captureException(err)
    res.redirect('/parametres?google=error')
  }
})

module.exports = router