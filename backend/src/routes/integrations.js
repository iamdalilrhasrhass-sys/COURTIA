const express = require('express')
const crypto = require('crypto')
const axios = require('axios')
const { OAuth2Client } = require('google-auth-library')

const { verifyToken } = require('../middleware/auth')
const { getJwtSecret } = require('../utils/jwtSecret')
const {
  PROVIDERS,
  getUserId,
  ensureIntegrationsSchema,
  getIntegration,
  getIntegrationSecrets,
  upsertIntegration,
  disconnectIntegration,
  getAllIntegrationStatuses,
  listCalendarEvents,
  upsertCalendarEvent,
  recordClientInteraction,
  listClientInteractions,
  listWhatsappThreads,
  upsertWhatsappThread,
  findClientByPhone,
  findClientByEmail,
} = require('../services/integrationsStore')
const { hasEncryptionKey, encryptSecret, decryptSecret } = require('../services/integrationSecrets')

const router = express.Router()

const OAUTH_STATE_TTL_MS = 10 * 60 * 1000
const GOOGLE_CALENDAR_SCOPES = ['https://www.googleapis.com/auth/calendar.readonly']
const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
]

const WHATSAPP_TEMPLATES = [
  {
    key: 'relance_echeance',
    label: 'Relance échéance',
    body: 'Bonjour {{prenom}}, votre échéance de contrat approche. Souhaitez-vous que nous préparions le renouvellement ensemble ?'
  },
  {
    key: 'demande_pieces',
    label: 'Demande de pièces',
    body: 'Bonjour {{prenom}}, pour finaliser votre dossier, pouvez-vous nous envoyer les pièces manquantes aujourd\'hui ?'
  },
  {
    key: 'confirmation_rdv',
    label: 'Confirmation rendez-vous',
    body: 'Bonjour {{prenom}}, je vous confirme notre rendez-vous du {{date}} à {{heure}}. À très vite.'
  },
  {
    key: 'relance_prospect',
    label: 'Relance prospect',
    body: 'Bonjour {{prenom}}, je reviens vers vous concernant votre projet d\'assurance. Un créneau de 10 minutes cette semaine ?'
  },
  {
    key: 'suivi_apres_appel',
    label: 'Suivi après appel',
    body: 'Merci pour notre échange {{prenom}}. Je vous envoie la proposition et reste disponible pour vos questions.'
  },
]

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

  if (signature !== expected) return null

  try {
    const payload = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'))
    if (!payload?.userId || !payload?.provider || !payload?.issuedAt) return null
    if (Date.now() - Number(payload.issuedAt) > OAUTH_STATE_TTL_MS) return null
    return payload
  } catch {
    return null
  }
}

function maskSecretValue(value) {
  if (!value) return null
  const text = String(value)
  if (text.length <= 6) return '***'
  return `${text.slice(0, 3)}***${text.slice(-3)}`
}

function sanitizePhone(phone) {
  return String(phone || '').replace(/[^0-9+]/g, '')
}

function withUserId(req, res) {
  const userId = getUserId(req.user)
  if (!Number.isFinite(userId) || userId <= 0) {
    res.status(401).json({ error: 'invalid_session' })
    return null
  }
  return userId
}

function getGoogleConfig(provider = 'google_calendar') {
  const normalized = String(provider || '').toLowerCase()
  const redirectUri =
    normalized === 'gmail'
      ? (process.env.GOOGLE_GMAIL_REDIRECT_URI || process.env.GOOGLE_REDIRECT_URI || '')
      : (process.env.GOOGLE_CALENDAR_REDIRECT_URI || process.env.GOOGLE_REDIRECT_URI || '')

  return {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    redirectUri,
  }
}

function isGoogleConfigured(provider = 'google_calendar') {
  const conf = getGoogleConfig(provider)
  return Boolean(conf.clientId && conf.clientSecret && conf.redirectUri)
}

function getOutlookConfig() {
  return {
    clientId: process.env.OUTLOOK_CLIENT_ID || '',
    clientSecret: process.env.OUTLOOK_CLIENT_SECRET || '',
    redirectUri: process.env.OUTLOOK_REDIRECT_URI || '',
    tenantId: process.env.OUTLOOK_TENANT_ID || 'common',
  }
}

function isOutlookConfigured() {
  const conf = getOutlookConfig()
  return Boolean(conf.clientId && conf.clientSecret && conf.redirectUri)
}

function buildProviderReadiness(provider) {
  const normalized = String(provider || '').toLowerCase()
  if (normalized === 'google_calendar' || normalized === 'gmail') {
    return {
      provider: normalized,
      configured: isGoogleConfigured(normalized),
      oauthReady: isGoogleConfigured(normalized),
      encryptionReady: hasEncryptionKey(),
    }
  }

  if (normalized === 'outlook') {
    return {
      provider: normalized,
      configured: isOutlookConfigured(),
      oauthReady: isOutlookConfigured(),
      encryptionReady: hasEncryptionKey(),
    }
  }

  if (normalized === 'whatsapp_business') {
    return {
      provider: normalized,
      configured: Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID),
      webhookReady: Boolean(process.env.WHATSAPP_VERIFY_TOKEN),
      encryptionReady: hasEncryptionKey(),
    }
  }

  return {
    provider: normalized,
    configured: false,
    encryptionReady: hasEncryptionKey(),
  }
}

async function resolveClientFromCalendarEvent(pool, userId, event = {}) {
  const attendeeEmails = Array.isArray(event.attendees)
    ? event.attendees.map((a) => String(a?.email || '').trim().toLowerCase()).filter(Boolean)
    : []

  for (const email of attendeeEmails) {
    const client = await findClientByEmail(pool, userId, email)
    if (client) return client
  }

  return null
}

function parseEmailAddress(value = '') {
  const raw = String(value || '').trim()
  if (!raw) return null
  const angled = raw.match(/<([^>]+)>/)
  const candidate = angled?.[1] || raw
  const normalized = String(candidate).trim().toLowerCase()
  if (!normalized.includes('@')) return null
  return normalized
}

function extractFirstEmailFromHeader(value = '') {
  const text = String(value || '')
  const parts = text.split(',').map((part) => parseEmailAddress(part)).filter(Boolean)
  return parts[0] || null
}

function buildGmailRawMessage({ from, to, subject, textBody }) {
  const lines = [
    `To: ${to}`,
    `Subject: ${subject || '(Sans objet)'}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="UTF-8"',
    '',
    textBody || '',
  ]
  if (from) {
    lines.unshift(`From: ${from}`)
  }
  return Buffer.from(lines.join('\r\n'), 'utf8').toString('base64url')
}

async function mapStatuses(pool, userId) {
  const rows = await getAllIntegrationStatuses(pool, userId)
  return rows.map((row) => {
    const readiness = buildProviderReadiness(row.provider)
    const metadata = row.metadata || {}
    return {
      provider: row.provider,
      status: row.status,
      external_account_email: row.external_account_email,
      scopes: row.scopes || [],
      token_expires_at: row.token_expires_at,
      last_sync_at: row.last_sync_at,
      updated_at: row.updated_at,
      configured: readiness.configured,
      oauthReady: readiness.oauthReady || false,
      webhookReady: readiness.webhookReady || false,
      encryptionReady: readiness.encryptionReady,
      metadata: {
        ...metadata,
        // never leak token-like values even if they accidentally land in metadata
        access_token: undefined,
        refresh_token: undefined,
      },
    }
  })
}

function htmlCallbackResponse(title, body) {
  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><title>${title}</title>
<style>body{font-family:Arial,sans-serif;background:#0b1020;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:20px}.card{max-width:560px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);border-radius:14px;padding:24px}h1{margin:0 0 10px;font-size:20px}p{opacity:.86;line-height:1.6;margin:0 0 8px}</style>
</head><body><div class="card"><h1>${title}</h1><p>${body}</p><p>Vous pouvez fermer cet onglet et revenir dans COURTIA.</p></div></body></html>`
}

// Public webhook endpoint (Meta verification challenge)
router.get('/whatsapp/webhook', async (req, res) => {
  const mode = req.query['hub.mode']
  const token = req.query['hub.verify_token']
  const challenge = req.query['hub.challenge']
  const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN

  if (mode === 'subscribe' && expectedToken && token === expectedToken) {
    return res.status(200).send(challenge)
  }

  return res.status(403).json({ error: 'whatsapp_webhook_verification_failed' })
})

router.post('/whatsapp/webhook', async (req, res) => {
  const pool = req.app.locals.pool
  await ensureIntegrationsSchema(pool)

  const payload = req.body || {}
  const entries = Array.isArray(payload.entry) ? payload.entry : []

  try {
    for (const entry of entries) {
      const changes = Array.isArray(entry.changes) ? entry.changes : []
      for (const change of changes) {
        const value = change.value || {}
        const metadata = value.metadata || {}
        const phoneNumberId = metadata.phone_number_id || process.env.WHATSAPP_PHONE_NUMBER_ID || null

        const messages = Array.isArray(value.messages) ? value.messages : []
        for (const message of messages) {
          const fromPhone = sanitizePhone(message.from)
          if (!fromPhone) continue

          const messageText = message?.text?.body || message?.button?.text || message?.interactive?.button_reply?.title || '[message whatsapp]'
          const occurredAt = message?.timestamp ? new Date(Number(message.timestamp) * 1000) : new Date()

          let userId = null
          if (phoneNumberId) {
            const owner = await pool.query(
              `SELECT user_id
               FROM integrations
               WHERE provider = 'whatsapp_business'
                 AND metadata->>'phone_number_id' = $1
               ORDER BY updated_at DESC
               LIMIT 1`,
              [String(phoneNumberId)]
            )
            userId = owner.rows[0]?.user_id ? Number(owner.rows[0].user_id) : null
          }

          if (!userId) {
            continue
          }

          const client = await findClientByPhone(pool, userId, fromPhone)

          await upsertWhatsappThread(pool, {
            user_id: userId,
            client_id: client?.id || null,
            phone: fromPhone,
            external_thread_id: fromPhone,
            last_message_preview: String(messageText).slice(0, 220),
            last_message_at: occurredAt,
            status: 'open',
            metadata: {
              webhook: true,
              message_id: message.id || null,
              contact_name: value.contacts?.[0]?.profile?.name || null,
            },
          })

          await recordClientInteraction(pool, {
            user_id: userId,
            client_id: client?.id || null,
            provider: 'whatsapp_business',
            direction: 'in',
            external_id: message.id || null,
            subject: 'Message WhatsApp entrant',
            body_preview: String(messageText).slice(0, 320),
            occurred_at: occurredAt,
            metadata: {
              phone_number_id: phoneNumberId,
              from: fromPhone,
            },
          })
        }
      }
    }

    return res.status(200).json({ received: true })
  } catch (err) {
    console.error('[integrations] whatsapp webhook error:', err.message)
    return res.status(500).json({ error: 'whatsapp_webhook_store_failed' })
  }
})

// Public OAuth callbacks
router.get('/google-calendar/callback', async (req, res) => {
  const pool = req.app.locals.pool
  await ensureIntegrationsSchema(pool)

  const statePayload = parseState(req.query.state)
  if (!statePayload || statePayload.provider !== 'google_calendar') {
    return res.status(400).send(htmlCallbackResponse('Connexion Google invalide', 'Le state OAuth est invalide ou expiré. Recommencez depuis COURTIA.'))
  }

  const userId = Number(statePayload.userId)
  const code = String(req.query.code || '')
  const providerError = String(req.query.error || '')

  if (providerError) {
    await upsertIntegration(pool, userId, 'google_calendar', {
      status: 'oauth_denied',
      metadata: { last_oauth_error: providerError },
    })
    return res.status(400).send(htmlCallbackResponse('Connexion Google refusée', 'L\'autorisation Google a été refusée.'))
  }

  if (!code) {
    return res.status(400).send(htmlCallbackResponse('Connexion Google incomplète', 'Aucun code OAuth reçu.'))
  }

  const googleConfig = getGoogleConfig('google_calendar')
  let tokenExchangeOk = false
  let tokenExchangeError = null
  let encryptedAccessToken = null
  let encryptedRefreshToken = null
  let tokenExpiresAt = null

  if (isGoogleConfigured('google_calendar')) {
    try {
      const oauthClient = new OAuth2Client(googleConfig.clientId, googleConfig.clientSecret, googleConfig.redirectUri)
      const tokenResponse = await oauthClient.getToken(code)
      const tokens = tokenResponse.tokens || {}

      if (!hasEncryptionKey()) {
        throw new Error('ENCRYPTION_KEY missing')
      }

      encryptedAccessToken = encryptSecret(tokens.access_token)
      encryptedRefreshToken = encryptSecret(tokens.refresh_token)
      if (tokens.expiry_date) {
        tokenExpiresAt = new Date(tokens.expiry_date)
      }
      tokenExchangeOk = Boolean(encryptedAccessToken)
    } catch (err) {
      tokenExchangeError = err.message
    }
  } else {
    tokenExchangeError = 'google_oauth_not_configured'
  }

  await upsertIntegration(pool, userId, 'google_calendar', {
    status: tokenExchangeOk ? 'connected' : 'authorization_received',
    access_token_encrypted: encryptedAccessToken,
    refresh_token_encrypted: encryptedRefreshToken,
    token_expires_at: tokenExpiresAt,
    scopes: GOOGLE_CALENDAR_SCOPES,
    metadata: {
      oauth_completed_at: new Date().toISOString(),
      token_exchange_error: tokenExchangeError,
    },
  })

  if (tokenExchangeOk) {
    return res.status(200).send(htmlCallbackResponse('Google Agenda connecté', 'Votre compte Google Agenda est maintenant connecté à COURTIA.'))
  }

  return res.status(200).send(htmlCallbackResponse('Autorisation Google reçue', 'Autorisation reçue, mais l\'échange de token n\'a pas pu être finalisé automatiquement. Vérifiez la configuration backend.'))
})

router.get('/gmail/callback', async (req, res) => {
  const pool = req.app.locals.pool
  await ensureIntegrationsSchema(pool)

  const statePayload = parseState(req.query.state)
  if (!statePayload || statePayload.provider !== 'gmail') {
    return res.status(400).send(htmlCallbackResponse('Connexion Gmail invalide', 'Le state OAuth est invalide ou expiré.'))
  }

  const userId = Number(statePayload.userId)
  const providerError = String(req.query.error || '')
  const code = String(req.query.code || '')

  if (providerError) {
    await upsertIntegration(pool, userId, 'gmail', {
      status: 'oauth_denied',
      metadata: { last_oauth_error: providerError },
    })
    return res.status(400).send(htmlCallbackResponse('Connexion Gmail refusée', 'La connexion Gmail a été refusée.'))
  }

  if (!code) {
    await upsertIntegration(pool, userId, 'gmail', {
      status: 'pending_oauth',
      scopes: GMAIL_SCOPES,
      metadata: {
        oauth_completed_at: new Date().toISOString(),
        token_exchange_error: 'oauth_code_missing',
      },
    })
    return res.status(400).send(htmlCallbackResponse('Connexion Gmail incomplète', 'Aucun code OAuth Gmail reçu.'))
  }

  const googleConfig = getGoogleConfig('gmail')
  let tokenExchangeOk = false
  let tokenExchangeError = null
  let encryptedAccessToken = null
  let encryptedRefreshToken = null
  let tokenExpiresAt = null
  let externalAccountEmail = null

  if (isGoogleConfigured('gmail')) {
    try {
      if (!hasEncryptionKey()) {
        throw new Error('ENCRYPTION_KEY missing')
      }

      const oauthClient = new OAuth2Client(googleConfig.clientId, googleConfig.clientSecret, googleConfig.redirectUri)
      const tokenResponse = await oauthClient.getToken(code)
      const tokens = tokenResponse.tokens || {}

      encryptedAccessToken = encryptSecret(tokens.access_token)
      encryptedRefreshToken = encryptSecret(tokens.refresh_token)
      if (tokens.expiry_date) {
        tokenExpiresAt = new Date(tokens.expiry_date)
      }

      if (tokens.access_token) {
        const profileResponse = await axios.get('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
          headers: { Authorization: `Bearer ${tokens.access_token}` },
          timeout: 12000,
        }).catch(() => null)

        externalAccountEmail = profileResponse?.data?.emailAddress
          ? String(profileResponse.data.emailAddress).toLowerCase()
          : null
      }

      tokenExchangeOk = Boolean(encryptedAccessToken)
    } catch (err) {
      tokenExchangeError = err.message
    }
  } else {
    tokenExchangeError = 'google_oauth_not_configured'
  }

  await upsertIntegration(pool, userId, 'gmail', {
    status: tokenExchangeOk ? 'connected' : 'authorization_received',
    external_account_email: externalAccountEmail,
    access_token_encrypted: encryptedAccessToken,
    refresh_token_encrypted: encryptedRefreshToken,
    token_expires_at: tokenExpiresAt,
    scopes: GMAIL_SCOPES,
    metadata: {
      oauth_completed_at: new Date().toISOString(),
      token_exchange_error: tokenExchangeError,
    },
  })

  if (tokenExchangeOk) {
    return res.status(200).send(htmlCallbackResponse('Gmail connecté', 'Votre compte Gmail est maintenant connecté à COURTIA.'))
  }

  return res.status(200).send(htmlCallbackResponse('Autorisation Gmail reçue', 'Autorisation reçue, mais l’échange de token Gmail n’a pas pu être finalisé automatiquement.'))
})

router.get('/outlook/callback', async (req, res) => {
  const pool = req.app.locals.pool
  await ensureIntegrationsSchema(pool)

  const statePayload = parseState(req.query.state)
  if (!statePayload || statePayload.provider !== 'outlook') {
    return res.status(400).send(htmlCallbackResponse('Connexion Outlook invalide', 'Le state OAuth est invalide ou expiré.'))
  }

  const userId = Number(statePayload.userId)
  const providerError = String(req.query.error || '')
  const code = String(req.query.code || '')

  if (providerError) {
    await upsertIntegration(pool, userId, 'outlook', {
      status: 'oauth_denied',
      metadata: { last_oauth_error: providerError },
    })
    return res.status(400).send(htmlCallbackResponse('Connexion Outlook refusée', 'La connexion Outlook a été refusée.'))
  }

  await upsertIntegration(pool, userId, 'outlook', {
    status: code ? 'authorization_received' : 'pending_oauth',
    metadata: {
      oauth_completed_at: new Date().toISOString(),
      token_exchange: 'not_implemented_v1',
    },
  })

  return res.status(200).send(htmlCallbackResponse('Connexion Outlook enregistrée', 'L\'architecture OAuth Outlook est prête. Activez ensuite l\'échange de token serveur.'))
})

// Authenticated routes
router.use(verifyToken)

router.get('/status', async (req, res) => {
  try {
    const pool = req.app.locals.pool
    const userId = withUserId(req, res)
    if (!userId) return

    await ensureIntegrationsSchema(pool)
    const integrations = await mapStatuses(pool, userId)

    return res.json({
      success: true,
      integrations,
      providers: PROVIDERS,
      environment: {
        encryptionReady: hasEncryptionKey(),
        googleConfigured: isGoogleConfigured('google_calendar') || isGoogleConfigured('gmail'),
        outlookConfigured: isOutlookConfigured(),
        whatsappConfigured: Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID),
      },
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[integrations] GET /status error:', err.message)
    return res.status(500).json({ error: 'integrations_status_failed' })
  }
})

router.get('/google-calendar/status', async (req, res) => {
  try {
    const pool = req.app.locals.pool
    const userId = withUserId(req, res)
    if (!userId) return

    const row = await getIntegration(pool, userId, 'google_calendar')
    return res.json({
      provider: 'google_calendar',
      status: row?.status || 'disconnected',
      configured: isGoogleConfigured('google_calendar'),
      oauthReady: isGoogleConfigured('google_calendar'),
      encryptionReady: hasEncryptionKey(),
      external_account_email: row?.external_account_email || null,
      last_sync_at: row?.last_sync_at || null,
      metadata: row?.metadata || {},
    })
  } catch (err) {
    console.error('[integrations] google status error:', err.message)
    return res.status(500).json({ error: 'google_calendar_status_failed' })
  }
})

router.post('/google-calendar/connect', async (req, res) => {
  try {
    const userId = withUserId(req, res)
    if (!userId) return
    const pool = req.app.locals.pool
    await ensureIntegrationsSchema(pool)

    if (!isGoogleConfigured('google_calendar')) {
      await upsertIntegration(pool, userId, 'google_calendar', {
        status: 'configuration_required',
        metadata: { config_missing: true },
      })
      return res.status(400).json({
        error: 'google_calendar_not_configured',
        details: 'Configurez GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET et GOOGLE_REDIRECT_URI.',
      })
    }

    const state = signState({
      userId,
      provider: 'google_calendar',
      issuedAt: Date.now(),
      nonce: crypto.randomBytes(10).toString('hex'),
    })

    const conf = getGoogleConfig('google_calendar')
    const oauthClient = new OAuth2Client(conf.clientId, conf.clientSecret, conf.redirectUri)
    const authUrl = oauthClient.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: GOOGLE_CALENDAR_SCOPES,
      include_granted_scopes: true,
      state,
    })

    await upsertIntegration(pool, userId, 'google_calendar', {
      status: 'pending_oauth',
      scopes: GOOGLE_CALENDAR_SCOPES,
      metadata: {
        oauth_started_at: new Date().toISOString(),
      },
    })

    return res.json({ success: true, provider: 'google_calendar', authUrl })
  } catch (err) {
    console.error('[integrations] google connect error:', err.message)
    return res.status(500).json({ error: 'google_calendar_connect_failed' })
  }
})

router.post('/google-calendar/disconnect', async (req, res) => {
  try {
    const pool = req.app.locals.pool
    const userId = withUserId(req, res)
    if (!userId) return

    const updated = await disconnectIntegration(pool, userId, 'google_calendar')
    return res.json({ success: true, integration: updated || { provider: 'google_calendar', status: 'disconnected' } })
  } catch (err) {
    console.error('[integrations] google disconnect error:', err.message)
    return res.status(500).json({ error: 'google_calendar_disconnect_failed' })
  }
})

router.post('/google-calendar/sync', async (req, res) => {
  try {
    const pool = req.app.locals.pool
    const userId = withUserId(req, res)
    if (!userId) return

    const integration = await getIntegrationSecrets(pool, userId, 'google_calendar')
    if (!integration || !['connected', 'authorization_received', 'configured'].includes(String(integration.status || ''))) {
      return res.status(400).json({ error: 'google_calendar_not_connected' })
    }

    const existingEvents = await listCalendarEvents(pool, userId, { provider: 'google_calendar', limit: 50 })
    const accessToken = decryptSecret(integration.access_token_encrypted)

    if (!accessToken) {
      return res.json({
        success: false,
        provider: 'google_calendar',
        status: integration.status,
        synced: 0,
        events: existingEvents,
        details: 'Token Google non disponible côté serveur. Connexion prête mais sync API inactive.',
      })
    }

    const response = await axios.get('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: {
        maxResults: 50,
        singleEvents: true,
        orderBy: 'startTime',
        timeMin: new Date().toISOString(),
      },
      timeout: 15000,
    })

    const items = Array.isArray(response.data?.items) ? response.data.items : []

    const saved = []
    for (const event of items) {
      const start = event.start?.dateTime || event.start?.date || null
      const end = event.end?.dateTime || event.end?.date || null
      const matchedClient = await resolveClientFromCalendarEvent(pool, userId, event)

      const row = await upsertCalendarEvent(pool, userId, {
        client_id: matchedClient?.id || null,
        provider: 'google_calendar',
        external_event_id: event.id,
        title: event.summary || '(Sans titre)',
        description: event.description || null,
        location: event.location || null,
        start_time: start ? new Date(start) : null,
        end_time: end ? new Date(end) : null,
        status: event.status || 'confirmed',
        metadata: {
          html_link: event.htmlLink || null,
          attendees: Array.isArray(event.attendees) ? event.attendees.map((a) => ({ email: a.email, responseStatus: a.responseStatus })) : [],
        },
      })

      if (row) {
        saved.push(row)
        await recordClientInteraction(pool, {
          user_id: userId,
          client_id: matchedClient?.id || null,
          provider: 'google_calendar',
          direction: 'system',
          external_id: event.id,
          subject: `Rendez-vous: ${event.summary || '(Sans titre)'}`,
          body_preview: String(event.description || '').slice(0, 320) || 'Événement agenda synchronisé',
          occurred_at: row.start_time || new Date(),
          metadata: {
            location: event.location || null,
            html_link: event.htmlLink || null,
          },
        })
      }
    }

    await upsertIntegration(pool, userId, 'google_calendar', {
      status: 'connected',
      scopes: GOOGLE_CALENDAR_SCOPES,
      last_sync_at: new Date(),
      metadata: {
        last_sync_count: saved.length,
      },
    })

    return res.json({
      success: true,
      provider: 'google_calendar',
      synced: saved.length,
      events: saved,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[integrations] google sync error:', err.message)
    return res.status(500).json({
      error: 'google_calendar_sync_failed',
      details: err.response?.data?.error?.message || err.message,
    })
  }
})

router.get('/google-calendar/events', async (req, res) => {
  try {
    const pool = req.app.locals.pool
    const userId = withUserId(req, res)
    if (!userId) return

    const limit = Number(req.query.limit || 50)
    const events = await listCalendarEvents(pool, userId, { provider: 'google_calendar', limit })
    return res.json({ success: true, provider: 'google_calendar', count: events.length, rows: events })
  } catch (err) {
    console.error('[integrations] google events error:', err.message)
    return res.status(500).json({ error: 'google_calendar_events_failed' })
  }
})

router.get('/whatsapp/status', async (req, res) => {
  try {
    const pool = req.app.locals.pool
    const userId = withUserId(req, res)
    if (!userId) return

    const row = await getIntegration(pool, userId, 'whatsapp_business')
    const metadata = row?.metadata || {}

    return res.json({
      provider: 'whatsapp_business',
      status: row?.status || 'disconnected',
      configured: Boolean(process.env.WHATSAPP_ACCESS_TOKEN && (metadata.phone_number_id || process.env.WHATSAPP_PHONE_NUMBER_ID)),
      webhookReady: Boolean(process.env.WHATSAPP_VERIFY_TOKEN),
      phone_number_id: metadata.phone_number_id || process.env.WHATSAPP_PHONE_NUMBER_ID || null,
      business_account_id: metadata.business_account_id || process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || null,
      last_sync_at: row?.last_sync_at || null,
      metadata,
      secrets: {
        access_token: maskSecretValue(process.env.WHATSAPP_ACCESS_TOKEN),
        verify_token_set: Boolean(process.env.WHATSAPP_VERIFY_TOKEN),
      },
    })
  } catch (err) {
    console.error('[integrations] whatsapp status error:', err.message)
    return res.status(500).json({ error: 'whatsapp_status_failed' })
  }
})

router.post('/whatsapp/configure', async (req, res) => {
  try {
    const pool = req.app.locals.pool
    const userId = withUserId(req, res)
    if (!userId) return

    const payload = req.body || {}
    const phoneNumberId = String(payload.phone_number_id || process.env.WHATSAPP_PHONE_NUMBER_ID || '').trim()
    const businessAccountId = String(payload.business_account_id || process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '').trim()

    const configured = Boolean(process.env.WHATSAPP_ACCESS_TOKEN && phoneNumberId)

    const row = await upsertIntegration(pool, userId, 'whatsapp_business', {
      status: configured ? 'configured' : 'configuration_required',
      metadata: {
        phone_number_id: phoneNumberId || null,
        business_account_id: businessAccountId || null,
        configured_at: new Date().toISOString(),
      },
    })

    return res.json({
      success: true,
      provider: 'whatsapp_business',
      integration: row,
      configured,
      details: configured
        ? 'WhatsApp Business prêt. Webhook + envoi activables selon configuration Meta Cloud API.'
        : 'Configuration incomplète. Vérifiez WHATSAPP_ACCESS_TOKEN et WHATSAPP_PHONE_NUMBER_ID.',
    })
  } catch (err) {
    console.error('[integrations] whatsapp configure error:', err.message)
    return res.status(500).json({ error: 'whatsapp_configure_failed' })
  }
})

router.post('/whatsapp/send', async (req, res) => {
  try {
    const pool = req.app.locals.pool
    const userId = withUserId(req, res)
    if (!userId) return

    const body = req.body || {}
    const message = String(body.message || '').trim()
    let to = sanitizePhone(body.to)
    const clientId = Number(body.clientId || body.client_id || 0)

    let client = null
    if (!to && clientId > 0) {
      const clientRes = await pool.query(
        `SELECT id, first_name, last_name, phone
         FROM clients
         WHERE id = $1 AND courtier_id = $2
         LIMIT 1`,
        [clientId, userId]
      )
      client = clientRes.rows[0] || null
      to = sanitizePhone(client?.phone || '')
    }

    if (!to) {
      return res.status(400).json({ error: 'whatsapp_to_missing' })
    }

    if (!message) {
      return res.status(400).json({ error: 'whatsapp_message_missing' })
    }

    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN

    if (!phoneNumberId || !accessToken) {
      return res.status(400).json({
        error: 'whatsapp_not_configured',
        details: 'WHATSAPP_PHONE_NUMBER_ID ou WHATSAPP_ACCESS_TOKEN manquant.',
      })
    }

    const url = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`
    const response = await axios.post(
      url,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: { body: message },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      }
    )

    if (!client && to) {
      client = await findClientByPhone(pool, userId, to)
    }

    await upsertWhatsappThread(pool, {
      user_id: userId,
      client_id: client?.id || null,
      phone: to,
      external_thread_id: to,
      last_message_preview: message.slice(0, 220),
      last_message_at: new Date(),
      status: 'open',
      metadata: {
        last_message_direction: 'out',
      },
    })

    await recordClientInteraction(pool, {
      user_id: userId,
      client_id: client?.id || null,
      provider: 'whatsapp_business',
      direction: 'out',
      external_id: response.data?.messages?.[0]?.id || null,
      subject: 'Message WhatsApp envoyé',
      body_preview: message.slice(0, 320),
      occurred_at: new Date(),
      metadata: {
        to,
        phone_number_id: phoneNumberId,
      },
    })

    await upsertIntegration(pool, userId, 'whatsapp_business', {
      status: 'connected',
      last_sync_at: new Date(),
      metadata: {
        last_outbound_message_at: new Date().toISOString(),
      },
    })

    return res.json({
      success: true,
      provider: 'whatsapp_business',
      delivered: true,
      response: response.data,
    })
  } catch (err) {
    console.error('[integrations] whatsapp send error:', err.response?.data || err.message)
    return res.status(500).json({
      error: 'whatsapp_send_failed',
      details: err.response?.data?.error?.message || err.message,
    })
  }
})

router.get('/whatsapp/threads', async (req, res) => {
  try {
    const pool = req.app.locals.pool
    const userId = withUserId(req, res)
    if (!userId) return

    const limit = Number(req.query.limit || 50)
    const rows = await listWhatsappThreads(pool, userId, { limit })
    return res.json({ success: true, provider: 'whatsapp_business', count: rows.length, rows })
  } catch (err) {
    console.error('[integrations] whatsapp threads error:', err.message)
    return res.status(500).json({ error: 'whatsapp_threads_failed' })
  }
})

router.get('/whatsapp/templates', async (_req, res) => {
  return res.json({ success: true, provider: 'whatsapp_business', templates: WHATSAPP_TEMPLATES })
})

router.get('/gmail/status', async (req, res) => {
  try {
    const pool = req.app.locals.pool
    const userId = withUserId(req, res)
    if (!userId) return

    const row = await getIntegration(pool, userId, 'gmail')
    return res.json({
      provider: 'gmail',
      status: row?.status || 'disconnected',
      configured: isGoogleConfigured('gmail'),
      oauthReady: isGoogleConfigured('gmail'),
      encryptionReady: hasEncryptionKey(),
      external_account_email: row?.external_account_email || null,
      last_sync_at: row?.last_sync_at || null,
      metadata: row?.metadata || {},
    })
  } catch (err) {
    console.error('[integrations] gmail status error:', err.message)
    return res.status(500).json({ error: 'gmail_status_failed' })
  }
})

router.post('/gmail/connect', async (req, res) => {
  try {
    const userId = withUserId(req, res)
    if (!userId) return
    const pool = req.app.locals.pool

    if (!isGoogleConfigured('gmail')) {
      await upsertIntegration(pool, userId, 'gmail', {
        status: 'configuration_required',
        metadata: { config_missing: true },
      })
      return res.status(400).json({
        error: 'gmail_not_configured',
        details: 'Configurez GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET et GOOGLE_REDIRECT_URI.',
      })
    }

    const state = signState({
      userId,
      provider: 'gmail',
      issuedAt: Date.now(),
      nonce: crypto.randomBytes(10).toString('hex'),
    })

    const conf = getGoogleConfig('gmail')
    const oauthClient = new OAuth2Client(conf.clientId, conf.clientSecret, conf.redirectUri)
    const authUrl = oauthClient.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: GMAIL_SCOPES,
      include_granted_scopes: true,
      state,
    })

    await upsertIntegration(pool, userId, 'gmail', {
      status: 'pending_oauth',
      scopes: GMAIL_SCOPES,
      metadata: {
        oauth_started_at: new Date().toISOString(),
      },
    })

    return res.json({ success: true, provider: 'gmail', authUrl })
  } catch (err) {
    console.error('[integrations] gmail connect error:', err.message)
    return res.status(500).json({ error: 'gmail_connect_failed' })
  }
})

router.post('/gmail/disconnect', async (req, res) => {
  try {
    const userId = withUserId(req, res)
    if (!userId) return
    const pool = req.app.locals.pool

    const updated = await disconnectIntegration(pool, userId, 'gmail')
    return res.json({ success: true, integration: updated || { provider: 'gmail', status: 'disconnected' } })
  } catch (err) {
    console.error('[integrations] gmail disconnect error:', err.message)
    return res.status(500).json({ error: 'gmail_disconnect_failed' })
  }
})

router.post('/gmail/sync', async (req, res) => {
  try {
    const userId = withUserId(req, res)
    if (!userId) return
    const pool = req.app.locals.pool

    const integration = await getIntegrationSecrets(pool, userId, 'gmail')
    if (!integration || (integration.status !== 'connected' && integration.status !== 'authorization_received')) {
      return res.status(400).json({ error: 'gmail_not_connected' })
    }

    const accessToken = decryptSecret(integration.access_token_encrypted)
    if (!accessToken) {
      return res.status(400).json({
        error: 'gmail_token_missing',
        details: 'Token Gmail absent côté serveur. Reconnectez Gmail depuis Paramètres.',
      })
    }

    const listResponse = await axios.get('https://gmail.googleapis.com/gmail/v1/users/me/messages', {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: {
        maxResults: 15,
        q: 'newer_than:30d',
      },
      timeout: 15000,
    })

    const messages = Array.isArray(listResponse?.data?.messages) ? listResponse.data.messages : []
    const savedRows = []

    for (const message of messages) {
      const messageId = String(message.id || '').trim()
      if (!messageId) continue

      const dedupe = await pool.query(
        `SELECT id
         FROM client_interactions
         WHERE user_id = $1 AND provider = 'gmail' AND external_id = $2
         LIMIT 1`,
        [userId, messageId]
      )
      if (dedupe.rowCount) continue

      const detailResponse = await axios.get(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { format: 'metadata', metadataHeaders: ['From', 'To', 'Subject', 'Date'] },
        timeout: 15000,
      })

      const payloadHeaders = Array.isArray(detailResponse?.data?.payload?.headers)
        ? detailResponse.data.payload.headers
        : []
      const headersMap = {}
      for (const h of payloadHeaders) {
        const key = String(h?.name || '').toLowerCase()
        if (!key) continue
        headersMap[key] = h?.value || ''
      }

      const fromEmail = extractFirstEmailFromHeader(headersMap.from)
      const toEmail = extractFirstEmailFromHeader(headersMap.to)
      const accountEmail = String(integration.external_account_email || '').toLowerCase()
      const peerEmail = accountEmail && fromEmail === accountEmail ? toEmail : fromEmail
      const matchedClient = peerEmail ? await findClientByEmail(pool, userId, peerEmail) : null
      const direction = accountEmail && fromEmail === accountEmail ? 'out' : 'in'
      const subject = String(headersMap.subject || 'Email')
      const snippet = String(detailResponse?.data?.snippet || '').slice(0, 320)

      const created = await recordClientInteraction(pool, {
        user_id: userId,
        client_id: matchedClient?.id || null,
        provider: 'gmail',
        direction,
        external_id: messageId,
        subject,
        body_preview: snippet || 'Email synchronisé',
        occurred_at: headersMap.date ? new Date(headersMap.date) : new Date(),
        metadata: {
          from: fromEmail,
          to: toEmail,
          thread_id: detailResponse?.data?.threadId || null,
        },
      })

      if (created) {
        savedRows.push(created)
      }
    }

    await upsertIntegration(pool, userId, 'gmail', {
      status: 'connected',
      scopes: GMAIL_SCOPES,
      last_sync_at: new Date(),
      metadata: {
        last_sync_count: savedRows.length,
      },
    })

    return res.json({
      success: true,
      provider: 'gmail',
      status: 'connected',
      synced: savedRows.length,
      rows: savedRows,
      details: savedRows.length
        ? 'Synchronisation Gmail terminée.'
        : 'Aucun nouvel email à synchroniser.',
    })
  } catch (err) {
    console.error('[integrations] gmail sync error:', err.message)
    return res.status(500).json({
      error: 'gmail_sync_failed',
      details: err.response?.data?.error?.message || err.message,
    })
  }
})

router.post('/gmail/send', async (req, res) => {
  try {
    const userId = withUserId(req, res)
    if (!userId) return
    const pool = req.app.locals.pool
    const body = req.body || {}

    const clientId = Number(body.clientId || body.client_id || 0)
    let to = parseEmailAddress(body.to)
    const subject = String(body.subject || '(Sans objet)').trim().slice(0, 200)
    const textBody = String(body.message || body.body || '').trim()

    if (!to && clientId > 0) {
      const clientResult = await pool.query(
        `SELECT id, email
         FROM clients
         WHERE id = $1 AND courtier_id = $2
         LIMIT 1`,
        [clientId, userId]
      )
      const clientRow = clientResult.rows[0] || null
      to = parseEmailAddress(clientRow?.email || '')
    }

    if (!to) {
      return res.status(400).json({ error: 'gmail_to_missing' })
    }
    if (!textBody) {
      return res.status(400).json({ error: 'gmail_message_missing' })
    }

    const integration = await getIntegrationSecrets(pool, userId, 'gmail')
    if (!integration || integration.status !== 'connected') {
      return res.status(400).json({ error: 'gmail_not_connected' })
    }

    const accessToken = decryptSecret(integration.access_token_encrypted)
    if (!accessToken) {
      return res.status(400).json({
        error: 'gmail_token_missing',
        details: 'Reconnectez Gmail pour activer l’envoi.',
      })
    }

    const fromAddress = parseEmailAddress(integration.external_account_email) || 'me'
    const raw = buildGmailRawMessage({
      from: fromAddress === 'me' ? '' : fromAddress,
      to,
      subject,
      textBody,
    })

    const sendResponse = await axios.post(
      'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
      { raw },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      }
    )

    let matchedClient = null
    if (clientId > 0) {
      const byId = await pool.query(
        'SELECT id FROM clients WHERE id = $1 AND courtier_id = $2 LIMIT 1',
        [clientId, userId]
      )
      matchedClient = byId.rows[0] || null
    }
    if (!matchedClient) {
      matchedClient = await findClientByEmail(pool, userId, to)
    }

    await recordClientInteraction(pool, {
      user_id: userId,
      client_id: matchedClient?.id || null,
      provider: 'gmail',
      direction: 'out',
      external_id: sendResponse?.data?.id || null,
      subject,
      body_preview: textBody.slice(0, 320),
      occurred_at: new Date(),
      metadata: {
        to,
        thread_id: sendResponse?.data?.threadId || null,
      },
    })

    await upsertIntegration(pool, userId, 'gmail', {
      status: 'connected',
      last_sync_at: new Date(),
      metadata: {
        last_outbound_email_at: new Date().toISOString(),
      },
    })

    return res.json({
      success: true,
      provider: 'gmail',
      sent: true,
      message_id: sendResponse?.data?.id || null,
      thread_id: sendResponse?.data?.threadId || null,
    })
  } catch (err) {
    console.error('[integrations] gmail send error:', err.response?.data || err.message)
    return res.status(500).json({
      error: 'gmail_send_failed',
      details: err.response?.data?.error?.message || err.message,
    })
  }
})

router.get('/outlook/status', async (req, res) => {
  try {
    const pool = req.app.locals.pool
    const userId = withUserId(req, res)
    if (!userId) return

    const row = await getIntegration(pool, userId, 'outlook')
    return res.json({
      provider: 'outlook',
      status: row?.status || 'disconnected',
      configured: isOutlookConfigured(),
      oauthReady: isOutlookConfigured(),
      last_sync_at: row?.last_sync_at || null,
      metadata: row?.metadata || {},
    })
  } catch (err) {
    console.error('[integrations] outlook status error:', err.message)
    return res.status(500).json({ error: 'outlook_status_failed' })
  }
})

router.post('/outlook/connect', async (req, res) => {
  try {
    const userId = withUserId(req, res)
    if (!userId) return
    const pool = req.app.locals.pool

    if (!isOutlookConfigured()) {
      await upsertIntegration(pool, userId, 'outlook', {
        status: 'configuration_required',
        metadata: { config_missing: true },
      })
      return res.status(400).json({
        error: 'outlook_not_configured',
        details: 'Configurez OUTLOOK_CLIENT_ID, OUTLOOK_CLIENT_SECRET et OUTLOOK_REDIRECT_URI.',
      })
    }

    const conf = getOutlookConfig()
    const state = signState({
      userId,
      provider: 'outlook',
      issuedAt: Date.now(),
      nonce: crypto.randomBytes(10).toString('hex'),
    })

    const params = new URLSearchParams({
      client_id: conf.clientId,
      response_type: 'code',
      redirect_uri: conf.redirectUri,
      response_mode: 'query',
      scope: 'offline_access openid profile User.Read Mail.Read',
      state,
    })

    const authUrl = `https://login.microsoftonline.com/${conf.tenantId}/oauth2/v2.0/authorize?${params.toString()}`

    await upsertIntegration(pool, userId, 'outlook', {
      status: 'pending_oauth',
      metadata: { oauth_started_at: new Date().toISOString() },
    })

    return res.json({ success: true, provider: 'outlook', authUrl })
  } catch (err) {
    console.error('[integrations] outlook connect error:', err.message)
    return res.status(500).json({ error: 'outlook_connect_failed' })
  }
})

router.post('/outlook/disconnect', async (req, res) => {
  try {
    const userId = withUserId(req, res)
    if (!userId) return
    const pool = req.app.locals.pool

    const updated = await disconnectIntegration(pool, userId, 'outlook')
    return res.json({ success: true, integration: updated || { provider: 'outlook', status: 'disconnected' } })
  } catch (err) {
    console.error('[integrations] outlook disconnect error:', err.message)
    return res.status(500).json({ error: 'outlook_disconnect_failed' })
  }
})

router.post('/outlook/sync', async (req, res) => {
  try {
    const userId = withUserId(req, res)
    if (!userId) return
    const pool = req.app.locals.pool

    const row = await getIntegration(pool, userId, 'outlook')
    if (!row || (row.status !== 'connected' && row.status !== 'authorization_received')) {
      return res.status(400).json({ error: 'outlook_not_connected' })
    }

    return res.json({
      success: true,
      provider: 'outlook',
      status: row.status,
      synced: 0,
      details: 'Synchronisation Outlook V1: endpoint prêt, token exchange serveur à finaliser.',
    })
  } catch (err) {
    console.error('[integrations] outlook sync error:', err.message)
    return res.status(500).json({ error: 'outlook_sync_failed' })
  }
})

router.get('/client/:clientId/interactions', async (req, res) => {
  try {
    const userId = withUserId(req, res)
    if (!userId) return
    const pool = req.app.locals.pool
    const clientId = Number(req.params.clientId)
    const limit = Number(req.query.limit || 50)

    if (!Number.isFinite(clientId) || clientId <= 0) {
      return res.status(400).json({ error: 'invalid_client_id' })
    }

    const own = await pool.query('SELECT id FROM clients WHERE id = $1 AND courtier_id = $2 LIMIT 1', [clientId, userId])
    if (!own.rowCount) {
      return res.status(404).json({ error: 'client_not_found' })
    }

    const rows = await listClientInteractions(pool, userId, clientId, { limit })
    return res.json({ success: true, client_id: clientId, count: rows.length, rows })
  } catch (err) {
    console.error('[integrations] client interactions error:', err.message)
    return res.status(500).json({ error: 'client_interactions_failed' })
  }
})

module.exports = {
  router,
  listClientInteractions,
  __internals: {
    parseEmailAddress,
    extractFirstEmailFromHeader,
    buildGmailRawMessage,
    buildProviderReadiness,
  },
}
