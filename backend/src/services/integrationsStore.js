let ensureSchemaPromise = null

const PROVIDERS = ['google_calendar', 'whatsapp_business', 'gmail', 'outlook']

function getUserId(reqUser = {}) {
  return Number(reqUser.id || reqUser.userId || 0)
}

function normalizeProvider(provider = '') {
  return String(provider || '').trim().toLowerCase()
}

function sanitizeStatus(status = '') {
  const value = String(status || '').trim().toLowerCase()
  return value || 'disconnected'
}

async function ensureIntegrationsSchema(pool) {
  if (!ensureSchemaPromise) {
    ensureSchemaPromise = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS integrations (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          provider TEXT NOT NULL,
          status TEXT DEFAULT 'disconnected',
          external_account_email TEXT,
          access_token_encrypted TEXT,
          refresh_token_encrypted TEXT,
          token_expires_at TIMESTAMP,
          scopes TEXT[],
          metadata JSONB DEFAULT '{}',
          last_sync_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(user_id, provider)
        );
      `)

      await pool.query(`
        CREATE TABLE IF NOT EXISTS client_interactions (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
          provider TEXT NOT NULL,
          direction TEXT,
          external_id TEXT,
          subject TEXT,
          body_preview TEXT,
          occurred_at TIMESTAMP,
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP DEFAULT NOW()
        );
      `)

      await pool.query(`
        CREATE TABLE IF NOT EXISTS calendar_events (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
          provider TEXT DEFAULT 'google_calendar',
          external_event_id TEXT,
          title TEXT,
          description TEXT,
          location TEXT,
          start_time TIMESTAMP,
          end_time TIMESTAMP,
          status TEXT,
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(user_id, provider, external_event_id)
        );
      `)

      await pool.query(`
        CREATE TABLE IF NOT EXISTS whatsapp_threads (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
          phone TEXT,
          external_thread_id TEXT,
          last_message_preview TEXT,
          last_message_at TIMESTAMP,
          status TEXT DEFAULT 'open',
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(user_id, phone)
        );
      `)

      await pool.query('CREATE INDEX IF NOT EXISTS idx_integrations_user_provider ON integrations(user_id, provider);')
      await pool.query('CREATE INDEX IF NOT EXISTS idx_client_interactions_user_client ON client_interactions(user_id, client_id, occurred_at DESC);')
      await pool.query('CREATE INDEX IF NOT EXISTS idx_calendar_events_user_start ON calendar_events(user_id, start_time);')
      await pool.query('CREATE INDEX IF NOT EXISTS idx_whatsapp_threads_user_last ON whatsapp_threads(user_id, last_message_at DESC);')

      await pool.query('ALTER TABLE demo_requests ADD COLUMN IF NOT EXISTS current_tools TEXT;').catch(() => {})
      await pool.query('ALTER TABLE demo_requests ADD COLUMN IF NOT EXISTS wants_google_calendar BOOLEAN DEFAULT false;').catch(() => {})
      await pool.query('ALTER TABLE demo_requests ADD COLUMN IF NOT EXISTS wants_whatsapp BOOLEAN DEFAULT false;').catch(() => {})
      await pool.query('ALTER TABLE demo_requests ADD COLUMN IF NOT EXISTS wants_email_sync BOOLEAN DEFAULT false;').catch(() => {})
    })()
  }

  return ensureSchemaPromise
}

async function getIntegration(pool, userId, provider) {
  const normalizedProvider = normalizeProvider(provider)
  if (!normalizedProvider) return null

  await ensureIntegrationsSchema(pool)

  const result = await pool.query(
    `SELECT id, user_id, provider, status, external_account_email, token_expires_at,
            scopes, metadata, last_sync_at, created_at, updated_at
     FROM integrations
     WHERE user_id = $1 AND provider = $2
     LIMIT 1`,
    [userId, normalizedProvider]
  )

  return result.rows[0] || null
}

async function getIntegrationSecrets(pool, userId, provider) {
  const normalizedProvider = normalizeProvider(provider)
  if (!normalizedProvider) return null

  await ensureIntegrationsSchema(pool)

  const result = await pool.query(
    `SELECT id, user_id, provider, status, external_account_email, token_expires_at,
            scopes, metadata, last_sync_at, created_at, updated_at,
            access_token_encrypted, refresh_token_encrypted
     FROM integrations
     WHERE user_id = $1 AND provider = $2
     LIMIT 1`,
    [userId, normalizedProvider]
  )

  return result.rows[0] || null
}

async function upsertIntegration(pool, userId, provider, patch = {}) {
  const normalizedProvider = normalizeProvider(provider)
  if (!normalizedProvider) {
    throw new Error('provider_required')
  }

  await ensureIntegrationsSchema(pool)

  const payload = {
    status: sanitizeStatus(patch.status || 'disconnected'),
    external_account_email: patch.external_account_email || null,
    access_token_encrypted: patch.access_token_encrypted || null,
    refresh_token_encrypted: patch.refresh_token_encrypted || null,
    token_expires_at: patch.token_expires_at || null,
    scopes: Array.isArray(patch.scopes) ? patch.scopes : null,
    metadata: patch.metadata || {},
    last_sync_at: patch.last_sync_at || null,
  }

  const result = await pool.query(
    `INSERT INTO integrations (
        user_id, provider, status, external_account_email,
        access_token_encrypted, refresh_token_encrypted, token_expires_at,
        scopes, metadata, last_sync_at, created_at, updated_at
     )
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,NOW(),NOW())
     ON CONFLICT (user_id, provider)
     DO UPDATE SET
        status = EXCLUDED.status,
        external_account_email = COALESCE(EXCLUDED.external_account_email, integrations.external_account_email),
        access_token_encrypted = COALESCE(EXCLUDED.access_token_encrypted, integrations.access_token_encrypted),
        refresh_token_encrypted = COALESCE(EXCLUDED.refresh_token_encrypted, integrations.refresh_token_encrypted),
        token_expires_at = COALESCE(EXCLUDED.token_expires_at, integrations.token_expires_at),
        scopes = COALESCE(EXCLUDED.scopes, integrations.scopes),
        metadata = COALESCE(integrations.metadata, '{}'::jsonb) || COALESCE(EXCLUDED.metadata, '{}'::jsonb),
        last_sync_at = COALESCE(EXCLUDED.last_sync_at, integrations.last_sync_at),
        updated_at = NOW()
     RETURNING id, user_id, provider, status, external_account_email, token_expires_at,
               scopes, metadata, last_sync_at, created_at, updated_at`,
    [
      userId,
      normalizedProvider,
      payload.status,
      payload.external_account_email,
      payload.access_token_encrypted,
      payload.refresh_token_encrypted,
      payload.token_expires_at,
      payload.scopes,
      JSON.stringify(payload.metadata || {}),
      payload.last_sync_at,
    ]
  )

  return result.rows[0] || null
}

async function disconnectIntegration(pool, userId, provider) {
  const normalizedProvider = normalizeProvider(provider)
  await ensureIntegrationsSchema(pool)

  const result = await pool.query(
    `UPDATE integrations
     SET status = 'disconnected',
         external_account_email = NULL,
         access_token_encrypted = NULL,
         refresh_token_encrypted = NULL,
         token_expires_at = NULL,
         scopes = NULL,
         metadata = COALESCE(metadata, '{}'::jsonb) || '{"disconnect_reason":"user_request"}'::jsonb,
         updated_at = NOW()
     WHERE user_id = $1 AND provider = $2
     RETURNING id, user_id, provider, status, external_account_email, token_expires_at,
               scopes, metadata, last_sync_at, created_at, updated_at`,
    [userId, normalizedProvider]
  )

  return result.rows[0] || null
}

async function getAllIntegrationStatuses(pool, userId) {
  await ensureIntegrationsSchema(pool)

  const result = await pool.query(
    `SELECT provider, status, external_account_email, token_expires_at, scopes, metadata, last_sync_at, updated_at
     FROM integrations
     WHERE user_id = $1`,
    [userId]
  )

  const map = {}
  for (const row of result.rows) {
    map[row.provider] = row
  }

  return PROVIDERS.map((provider) => map[provider] || {
    provider,
    status: 'disconnected',
    external_account_email: null,
    token_expires_at: null,
    scopes: null,
    metadata: {},
    last_sync_at: null,
    updated_at: null,
  })
}

async function listCalendarEvents(pool, userId, { provider = 'google_calendar', limit = 50 } = {}) {
  await ensureIntegrationsSchema(pool)

  const result = await pool.query(
    `SELECT id, user_id, client_id, provider, external_event_id, title, description, location,
            start_time, end_time, status, metadata, created_at, updated_at
     FROM calendar_events
     WHERE user_id = $1 AND provider = $2
     ORDER BY start_time ASC NULLS LAST
     LIMIT $3`,
    [userId, normalizeProvider(provider), Math.min(Math.max(Number(limit) || 50, 1), 500)]
  )

  return result.rows
}

async function upsertCalendarEvent(pool, userId, event) {
  await ensureIntegrationsSchema(pool)

  const result = await pool.query(
    `INSERT INTO calendar_events (
        user_id, client_id, provider, external_event_id, title, description, location,
        start_time, end_time, status, metadata, created_at, updated_at
     )
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,NOW(),NOW())
     ON CONFLICT (user_id, provider, external_event_id)
     DO UPDATE SET
       client_id = EXCLUDED.client_id,
       title = EXCLUDED.title,
       description = EXCLUDED.description,
       location = EXCLUDED.location,
       start_time = EXCLUDED.start_time,
       end_time = EXCLUDED.end_time,
       status = EXCLUDED.status,
       metadata = COALESCE(calendar_events.metadata, '{}'::jsonb) || COALESCE(EXCLUDED.metadata, '{}'::jsonb),
       updated_at = NOW()
     RETURNING *`,
    [
      userId,
      event.client_id || null,
      normalizeProvider(event.provider || 'google_calendar'),
      event.external_event_id,
      event.title || null,
      event.description || null,
      event.location || null,
      event.start_time || null,
      event.end_time || null,
      event.status || 'confirmed',
      JSON.stringify(event.metadata || {}),
    ]
  )

  return result.rows[0]
}

async function recordClientInteraction(pool, row) {
  await ensureIntegrationsSchema(pool)

  const result = await pool.query(
    `INSERT INTO client_interactions (
        user_id, client_id, provider, direction, external_id, subject,
        body_preview, occurred_at, metadata, created_at
     )
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,NOW())
     RETURNING *`,
    [
      row.user_id || null,
      row.client_id || null,
      normalizeProvider(row.provider),
      row.direction || null,
      row.external_id || null,
      row.subject || null,
      row.body_preview || null,
      row.occurred_at || new Date(),
      JSON.stringify(row.metadata || {}),
    ]
  )

  return result.rows[0]
}

async function listClientInteractions(pool, userId, clientId, { limit = 50 } = {}) {
  await ensureIntegrationsSchema(pool)

  const result = await pool.query(
    `SELECT id, user_id, client_id, provider, direction, external_id, subject, body_preview,
            occurred_at, metadata, created_at
     FROM client_interactions
     WHERE user_id = $1 AND client_id = $2
     ORDER BY occurred_at DESC NULLS LAST, created_at DESC
     LIMIT $3`,
    [userId, clientId, Math.min(Math.max(Number(limit) || 50, 1), 300)]
  )

  return result.rows
}

async function listWhatsappThreads(pool, userId, { limit = 50 } = {}) {
  await ensureIntegrationsSchema(pool)
  const result = await pool.query(
    `SELECT id, user_id, client_id, phone, external_thread_id, last_message_preview,
            last_message_at, status, metadata, created_at, updated_at
     FROM whatsapp_threads
     WHERE user_id = $1
     ORDER BY last_message_at DESC NULLS LAST, updated_at DESC
     LIMIT $2`,
    [userId, Math.min(Math.max(Number(limit) || 50, 1), 500)]
  )
  return result.rows
}

async function upsertWhatsappThread(pool, row) {
  await ensureIntegrationsSchema(pool)
  const result = await pool.query(
    `INSERT INTO whatsapp_threads (
        user_id, client_id, phone, external_thread_id, last_message_preview,
        last_message_at, status, metadata, created_at, updated_at
     )
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,NOW(),NOW())
     ON CONFLICT (user_id, phone)
     DO UPDATE SET
       client_id = COALESCE(EXCLUDED.client_id, whatsapp_threads.client_id),
       external_thread_id = COALESCE(EXCLUDED.external_thread_id, whatsapp_threads.external_thread_id),
       last_message_preview = EXCLUDED.last_message_preview,
       last_message_at = EXCLUDED.last_message_at,
       status = COALESCE(EXCLUDED.status, whatsapp_threads.status),
       metadata = COALESCE(whatsapp_threads.metadata, '{}'::jsonb) || COALESCE(EXCLUDED.metadata, '{}'::jsonb),
       updated_at = NOW()
     RETURNING *`,
    [
      row.user_id,
      row.client_id || null,
      row.phone || null,
      row.external_thread_id || null,
      row.last_message_preview || null,
      row.last_message_at || new Date(),
      row.status || 'open',
      JSON.stringify(row.metadata || {}),
    ]
  )

  return result.rows[0]
}

async function findClientByPhone(pool, userId, phone) {
  if (!phone) return null
  await ensureIntegrationsSchema(pool)

  const sanitized = String(phone).replace(/\D/g, '')
  const result = await pool.query(
    `SELECT id, first_name, last_name, phone, email
     FROM clients
     WHERE courtier_id = $1
       AND REGEXP_REPLACE(COALESCE(phone, ''), '[^0-9]', '', 'g') = $2
     LIMIT 1`,
    [userId, sanitized]
  )

  return result.rows[0] || null
}

async function findClientByEmail(pool, userId, email) {
  if (!email) return null
  await ensureIntegrationsSchema(pool)

  const normalizedEmail = String(email || '').trim().toLowerCase()
  const result = await pool.query(
    `SELECT id, first_name, last_name, phone, email
     FROM clients
     WHERE courtier_id = $1 AND LOWER(email) = $2
     LIMIT 1`,
    [userId, normalizedEmail]
  )

  return result.rows[0] || null
}

module.exports = {
  PROVIDERS,
  getUserId,
  normalizeProvider,
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
}
