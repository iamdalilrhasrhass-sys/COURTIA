/**
 * Service Calendrier — LOT 20
 * Intégration Google Calendar pour relances et RDV
 */

const { google } = require('googleapis')

function getConfigStatus() {
  const missing = []
  if (!process.env.GOOGLE_CLIENT_ID) missing.push('GOOGLE_CLIENT_ID')
  if (!process.env.GOOGLE_CLIENT_SECRET) missing.push('GOOGLE_CLIENT_SECRET')
  return {
    configured: missing.length === 0,
    missing,
  }
}

function isConfigured() {
  return getConfigStatus().configured
}

function getOAuth2Client(tokens = {}) {
  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/calendar/callback'
  )
  if (tokens.access_token) {
    client.setCredentials(tokens)
  }
  return client
}

function getCalendarClient(tokens) {
  const auth = getOAuth2Client(tokens)
  return google.calendar({ version: 'v3', auth })
}

/**
 * Crée un événement dans Google Calendar
 */
async function createEvent(title, date, clientEmail, description, options = {}) {
  const config = getConfigStatus()

  // Mode mock si non configuré
  if (!config.configured || !options.tokens?.access_token) {
    console.log('[Calendar] Mode mock — API non configurée')
    const mockId = `mock_event_${Date.now()}`
    return {
      configured: false,
      mock: true,
      eventId: mockId,
      htmlLink: `https://calendar.google.com/calendar/event?eid=${mockId}`,
      title,
      date,
    }
  }

  try {
    const calendar = getCalendarClient(options.tokens)

    const startDate = new Date(date)
    const endDate = new Date(startDate.getTime() + (options.durationMinutes || 60) * 60 * 1000)

    const event = {
      summary: title,
      description: description || '',
      start: {
        dateTime: startDate.toISOString(),
        timeZone: 'Europe/Paris',
      },
      end: {
        dateTime: endDate.toISOString(),
        timeZone: 'Europe/Paris',
      },
      location: options.location || '',
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 60 },
          { method: 'popup', minutes: 15 },
        ],
      },
    }

    // Ajouter le client comme invité si email fourni
    if (clientEmail) {
      event.attendees = [{ email: clientEmail }]
    }

    const res = await calendar.events.insert({
      calendarId: 'primary',
      resource: event,
      sendNotifications: options.sendNotifications !== false,
    })

    return {
      configured: true,
      mock: false,
      eventId: res.data.id,
      htmlLink: res.data.htmlLink,
      title,
      date: startDate,
    }
  } catch (err) {
    console.error('[Calendar] createEvent error:', err.message)
    throw new Error(`calendar_create_error: ${err.message}`)
  }
}

/**
 * Liste les événements du calendrier
 */
async function listEvents(startDate, endDate, options = {}) {
  const config = getConfigStatus()

  if (!config.configured || !options.tokens?.access_token) {
    console.log('[Calendar] Mode mock — API non configurée')
    return {
      configured: false,
      mock: true,
      events: [
        {
          id: 'mock_1',
          title: 'RDV Client Demo',
          start: new Date(),
          end: new Date(Date.now() + 3600000),
          description: 'Démonstration COURTIA',
        },
      ],
    }
  }

  try {
    const calendar = getCalendarClient(options.tokens)

    const res = await calendar.events.list({
      calendarId: 'primary',
      timeMin: startDate.toISOString(),
      timeMax: endDate.toISOString(),
      maxResults: options.maxResults || 50,
      singleEvents: true,
      orderBy: 'startTime',
    })

    const events = (res.data.items || []).map(e => ({
      id: e.id,
      title: e.summary || '',
      description: e.description || '',
      start: e.start?.dateTime || e.start?.date,
      end: e.end?.dateTime || e.end?.date,
      location: e.location || '',
      attendees: (e.attendees || []).map(a => a.email),
      htmlLink: e.htmlLink,
    }))

    return {
      configured: true,
      mock: false,
      events,
    }
  } catch (err) {
    console.error('[Calendar] listEvents error:', err.message)
    throw new Error(`calendar_list_error: ${err.message}`)
  }
}

/**
 * Supprime un événement du calendrier
 */
async function deleteEvent(eventId, options = {}) {
  const config = getConfigStatus()

  if (!config.configured || !options.tokens?.access_token || eventId?.startsWith('mock_')) {
    return { success: true, mock: true }
  }

  try {
    const calendar = getCalendarClient(options.tokens)
    await calendar.events.delete({
      calendarId: 'primary',
      eventId,
    })
    return { success: true, mock: false }
  } catch (err) {
    console.error('[Calendar] deleteEvent error:', err.message)
    throw new Error(`calendar_delete_error: ${err.message}`)
  }
}

/**
 * Met à jour un événement
 */
async function updateEvent(eventId, updates, options = {}) {
  const config = getConfigStatus()

  if (!config.configured || !options.tokens?.access_token || eventId?.startsWith('mock_')) {
    return { success: true, mock: true, eventId }
  }

  try {
    const calendar = getCalendarClient(options.tokens)

    const event = {}
    if (updates.title) event.summary = updates.title
    if (updates.description) event.description = updates.description
    if (updates.date) {
      const startDate = new Date(updates.date)
      const endDate = new Date(startDate.getTime() + (updates.durationMinutes || 60) * 60 * 1000)
      event.start = { dateTime: startDate.toISOString(), timeZone: 'Europe/Paris' }
      event.end = { dateTime: endDate.toISOString(), timeZone: 'Europe/Paris' }
    }
    if (updates.location) event.location = updates.location

    const res = await calendar.events.patch({
      calendarId: 'primary',
      eventId,
      resource: event,
    })

    return {
      success: true,
      mock: false,
      eventId: res.data.id,
      htmlLink: res.data.htmlLink,
    }
  } catch (err) {
    console.error('[Calendar] updateEvent error:', err.message)
    throw new Error(`calendar_update_error: ${err.message}`)
  }
}

/**
 * Génère l'URL d'autorisation OAuth
 */
function getAuthUrl(state = '') {
  const client = getOAuth2Client()
  return client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
    ],
    state,
    prompt: 'consent',
  })
}

/**
 * Échange un code d'autorisation contre des tokens
 */
async function getTokensFromCode(code) {
  const client = getOAuth2Client()
  const { tokens } = await client.getToken(code)
  return tokens
}

module.exports = {
  getConfigStatus,
  isConfigured,
  getOAuth2Client,
  createEvent,
  listEvents,
  deleteEvent,
  updateEvent,
  getAuthUrl,
  getTokensFromCode,
}