-- COURTIA ARK inter-vertical handoff: links between dossiers in the value chain.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE dossiers
  ADD COLUMN IF NOT EXISTS vertical_key TEXT NOT NULL DEFAULT 'assurance';

CREATE TABLE IF NOT EXISTS dossier_links (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       TEXT NOT NULL,
  from_dossier_id TEXT NOT NULL,
  to_dossier_id   TEXT NOT NULL,
  relation        TEXT NOT NULL CHECK (relation IN ('financing','insurance','cross_sell')),
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (from_dossier_id, to_dossier_id)
);

CREATE INDEX IF NOT EXISTS idx_dossier_links_from
  ON dossier_links (tenant_id, from_dossier_id);

CREATE INDEX IF NOT EXISTS idx_dossier_links_to
  ON dossier_links (tenant_id, to_dossier_id);

CREATE INDEX IF NOT EXISTS idx_dossiers_vertical_product
  ON dossiers (tenant_id, client_id, vertical_key, product_type, status);
