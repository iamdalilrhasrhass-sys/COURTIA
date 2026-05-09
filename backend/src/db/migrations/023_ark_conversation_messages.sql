-- 023_ark_conversation_messages.sql
-- Compatibility for legacy ark_conversations schemas.
-- Down migration: src/db/migrations/down/023_ark_conversation_messages.down.sql

CREATE TABLE IF NOT EXISTS ark_conversations (
  id SERIAL PRIMARY KEY,
  client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  user_message TEXT,
  ark_response TEXT,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE ark_conversations
  ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS user_message TEXT,
  ADD COLUMN IF NOT EXISTS ark_response TEXT,
  ADD COLUMN IF NOT EXISTS messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

UPDATE ark_conversations
SET messages = jsonb_strip_nulls(jsonb_build_array(
    jsonb_build_object(
      'role', 'user',
      'content', user_message,
      'timestamp', COALESCE(created_at, NOW())
    ),
    jsonb_build_object(
      'role', 'assistant',
      'content', ark_response,
      'timestamp', COALESCE(created_at, NOW())
    )
  )),
  updated_at = COALESCE(updated_at, created_at, NOW())
WHERE messages = '[]'::jsonb
  AND (user_message IS NOT NULL OR ark_response IS NOT NULL);

UPDATE ark_conversations
SET updated_at = COALESCE(updated_at, created_at, NOW())
WHERE updated_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_ark_conversations_client_updated
  ON ark_conversations(client_id, updated_at DESC);
