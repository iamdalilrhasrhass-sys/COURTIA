-- 011_integrations_core.sql
-- Intégrations externes (Google Calendar, WhatsApp Business, Gmail, Outlook)
-- + timeline interactions + extension demo requests

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

CREATE INDEX IF NOT EXISTS idx_integrations_user_provider ON integrations(user_id, provider);
CREATE INDEX IF NOT EXISTS idx_client_interactions_user_client ON client_interactions(user_id, client_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_start ON calendar_events(user_id, start_time);
CREATE INDEX IF NOT EXISTS idx_whatsapp_threads_user_last ON whatsapp_threads(user_id, last_message_at DESC);

ALTER TABLE demo_requests ADD COLUMN IF NOT EXISTS current_tools TEXT;
ALTER TABLE demo_requests ADD COLUMN IF NOT EXISTS wants_google_calendar BOOLEAN DEFAULT false;
ALTER TABLE demo_requests ADD COLUMN IF NOT EXISTS wants_whatsapp BOOLEAN DEFAULT false;
ALTER TABLE demo_requests ADD COLUMN IF NOT EXISTS wants_email_sync BOOLEAN DEFAULT false;
