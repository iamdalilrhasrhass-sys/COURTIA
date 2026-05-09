const express = require('express')
const crypto = require('crypto')
const axios = require('axios')
const { OAuth2Client } = require('google-auth-library')

const { verifyToken } = require('../middleware/auth')
const { requireCabinetFeature } = require('../middleware/cabinetAccess')
const { getJwtSecret } = require('../utils/jwtSecret')
const logger = require('../lib/logger')
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
  findWhatsappConversationByPhone,
  upsertWhatsappConversation,
  insertWhatsappMessage,
  findClientByPhone,
  findClientByEmail,
} = require('../services/integrationsStore')
const { hasEncryptionKey, encryptSecret, decryptSecret } = require('../services/integrationSecrets')
const {
  GOOGLE_CALENDAR_SCOPES,
  GMAIL_SCOPES,
  GOOGLE_COMBINED_SCOPES,
  getGoogleConfig,
  isGoogleConfigured,
  encodeGmailRawMessage,
  extractGmailMessageSummary,
} = require('../services/googleIntegrationService')
const {
  buildWhatsappPayload,
  getWhatsappTemplates,
  isWhatsappWindowOpen,
  parseWhatsappWebhookMessages,
  sanitizeWhatsappPhone,
  verifyMetaSignature,
} = require('../services/whatsappBusinessService')

const router = express.Router()

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
  return sanitizeWhatsappPhone(phone)
}

function withUserId(req, res) {
  const userId = getUserId(req.user)
  if (!Number.isFinite(userId) || userId <= 0) {
    res.status(401).json({ error: 'invalid_session' })
    return null
  }
  return userId
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

async function fetchGoogleAccountEmail(accessToken) {
  if (!accessToken) return null
  try {
    const response = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
      timeout: 10000,
    })
    return response.data?.email || null
  } catch (err) {
    logger.warn({ error: err.message }, 'google account email lookup failed')
    return null
  }
}

async function exchangeGoogleAuthorizationCode(provider, code) {
  if (!isGoogleConfigured(provider)) {
    return { ok: false, error: 'google_oauth_not_configured' }
  }
  if (!hasEncryptionKey()) {
    return { ok: false, error: 'encryption_key_missing' }
  }

  try {
    const googleConfig = getGoogleConfig(provider)
    const oauthClient = new OAuth2Client(googleConfig.clientId, googleConfig.clientSecret, googleConfig.redirectUri)
    const tokenResponse = await oauthClient.getToken(code)
    const tokens = tokenResponse.tokens || {}
    const accountEmail = await fetchGoogleAccountEmail(tokens.access_token)

    return {
      ok: Boolean(tokens.access_token),
      accessTokenEncrypted: encryptSecret(tokens.access_token),
      refreshTokenEncrypted: encryptSecret(tokens.refresh_token),
      tokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      accountEmail,
      error: tokens.access_token ? null : 'google_access_token_missing',
    }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

function emailFromAddress(value = '') {
  const text = String(value || '').trim()
  const match = text.match(/<([^>]+)>/)
  return String(match?.[1] || text).trim().toLowerCase()
}

async function recordEmailThread(pool, userId, clientId, summary, direction = 'inbound') {
  try {
    const thread = await pool.query(
      `INSERT INTO email_threads (
        user_id, client_id, provider, external_thread_id, subject, last_message_at,
        participants, ark_tags, created_at, updated_at
      ) VALUES ($1,$2,'gmail',$3,$4,$5,$6,$7,NOW(),NOW())
      ON CONFLICT (user_id, provider, external_thread_id) DO UPDATE SET
        client_id = COALESCE(EXCLUDED.client_id, email_threads.client_id),
        subject = COALESCE(EXCLUDED.subject, email_threads.subject),
        last_message_at = GREATEST(email_threads.last_message_at, EXCLUDED.last_message_at),
        participants = EXCLUDED.participants,
        updated_at = NOW()
      RETURNING id`,
      [
        userId,
        clientId || null,
        summary.threadId || summary.messageId,
        summary.subject,
        summary.sentAt || new Date(),
        [summary.from, summary.to].filter(Boolean),
        [],
      ]
    )

    await pool.query(
      `INSERT INTO email_messages (
        thread_id, external_message_id, from_address, to_addresses, subject,
        body_preview, sent_at, direction, ark_summary, created_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())
      ON CONFLICT (thread_id, external_message_id) DO UPDATE SET
        body_preview = EXCLUDED.body_preview,
        sent_at = EXCLUDED.sent_at,
        direction = EXCLUDED.direction`,
      [
        thread.rows[0].id,
        summary.messageId,
        summary.from || '',
        summary.to ? [summary.to] : [],
        summary.subject || null,
        summary.snippet || '',
        summary.sentAt || new Date(),
        direction,
        summary.snippet || null,
      ]
    )
  } catch (err) {
    if (err?.code !== '42P01') {
      logger.warn({ error: err.message, user_id: userId }, 'gmail thread persistence skipped')
    }
  }
}

async function upsertOAuthTokenRecord(pool, userId, exchange, scopes = GOOGLE_COMBINED_SCOPES) {
  if (!exchange?.ok || !exchange.accessTokenEncrypted) return
  try {
    await pool.query(
      `INSERT INTO oauth_tokens (
        user_id, provider, account_email, access_token_enc, refresh_token_enc,
        scopes, expires_at, last_sync_at, status, created_at
      ) VALUES ($1,'google',$2,$3,$4,$5,$6,NOW(),'active',NOW())
      ON CONFLICT (user_id, provider, account_email) DO UPDATE SET
        access_token_enc = EXCLUDED.access_token_enc,
        refresh_token_enc = COALESCE(EXCLUDED.refresh_token_enc, oauth_tokens.refresh_token_enc),
        scopes = EXCLUDED.scopes,
        expires_at = EXCLUDED.expires_at,
        last_sync_at = NOW(),
        status = 'active'`,
      [
        userId,
        exchange.accountEmail || `google-user-${userId}`,
        exchange.accessTokenEncrypted,
        exchange.refreshTokenEncrypted,
        scopes,
        exchange.tokenExpiresAt,
      ]
    )
  } catch (err) {
    if (err?.code !== '42P01') {
      logger.warn({ error: err.message, user_id: userId }, 'oauth token mirror skipped')
    }
  }
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

  const signature = verifyMetaSignature({
    rawBody: req.rawBody,
    signatureHeader: req.get('x-hub-signature-256'),
    appSecret: process.env.WHATSAPP_APP_SECRET,
  })

  if (!signature.configured) {
    return res.status(503).json({ error: 'whatsapp_app_secret_missing' })
  }
  if (!signature.valid) {
    return res.status(403).json({ error: 'whatsapp_signature_invalid' })
  }

  try {
    const messages = parseWhatsappWebhookMessages(req.body || {})

    for (const message of messages) {
      let userId = null
      if (message.phoneNumberId) {
        const owner = await pool.query(
          `SELECT user_id
           FROM integrations
           WHERE provider = 'whatsapp_business'
             AND metadata->>'phone_number_id' = $1
           ORDER BY updated_at DESC
           LIMIT 1`,
          [String(message.phoneNumberId)]
        )
        userId = owner.rows[0]?.user_id ? Number(owner.rows[0].user_id) : null
      }

      if (!userId) continue

      const client = await findClientByPhone(pool, userId, message.phone)
      const preview = String(message.text || '').slice(0, 320)

      await upsertWhatsappThread(pool, {
        user_id: userId,
        client_id: client?.id || null,
        phone: message.phone,
        external_thread_id: message.phone,
        last_message_preview: preview.slice(0, 220),
        last_message_at: message.occurredAt,
        status: 'open',
        metadata: {
          webhook: true,
          message_id: message.messageId,
          contact_name: message.contactName,
          message_type: message.type,
        },
      })

      const conversation = await upsertWhatsappConversation(pool, {
        user_id: userId,
        client_id: client?.id || null,
        phone_e164: message.phone,
        external_conversation_id: message.phone,
        last_message_preview: preview.slice(0, 220),
        last_message_at: message.occurredAt,
        status: 'open',
        metadata: {
          phone_number_id: message.phoneNumberId,
          contact_name: message.contactName,
        },
      })

      if (conversation?.id) {
        await insertWhatsappMessage(pool, {
          conversation_id: conversation.id,
          external_id: message.messageId || `in-${message.phone}-${Date.now()}`,
          direction: 'inbound',
          body_preview: preview,
          media_type: message.type === 'text' ? null : message.type,
          status: 'received',
          sent_at: message.occurredAt,
          metadata: {
            phone_number_id: message.phoneNumberId,
            raw_type: message.type,
          },
        })
      }

      await recordClientInteraction(pool, {
        user_id: userId,
        client_id: client?.id || null,
        provider: 'whatsapp_business',
        direction: 'in',
        external_id: message.messageId,
        subject: 'Message WhatsApp entrant',
        body_preview: preview,
        occurred_at: message.occurredAt,
        metadata: {
          phone_number_id: message.phoneNumberId,
          from: message.phone,
        }
      })
    }

    return res.status(200).json({ received: true })
  } catch (err) {
    logger.error({ error: err.message }, 'integrations whatsapp webhook failed')
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

  const exchange = await exchangeGoogleAuthorizationCode('google_calendar', code)

  await upsertIntegration(pool, userId, 'google_calendar', {
    status: exchange.ok ? 'connected' : 'authorization_received',
    external_account_email: exchange.accountEmail,
    access_token_encrypted: exchange.accessTokenEncrypted,
    refresh_token_encrypted: exchange.refreshTokenEncrypted,
    token_expires_at: exchange.tokenExpiresAt,
    scopes: GOOGLE_CALENDAR_SCOPES,
    metadata: {
      oauth_completed_at: new Date().toISOString(),
      token_exchange_error: exchange.error,
    },
  })
  await upsertOAuthTokenRecord(pool, userId, exchange, GOOGLE_CALENDAR_SCOPES)

  if (exchange.ok) {
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

  const exchange = code ? await exchangeGoogleAuthorizationCode('gmail', code) : { ok: false, error: 'google_code_missing' }

  await upsertIntegration(pool, userId, 'gmail', {
    status: exchange.ok ? 'connected' : (code ? 'authorization_received' : 'pending_oauth'),
    external_account_email: exchange.accountEmail,
    access_token_encrypted: exchange.accessTokenEncrypted,
    refresh_token_encrypted: exchange.refreshTokenEncrypted,
    token_expires_at: exchange.tokenExpiresAt,
    scopes: GMAIL_SCOPES,
    metadata: {
      oauth_completed_at: new Date().toISOString(),
      token_exchange_error: exchange.error,
    },
  })
  await upsertOAuthTokenRecord(pool, userId, exchange, GMAIL_SCOPES)

  if (exchange.ok) {
    return res.status(200).send(htmlCallbackResponse('Gmail connecté', 'Votre compte Gmail est maintenant connecté à COURTIA.'))
  }

  return res.status(200).send(htmlCallbackResponse('Connexion Gmail enregistrée', 'Autorisation reçue, mais l\'échange de token n\'a pas pu être finalisé automatiquement. Vérifiez la configuration backend.'))
})

router.get('/google/oauth/callback', async (req, res) => {
  const pool = req.app.locals.pool
  await ensureIntegrationsSchema(pool)

  const statePayload = parseState(req.query.state)
  if (!statePayload || statePayload.provider !== 'google') {
    return res.status(400).send(htmlCallbackResponse('Connexion Google invalide', 'Le state OAuth est invalide ou expiré. Recommencez depuis COURTIA.'))
  }

  const userId = Number(statePayload.userId)
  const code = String(req.query.code || '')
  const providerError = String(req.query.error || '')

  if (providerError) {
    await Promise.all([
      upsertIntegration(pool, userId, 'google_calendar', { status: 'oauth_denied', metadata: { last_oauth_error: providerError } }),
      upsertIntegration(pool, userId, 'gmail', { status: 'oauth_denied', metadata: { last_oauth_error: providerError } }),
    ])
    return res.status(400).send(htmlCallbackResponse('Connexion Google refusée', 'L’autorisation Google a été refusée.'))
  }

  if (!code) {
    return res.status(400).send(htmlCallbackResponse('Connexion Google incomplète', 'Aucun code OAuth reçu.'))
  }

  const exchange = await exchangeGoogleAuthorizationCode('google', code)
  const sharedPatch = {
    status: exchange.ok ? 'connected' : 'authorization_received',
    external_account_email: exchange.accountEmail,
    access_token_encrypted: exchange.accessTokenEncrypted,
    refresh_token_encrypted: exchange.refreshTokenEncrypted,
    token_expires_at: exchange.tokenExpiresAt,
    metadata: {
      oauth_completed_at: new Date().toISOString(),
      token_exchange_error: exchange.error,
      combined_google_oauth: true,
    },
  }

  await Promise.all([
    upsertIntegration(pool, userId, 'google_calendar', { ...sharedPatch, scopes: GOOGLE_CALENDAR_SCOPES }),
    upsertIntegration(pool, userId, 'gmail', { ...sharedPatch, scopes: GMAIL_SCOPES }),
    upsertOAuthTokenRecord(pool, userId, exchange, GOOGLE_COMBINED_SCOPES),
  ])

  if (exchange.ok) {
    return res.status(200).send(htmlCallbackResponse('Google connecté', 'Google Agenda et Gmail sont maintenant connectés à COURTIA.'))
  }

  return res.status(200).send(htmlCallbackResponse('Autorisation Google reçue', 'Autorisation reçue, mais l’échange de token n’a pas pu être finalisé automatiquement. Vérifiez la configuration backend.'))
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
        googleConfigured: isGoogleConfigured('google'),
        googleCalendarConfigured: isGoogleConfigured('google_calendar'),
        gmailConfigured: isGoogleConfigured('gmail'),
        outlookConfigured: isOutlookConfigured(),
        whatsappConfigured: Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID),
      },
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    logger.error({ error: err.message }, 'integrations status failed')
    return res.status(500).json({ error: 'integrations_status_failed' })
  }
})

router.get('/google/status', async (req, res) => {
  try {
    const pool = req.app.locals.pool
    const userId = withUserId(req, res)
    if (!userId) return

    await ensureIntegrationsSchema(pool)
    const [calendar, gmail] = await Promise.all([
      getIntegration(pool, userId, 'google_calendar'),
      getIntegration(pool, userId, 'gmail'),
    ])

    return res.json({
      success: true,
      provider: 'google',
      configured: isGoogleConfigured('google'),
      encryptionReady: hasEncryptionKey(),
      calendar: {
        status: calendar?.status || 'disconnected',
        external_account_email: calendar?.external_account_email || null,
        last_sync_at: calendar?.last_sync_at || null,
        configured: isGoogleConfigured('google_calendar'),
      },
      gmail: {
        status: gmail?.status || 'disconnected',
        external_account_email: gmail?.external_account_email || null,
        last_sync_at: gmail?.last_sync_at || null,
        configured: isGoogleConfigured('gmail'),
      },
    })
  } catch (err) {
    logger.error({ error: err.message }, 'integrations google status failed')
    return res.status(500).json({ error: 'google_status_failed' })
  }
})

router.get('/google/oauth/start', async (req, res) => {
  try {
    const pool = req.app.locals.pool
    const userId = withUserId(req, res)
    if (!userId) return

    await ensureIntegrationsSchema(pool)
    if (!isGoogleConfigured('google')) {
      await Promise.all([
        upsertIntegration(pool, userId, 'google_calendar', { status: 'configuration_required', metadata: { config_missing: true } }),
        upsertIntegration(pool, userId, 'gmail', { status: 'configuration_required', metadata: { config_missing: true } }),
      ])
      return res.status(400).json({
        error: 'google_not_configured',
        details: 'Configurez GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET et GOOGLE_REDIRECT_URI.',
      })
    }

    const state = signState({
      userId,
      provider: 'google',
      issuedAt: Date.now(),
      nonce: crypto.randomBytes(10).toString('hex'),
    })
    const conf = getGoogleConfig('google')
    const oauthClient = new OAuth2Client(conf.clientId, conf.clientSecret, conf.redirectUri)
    const authUrl = oauthClient.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: GOOGLE_COMBINED_SCOPES,
      include_granted_scopes: true,
      state,
    })

    await Promise.all([
      upsertIntegration(pool, userId, 'google_calendar', { status: 'pending_oauth', scopes: GOOGLE_CALENDAR_SCOPES, metadata: { oauth_started_at: new Date().toISOString(), combined_google_oauth: true } }),
      upsertIntegration(pool, userId, 'gmail', { status: 'pending_oauth', scopes: GMAIL_SCOPES, metadata: { oauth_started_at: new Date().toISOString(), combined_google_oauth: true } }),
    ])

    return res.json({ success: true, provider: 'google', authUrl })
  } catch (err) {
    logger.error({ error: err.message }, 'integrations google oauth start failed')
    return res.status(500).json({ error: 'google_oauth_start_failed' })
  }
})

router.post('/google/disconnect', async (req, res) => {
  try {
    const pool = req.app.locals.pool
    const userId = withUserId(req, res)
    if (!userId) return

    const [calendar, gmail] = await Promise.all([
      disconnectIntegration(pool, userId, 'google_calendar'),
      disconnectIntegration(pool, userId, 'gmail'),
    ])
    return res.json({
      success: true,
      provider: 'google',
      integrations: {
        google_calendar: calendar || { provider: 'google_calendar', status: 'disconnected' },
        gmail: gmail || { provider: 'gmail', status: 'disconnected' },
      },
    })
  } catch (err) {
    logger.error({ error: err.message }, 'integrations google disconnect failed')
    return res.status(500).json({ error: 'google_disconnect_failed' })
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
    logger.error({ error: err.message }, 'integrations google calendar status failed')
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
    logger.error({ error: err.message }, 'integrations google calendar connect failed')
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
    logger.error({ error: err.message }, 'integrations google calendar disconnect failed')
    return res.status(500).json({ error: 'google_calendar_disconnect_failed' })
  }
})

async function syncGoogleCalendarHandler(req, res) {
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
    logger.error({ error: err.message }, 'integrations google calendar sync failed')
    return res.status(500).json({
      error: 'google_calendar_sync_failed',
      details: err.response?.data?.error?.message || err.message,
    })
  }
}

router.post('/google-calendar/sync', syncGoogleCalendarHandler)
router.post('/calendar/sync', syncGoogleCalendarHandler)

async function listGoogleCalendarEventsHandler(req, res) {
  try {
    const pool = req.app.locals.pool
    const userId = withUserId(req, res)
    if (!userId) return

    const limit = Number(req.query.limit || 50)
    const events = await listCalendarEvents(pool, userId, { provider: 'google_calendar', limit })
    return res.json({ success: true, provider: 'google_calendar', count: events.length, rows: events })
  } catch (err) {
    logger.error({ error: err.message }, 'integrations google calendar events failed')
    return res.status(500).json({ error: 'google_calendar_events_failed' })
  }
}

router.get('/google-calendar/events', listGoogleCalendarEventsHandler)
router.get('/calendar/events', listGoogleCalendarEventsHandler)

router.get('/whatsapp/status', requireCabinetFeature('v1_whatsapp_business'), async (req, res) => {
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
    logger.error({ error: err.message }, 'integrations whatsapp status failed')
    return res.status(500).json({ error: 'whatsapp_status_failed' })
  }
})

router.post('/whatsapp/configure', requireCabinetFeature('v1_whatsapp_business'), async (req, res) => {
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
    logger.error({ error: err.message }, 'integrations whatsapp configure failed')
    return res.status(500).json({ error: 'whatsapp_configure_failed' })
  }
})

router.post('/whatsapp/send', requireCabinetFeature('v1_whatsapp_business'), async (req, res) => {
  try {
    const pool = req.app.locals.pool
    const userId = withUserId(req, res)
    if (!userId) return

    const body = req.body || {}
    const message = String(body.message || body.body || '').trim()
    const templateId = String(body.templateId || body.template_id || '').trim()
    const templateVariables = Array.isArray(body.templateVariables || body.template_variables)
      ? (body.templateVariables || body.template_variables)
      : []
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

    if (!message && !templateId) {
      return res.status(400).json({ error: 'whatsapp_message_missing' })
    }

    const integration = await getIntegration(pool, userId, 'whatsapp_business')
    const metadata = integration?.metadata || {}
    const phoneNumberId = metadata.phone_number_id || process.env.WHATSAPP_PHONE_NUMBER_ID
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN

    if (!phoneNumberId || !accessToken) {
      return res.status(400).json({
        error: 'whatsapp_not_configured',
        details: 'WHATSAPP_PHONE_NUMBER_ID ou WHATSAPP_ACCESS_TOKEN manquant.',
      })
    }

    const conversation = await findWhatsappConversationByPhone(pool, userId, to)
    const textAllowed = templateId || isWhatsappWindowOpen(conversation?.last_message_at)
    if (!textAllowed) {
      return res.status(400).json({
        error: 'whatsapp_template_required',
        details: 'La fenêtre client 24h est fermée. Utilisez un template Meta approuvé.',
        templates: getWhatsappTemplates(),
      })
    }

    const url = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`
    let whatsappPayload
    try {
      whatsappPayload = buildWhatsappPayload({
        to,
        message,
        templateId,
        templateVariables,
        language: body.language || 'fr',
      })
    } catch (err) {
      return res.status(400).json({ error: err.message || 'whatsapp_payload_invalid' })
    }
    const response = await axios.post(
      url,
      whatsappPayload,
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

    const preview = message || `Template ${templateId}`
    await upsertWhatsappThread(pool, {
      user_id: userId,
      client_id: client?.id || null,
      phone: to,
      external_thread_id: to,
      last_message_preview: preview.slice(0, 220),
      last_message_at: new Date(),
      status: 'open',
      metadata: {
        last_message_direction: 'out',
        template_id: templateId || null,
      },
    })

    const savedConversation = await upsertWhatsappConversation(pool, {
      user_id: userId,
      client_id: client?.id || null,
      phone_e164: to,
      external_conversation_id: to,
      last_message_preview: preview.slice(0, 220),
      last_message_at: new Date(),
      status: 'open',
      metadata: {
        last_message_direction: 'outbound',
        phone_number_id: phoneNumberId,
      },
    })

    if (savedConversation?.id) {
      await insertWhatsappMessage(pool, {
        conversation_id: savedConversation.id,
        external_id: response.data?.messages?.[0]?.id || `out-${Date.now()}`,
        direction: 'outbound',
        body_preview: preview.slice(0, 320),
        status: response.data?.messages?.[0]?.message_status || 'sent',
        template_id: templateId || null,
        sent_at: new Date(),
        metadata: {
          payload_type: whatsappPayload.type,
          phone_number_id: phoneNumberId,
        },
      })
    }

    await recordClientInteraction(pool, {
      user_id: userId,
      client_id: client?.id || null,
      provider: 'whatsapp_business',
      direction: 'out',
      external_id: response.data?.messages?.[0]?.id || null,
      subject: 'Message WhatsApp envoyé',
      body_preview: preview.slice(0, 320),
      occurred_at: new Date(),
      metadata: {
        to,
        phone_number_id: phoneNumberId,
        template_id: templateId || null,
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
    logger.error({ error: err.message }, 'integrations whatsapp send failed')
    return res.status(500).json({
      error: 'whatsapp_send_failed',
      details: err.response?.data?.error?.message || err.message,
    })
  }
})

router.get('/whatsapp/threads', requireCabinetFeature('v1_whatsapp_business'), async (req, res) => {
  try {
    const pool = req.app.locals.pool
    const userId = withUserId(req, res)
    if (!userId) return

    const limit = Number(req.query.limit || 50)
    const clientId = req.query.client_id || req.query.clientId || null
    const rows = await listWhatsappThreads(pool, userId, { limit, clientId })
    return res.json({ success: true, provider: 'whatsapp_business', count: rows.length, rows })
  } catch (err) {
    logger.error({ error: err.message }, 'integrations whatsapp threads failed')
    return res.status(500).json({ error: 'whatsapp_threads_failed' })
  }
})

router.get('/whatsapp/templates', requireCabinetFeature('v1_whatsapp_business'), async (_req, res) => {
  return res.json({ success: true, provider: 'whatsapp_business', templates: getWhatsappTemplates() })
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
      last_sync_at: row?.last_sync_at || null,
      metadata: row?.metadata || {},
    })
  } catch (err) {
    logger.error({ error: err.message }, 'integrations gmail status failed')
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
    logger.error({ error: err.message }, 'integrations gmail connect failed')
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
    logger.error({ error: err.message }, 'integrations gmail disconnect failed')
    return res.status(500).json({ error: 'gmail_disconnect_failed' })
  }
})

router.post('/gmail/sync', async (req, res) => {
  try {
    const userId = withUserId(req, res)
    if (!userId) return
    const pool = req.app.locals.pool

    const row = await getIntegrationSecrets(pool, userId, 'gmail')
    if (!row || (row.status !== 'connected' && row.status !== 'authorization_received')) {
      return res.status(400).json({ error: 'gmail_not_connected' })
    }

    const accessToken = decryptSecret(row.access_token_encrypted)
    if (!accessToken) {
      return res.json({
        success: false,
        provider: 'gmail',
        status: row.status,
        synced: 0,
        details: 'Token Gmail non disponible côté serveur. Connexion prête mais sync API inactive.',
      })
    }

    const list = await axios.get('https://gmail.googleapis.com/gmail/v1/users/me/messages', {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { maxResults: Math.min(Number(req.body?.limit || 10), 25), q: 'newer_than:30d' },
      timeout: 15000,
    })
    const messages = Array.isArray(list.data?.messages) ? list.data.messages : []
    let synced = 0

    for (const message of messages) {
      const detail = await axios.get(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { format: 'metadata', metadataHeaders: ['From', 'To', 'Subject', 'Date'] },
        timeout: 15000,
      })
      const summary = extractGmailMessageSummary(detail.data || {})
      const matchedEmail = emailFromAddress(summary.from) || emailFromAddress(summary.to)
      const client = matchedEmail ? await findClientByEmail(pool, userId, matchedEmail) : null

      await recordEmailThread(pool, userId, client?.id || null, summary, 'inbound')
      await recordClientInteraction(pool, {
        user_id: userId,
        client_id: client?.id || null,
        provider: 'gmail',
        direction: 'in',
        external_id: summary.messageId,
        subject: summary.subject,
        body_preview: summary.snippet,
        occurred_at: summary.sentAt,
        metadata: {
          thread_id: summary.threadId,
          from: summary.from,
          to: summary.to,
        },
      })
      synced += 1
    }

    await upsertIntegration(pool, userId, 'gmail', {
      status: 'connected',
      scopes: GMAIL_SCOPES,
      last_sync_at: new Date(),
      metadata: { last_sync_count: synced },
    })

    return res.json({
      success: true,
      provider: 'gmail',
      status: 'connected',
      synced,
      details: synced > 0 ? 'Messages Gmail synchronisés.' : 'Aucun message récent à synchroniser.',
    })
  } catch (err) {
    logger.error({ error: err.message }, 'integrations gmail sync failed')
    return res.status(500).json({ error: 'gmail_sync_failed', details: err.response?.data?.error?.message || err.message })
  }
})

router.post('/gmail/send', async (req, res) => {
  try {
    const userId = withUserId(req, res)
    if (!userId) return
    const pool = req.app.locals.pool

    const row = await getIntegrationSecrets(pool, userId, 'gmail')
    if (!row || row.status !== 'connected') {
      return res.status(400).json({ error: 'gmail_not_connected' })
    }

    const accessToken = decryptSecret(row.access_token_encrypted)
    if (!accessToken) {
      return res.status(400).json({ error: 'gmail_token_missing', details: 'Reconnectez Gmail pour obtenir un token serveur chiffré.' })
    }

    const body = req.body || {}
    const clientId = Number(body.client_id || body.clientId || 0) || null
    let to = String(body.to || '').trim()
    let client = null
    if (clientId) {
      const clientResult = await pool.query('SELECT id, email FROM clients WHERE id=$1 LIMIT 1', [clientId])
      client = clientResult.rows[0] || null
      to = to || client?.email || ''
    }

    if (!to || !body.subject || !body.body) {
      return res.status(400).json({ error: 'gmail_message_invalid', details: 'Champs requis: to, subject, body.' })
    }

    const raw = encodeGmailRawMessage({
      to,
      from: row.external_account_email || undefined,
      subject: body.subject,
      body: body.body,
    })
    const sent = await axios.post(
      'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
      { raw },
      { headers: { Authorization: `Bearer ${accessToken}` }, timeout: 15000 }
    )

    const summary = {
      messageId: sent.data?.id || null,
      threadId: sent.data?.threadId || null,
      from: row.external_account_email || '',
      to,
      subject: body.subject,
      sentAt: new Date(),
      snippet: String(body.body).slice(0, 220),
    }

    await recordEmailThread(pool, userId, client?.id || clientId || null, summary, 'outbound')
    await recordClientInteraction(pool, {
      user_id: userId,
      client_id: client?.id || clientId || null,
      provider: 'gmail',
      direction: 'out',
      external_id: summary.messageId,
      subject: body.subject,
      body_preview: summary.snippet,
      occurred_at: summary.sentAt,
      metadata: { thread_id: summary.threadId, to },
    })

    return res.json({ success: true, provider: 'gmail', message_id: summary.messageId, thread_id: summary.threadId })
  } catch (err) {
    logger.error({ error: err.message }, 'integrations gmail send failed')
    return res.status(500).json({ error: 'gmail_send_failed', details: err.response?.data?.error?.message || err.message })
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
    logger.error({ error: err.message }, 'integrations outlook status failed')
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
    logger.error({ error: err.message }, 'integrations outlook connect failed')
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
    logger.error({ error: err.message }, 'integrations outlook disconnect failed')
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
    logger.error({ error: err.message }, 'integrations outlook sync failed')
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
    logger.error({ error: err.message }, 'integrations client interactions failed')
    return res.status(500).json({ error: 'client_interactions_failed' })
  }
})

module.exports = {
  router,
  listClientInteractions,
}
