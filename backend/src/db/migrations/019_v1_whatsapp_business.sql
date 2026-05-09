-- 019_v1_whatsapp_business.sql
-- WhatsApp Business Cloud API V1: conversations, messages, feature flag.

CREATE TABLE IF NOT EXISTS whatsapp_conversations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
  phone_e164 TEXT NOT NULL,
  external_conversation_id TEXT,
  last_message_preview TEXT,
  last_message_at TIMESTAMP,
  ark_tags TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'open',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, phone_e164)
);

CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  body_preview TEXT,
  media_url TEXT,
  media_type TEXT,
  status TEXT,
  template_id TEXT,
  sent_at TIMESTAMP NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(conversation_id, external_id)
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_user_last
  ON whatsapp_conversations(user_id, last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_client
  ON whatsapp_conversations(user_id, client_id, last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_conversation_sent
  ON whatsapp_messages(conversation_id, sent_at DESC);

INSERT INTO feature_flags (key, description, default_enabled)
VALUES ('v1_whatsapp_business', 'V1 WhatsApp Business Cloud API integration', TRUE)
ON CONFLICT (key) DO UPDATE SET
  description = EXCLUDED.description,
  default_enabled = EXCLUDED.default_enabled;
