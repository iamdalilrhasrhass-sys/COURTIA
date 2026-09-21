/**
 * Routes Calendrier — LOT 20
 * Sync Google Calendar pour relances et RDV
 */

const express = require('express')
const router = express.Router()
const crypto = require('crypto')
const marcheCabinet = require('../lib/marcheCabinet')
const calendarService = require('../services/calendarService')
const verifyToken = require('../middleware/authMiddleware')
const { getJwtSecret } = require('../utils/jwtSecret')
const { captureException } = require('../sentry')
const { messagePublic } = require('../lib/erreursPubliques')

// ==================== STATE OAUTH SIGNÉ (SEC-008) ====================
//
// Le callback OAuth Google lisait `JSON.parse(state).userId` sans aucune
// vérification : un attaquant pouvait faire accepter SON code d'autorisation
// en désignant la victime comme propriétaire (le refresh token Google de la
// victime était alors remplacé). On applique le même mécanisme que
// backend/src/routes/integrations.js : state signé HMAC + expiration.
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000

function getStateSecret() {
  return process.env.ENCRYPTION_KEY || getJwtSecret()
}

function signState(payload) {
  const raw = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signature = crypto
    .createHmac('sha256', getStateSecret())
    .update(raw)
    .digest('base64url')
  return `${raw}.${signature}`
}

function parseState(state) {
  const [raw, signature] = String(state || '').split('.')
  if (!raw || !signature) return null

  const expected = crypto
    .createHmac('sha256', getStateSecret())
    .update(raw)
    .digest('base64url')

  const expectedBuf = Buffer.from(expected)
  const providedBuf = Buffer.from(signature)
  if (expectedBuf.length !== providedBuf.length) return null
  if (!crypto.timingSafeEqual(expectedBuf, providedBuf)) return null

  try {
    const payload = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'))
    if (!payload?.userId || !payload?.issuedAt) return null
    if (Date.now() - Number(payload.issuedAt) > OAUTH_STATE_TTL_MS) return null
    return payload
  } catch (e) {
    return null
  }
}

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

    // Marché du CABINET : il décide du fuseau horaire poussé à Google Calendar
    // (un cabinet suisse ne se voit plus attribuer « Europe/Paris »).
    const marche = await marcheCabinet.marcheDeLaRequete(req, (sql, params) => pool.query(sql, params))

    // Créer l'événement Google Calendar
    const result = await calendarService.createEvent(title, date, email, description, {
      tokens,
      location,
      durationMinutes,
      marche: marche ? marche.marche : 'FR',
      timeZone: marche ? marche.fuseau : undefined,
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
      // `google_synced` dit la vérité : sans Google configuré, le rendez-vous
      // n'existe que dans COURTIA (google_event_id est NULL).
      google_synced: result.google_synced === true,
      googleLink: result.htmlLink || null,
      event: insertRes.rows[0],
    })
  } catch (err) {
    console.error('[Calendar] create event error:', err)
    captureException(err)
    res.status(500).json({ error: messagePublic(err, { statut: 500 }) })
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
    res.status(500).json({ error: messagePublic(err, { statut: 500 }) })
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
    res.status(500).json({ error: messagePublic(err, { statut: 500 }) })
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

    // Supprimer de la base — PORTÉE DANS LA REQUÊTE (P4 SEC-029, mesuré le
    // 20/09/2026 : les écritures par identifiant n'étaient pas bornées). Le
    // contrôle de propriété ci-dessus est conservé, mais l'écriture porte
    // désormais elle-même sa portée : un `WHERE id = $1` nu reste juste tant que
    // le code au-dessus n'est pas modifié — il suffit d'une refonte pour que la
    // vérification saute. La requête, elle, ne peut pas l'oublier.
    const supprime = await pool.query(
      'DELETE FROM calendar_events WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    )
    if (supprime.rowCount === 0) {
      return res.status(404).json({ error: 'Événement non trouvé' })
    }

    res.json({ success: true })
  } catch (err) {
    console.error('[Calendar] delete event error:', err)
    captureException(err)
    res.status(500).json({ error: messagePublic(err, { statut: 500 }) })
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

    // Mettre à jour en base — PORTÉE DANS LA REQUÊTE (P4 SEC-029) : l'écriture
    // est bornée à l'événement DE CET UTILISATEUR, dans la requête elle-même et
    // non plus seulement par la lecture qui la précède.
    const updateRes = await pool.query(
      `UPDATE calendar_events
       SET title = COALESCE($1, title),
           event_date = COALESCE($2, event_date),
           description = COALESCE($3, description),
           location = COALESCE($4, location),
           updated_at = NOW()
       WHERE id = $5 AND user_id = $6
       RETURNING *`,
      [title, date ? new Date(date) : null, description, location, id, userId]
    )

    if (updateRes.rowCount === 0) {
      return res.status(404).json({ error: 'Événement non trouvé' })
    }

    res.json({ success: true, event: updateRes.rows[0] })
  } catch (err) {
    console.error('[Calendar] update event error:', err)
    captureException(err)
    res.status(500).json({ error: messagePublic(err, { statut: 500 }) })
  }
})

// GET /api/calendar/auth-url — URL pour autoriser Google Calendar
router.get('/auth-url', verifyToken, (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId
    // SEC-008 : state signé (HMAC) et daté, vérifiable au retour du callback.
    const state = signState({ userId, provider: 'google_calendar', issuedAt: Date.now() })
    const authUrl = calendarService.getAuthUrl(state)
    res.json({ authUrl })
  } catch (err) {
    console.error('[Calendar] auth URL error:', err)
    captureException(err)
    res.status(500).json({ error: messagePublic(err, { statut: 500 }) })
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

    // SEC-008 : le state est vérifié AVANT tout échange de code Google.
    const stateData = parseState(state)
    if (!stateData) {
      return res.status(400).json({ error: 'State invalide ou expiré' })
    }
    const userId = stateData.userId

    const tokens = await calendarService.getTokensFromCode(code)

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