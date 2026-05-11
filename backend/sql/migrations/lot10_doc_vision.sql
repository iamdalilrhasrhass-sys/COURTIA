-- LOT 10: DOCUMENT VISION PIPELINE
-- Migration: Extraction automatique de documents (RIB, carte grise, relevé info, etc.)
-- Date: 2026-05-11

-- Table principale des extractions de documents
CREATE TABLE IF NOT EXISTS document_extractions (
  id SERIAL PRIMARY KEY,
  broker_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_document_id INTEGER REFERENCES client_documents(id) ON DELETE CASCADE,
  client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
  document_type VARCHAR(60) NOT NULL,
  detected_type VARCHAR(60),
  extraction_status VARCHAR(40) DEFAULT 'pending',
  extracted_fields JSONB DEFAULT '{}',
  confidence NUMERIC(4,3),
  warnings JSONB DEFAULT '[]',
  ai_engine VARCHAR(50),
  ai_model VARCHAR(80),
  ai_cost_usd NUMERIC(10,6),
  ai_latency_ms INTEGER,
  applied_to_client BOOLEAN DEFAULT false,
  applied_at TIMESTAMP,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_docext_broker ON document_extractions(broker_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_docext_doc ON document_extractions(client_document_id);
CREATE INDEX IF NOT EXISTS idx_docext_client ON document_extractions(client_id);
CREATE INDEX IF NOT EXISTS idx_docext_type ON document_extractions(document_type, extraction_status);

-- Commentaires
COMMENT ON TABLE document_extractions IS 'Extractions automatiques de données depuis documents (RIB, carte grise, etc.)';
COMMENT ON COLUMN document_extractions.document_type IS 'Type déclaré: rib, carte_grise, releve_information, attestation_assurance, piece_identite, justif_domicile';
COMMENT ON COLUMN document_extractions.detected_type IS 'Type détecté par le système (peut différer du déclaré)';
COMMENT ON COLUMN document_extractions.extraction_status IS 'pending, processing, completed, failed, partial';
COMMENT ON COLUMN document_extractions.confidence IS 'Score de confiance 0.000 à 1.000';
COMMENT ON COLUMN document_extractions.applied_to_client IS 'True si les données ont été appliquées à la fiche client';

SELECT 'LOT 10 Document Vision migration applied' AS result;
