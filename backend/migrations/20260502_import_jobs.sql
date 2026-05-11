-- COURTIA Portfolio Import V1 foundation (non destructive)
-- Date: 2026-05-02

CREATE TABLE IF NOT EXISTS import_jobs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id INTEGER,
  filename TEXT NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'preview_ready',
  total_rows INTEGER NOT NULL DEFAULT 0,
  valid_rows INTEGER NOT NULL DEFAULT 0,
  error_rows INTEGER NOT NULL DEFAULT 0,
  duplicate_rows INTEGER NOT NULL DEFAULT 0,
  mapping_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  summary_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_import_jobs_user ON import_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_import_jobs_status ON import_jobs(status);
CREATE INDEX IF NOT EXISTS idx_import_jobs_created_at ON import_jobs(created_at DESC);

CREATE TABLE IF NOT EXISTS import_job_rows (
  id SERIAL PRIMARY KEY,
  import_job_id INTEGER NOT NULL REFERENCES import_jobs(id) ON DELETE CASCADE,
  row_number INTEGER NOT NULL,
  raw_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  mapped_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  status VARCHAR(40) NOT NULL DEFAULT 'pending',
  errors_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_import_job_rows_job ON import_job_rows(import_job_id);
CREATE INDEX IF NOT EXISTS idx_import_job_rows_status ON import_job_rows(status);

-- LOT 18 — Module Sinistres (Claims)
CREATE TABLE IF NOT EXISTS claims (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  contract_id INTEGER REFERENCES quotes(id) ON DELETE SET NULL,
  type VARCHAR(100) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'opened',
  opened_at DATE NOT NULL DEFAULT CURRENT_DATE,
  closed_at DATE,
  description TEXT,
  amount DECIMAL(12, 2),
  insurer_ref VARCHAR(100),
  ark_summary TEXT,
  courtier_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_claims_client_id ON claims(client_id);
CREATE INDEX IF NOT EXISTS idx_claims_courtier_id ON claims(courtier_id);
CREATE INDEX IF NOT EXISTS idx_claims_status ON claims(status);
CREATE INDEX IF NOT EXISTS idx_claims_opened_at ON claims(opened_at);

-- LOT 18 — Inscriptions Beta Marketing
CREATE TABLE IF NOT EXISTS beta_signups (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  cabinet_name VARCHAR(255),
  orias VARCHAR(20),
  portfolio_size VARCHAR(50),
  source VARCHAR(100) DEFAULT 'landing',
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_beta_signups_email ON beta_signups(email);
CREATE INDEX IF NOT EXISTS idx_beta_signups_created_at ON beta_signups(created_at);
