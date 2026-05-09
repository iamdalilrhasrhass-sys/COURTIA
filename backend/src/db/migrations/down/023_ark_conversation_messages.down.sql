-- Down migration for 023_ark_conversation_messages.sql
-- Keeps the legacy ark_conversations table and legacy text columns intact.

DROP INDEX IF EXISTS idx_ark_conversations_client_updated;

ALTER TABLE ark_conversations
  DROP COLUMN IF EXISTS messages,
  DROP COLUMN IF EXISTS updated_at;
