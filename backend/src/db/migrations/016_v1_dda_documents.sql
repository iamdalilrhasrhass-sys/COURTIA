CREATE TABLE IF NOT EXISTS documents (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  contract_id INTEGER REFERENCES contracts(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('fic', 'mandat_courtage', 'devoir_conseil', 'attestation')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'generated', 'sent_to_sign', 'signed', 'refused', 'expired', 'archived')),
  template_version TEXT NOT NULL,
  variables JSONB NOT NULL DEFAULT '{}'::jsonb,
  storage_path TEXT,
  signed_storage_path TEXT,
  yousign_signature_id TEXT,
  generated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  generated_at TIMESTAMPTZ,
  signed_at TIMESTAMPTZ,
  archive_until TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '5 years',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_documents_user_client ON documents(user_id, client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(user_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS documents_blob (
  document_id INTEGER PRIMARY KEY REFERENCES documents(id) ON DELETE CASCADE,
  content BYTEA NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'application/pdf',
  file_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS document_activity_log (
  id SERIAL PRIMARY KEY,
  document_id INTEGER REFERENCES documents(id) ON DELETE SET NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_document_activity_document ON document_activity_log(document_id, created_at DESC);

ALTER TABLE cabinets ADD COLUMN IF NOT EXISTS tutelle_authority TEXT DEFAULT 'ACPR';
ALTER TABLE cabinets ADD COLUMN IF NOT EXISTS dpa_signed_at TIMESTAMPTZ;

INSERT INTO feature_flags (key, description, default_enabled)
VALUES
  ('v1_dda_documents', 'V1 documents métier DDA: FIC, mandat, devoir de conseil et attestations', TRUE)
ON CONFLICT (key) DO UPDATE SET
  description = EXCLUDED.description,
  default_enabled = EXCLUDED.default_enabled;
