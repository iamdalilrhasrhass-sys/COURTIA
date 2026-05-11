-- ============================================================
-- COURTIA — LOT 5 : Comparateur Multi-Compagnies
-- Migration: Tables insurance_providers, broker_integrations, 
--            integration_credentials, quote_requests, quote_results, quote_comparisons
-- ============================================================

-- Table des compagnies/grossistes d'assurance
CREATE TABLE IF NOT EXISTS insurance_providers (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  type VARCHAR(40),
  logo_url VARCHAR(500),
  website VARCHAR(300),
  api_status VARCHAR(40) DEFAULT 'not_available',
  supported_products JSONB,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Intégrations courtier <-> provider
CREATE TABLE IF NOT EXISTS broker_integrations (
  id SERIAL PRIMARY KEY,
  broker_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider_id INTEGER NOT NULL REFERENCES insurance_providers(id),
  status VARCHAR(40) DEFAULT 'pending',
  priority INTEGER DEFAULT 0,
  commission_rate NUMERIC(5,2),
  acceptance_rate NUMERIC(5,2),
  preferred_products JSONB,
  deposit_email VARCHAR(255),
  webhook_url VARCHAR(500),
  credentials_id INTEGER,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(broker_id, provider_id)
);

-- Credentials chiffrés pour les intégrations
CREATE TABLE IF NOT EXISTS integration_credentials (
  id SERIAL PRIMARY KEY,
  integration_id INTEGER NOT NULL REFERENCES broker_integrations(id) ON DELETE CASCADE,
  credential_type VARCHAR(40),
  encrypted_value TEXT NOT NULL,
  iv VARCHAR(64) NOT NULL,
  auth_tag VARCHAR(64) NOT NULL,
  last_four VARCHAR(8),
  rotated_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Demandes de tarifs normalisées
CREATE TABLE IF NOT EXISTS quote_requests (
  id SERIAL PRIMARY KEY,
  client_id INTEGER REFERENCES clients(id),
  broker_id INTEGER REFERENCES users(id),
  product_type VARCHAR(80),
  normalized_data JSONB NOT NULL,
  target_providers JSONB,
  status VARCHAR(40) DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT NOW(),
  submitted_at TIMESTAMP
);

-- Résultats de devis reçus (API ou manuel)
CREATE TABLE IF NOT EXISTS quote_results (
  id SERIAL PRIMARY KEY,
  request_id INTEGER NOT NULL REFERENCES quote_requests(id) ON DELETE CASCADE,
  provider_id INTEGER REFERENCES insurance_providers(id),
  provider_code VARCHAR(50),
  premium_annual NUMERIC(10,2),
  coverage_summary JSONB,
  raw_response JSONB,
  source VARCHAR(40),
  status VARCHAR(40),
  received_at TIMESTAMP DEFAULT NOW()
);

-- Comparaisons et recommandations ARK
CREATE TABLE IF NOT EXISTS quote_comparisons (
  id SERIAL PRIMARY KEY,
  request_id INTEGER NOT NULL REFERENCES quote_requests(id),
  recommendation JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_broker_integ ON broker_integrations(broker_id);
CREATE INDEX IF NOT EXISTS idx_quote_req_client ON quote_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_quote_req_broker ON quote_requests(broker_id);
CREATE INDEX IF NOT EXISTS idx_quote_results_request ON quote_results(request_id);
CREATE INDEX IF NOT EXISTS idx_integration_creds ON integration_credentials(integration_id);

-- ============================================================
-- FIN LOT 5 MIGRATION
-- ============================================================