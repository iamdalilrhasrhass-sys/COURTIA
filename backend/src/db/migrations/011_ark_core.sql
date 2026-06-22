-- COURTIA ARK core: immutable event log, governed dossiers, approvable AI actions.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS events (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      TEXT NOT NULL,
  aggregate_type TEXT NOT NULL,
  aggregate_id   TEXT NOT NULL,
  event_type     TEXT NOT NULL,
  actor_type     TEXT NOT NULL CHECK (actor_type IN ('human','ark','system','client')),
  actor_id       TEXT,
  payload        JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  seq            BIGSERIAL
);

CREATE INDEX IF NOT EXISTS idx_events_aggregate
  ON events (tenant_id, aggregate_type, aggregate_id, seq);

CREATE INDEX IF NOT EXISTS idx_events_type
  ON events (tenant_id, event_type, occurred_at DESC);

CREATE OR REPLACE FUNCTION events_immutable() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'events is append-only: % forbidden', TG_OP
    USING ERRCODE = 'check_violation';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_events_immutable ON events;
CREATE TRIGGER trg_events_immutable
  BEFORE UPDATE OR DELETE ON events
  FOR EACH ROW EXECUTE FUNCTION events_immutable();

CREATE TABLE IF NOT EXISTS dossiers (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         TEXT NOT NULL,
  client_id         TEXT NOT NULL,
  vertical_key      TEXT NOT NULL DEFAULT 'assurance',
  product_type      TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'lead',
  completion_score  INTEGER NOT NULL DEFAULT 0 CHECK (completion_score BETWEEN 0 AND 100),
  estimated_premium NUMERIC(12,2),
  assigned_to       TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE dossiers ADD COLUMN IF NOT EXISTS vertical_key TEXT NOT NULL DEFAULT 'assurance';

CREATE INDEX IF NOT EXISTS idx_dossiers_tenant_status
  ON dossiers (tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_dossiers_client
  ON dossiers (client_id);

CREATE TABLE IF NOT EXISTS ai_actions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         TEXT NOT NULL,
  client_id         TEXT,
  dossier_id        TEXT,
  agent_key         TEXT NOT NULL DEFAULT 'ark',
  action_type       TEXT NOT NULL,
  title             TEXT NOT NULL,
  rationale         TEXT,
  payload           JSONB NOT NULL DEFAULT '{}'::jsonb,
  priority          TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','executed','failed')),
  requires_approval BOOLEAN NOT NULL DEFAULT TRUE,
  approved_by       TEXT,
  approved_at       TIMESTAMPTZ,
  executed_at       TIMESTAMPTZ,
  result            JSONB NOT NULL DEFAULT '{}'::jsonb,
  expires_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_actions_pending
  ON ai_actions (tenant_id, status, priority, created_at DESC);

CREATE TABLE IF NOT EXISTS ark_daily_briefs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    TEXT NOT NULL,
  user_id      TEXT NOT NULL,
  brief_date   DATE NOT NULL,
  summary      TEXT,
  kpis         JSONB NOT NULL DEFAULT '{}'::jsonb,
  priorities   JSONB NOT NULL DEFAULT '[]'::jsonb,
  model        TEXT,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, user_id, brief_date)
);

CREATE INDEX IF NOT EXISTS idx_briefs_lookup
  ON ark_daily_briefs (tenant_id, user_id, brief_date DESC);
