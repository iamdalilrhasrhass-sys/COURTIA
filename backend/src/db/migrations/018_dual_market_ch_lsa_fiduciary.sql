CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE IF EXISTS users
  ADD COLUMN IF NOT EXISTS market VARCHAR(2) NOT NULL DEFAULT 'FR',
  ADD COLUMN IF NOT EXISTS market_override VARCHAR(2),
  ADD COLUMN IF NOT EXISTS preferred_locale VARCHAR(16) NOT NULL DEFAULT 'fr-FR',
  ADD COLUMN IF NOT EXISTS setup_waived BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS setup_paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS setup_checkout_session_id VARCHAR(128),
  ADD COLUMN IF NOT EXISTS next_training_due DATE;

ALTER TABLE IF EXISTS organization_profiles
  ADD COLUMN IF NOT EXISTS market VARCHAR(2) NOT NULL DEFAULT 'FR',
  ADD COLUMN IF NOT EXISTS market_override VARCHAR(2),
  ADD COLUMN IF NOT EXISTS preferred_locale VARCHAR(16) NOT NULL DEFAULT 'fr-FR',
  ADD COLUMN IF NOT EXISTS setup_waived BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS setup_paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS setup_checkout_session_id VARCHAR(128),
  ADD COLUMN IF NOT EXISTS finma_register_number VARCHAR(64),
  ADD COLUMN IF NOT EXISTS intermediary_type VARCHAR(32),
  ADD COLUMN IF NOT EXISTS lsa_compliant_since TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS next_training_due DATE;

ALTER TABLE IF EXISTS checkout_sessions
  ADD COLUMN IF NOT EXISTS market VARCHAR(2) NOT NULL DEFAULT 'FR',
  ADD COLUMN IF NOT EXISTS setup_amount_cents INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS setup_waived BOOLEAN NOT NULL DEFAULT FALSE;

DO $$
BEGIN
  IF to_regclass('public.tenants') IS NOT NULL THEN
    ALTER TABLE tenants
      ADD COLUMN IF NOT EXISTS market VARCHAR(2) NOT NULL DEFAULT 'FR',
      ADD COLUMN IF NOT EXISTS market_override VARCHAR(2),
      ADD COLUMN IF NOT EXISTS preferred_locale VARCHAR(16) NOT NULL DEFAULT 'fr-FR',
      ADD COLUMN IF NOT EXISTS setup_waived BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS setup_paid_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS setup_checkout_session_id VARCHAR(128),
      ADD COLUMN IF NOT EXISTS finma_register_number VARCHAR(64),
      ADD COLUMN IF NOT EXISTS intermediary_type VARCHAR(32),
      ADD COLUMN IF NOT EXISTS lsa_compliant_since TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS next_training_due DATE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS market_billing_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market VARCHAR(2) NOT NULL CHECK (market IN ('FR', 'CH')),
  code VARCHAR(32) NOT NULL,
  display_name VARCHAR(120) NOT NULL,
  monthly_amount_cents INTEGER,
  setup_amount_cents INTEGER NOT NULL DEFAULT 0,
  currency VARCHAR(3) NOT NULL,
  tax_behavior VARCHAR(16) NOT NULL DEFAULT 'exclusive',
  stripe_price_id_test VARCHAR(128),
  stripe_price_id_live VARCHAR(128),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (market, code)
);

INSERT INTO market_billing_plans (
  market, code, display_name, monthly_amount_cents, setup_amount_cents, currency, tax_behavior
) VALUES
  ('FR', 'starter', 'Starter', 8900, 0, 'EUR', 'exclusive'),
  ('FR', 'pro', 'Pro', 15900, 0, 'EUR', 'exclusive'),
  ('FR', 'premium', 'Cabinet', NULL, 0, 'EUR', 'exclusive'),
  ('CH', 'starter', 'Indépendant', 19900, 49000, 'CHF', 'exclusive'),
  ('CH', 'pro', 'Cabinet', 34900, 99000, 'CHF', 'exclusive'),
  ('CH', 'premium', 'Sur-Mesure / Fiduciaire', NULL, 150000, 'CHF', 'exclusive')
ON CONFLICT (market, code) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  monthly_amount_cents = EXCLUDED.monthly_amount_cents,
  setup_amount_cents = EXCLUDED.setup_amount_cents,
  currency = EXCLUDED.currency,
  tax_behavior = EXCLUDED.tax_behavior,
  active = TRUE,
  updated_at = NOW();

CREATE TABLE IF NOT EXISTS lsa_advisory_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  broker_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  status VARCHAR(32) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'cancelled')),
  locale VARCHAR(16) NOT NULL DEFAULT 'fr-CH'
);

CREATE INDEX IF NOT EXISTS idx_lsa_sessions_tenant_status
  ON lsa_advisory_sessions (tenant_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS lsa_advisory_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES lsa_advisory_sessions(id) ON DELETE CASCADE,
  step_type VARCHAR(80) NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lsa_steps_session_time
  ON lsa_advisory_steps (session_id, timestamp ASC);

CREATE OR REPLACE FUNCTION prevent_lsa_step_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'lsa_advisory_steps is append-only';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_lsa_step_update ON lsa_advisory_steps;
CREATE TRIGGER trg_prevent_lsa_step_update
  BEFORE UPDATE OR DELETE ON lsa_advisory_steps
  FOR EACH ROW EXECUTE FUNCTION prevent_lsa_step_mutation();

CREATE TABLE IF NOT EXISTS lsa_information_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES lsa_advisory_sessions(id) ON DELETE CASCADE,
  pdf_path TEXT NOT NULL,
  hash_sha256 VARCHAR(64) NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  client_ack BOOLEAN NOT NULL DEFAULT FALSE,
  client_ack_at TIMESTAMPTZ,
  UNIQUE (session_id, hash_sha256)
);

CREATE TABLE IF NOT EXISTS cantons (
  code CHAR(2) PRIMARY KEY,
  name_fr VARCHAR(80) NOT NULL,
  name_de VARCHAR(80) NOT NULL,
  name_it VARCHAR(80) NOT NULL,
  tax_notes JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO cantons (code, name_fr, name_de, name_it) VALUES
  ('AG', 'Argovie', 'Aargau', 'Argovia'),
  ('AI', 'Appenzell Rhodes-Intérieures', 'Appenzell Innerrhoden', 'Appenzello Interno'),
  ('AR', 'Appenzell Rhodes-Extérieures', 'Appenzell Ausserrhoden', 'Appenzello Esterno'),
  ('BE', 'Berne', 'Bern', 'Berna'),
  ('BL', 'Bâle-Campagne', 'Basel-Landschaft', 'Basilea Campagna'),
  ('BS', 'Bâle-Ville', 'Basel-Stadt', 'Basilea Città'),
  ('FR', 'Fribourg', 'Freiburg', 'Friburgo'),
  ('GE', 'Genève', 'Genf', 'Ginevra'),
  ('GL', 'Glaris', 'Glarus', 'Glarona'),
  ('GR', 'Grisons', 'Graubünden', 'Grigioni'),
  ('JU', 'Jura', 'Jura', 'Giura'),
  ('LU', 'Lucerne', 'Luzern', 'Lucerna'),
  ('NE', 'Neuchâtel', 'Neuenburg', 'Neuchâtel'),
  ('NW', 'Nidwald', 'Nidwalden', 'Nidvaldo'),
  ('OW', 'Obwald', 'Obwalden', 'Obvaldo'),
  ('SG', 'Saint-Gall', 'St. Gallen', 'San Gallo'),
  ('SH', 'Schaffhouse', 'Schaffhausen', 'Sciaffusa'),
  ('SO', 'Soleure', 'Solothurn', 'Soletta'),
  ('SZ', 'Schwytz', 'Schwyz', 'Svitto'),
  ('TG', 'Thurgovie', 'Thurgau', 'Turgovia'),
  ('TI', 'Tessin', 'Tessin', 'Ticino'),
  ('UR', 'Uri', 'Uri', 'Uri'),
  ('VD', 'Vaud', 'Waadt', 'Vaud'),
  ('VS', 'Valais', 'Wallis', 'Vallese'),
  ('ZG', 'Zoug', 'Zug', 'Zugo'),
  ('ZH', 'Zurich', 'Zürich', 'Zurigo')
ON CONFLICT (code) DO UPDATE SET
  name_fr = EXCLUDED.name_fr,
  name_de = EXCLUDED.name_de,
  name_it = EXCLUDED.name_it;

CREATE TABLE IF NOT EXISTS fiduciary_mandates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  canton_code CHAR(2) REFERENCES cantons(code),
  mandate_type VARCHAR(40) NOT NULL CHECK (mandate_type IN ('comptabilite', 'tva', 'salaires_avs', 'fiscalite', 'domiciliation')),
  status VARCHAR(24) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'closed')),
  starts_at DATE,
  ends_at DATE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fiduciary_mandates_tenant
  ON fiduciary_mandates (tenant_id, status, canton_code);

CREATE TABLE IF NOT EXISTS fiduciary_deadlines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  mandate_id UUID REFERENCES fiduciary_mandates(id) ON DELETE CASCADE,
  canton_code CHAR(2) REFERENCES cantons(code),
  deadline_type VARCHAR(48) NOT NULL,
  due_date DATE NOT NULL,
  recurrence_rule TEXT,
  status VARCHAR(24) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'done', 'late', 'cancelled')),
  ark_alert_at TIMESTAMPTZ,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fiduciary_deadlines_tenant_due
  ON fiduciary_deadlines (tenant_id, status, due_date ASC);

CREATE TABLE IF NOT EXISTS fiduciary_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  mandate_id UUID REFERENCES fiduciary_mandates(id) ON DELETE CASCADE,
  document_type VARCHAR(64) NOT NULL,
  storage_path TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  hash_sha256 VARCHAR(64) NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, mandate_id, storage_path, version)
);

CREATE TABLE IF NOT EXISTS fiduciary_payroll_employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  mandate_id UUID REFERENCES fiduciary_mandates(id) ON DELETE CASCADE,
  employee_ref TEXT NOT NULL,
  canton_code CHAR(2) REFERENCES cantons(code),
  avs_number_hash VARCHAR(64),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, mandate_id, employee_ref)
);

CREATE TABLE IF NOT EXISTS nlpd_processing_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  activity_name VARCHAR(160) NOT NULL,
  data_categories TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  purpose TEXT NOT NULL,
  legal_basis TEXT,
  processors JSONB NOT NULL DEFAULT '[]'::jsonb,
  retention_rule TEXT,
  cross_border_transfer JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nlpd_processing_tenant
  ON nlpd_processing_activities (tenant_id, activity_name);
