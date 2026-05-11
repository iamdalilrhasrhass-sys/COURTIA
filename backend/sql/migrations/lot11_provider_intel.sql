-- ============================================================
-- LOT 11 : Multi-Provider Quote Intelligence
-- Migration : Enrichissement insurance_providers + provider_quote_briefs
-- ============================================================

-- Ajouter colonnes intelligence sur insurance_providers si manquantes
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='insurance_providers' AND column_name='communication_style') THEN
    ALTER TABLE insurance_providers ADD COLUMN communication_style TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='insurance_providers' AND column_name='mandatory_documents') THEN
    ALTER TABLE insurance_providers ADD COLUMN mandatory_documents JSONB DEFAULT '[]';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='insurance_providers' AND column_name='product_catalog') THEN
    ALTER TABLE insurance_providers ADD COLUMN product_catalog JSONB DEFAULT '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='insurance_providers' AND column_name='quote_email_template') THEN
    ALTER TABLE insurance_providers ADD COLUMN quote_email_template TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='insurance_providers' AND column_name='specific_fields') THEN
    ALTER TABLE insurance_providers ADD COLUMN specific_fields JSONB DEFAULT '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='insurance_providers' AND column_name='preferred_format') THEN
    ALTER TABLE insurance_providers ADD COLUMN preferred_format VARCHAR(40) DEFAULT 'email';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='insurance_providers' AND column_name='response_time_hours') THEN
    ALTER TABLE insurance_providers ADD COLUMN response_time_hours INTEGER DEFAULT 48;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='insurance_providers' AND column_name='contact_email') THEN
    ALTER TABLE insurance_providers ADD COLUMN contact_email VARCHAR(255);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='insurance_providers' AND column_name='submission_instructions') THEN
    ALTER TABLE insurance_providers ADD COLUMN submission_instructions TEXT;
  END IF;
END $$;

-- Table des briefs de devis générés par ARK pour chaque provider
CREATE TABLE IF NOT EXISTS provider_quote_briefs (
  id SERIAL PRIMARY KEY,
  broker_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quote_request_id INTEGER REFERENCES quote_requests(id) ON DELETE CASCADE,
  provider_id INTEGER NOT NULL REFERENCES insurance_providers(id) ON DELETE CASCADE,
  -- Contenu du brief
  subject VARCHAR(300),
  body_html TEXT,
  body_plain TEXT,
  attachments JSONB DEFAULT '[]',
  -- Analyse des pièces
  missing_pieces JSONB DEFAULT '[]',
  present_pieces JSONB DEFAULT '[]',
  outdated_pieces JSONB DEFAULT '[]',
  -- Métadonnées IA
  ai_confidence NUMERIC(3,2),
  ai_cost_usd NUMERIC(10,6),
  ai_model VARCHAR(80),
  -- Statut et envoi
  status VARCHAR(40) DEFAULT 'draft',
  sent_at TIMESTAMP,
  response_received_at TIMESTAMP,
  provider_response_notes TEXT,
  -- Technique
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_briefs_broker ON provider_quote_briefs(broker_id, status);
CREATE INDEX IF NOT EXISTS idx_briefs_request ON provider_quote_briefs(quote_request_id);
CREATE INDEX IF NOT EXISTS idx_briefs_provider ON provider_quote_briefs(provider_id);
CREATE INDEX IF NOT EXISTS idx_briefs_status ON provider_quote_briefs(status, created_at DESC);

-- Trigger pour updated_at automatique
CREATE OR REPLACE FUNCTION update_brief_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_brief_updated ON provider_quote_briefs;
CREATE TRIGGER trg_brief_updated
  BEFORE UPDATE ON provider_quote_briefs
  FOR EACH ROW
  EXECUTE FUNCTION update_brief_timestamp();

-- ============================================================
-- FIN LOT 11 MIGRATION
-- ============================================================
