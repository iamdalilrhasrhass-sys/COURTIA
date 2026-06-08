-- COURTIA ARK dossier intelligence: client documents and provenance data points.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS client_documents (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     TEXT NOT NULL,
  client_id     TEXT NOT NULL,
  dossier_id    TEXT,
  uploaded_by   TEXT,
  source        TEXT NOT NULL DEFAULT 'manual_upload'
                CHECK (source IN ('manual_upload','whatsapp','email','api')),
  document_type TEXT,
  file_url      TEXT NOT NULL,
  file_name     TEXT,
  mime_type     TEXT,
  status        TEXT NOT NULL DEFAULT 'uploaded'
                CHECK (status IN ('uploaded','extracting','extracted','failed')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE client_documents
  ADD COLUMN IF NOT EXISTS tenant_id TEXT,
  ADD COLUMN IF NOT EXISTS dossier_id TEXT,
  ADD COLUMN IF NOT EXISTS uploaded_by TEXT,
  ADD COLUMN IF NOT EXISTS file_url TEXT,
  ADD COLUMN IF NOT EXISTS file_name TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

UPDATE client_documents
   SET tenant_id = COALESCE(tenant_id, broker_id::text, 'legacy')
 WHERE tenant_id IS NULL;

ALTER TABLE client_documents
  ALTER COLUMN tenant_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_client_documents_client
  ON client_documents (tenant_id, client_id);

CREATE INDEX IF NOT EXISTS idx_client_documents_dossier
  ON client_documents (dossier_id);

CREATE TABLE IF NOT EXISTS data_points (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     TEXT NOT NULL,
  client_id     TEXT NOT NULL,
  field_key     TEXT NOT NULL,
  value         JSONB NOT NULL,
  source        TEXT NOT NULL,
  source_ref    UUID,
  confidence    NUMERIC(4,3),
  verified_by   TEXT,
  verified_at   TIMESTAMPTZ,
  superseded_by UUID,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_data_points_active
  ON data_points (tenant_id, client_id, field_key)
  WHERE superseded_by IS NULL;
