-- ============================================
-- LOT 8 — ARK COMPOSE
-- Migration: compliance_documents + broker_profile_settings
-- ============================================

-- Table des documents de conformité générés (IPID, DDA, Devoir de Conseil)
CREATE TABLE IF NOT EXISTS compliance_documents (
  id SERIAL PRIMARY KEY,
  broker_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  quote_id INTEGER REFERENCES quotes(id) ON DELETE SET NULL,
  document_type VARCHAR(40) NOT NULL,        -- 'ipid', 'dda', 'devoir_conseil'
  status VARCHAR(40) DEFAULT 'draft',        -- 'draft', 'generated', 'signed', 'archived'
  version INTEGER DEFAULT 1,
  storage_path VARCHAR(500),
  pdf_hash VARCHAR(128),
  ai_generated BOOLEAN DEFAULT true,
  ai_reasoning TEXT,
  content_data JSONB NOT NULL,               -- Données structurées du document
  generated_at TIMESTAMP DEFAULT NOW(),
  signed_at TIMESTAMP,
  signed_by VARCHAR(200),
  signature_method VARCHAR(50),              -- 'yousign', 'pades', 'manual', 'none'
  signature_proof JSONB,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_compdocs_client ON compliance_documents(client_id, document_type);
CREATE INDEX IF NOT EXISTS idx_compdocs_broker ON compliance_documents(broker_id, status);
CREATE INDEX IF NOT EXISTS idx_compdocs_quote ON compliance_documents(quote_id);
CREATE INDEX IF NOT EXISTS idx_compdocs_type_date ON compliance_documents(document_type, generated_at DESC);

-- Table profil courtier (informations DDA obligatoires)
CREATE TABLE IF NOT EXISTS broker_profile_settings (
  id SERIAL PRIMARY KEY,
  broker_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  
  -- Identité légale
  orias_number VARCHAR(50),
  company_name VARCHAR(200),
  siret VARCHAR(20),
  legal_form VARCHAR(100),
  
  -- Coordonnées
  address TEXT,
  postal_code VARCHAR(10),
  city VARCHAR(100),
  country VARCHAR(50) DEFAULT 'France',
  phone VARCHAR(30),
  email VARCHAR(200),
  website VARCHAR(200),
  
  -- Informations DDA obligatoires
  remuneration_type VARCHAR(50),
  remuneration_details TEXT,
  conflicts_disclosure TEXT,
  complaints_handling TEXT,
  
  -- Autorité de tutelle
  supervisor_name VARCHAR(200) DEFAULT 'ACPR',
  supervisor_address TEXT DEFAULT '4 place de Budapest CS 92459 75436 Paris cedex 09',
  
  -- Assurance RCP
  rcp_insurer VARCHAR(200),
  rcp_policy_number VARCHAR(100),
  rcp_coverage_amount DECIMAL(12,2),
  
  -- Garantie financière (si encaissement fonds)
  financial_guarantee_insurer VARCHAR(200),
  financial_guarantee_amount DECIMAL(12,2),
  
  -- Branding personnalisé
  custom_branding JSONB DEFAULT '{}',
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Fonction trigger MAJ updated_at
CREATE OR REPLACE FUNCTION update_compose_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers
DROP TRIGGER IF EXISTS trigger_compliance_documents_updated ON compliance_documents;
CREATE TRIGGER trigger_compliance_documents_updated
  BEFORE UPDATE ON compliance_documents
  FOR EACH ROW EXECUTE FUNCTION update_compose_timestamp();

DROP TRIGGER IF EXISTS trigger_broker_profile_settings_updated ON broker_profile_settings;
CREATE TRIGGER trigger_broker_profile_settings_updated
  BEFORE UPDATE ON broker_profile_settings
  FOR EACH ROW EXECUTE FUNCTION update_compose_timestamp();

-- Vue synthétique documents conformité par client
CREATE OR REPLACE VIEW v_client_compliance_status AS
SELECT 
  c.id AS client_id,
  c.broker_id,
  c.nom,
  c.prenom,
  COALESCE(
    (SELECT json_agg(json_build_object(
      'type', cd.document_type,
      'status', cd.status,
      'generated_at', cd.generated_at,
      'signed_at', cd.signed_at
    ) ORDER BY cd.document_type)
    FROM compliance_documents cd 
    WHERE cd.client_id = c.id),
    '[]'::json
  ) AS documents,
  (SELECT COUNT(*) FROM compliance_documents WHERE client_id = c.id AND status = 'signed') AS signed_count,
  (SELECT COUNT(*) FROM compliance_documents WHERE client_id = c.id AND status = 'draft') AS draft_count
FROM clients c;

COMMENT ON TABLE compliance_documents IS 'LOT 8 ARK COMPOSE: Documents conformité générés par IA (IPID, DDA, Devoir de Conseil)';
COMMENT ON TABLE broker_profile_settings IS 'LOT 8 ARK COMPOSE: Profil courtier pour génération DDA';