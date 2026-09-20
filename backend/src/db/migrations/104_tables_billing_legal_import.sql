-- ============================================================================
-- 104 — REJEU DES MIGRATIONS ORPHELINES backend/migrations/
-- ============================================================================
-- POURQUOI CETTE MIGRATION EXISTE
--
-- Le dépôt contient TROIS dossiers de migrations :
--   backend/src/db/migrations   <- le SEUL dossier appliqué (scripts/db_rebuild.sh,
--                                  backend/src/db/migrate.js)
--   backend/sql/migrations      <- rejoué par 101_tables_lots_non_appliques.sql
--   backend/migrations          <- AUCUN outil du dépôt ne l'applique  <-- ce fichier
--
-- Contenu de backend/migrations (2 fichiers, DDL complète et déjà écrite) :
--   20260502_billing_legal_foundation.sql -> organization_profiles, billing_plans,
--        customer_billing_profiles, subscriptions, checkout_sessions, payment_events,
--        invoices, legal_documents, legal_acceptances, signature_requests,
--        signed_documents
--   20260502_import_jobs.sql              -> import_jobs, import_job_rows, claims,
--        beta_signups
--
-- Ces tables sont LISES par le code (preuve fichier:ligne au fil du fichier).
-- Auto-contrôle du dépôt : backend/src/services/billingService.js:13 et
-- backend/src/services/importService.js:15 créent CES MÊMES tables à l'exécution
-- (`CREATE TABLE IF NOT EXISTS`) — la DDL rejouée ici est donc identique à celle
-- que le code exécute lui-même : rien n'est inventé.
--
-- Mesure avant cette migration : base reconstruite par la procédure officielle
-- (database/schema.sql + 42 migrations, 0 échec, 158 tables) puis
-- scripts/audit_tables_code.py -> 39 tables absentes, dont 15 définies ici.
--
-- IDEMPOTENCE : CREATE TABLE IF NOT EXISTS partout, CREATE INDEX IF NOT EXISTS
-- HORS des CREATE TABLE, ALTER TABLE ... ADD COLUMN IF NOT EXISTS en fin de fichier.
-- Sans effet sur une base de production qui posséderait déjà ces tables.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. organization_profiles  (billingService.js:18, billing.js:35,
--    adminSuperAdmin.js:291, legalAcceptanceService.js)
-- ---------------------------------------------------------------------------
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
  -- Aucun pays par defaut (defaut P0 CH-005).
  country VARCHAR(120),
  legal_signatory_name VARCHAR(255),
  legal_signatory_role VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_org_profiles_owner_user ON organization_profiles(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_org_profiles_siret ON organization_profiles(siret);

-- ---------------------------------------------------------------------------
-- 2. billing_plans  (billingService.js:319/326, adminSuperAdmin.js:299)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS billing_plans (
  id SERIAL PRIMARY KEY,
  code VARCHAR(32) NOT NULL UNIQUE,
  display_name VARCHAR(120) NOT NULL,
  price_amount_cents INTEGER,
  -- Devise ECRITE offre par offre (grille CHF en Suisse, EUR en France).
  currency VARCHAR(8),
  interval VARCHAR(16) NOT NULL DEFAULT 'month',
  stripe_price_id_test VARCHAR(128),
  stripe_price_id_live VARCHAR(128),
  features_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Semis repris À L'IDENTIQUE de backend/migrations/20260502_billing_legal_foundation.sql:43-48.
-- Divergence relevée (documentée, non corrigée ici) : le code (billingService.js:65)
-- sème aussi un plan 'cabinet'. On rejoue le fichier tel quel ; l'upsert du code
-- ajoutera 'cabinet' à la demande au premier passage.
INSERT INTO billing_plans (code, display_name, price_amount_cents, currency, interval, is_active)
VALUES
  ('starter', 'Starter', 8900, 'EUR', 'month', TRUE),
  ('pro', 'Pro', 15900, 'EUR', 'month', TRUE),
  ('premium', 'Premium', NULL, 'EUR', 'month', TRUE)
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. customer_billing_profiles  (billing.js:156, 191, 279, 771)
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- 4. subscriptions  (billing.js:213, 241, 491, adminSuperAdmin.js:299)
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- 5. checkout_sessions  (billing.js:295)
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- 6. payment_events  (billing.js:821, adminSuperAdmin.js:316,
--    billingWebhookService.js:6 « ON CONFLICT (event_id) »)
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- 7. invoices  (adminSuperAdmin.js:324)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS invoices (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organization_profiles(id) ON DELETE CASCADE,
  provider_invoice_id VARCHAR(128),
  status VARCHAR(64),
  amount_cents INTEGER,
  -- Devise ecrite a la creation de la facture : plus d'euro par defaut.
  currency VARCHAR(8),
  invoice_url TEXT,
  paid_at TIMESTAMPTZ,
  due_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_provider_invoice_id ON invoices(provider_invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoices_org ON invoices(organization_id);

-- ---------------------------------------------------------------------------
-- 8. legal_documents  (legalAcceptanceService.js:44 « ON CONFLICT (doc_type, version) »)
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- 9. legal_acceptances  (legalAcceptanceService.js:115, billing.js:132,
--    adminSuperAdmin.js:308)
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- 10. signature_requests
--     DDL rejouée de backend/migrations/20260502_billing_legal_foundation.sql:155-167
--     FUSIONNÉE avec les colonnes réellement écrites/lues par le code :
--       signatures.js:66-67 INSERT (user_id, document_id, client_id,
--         yousign_request_id, status, signer_email, signer_name, signature_url,
--         created_at)
--       signatures.js:98/102-105/109 SELECT ... WHERE sr.user_id, sr.status, sr.client_id
--       signatures.js:145/261 UPDATE status, signed_at, updated_at,
--         WHERE yousign_request_id
--       signatures.js:207 UPDATE last_reminder_at
--       reporting.js:50/55 SELECT ... WHERE user_id
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS signature_requests (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  document_id INTEGER,
  client_id INTEGER,
  yousign_request_id VARCHAR(128),
  status VARCHAR(64) NOT NULL DEFAULT 'pending',
  signer_email VARCHAR(255),
  signer_name VARCHAR(255),
  signature_url TEXT,
  last_reminder_at TIMESTAMPTZ,
  signed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- colonnes du fichier orphelin conservées (compatibilité)
  organization_id INTEGER REFERENCES organization_profiles(id) ON DELETE CASCADE,
  provider VARCHAR(64),
  provider_request_id VARCHAR(128),
  requested_at TIMESTAMPTZ,
  document_version VARCHAR(32)
);

-- La table EXISTE DÉJÀ dans les migrations appliquées (017_v1_yousign_signature.sql) :
-- le CREATE TABLE ci-dessus est donc ignoré sur une base existante, et il faut
-- garantir par ALTER chaque colonne utilisée ensuite (notamment celles sur
-- lesquelles on pose un index). Ces ALTER sont des no-op sur une base neuve.
ALTER TABLE signature_requests ADD COLUMN IF NOT EXISTS organization_id INTEGER;
ALTER TABLE signature_requests ADD COLUMN IF NOT EXISTS provider VARCHAR(64);
ALTER TABLE signature_requests ADD COLUMN IF NOT EXISTS provider_request_id VARCHAR(128);
ALTER TABLE signature_requests ADD COLUMN IF NOT EXISTS requested_at TIMESTAMPTZ;
ALTER TABLE signature_requests ADD COLUMN IF NOT EXISTS document_version VARCHAR(32);
ALTER TABLE signature_requests ADD COLUMN IF NOT EXISTS user_id INTEGER;
ALTER TABLE signature_requests ADD COLUMN IF NOT EXISTS document_id INTEGER;
ALTER TABLE signature_requests ADD COLUMN IF NOT EXISTS client_id INTEGER;
ALTER TABLE signature_requests ADD COLUMN IF NOT EXISTS yousign_request_id VARCHAR(128);
ALTER TABLE signature_requests ADD COLUMN IF NOT EXISTS signer_email VARCHAR(255);
ALTER TABLE signature_requests ADD COLUMN IF NOT EXISTS signer_name VARCHAR(255);
ALTER TABLE signature_requests ADD COLUMN IF NOT EXISTS signature_url TEXT;
ALTER TABLE signature_requests ADD COLUMN IF NOT EXISTS last_reminder_at TIMESTAMPTZ;
ALTER TABLE signature_requests ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ;
ALTER TABLE signature_requests ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE signature_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE UNIQUE INDEX IF NOT EXISTS idx_signature_requests_provider_request_id ON signature_requests(provider_request_id);
CREATE INDEX IF NOT EXISTS idx_signature_requests_org ON signature_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_signature_requests_user ON signature_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_signature_requests_client ON signature_requests(client_id);

-- organization_id était NOT NULL dans le fichier orphelin, mais AUCUN écrivain du
-- dépôt ne le fournit (signatures.js:66-68 — le seul INSERT de la table). Le garder
-- NOT NULL casse toutes les créations de demande de signature en 500 : on le rend
-- facultatif (même classe de correctif que 102_appointments_organizer_id_facultatif.sql).
-- Idempotent : DROP NOT NULL sur une colonne déjà facultative ne fait rien.
ALTER TABLE signature_requests ALTER COLUMN organization_id DROP NOT NULL;

-- ---------------------------------------------------------------------------
-- 11. signed_documents
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- 12. import_jobs  (importService.js:135 INSERT, :161 SELECT, :376, :408)
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- 13. import_job_rows  (importService.js:169 INSERT, :368 SELECT)
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- 14. claims  (LOT 18 — module sinistres ; présente aussi dans database/schema.sql,
--     rejouée ici à l'identique avec garde pour la cohérence du lot)
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- 15. beta_signups  (beta.js:15 INSERT, :60 INSERT, :61 SELECT, :64)
-- ---------------------------------------------------------------------------
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

-- ============================================================================
-- COLONNES RÉCLAMÉES PAR LE CODE et absentes de la DDL rejouée
-- ============================================================================
-- Les colonnes de signature_requests sont garanties par les ALTER placés AVANT
-- ses index (voir § 10). Après reconstruction et passage de
-- scripts/audit_colonnes_code.py, ce lot ne réclamait plus aucune colonne
-- supplémentaire sur les tables de ce fichier.
-- ============================================================================

COMMIT;
