-- Courtiark — prospection commerciale France
-- Domaine isolé des clients assurés et du module REACH marketing.

ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(80);
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(30) NOT NULL DEFAULT 'active';
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_reason TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_users_username_lower
  ON users (LOWER(username)) WHERE username IS NOT NULL AND deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS sales_import_jobs (
  id BIGSERIAL PRIMARY KEY,
  created_by INTEGER NOT NULL REFERENCES users(id),
  source VARCHAR(80) NOT NULL DEFAULT 'csv',
  source_label VARCHAR(255),
  file_name VARCHAR(255) NOT NULL,
  file_sha256 CHAR(64) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'previewed',
  import_mode VARCHAR(20) NOT NULL DEFAULT 'upsert',
  total_rows INTEGER NOT NULL DEFAULT 0,
  valid_rows INTEGER NOT NULL DEFAULT 0,
  error_rows INTEGER NOT NULL DEFAULT 0,
  created_rows INTEGER NOT NULL DEFAULT 0,
  updated_rows INTEGER NOT NULL DEFAULT 0,
  skipped_rows INTEGER NOT NULL DEFAULT 0,
  errors JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_cabinet_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_snapshots JSONB NOT NULL DEFAULT '[]'::jsonb,
  committed_at TIMESTAMPTZ,
  rolled_back_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sales_import_rows (
  id BIGSERIAL PRIMARY KEY,
  import_job_id BIGINT NOT NULL REFERENCES sales_import_jobs(id) ON DELETE CASCADE,
  row_number INTEGER NOT NULL,
  normalized_data JSONB NOT NULL,
  validation_errors JSONB NOT NULL DEFAULT '[]'::jsonb,
  duplicate_cabinet_id BIGINT,
  action VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(import_job_id, row_number)
);

CREATE TABLE IF NOT EXISTS sales_cabinets (
  id BIGSERIAL PRIMARY KEY,
  legal_name VARCHAR(255) NOT NULL,
  trade_name VARCHAR(255),
  siren VARCHAR(9),
  siret VARCHAR(14),
  orias_number VARCHAR(40),
  address TEXT,
  postal_code VARCHAR(10),
  city VARCHAR(120),
  department VARCHAR(100),
  region VARCHAR(120),
  phone VARCHAR(40),
  professional_email VARCHAR(255),
  website VARCHAR(500),
  legal_representative_name VARCHAR(255),
  primary_contact_name VARCHAR(255),
  primary_contact_role VARCHAR(160),
  employee_count INTEGER,
  revenue_eur NUMERIC(16,2),
  establishment_count INTEGER,
  company_category VARCHAR(80),
  size_category VARCHAR(80) NOT NULL DEFAULT 'independant_micro',
  size_score NUMERIC(6,2) NOT NULL DEFAULT 0,
  size_is_estimated BOOLEAN NOT NULL DEFAULT TRUE,
  size_explanation TEXT,
  data_source VARCHAR(120) NOT NULL DEFAULT 'manual',
  source_url TEXT,
  verified_at TIMESTAMPTZ,
  assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
  commercial_status VARCHAR(50) NOT NULL DEFAULT 'non_attribue',
  priority VARCHAR(12) NOT NULL DEFAULT 'normale',
  interest_level VARCHAR(20),
  last_action_at TIMESTAMPTZ,
  next_action VARCHAR(120),
  next_followup_at TIMESTAMPTZ,
  notes TEXT,
  is_client BOOLEAN NOT NULL DEFAULT FALSE,
  do_not_contact BOOLEAN NOT NULL DEFAULT FALSE,
  import_job_id BIGINT REFERENCES sales_import_jobs(id) ON DELETE SET NULL,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT sales_cabinets_siren_format CHECK (siren IS NULL OR siren ~ '^[0-9]{9}$'),
  CONSTRAINT sales_cabinets_siret_format CHECK (siret IS NULL OR siret ~ '^[0-9]{14}$'),
  CONSTRAINT sales_cabinets_priority_check CHECK (priority IN ('basse','normale','haute','urgente')),
  CONSTRAINT sales_cabinets_interest_check CHECK (interest_level IS NULL OR interest_level IN ('faible','moyen','fort','tres_fort')),
  CONSTRAINT sales_cabinets_status_check CHECK (commercial_status IN (
    'non_attribue','a_contacter','appel_en_cours','appel_tente','injoignable','a_rappeler',
    'contact_etabli','contact_qualifie','interesse','rdv_a_programmer','rdv_programme',
    'demo_programmee','demo_realisee','proposition_a_envoyer','proposition_envoyee',
    'negociation','signe','client_actif','refuse','pas_interesse','non_pertinent',
    'ne_plus_contacter','cabinet_ferme'
  ))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_sales_cabinets_siren
  ON sales_cabinets(siren) WHERE siren IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_sales_cabinets_siret
  ON sales_cabinets(siret) WHERE siret IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sales_cabinets_assignment ON sales_cabinets(assigned_to, commercial_status);
CREATE INDEX IF NOT EXISTS idx_sales_cabinets_next_followup ON sales_cabinets(next_followup_at);
CREATE INDEX IF NOT EXISTS idx_sales_cabinets_size ON sales_cabinets(size_score, id);
CREATE INDEX IF NOT EXISTS idx_sales_cabinets_geo ON sales_cabinets(region, department, city);
CREATE INDEX IF NOT EXISTS idx_sales_cabinets_search ON sales_cabinets(LOWER(legal_name), LOWER(COALESCE(trade_name, '')));

ALTER TABLE sales_import_rows
  DROP CONSTRAINT IF EXISTS sales_import_rows_duplicate_cabinet_id_fkey;
ALTER TABLE sales_import_rows
  ADD CONSTRAINT sales_import_rows_duplicate_cabinet_id_fkey
  FOREIGN KEY (duplicate_cabinet_id) REFERENCES sales_cabinets(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS sales_cabinet_assignments (
  id BIGSERIAL PRIMARY KEY,
  cabinet_id BIGINT NOT NULL REFERENCES sales_cabinets(id) ON DELETE CASCADE,
  from_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  to_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  assignment_method VARCHAR(40) NOT NULL DEFAULT 'manual',
  assignment_criteria JSONB NOT NULL DEFAULT '{}'::jsonb,
  justification TEXT,
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sales_assignment_history ON sales_cabinet_assignments(cabinet_id, created_at DESC);

CREATE TABLE IF NOT EXISTS sales_cabinet_locks (
  cabinet_id BIGINT PRIMARY KEY REFERENCES sales_cabinets(id) ON DELETE CASCADE,
  locked_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  locked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  locked_until TIMESTAMPTZ NOT NULL,
  lock_token UUID NOT NULL,
  CHECK (locked_until > locked_at)
);
CREATE INDEX IF NOT EXISTS idx_sales_locks_expiry ON sales_cabinet_locks(locked_until);

CREATE TABLE IF NOT EXISTS sales_calls (
  id BIGSERIAL PRIMARY KEY,
  cabinet_id BIGINT NOT NULL REFERENCES sales_cabinets(id) ON DELETE CASCADE,
  commercial_id INTEGER NOT NULL REFERENCES users(id),
  lock_token UUID,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  reached BOOLEAN,
  outcome VARCHAR(40),
  contacted_person_name VARCHAR(255),
  contacted_person_role VARCHAR(160),
  direct_phone VARCHAR(40),
  direct_email VARCHAR(255),
  interest_level VARCHAR(20),
  identified_need TEXT,
  comment TEXT,
  next_step VARCHAR(60),
  callback_decision VARCHAR(20),
  callback_at TIMESTAMPTZ,
  suggested_time VARCHAR(80),
  alternate_contact VARCHAR(255),
  alternate_phone VARCHAR(40),
  alternate_email VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT sales_calls_reached_check CHECK (reached IS NULL OR reached IN (TRUE, FALSE)),
  CONSTRAINT sales_calls_interest_check CHECK (interest_level IS NULL OR interest_level IN ('faible','moyen','fort','tres_fort')),
  CONSTRAINT sales_calls_callback_check CHECK (callback_decision IS NULL OR callback_decision IN ('oui','non','plus_tard'))
);
CREATE INDEX IF NOT EXISTS idx_sales_calls_cabinet ON sales_calls(cabinet_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_calls_commercial ON sales_calls(commercial_id, started_at DESC);

CREATE TABLE IF NOT EXISTS sales_cabinet_notes (
  id BIGSERIAL PRIMARY KEY,
  cabinet_id BIGINT NOT NULL REFERENCES sales_cabinets(id) ON DELETE CASCADE,
  author_id INTEGER NOT NULL REFERENCES users(id),
  body TEXT NOT NULL,
  supersedes_note_id BIGINT REFERENCES sales_cabinet_notes(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sales_notes_cabinet ON sales_cabinet_notes(cabinet_id, created_at DESC);

CREATE TABLE IF NOT EXISTS sales_followups (
  id BIGSERIAL PRIMARY KEY,
  cabinet_id BIGINT NOT NULL REFERENCES sales_cabinets(id) ON DELETE CASCADE,
  assigned_to INTEGER NOT NULL REFERENCES users(id),
  created_by INTEGER NOT NULL REFERENCES users(id),
  due_at TIMESTAMPTZ NOT NULL,
  type VARCHAR(40) NOT NULL DEFAULT 'rappel',
  instructions TEXT,
  status VARCHAR(24) NOT NULL DEFAULT 'planifie',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT sales_followups_status_check CHECK (status IN ('planifie','termine','annule','en_retard'))
);
CREATE INDEX IF NOT EXISTS idx_sales_followups_due ON sales_followups(assigned_to, status, due_at);

CREATE TABLE IF NOT EXISTS sales_appointments (
  id BIGSERIAL PRIMARY KEY,
  cabinet_id BIGINT NOT NULL REFERENCES sales_cabinets(id) ON DELETE CASCADE,
  owner_id INTEGER NOT NULL REFERENCES users(id),
  created_by INTEGER NOT NULL REFERENCES users(id),
  event_type VARCHAR(24) NOT NULL DEFAULT 'rendez_vous',
  starts_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  attendee_name VARCHAR(255) NOT NULL,
  format VARCHAR(24) NOT NULL,
  phone VARCHAR(40),
  meeting_url TEXT,
  address TEXT,
  preparation_notes TEXT,
  reminder_minutes INTEGER NOT NULL DEFAULT 60,
  status VARCHAR(30) NOT NULL DEFAULT 'planifie',
  demo_held BOOLEAN,
  prospect_interested BOOLEAN,
  proposal_required BOOLEAN,
  callback_required BOOLEAN,
  next_action TEXT,
  potential_amount_eur NUMERIC(14,2),
  signature_probability INTEGER,
  completed_report_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT sales_appointments_type_check CHECK (event_type IN ('rendez_vous','demonstration')),
  CONSTRAINT sales_appointments_format_check CHECK (format IN ('telephone','visioconference','presentiel')),
  CONSTRAINT sales_appointments_status_check CHECK (status IN ('planifie','confirme','reporte','annule','realise','absence_prospect','a_reprogrammer')),
  CONSTRAINT sales_appointments_probability_check CHECK (signature_probability IS NULL OR signature_probability BETWEEN 0 AND 100)
);
CREATE INDEX IF NOT EXISTS idx_sales_appointments_owner ON sales_appointments(owner_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_sales_appointments_cabinet ON sales_appointments(cabinet_id, starts_at DESC);

CREATE TABLE IF NOT EXISTS sales_proposals (
  id BIGSERIAL PRIMARY KEY,
  cabinet_id BIGINT NOT NULL REFERENCES sales_cabinets(id) ON DELETE CASCADE,
  owner_id INTEGER NOT NULL REFERENCES users(id),
  created_by INTEGER NOT NULL REFERENCES users(id),
  amount_eur NUMERIC(14,2),
  status VARCHAR(24) NOT NULL DEFAULT 'brouillon',
  subject VARCHAR(255),
  notes TEXT,
  document_url TEXT,
  sent_at TIMESTAMPTZ,
  signed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT sales_proposals_status_check CHECK (status IN ('brouillon','a_envoyer','envoyee','negociation','signee','refusee'))
);
CREATE INDEX IF NOT EXISTS idx_sales_proposals_cabinet ON sales_proposals(cabinet_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_proposals_owner ON sales_proposals(owner_id, status);

CREATE TABLE IF NOT EXISTS sales_status_history (
  id BIGSERIAL PRIMARY KEY,
  cabinet_id BIGINT NOT NULL REFERENCES sales_cabinets(id) ON DELETE CASCADE,
  changed_by INTEGER NOT NULL REFERENCES users(id),
  old_status VARCHAR(50),
  new_status VARCHAR(50) NOT NULL,
  justification TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sales_status_history ON sales_status_history(cabinet_id, created_at DESC);

CREATE TABLE IF NOT EXISTS sales_audit_log (
  id BIGSERIAL PRIMARY KEY,
  actor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(80) NOT NULL,
  entity_id VARCHAR(100),
  cabinet_id BIGINT REFERENCES sales_cabinets(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address INET,
  user_agent VARCHAR(500),
  previous_hash CHAR(64),
  entry_hash CHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sales_audit_actor ON sales_audit_log(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_audit_cabinet ON sales_audit_log(cabinet_id, created_at DESC);

CREATE OR REPLACE FUNCTION prevent_sales_audit_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'sales_audit_log is append-only';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sales_audit_no_update ON sales_audit_log;
CREATE TRIGGER trg_sales_audit_no_update
  BEFORE UPDATE OR DELETE ON sales_audit_log
  FOR EACH ROW EXECUTE FUNCTION prevent_sales_audit_mutation();
