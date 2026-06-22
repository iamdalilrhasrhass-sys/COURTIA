CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS advice_notes (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id              TEXT NOT NULL,
  client_id              TEXT NOT NULL,
  dossier_id             TEXT NOT NULL,
  vertical_key           TEXT NOT NULL DEFAULT 'assurance',
  product_type           TEXT NOT NULL,
  needs_summary          TEXT,
  client_situation       TEXT,
  facts_used             JSONB NOT NULL DEFAULT '[]'::jsonb,
  options_considered     JSONB NOT NULL DEFAULT '[]'::jsonb,
  recommendation         TEXT,
  recommendation_reasons TEXT,
  warnings               JSONB NOT NULL DEFAULT '[]'::jsonb,
  missing_information    JSONB NOT NULL DEFAULT '[]'::jsonb,
  status                 TEXT NOT NULL DEFAULT 'draft'
                         CHECK (status IN ('draft','validated','superseded')),
  generated_by_model     TEXT,
  validated_by           TEXT,
  validated_at           TIMESTAMPTZ,
  superseded_by          TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_advice_notes_dossier
  ON advice_notes (tenant_id, dossier_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_advice_notes_client
  ON advice_notes (tenant_id, client_id, created_at DESC);
