-- COURTIA ARK WhatsApp Cloud intake: inbound events and Meta account routing.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS inbound_events (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          TEXT,
  provider           TEXT NOT NULL,
  event_type         TEXT NOT NULL,
  external_id        TEXT,
  from_identifier    TEXT,
  client_id          TEXT,
  raw_payload        JSONB NOT NULL,
  normalized_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status             TEXT NOT NULL DEFAULT 'received'
                     CHECK (status IN ('received','processed','failed','ignored')),
  processed_at       TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_inbound_external
  ON inbound_events (provider, external_id)
  WHERE external_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_inbound_client
  ON inbound_events (tenant_id, client_id, created_at DESC);

CREATE TABLE IF NOT EXISTS whatsapp_accounts (
  phone_number_id TEXT PRIMARY KEY,
  tenant_id       TEXT NOT NULL,
  display_number  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
