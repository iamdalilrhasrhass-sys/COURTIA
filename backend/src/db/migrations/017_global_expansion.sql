CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS countries_config (
  id SERIAL PRIMARY KEY,
  code VARCHAR(2) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  currency_sym VARCHAR(8) NOT NULL,
  setup_fee NUMERIC(10,2) NOT NULL,
  monthly_fee NUMERIC(10,2) NOT NULL,
  closer_setup_pct NUMERIC(5,2) NOT NULL DEFAULT 40.00,
  closer_mrr_pct NUMERIC(5,2) NOT NULL DEFAULT 15.00,
  closer_mrr_months INTEGER NOT NULL DEFAULT 12,
  legal_entity_type VARCHAR(64),
  legal_note TEXT,
  supports_insurers BOOLEAN NOT NULL DEFAULT FALSE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO countries_config
  (code, name, currency, currency_sym, setup_fee, monthly_fee,
   closer_setup_pct, closer_mrr_pct, closer_mrr_months,
   legal_entity_type, legal_note, supports_insurers)
VALUES
  ('FR', 'France', 'EUR', '€', 299.00, 199.00,
   40.00, 15.00, 12,
   'mandataire_commercial',
   'Contrat agent commercial — Loi Doubin. Commission taxable TVA 20%.',
   FALSE),
  ('CH', 'Suisse', 'CHF', 'CHF', 490.00, 349.00,
   40.00, 15.00, 12,
   'agent_commercial',
   'Contrat agent indépendant droit suisse CO art. 418a. Pas de TVA < CHF 100k/an.',
   FALSE),
  ('US', 'United States', 'USD', '$', 499.00, 299.00,
   40.00, 15.00, 12,
   '1099_contractor',
   'Independent contractor agreement. 1099-NEC issued >$600/year. No withholding.',
   TRUE)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  currency = EXCLUDED.currency,
  currency_sym = EXCLUDED.currency_sym,
  setup_fee = EXCLUDED.setup_fee,
  monthly_fee = EXCLUDED.monthly_fee,
  closer_setup_pct = EXCLUDED.closer_setup_pct,
  closer_mrr_pct = EXCLUDED.closer_mrr_pct,
  closer_mrr_months = EXCLUDED.closer_mrr_months,
  legal_entity_type = EXCLUDED.legal_entity_type,
  legal_note = EXCLUDED.legal_note,
  supports_insurers = EXCLUDED.supports_insurers,
  active = TRUE,
  updated_at = NOW();

CREATE TABLE IF NOT EXISTS closers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code VARCHAR(2) NOT NULL REFERENCES countries_config(code),
  full_name VARCHAR(200) NOT NULL,
  email VARCHAR(200) NOT NULL UNIQUE,
  phone VARCHAR(50),
  referral_code VARCHAR(32) NOT NULL UNIQUE,
  referral_link TEXT GENERATED ALWAYS AS ('https://courtiark.fr/demo?ref=' || referral_code) STORED,
  contract_signed_at TIMESTAMPTZ,
  contract_pdf_url TEXT,
  us_segment VARCHAR(20) CHECK (us_segment IN ('broker','insurer','both')),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','terminated')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS closers_country_status_idx ON closers(country_code, status);
CREATE UNIQUE INDEX IF NOT EXISTS closers_referral_code_idx ON closers(referral_code);

CREATE TABLE IF NOT EXISTS closer_deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  closer_id UUID NOT NULL REFERENCES closers(id) ON DELETE CASCADE,
  country_code VARCHAR(2) NOT NULL REFERENCES countries_config(code),
  client_name VARCHAR(200) NOT NULL,
  client_email VARCHAR(200) NOT NULL,
  client_type VARCHAR(20) NOT NULL DEFAULT 'broker' CHECK (client_type IN ('broker','insurer')),
  setup_fee NUMERIC(10,2) NOT NULL,
  monthly_fee NUMERIC(10,2) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  setup_commission NUMERIC(10,2) NOT NULL,
  mrr_commission NUMERIC(10,2) NOT NULL,
  mrr_months_left INTEGER NOT NULL DEFAULT 12,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','churned','paused')),
  signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  churned_at TIMESTAMPTZ,
  churn_guard_months INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (closer_id, client_email)
);

CREATE INDEX IF NOT EXISTS closer_deals_closer_status_idx ON closer_deals(closer_id, status);
CREATE INDEX IF NOT EXISTS closer_deals_signed_at_idx ON closer_deals(signed_at);

CREATE TABLE IF NOT EXISTS closer_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  closer_id UUID NOT NULL REFERENCES closers(id) ON DELETE CASCADE,
  deal_id UUID NOT NULL REFERENCES closer_deals(id) ON DELETE CASCADE,
  commission_type VARCHAR(20) NOT NULL CHECK (commission_type IN ('setup','mrr')),
  amount NUMERIC(10,2) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  period_month DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','clawed_back')),
  paid_at TIMESTAMPTZ,
  claw_back_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS closer_commissions_closer_status_idx ON closer_commissions(closer_id, status);
CREATE INDEX IF NOT EXISTS closer_commissions_deal_idx ON closer_commissions(deal_id);
CREATE INDEX IF NOT EXISTS closer_commissions_period_idx ON closer_commissions(period_month);

CREATE TABLE IF NOT EXISTS onboarding_steps (
  id SERIAL PRIMARY KEY,
  country_code VARCHAR(2) NOT NULL REFERENCES countries_config(code),
  client_type VARCHAR(20) NOT NULL DEFAULT 'broker',
  step_order INTEGER NOT NULL,
  step_key VARCHAR(100) NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  required BOOLEAN NOT NULL DEFAULT TRUE,
  doc_required BOOLEAN NOT NULL DEFAULT FALSE,
  doc_label VARCHAR(200),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (country_code, client_type, step_order)
);

CREATE TABLE IF NOT EXISTS closer_referral_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  closer_id UUID NOT NULL REFERENCES closers(id) ON DELETE CASCADE,
  referral_code VARCHAR(32) NOT NULL,
  event_type VARCHAR(32) NOT NULL DEFAULT 'visit',
  landing_path TEXT,
  user_agent TEXT,
  ip INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS closer_referral_events_closer_idx ON closer_referral_events(closer_id, created_at DESC);

INSERT INTO onboarding_steps (country_code, client_type, step_order, step_key, title, description, required, doc_required, doc_label)
VALUES
  ('FR','broker',1,'orias_verify','Vérification ORIAS','Entrez votre numéro ORIAS pour validation automatique',TRUE,FALSE,NULL),
  ('FR','broker',2,'cabinet_info','Informations cabinet','Raison sociale, SIRET, adresse, forme juridique',TRUE,FALSE,NULL),
  ('FR','broker',3,'dda_profile','Profil DDA','Configuration de votre devoir de conseil et recueil de besoins',TRUE,FALSE,NULL),
  ('FR','broker',4,'compagnies','Compagnies partenaires','Ajoutez vos codes courtage par compagnie',FALSE,FALSE,NULL),
  ('FR','broker',5,'import_portefeuille','Import portefeuille','Import CSV ou saisie manuelle de vos clients existants',FALSE,FALSE,NULL),
  ('FR','broker',6,'ark_setup','Configuration ARK','Activez votre agent IA ARK et définissez vos préférences',TRUE,FALSE,NULL),
  ('CH','broker',1,'finma_verify','Vérification FINMA / ARIF','Numéro d''intermédiaire ou OAR de rattachement',TRUE,FALSE,NULL),
  ('CH','broker',2,'cabinet_info','Informations cabinet','Raison sociale, IDE (UID), canton, forme juridique',TRUE,FALSE,NULL),
  ('CH','broker',3,'lsa_profile','Profil LSA','Obligations loi sur la surveillance des assurances',TRUE,FALSE,NULL),
  ('CH','broker',4,'language_pref','Préférence langue','Français / Deutsch / Italiano — adapte l''interface',TRUE,FALSE,NULL),
  ('CH','broker',5,'compagnies','Compagnies partenaires','Ajoutez vos mandats par compagnie (SwissLife, Zurich, AXA CH…)',FALSE,FALSE,NULL),
  ('CH','broker',6,'ark_setup','Configuration ARK','Activez ARK — disponible en FR/DE/IT',TRUE,FALSE,NULL),
  ('US','broker',1,'nipr_verify','NIPR License Verification','Enter your National Producer Number (NPN) for automatic NIPR lookup',TRUE,FALSE,NULL),
  ('US','broker',2,'agency_info','Agency Information','Agency name, EIN, state of domicile, business structure',TRUE,FALSE,NULL),
  ('US','broker',3,'eo_insurance','E&O Insurance Upload','Upload your Errors & Omissions insurance certificate',TRUE,TRUE,'E&O Certificate (PDF)'),
  ('US','broker',4,'state_licenses','State Licenses','Add your active state licenses — we auto-sync with NIPR',FALSE,FALSE,NULL),
  ('US','broker',5,'carriers','Carrier Appointments','Add your carrier appointments and commission schedules',FALSE,FALSE,NULL),
  ('US','broker',6,'ark_setup','ARK AI Agent Setup','Configure your ARK agent — English interface, US compliance mode',TRUE,FALSE,NULL),
  ('US','insurer',1,'carrier_verify','Carrier Verification','NAIC company code and Certificate of Authority per state',TRUE,TRUE,'Certificate of Authority'),
  ('US','insurer',2,'company_info','Company Information','Legal name, domicile state, AM Best rating, surplus lines status',TRUE,FALSE,NULL),
  ('US','insurer',3,'product_lines','Product Lines','Select lines of business: P&C, Life, Health, Specialty, Surplus',TRUE,FALSE,NULL),
  ('US','insurer',4,'distribution','Distribution Setup','Configure broker portal, commission schedules, appetites',TRUE,FALSE,NULL),
  ('US','insurer',5,'compliance','Compliance Configuration','NAIC model laws, filing requirements, rate/form filings',TRUE,FALSE,NULL),
  ('US','insurer',6,'ark_setup','ARK Integration','Connect ARK to your product catalog and underwriting APIs',TRUE,FALSE,NULL)
ON CONFLICT (country_code, client_type, step_order) DO UPDATE SET
  step_key = EXCLUDED.step_key,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  required = EXCLUDED.required,
  doc_required = EXCLUDED.doc_required,
  doc_label = EXCLUDED.doc_label;

CREATE OR REPLACE FUNCTION calculate_closer_commissions(
  p_country_code VARCHAR(2),
  p_setup_fee NUMERIC,
  p_monthly_fee NUMERIC
) RETURNS TABLE (
  setup_commission NUMERIC,
  mrr_commission NUMERIC,
  mrr_months INTEGER,
  total_potential NUMERIC
) AS $$
DECLARE
  cfg countries_config%ROWTYPE;
BEGIN
  SELECT * INTO cfg FROM countries_config WHERE code = p_country_code;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unknown country code %', p_country_code;
  END IF;

  setup_commission := ROUND(p_setup_fee * cfg.closer_setup_pct / 100, 2);
  mrr_commission := ROUND(p_monthly_fee * cfg.closer_mrr_pct / 100, 2);
  mrr_months := cfg.closer_mrr_months;
  total_potential := setup_commission + (mrr_commission * mrr_months);
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_global_expansion_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'countries_config_updated_at'
  ) THEN
    CREATE TRIGGER countries_config_updated_at
      BEFORE UPDATE ON countries_config
      FOR EACH ROW EXECUTE FUNCTION set_global_expansion_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'closers_updated_at'
  ) THEN
    CREATE TRIGGER closers_updated_at
      BEFORE UPDATE ON closers
      FOR EACH ROW EXECUTE FUNCTION set_global_expansion_updated_at();
  END IF;
END $$;

CREATE OR REPLACE VIEW closer_earnings_summary AS
WITH deal_summary AS (
  SELECT
    closer_id,
    COUNT(*) FILTER (WHERE status = 'active') AS active_deals
  FROM closer_deals
  GROUP BY closer_id
),
commission_summary AS (
  SELECT
    closer_id,
    COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0) AS total_paid,
    COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0) AS pending_amount
  FROM closer_commissions
  GROUP BY closer_id
)
SELECT
  c.id,
  c.full_name,
  c.country_code,
  c.referral_code,
  COALESCE(ds.active_deals, 0) AS active_deals,
  COALESCE(cs.total_paid, 0) AS total_paid,
  COALESCE(cs.pending_amount, 0) AS pending_amount,
  cc.currency
FROM closers c
LEFT JOIN deal_summary ds ON ds.closer_id = c.id
LEFT JOIN commission_summary cs ON cs.closer_id = c.id
JOIN countries_config cc ON cc.code = c.country_code
GROUP BY c.id, c.full_name, c.country_code, c.referral_code, ds.active_deals, cs.total_paid, cs.pending_amount, cc.currency;
