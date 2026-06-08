CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS prospects (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     TEXT NOT NULL,
  full_name     TEXT,
  company       TEXT,
  email         TEXT,
  phone         TEXT,
  sector        TEXT,
  source        TEXT,
  status        TEXT NOT NULL DEFAULT 'new'
                CHECK (status IN ('new','queued','contacted','replied','qualified','unqualified','opted_out')),
  notes         TEXT,
  opt_out_token TEXT NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex') UNIQUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, email)
);

CREATE INDEX IF NOT EXISTS idx_prospects_tenant
  ON prospects (tenant_id, status, sector);

CREATE TABLE IF NOT EXISTS prospect_messages (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         TEXT NOT NULL,
  prospect_id       UUID NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  channel           TEXT NOT NULL DEFAULT 'email',
  step              INTEGER NOT NULL DEFAULT 1,
  subject           TEXT,
  body              TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','approved','sent','failed','cancelled')),
  sent_at           TIMESTAMPTZ,
  provider_response JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prospect_messages_lookup
  ON prospect_messages (tenant_id, prospect_id, status);
