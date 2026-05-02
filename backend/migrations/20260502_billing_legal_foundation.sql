-- COURTIA billing/legal foundation (non-destructive)
-- Date: 2026-05-02
-- IMPORTANT: appliquer après validation technique/juridique.

BEGIN;

CREATE TABLE IF NOT EXISTS organization_profiles (
  id SERIAL PRIMARY KEY,
  owner_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cabinet_name VARCHAR(255),
  legal_form VARCHAR(120),
  siret VARCHAR(32),
  orias VARCHAR(64),
  billing_email VARCHAR(255),
  phone VARCHAR(40),
  address_line1 VARCHAR(255),
  postal_code VARCHAR(20),
  city VARCHAR(120),
  country VARCHAR(120) DEFAULT 'France',
  legal_signatory_name VARCHAR(255),
  legal_signatory_role VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_org_profiles_owner_user ON organization_profiles(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_org_profiles_siret ON organization_profiles(siret);

CREATE TABLE IF NOT EXISTS billing_plans (
  id SERIAL PRIMARY KEY,
  code VARCHAR(32) NOT NULL UNIQUE,
  display_name VARCHAR(120) NOT NULL,
  price_amount_cents INTEGER,
  currency VARCHAR(8) NOT NULL DEFAULT 'EUR',
  interval VARCHAR(16) NOT NULL DEFAULT 'month',
  stripe_price_id_test VARCHAR(128),
  stripe_price_id_live VARCHAR(128),
  features_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO billing_plans (code, display_name, price_amount_cents, currency, interval, is_active)
VALUES
  ('starter', 'Starter', 8900, 'EUR', 'month', TRUE),
  ('pro', 'Pro', 15900, 'EUR', 'month', TRUE),
  ('premium', 'Premium', NULL, 'EUR', 'month', TRUE)
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS customer_billing_profiles (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organization_profiles(id) ON DELETE CASCADE,
  stripe_customer_id VARCHAR(128),
  tax_mode VARCHAR(32),
  vat_applicable BOOLEAN,
  vat_label VARCHAR(255),
  seller_status_snapshot VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_billing_profiles_org ON customer_billing_profiles(organization_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_billing_profiles_stripe_customer ON customer_billing_profiles(stripe_customer_id);

CREATE TABLE IF NOT EXISTS subscriptions (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organization_profiles(id) ON DELETE CASCADE,
  plan_id INTEGER REFERENCES billing_plans(id),
  provider VARCHAR(32) NOT NULL DEFAULT 'stripe',
  provider_subscription_id VARCHAR(128),
  status VARCHAR(64) NOT NULL DEFAULT 'inactive',
  trial_start_at TIMESTAMPTZ,
  trial_end_at TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_provider_sub_id ON subscriptions(provider_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_org ON subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

CREATE TABLE IF NOT EXISTS checkout_sessions (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER REFERENCES organization_profiles(id) ON DELETE SET NULL,
  plan_id INTEGER REFERENCES billing_plans(id),
  provider_session_id VARCHAR(128),
  status VARCHAR(64) NOT NULL DEFAULT 'created',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  raw_payload_json JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_checkout_sessions_provider_id ON checkout_sessions(provider_session_id);
CREATE INDEX IF NOT EXISTS idx_checkout_sessions_org ON checkout_sessions(organization_id);

CREATE TABLE IF NOT EXISTS payment_events (
  id SERIAL PRIMARY KEY,
  provider VARCHAR(32) NOT NULL DEFAULT 'stripe',
  event_id VARCHAR(128) NOT NULL UNIQUE,
  event_type VARCHAR(128) NOT NULL,
  organization_id INTEGER REFERENCES organization_profiles(id) ON DELETE SET NULL,
  subscription_id INTEGER REFERENCES subscriptions(id) ON DELETE SET NULL,
  processed_at TIMESTAMPTZ,
  is_idempotent BOOLEAN NOT NULL DEFAULT TRUE,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payment_events_org ON payment_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_sub ON payment_events(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_type ON payment_events(event_type);

CREATE TABLE IF NOT EXISTS invoices (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organization_profiles(id) ON DELETE CASCADE,
  provider_invoice_id VARCHAR(128),
  status VARCHAR(64),
  amount_cents INTEGER,
  currency VARCHAR(8) DEFAULT 'EUR',
  invoice_url TEXT,
  paid_at TIMESTAMPTZ,
  due_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_provider_invoice_id ON invoices(provider_invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoices_org ON invoices(organization_id);

CREATE TABLE IF NOT EXISTS legal_documents (
  id SERIAL PRIMARY KEY,
  doc_type VARCHAR(64) NOT NULL,
  version VARCHAR(32) NOT NULL,
  title VARCHAR(255) NOT NULL,
  storage_url TEXT,
  published_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(doc_type, version)
);

CREATE TABLE IF NOT EXISTS legal_acceptances (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organization_profiles(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  doc_type VARCHAR(64) NOT NULL,
  doc_version VARCHAR(32) NOT NULL,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip VARCHAR(64),
  user_agent TEXT,
  consent_context_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_legal_acceptances_org ON legal_acceptances(organization_id);
CREATE INDEX IF NOT EXISTS idx_legal_acceptances_user ON legal_acceptances(user_id);
CREATE INDEX IF NOT EXISTS idx_legal_acceptances_type_version ON legal_acceptances(doc_type, doc_version);

CREATE TABLE IF NOT EXISTS signature_requests (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organization_profiles(id) ON DELETE CASCADE,
  provider VARCHAR(64),
  provider_request_id VARCHAR(128),
  status VARCHAR(64) NOT NULL DEFAULT 'pending',
  requested_at TIMESTAMPTZ,
  signed_at TIMESTAMPTZ,
  document_version VARCHAR(32),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_signature_requests_provider_request_id ON signature_requests(provider_request_id);
CREATE INDEX IF NOT EXISTS idx_signature_requests_org ON signature_requests(organization_id);

CREATE TABLE IF NOT EXISTS signed_documents (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organization_profiles(id) ON DELETE CASCADE,
  signature_request_id INTEGER REFERENCES signature_requests(id) ON DELETE SET NULL,
  provider_document_id VARCHAR(128),
  storage_url TEXT,
  checksum VARCHAR(255),
  signed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_signed_documents_provider_doc_id ON signed_documents(provider_document_id);
CREATE INDEX IF NOT EXISTS idx_signed_documents_org ON signed_documents(organization_id);

COMMIT;
