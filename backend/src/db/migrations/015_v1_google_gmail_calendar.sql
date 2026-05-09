CREATE TABLE IF NOT EXISTS oauth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('google', 'microsoft')),
  account_email TEXT,
  access_token_enc TEXT,
  refresh_token_enc TEXT,
  scopes TEXT[] NOT NULL DEFAULT '{}',
  expires_at TIMESTAMPTZ,
  last_sync_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, provider, account_email)
);
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_user_provider ON oauth_tokens(user_id, provider);

CREATE TABLE IF NOT EXISTS email_threads (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
  provider TEXT NOT NULL DEFAULT 'gmail',
  external_thread_id TEXT NOT NULL,
  subject TEXT,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  participants TEXT[] NOT NULL DEFAULT '{}',
  ark_tags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, provider, external_thread_id)
);
CREATE INDEX IF NOT EXISTS idx_email_threads_user_client ON email_threads(user_id, client_id, last_message_at DESC);

CREATE TABLE IF NOT EXISTS email_messages (
  id SERIAL PRIMARY KEY,
  thread_id INTEGER NOT NULL REFERENCES email_threads(id) ON DELETE CASCADE,
  external_message_id TEXT NOT NULL,
  from_address TEXT,
  to_addresses TEXT[] NOT NULL DEFAULT '{}',
  cc_addresses TEXT[] NOT NULL DEFAULT '{}',
  subject TEXT,
  body_preview TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  ark_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (thread_id, external_message_id)
);
CREATE INDEX IF NOT EXISTS idx_email_messages_thread_sent ON email_messages(thread_id, sent_at DESC);

INSERT INTO feature_flags (key, description, default_enabled)
VALUES
  ('v1_google_gmail_calendar', 'V1 Google OAuth, Gmail and Google Calendar integrations', TRUE)
ON CONFLICT (key) DO UPDATE SET
  description = EXCLUDED.description,
  default_enabled = EXCLUDED.default_enabled;
