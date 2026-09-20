-- ============================================================================
-- 101 — TABLES DES LOTS 4 À 12 NON APPLIQUÉES PAR LE RUNNER DE MIGRATIONS
--
-- CAUSE RACINE OBSERVÉE (20/09/2026) : les fichiers backend/sql/migrations/*.sql
-- (lots 4 à 12) n'étaient appliqués par AUCUN chemin d'installation. Le runner
-- (backend/scripts/migrate.js) et scripts/db_rebuild.sh ne lisent que
-- backend/src/db/migrations/. Conséquence mesurée sur une base neuve (39
-- migrations, 0 erreur) : 22 tables du code étaient ABSENTES — client_documents,
-- insurance_providers, broker_integrations, quote_*, ark_watch_runs,
-- ark_watch_signals, client_portal_*, compliance_documents, voice_intakes,
-- document_extractions, provider_quote_briefs, opportunites…
-- C'est cette absence qui faisait échouer l'étape d'onboarding « ARK Watch »
-- en arrière-plan (table ark_watch_runs).
--
-- Cette migration rejoue les lots DANS backend/src/db/migrations, à l'endroit que
-- les deux outils lisent réellement, et dans l'ORDRE DES DÉPENDANCES
-- (documents → comparateur → métiers → arkwatch → compose → voice → vision →
-- provider intel → portail).
--
-- Toutes les instructions sont idempotentes (CREATE TABLE/INDEX IF NOT EXISTS) :
-- une base qui possède déjà ces tables n'est pas modifiée.
--
-- NE PAS réintroduire de dépendance à backend/sql/migrations : ce dossier est
-- conservé comme archive de provenance uniquement.
-- ============================================================================


-- ---------- source : backend/sql/migrations/lot4_documents.sql ----------

-- =============================================================================
-- LOT 4 — GESTION DOCUMENTS CLIENTS
-- Migration: lot4_documents.sql
-- Créé le: 2026-05-11
-- Tables: client_documents, document_requests, document_request_items, document_transmissions
-- =============================================================================

-- Table principale des documents clients uploadés
CREATE TABLE IF NOT EXISTS client_documents (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  broker_id INTEGER REFERENCES users(id),
  document_type VARCHAR(80),
  original_filename VARCHAR(255),
  storage_path VARCHAR(500),
  mime_type VARCHAR(100),
  file_size_bytes INTEGER,
  file_hash VARCHAR(64), -- SHA256 pour déduplication
  status VARCHAR(40) DEFAULT 'received',
  source VARCHAR(40) DEFAULT 'manual', -- manual, collect_link, whatsapp, email
  analysis_status VARCHAR(40) DEFAULT 'pending', -- pending, analyzing, completed, failed
  analysis_result JSONB,
  ocr_text TEXT,
  uploaded_at TIMESTAMP DEFAULT NOW(),
  analyzed_at TIMESTAMP,
  deleted_at TIMESTAMP, -- soft delete
  metadata JSONB
);

-- Demandes de collecte de documents (liens envoyés aux clients)
CREATE TABLE IF NOT EXISTS document_requests (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  broker_id INTEGER REFERENCES users(id),
  token VARCHAR(64) UNIQUE NOT NULL,
  status VARCHAR(40) DEFAULT 'pending', -- pending, partial, completed, expired
  requested_types JSONB, -- ["carte_identite", "rib", "permis_conduire"]
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  notes TEXT,
  reminder_sent_at TIMESTAMP,
  reminder_count INTEGER DEFAULT 0
);

-- Items individuels d'une demande de collecte
CREATE TABLE IF NOT EXISTS document_request_items (
  id SERIAL PRIMARY KEY,
  request_id INTEGER NOT NULL REFERENCES document_requests(id) ON DELETE CASCADE,
  document_type VARCHAR(80),
  status VARCHAR(40) DEFAULT 'pending', -- pending, received, rejected
  document_id INTEGER REFERENCES client_documents(id),
  received_at TIMESTAMP,
  rejection_reason TEXT
);

-- Transmissions de documents aux compagnies d'assurance
CREATE TABLE IF NOT EXISTS document_transmissions (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id),
  broker_id INTEGER REFERENCES users(id),
  provider_name VARCHAR(100), -- Nom de la compagnie
  channel VARCHAR(40), -- email, api, ftp, manual
  document_ids JSONB, -- [1, 2, 3]
  status VARCHAR(40) DEFAULT 'pending', -- pending, sent, confirmed, failed
  sent_at TIMESTAMP,
  proof JSONB, -- { email_id, api_response, etc. }
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_client_docs_client ON client_documents(client_id);
CREATE INDEX IF NOT EXISTS idx_client_docs_broker ON client_documents(broker_id);
CREATE INDEX IF NOT EXISTS idx_client_docs_status ON client_documents(status);
CREATE INDEX IF NOT EXISTS idx_client_docs_hash ON client_documents(file_hash);
CREATE INDEX IF NOT EXISTS idx_doc_req_token ON document_requests(token);
CREATE INDEX IF NOT EXISTS idx_doc_req_client ON document_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_doc_req_status ON document_requests(status);
CREATE INDEX IF NOT EXISTS idx_doc_req_items_request ON document_request_items(request_id);
CREATE INDEX IF NOT EXISTS idx_doc_trans_client ON document_transmissions(client_id);

-- Commentaires tables
COMMENT ON TABLE client_documents IS 'Documents uploadés par ou pour les clients (CNI, RIB, attestations...)';
COMMENT ON TABLE document_requests IS 'Demandes de collecte via lien sécurisé envoyé au client';
COMMENT ON TABLE document_request_items IS 'Documents individuels demandés dans une requête de collecte';
COMMENT ON TABLE document_transmissions IS 'Historique des envois de documents aux compagnies';

-- ---------- source : backend/sql/migrations/lot5_comparateur.sql ----------

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

-- ---------- source : backend/sql/migrations/lot6_metiers.sql ----------

-- ============================================================
-- LOT 6 : Migration tables métier — Relances + Opportunités
-- ============================================================

-- ==================== TABLE RELANCES ====================
CREATE TABLE IF NOT EXISTS relances (
  id SERIAL PRIMARY KEY,
  broker_id INTEGER NOT NULL REFERENCES users(id),
  client_id INTEGER REFERENCES clients(id),
  quote_id INTEGER REFERENCES quotes(id),
  quote_request_id INTEGER REFERENCES quote_requests(id),
  type VARCHAR(50),
  channel VARCHAR(30) DEFAULT 'email',
  scheduled_at TIMESTAMP,
  sent_at TIMESTAMP,
  status VARCHAR(40) DEFAULT 'pending',
  priority VARCHAR(20) DEFAULT 'medium',
  subject VARCHAR(300),
  content TEXT,
  ai_generated BOOLEAN DEFAULT false,
  ai_reasoning TEXT,
  response_received BOOLEAN DEFAULT false,
  response_at TIMESTAMP,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- `relances` est créée par la migration 004 SANS broker_id, et le code ne
-- l'utilise pas (backend/src/routes/relances.js, en-tête : « Il n'y a pas de
-- colonne broker_id/courtier_id sur relances »). L'index historique de ce lot
-- référençait une colonne qui n'existe pas : il faisait échouer TOUTE la
-- migration (et donc la création des 21 tables suivantes). Il n'est créé que
-- si la colonne existe réellement.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'relances' AND column_name = 'broker_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_relances_broker ON relances(broker_id, status);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_relances_scheduled ON relances(scheduled_at) WHERE status='pending';
CREATE INDEX IF NOT EXISTS idx_relances_client ON relances(client_id);
CREATE INDEX IF NOT EXISTS idx_relances_priority ON relances(priority, status);

-- ==================== TABLE OPPORTUNITES ====================
CREATE TABLE IF NOT EXISTS opportunites (
  id SERIAL PRIMARY KEY,
  broker_id INTEGER NOT NULL REFERENCES users(id),
  client_id INTEGER NOT NULL REFERENCES clients(id),
  type VARCHAR(60),
  product_current VARCHAR(200),
  product_target VARCHAR(80),
  score INTEGER DEFAULT 50,
  estimated_revenue NUMERIC(10,2) DEFAULT 0,
  status VARCHAR(40) DEFAULT 'detected',
  reasoning TEXT,
  suggested_action TEXT,
  detected_at TIMESTAMP DEFAULT NOW(),
  contacted_at TIMESTAMP,
  converted_at TIMESTAMP,
  quote_request_id INTEGER REFERENCES quote_requests(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_oppo_broker ON opportunites(broker_id, status);
CREATE INDEX IF NOT EXISTS idx_oppo_score ON opportunites(score DESC) WHERE status='detected';
CREATE INDEX IF NOT EXISTS idx_oppo_client ON opportunites(client_id);
CREATE INDEX IF NOT EXISTS idx_oppo_type ON opportunites(type);

-- ==================== COLONNE METADATA MANQUANTE quote_requests ====================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='quote_requests' AND column_name='metadata'
  ) THEN
    ALTER TABLE quote_requests ADD COLUMN metadata JSONB DEFAULT '{}';
  END IF;
END $$;

-- ============================================================
-- FIN MIGRATION LOT 6
-- ============================================================

-- ---------- source : backend/sql/migrations/lot7_arkwatch.sql ----------

-- ============================================================
-- LOT 7 : ARK Watch — Surveillance proactive du portefeuille
-- Différenciateur #1 COURTIA : Aucun CRM courtier français ne fait ça
-- ============================================================

-- ==================== TABLE SIGNAUX ARK WATCH ====================
CREATE TABLE IF NOT EXISTS ark_watch_signals (
  id SERIAL PRIMARY KEY,
  broker_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
  quote_id INTEGER REFERENCES quotes(id) ON DELETE SET NULL,
  signal_type VARCHAR(80) NOT NULL,
  severity VARCHAR(20) DEFAULT 'medium',
  score INTEGER DEFAULT 50,
  title VARCHAR(300),
  description TEXT,
  suggested_action TEXT,
  estimated_value NUMERIC(10,2),
  status VARCHAR(40) DEFAULT 'new',
  detected_at TIMESTAMP DEFAULT NOW(),
  acknowledged_at TIMESTAMP,
  resolved_at TIMESTAMP,
  dedup_key VARCHAR(200),
  metadata JSONB DEFAULT '{}',
  UNIQUE(broker_id, dedup_key)
);

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_watch_broker_status ON ark_watch_signals(broker_id, status, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_watch_severity ON ark_watch_signals(severity, score DESC) WHERE status='new';
CREATE INDEX IF NOT EXISTS idx_watch_client ON ark_watch_signals(client_id);
CREATE INDEX IF NOT EXISTS idx_watch_type ON ark_watch_signals(signal_type);
CREATE INDEX IF NOT EXISTS idx_watch_dedup ON ark_watch_signals(dedup_key);

-- ==================== TABLE HISTORIQUE RUNS ====================
CREATE TABLE IF NOT EXISTS ark_watch_runs (
  id SERIAL PRIMARY KEY,
  broker_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  run_type VARCHAR(50),
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  status VARCHAR(40) DEFAULT 'running',
  signals_detected INTEGER DEFAULT 0,
  signals_by_type JSONB DEFAULT '{}',
  errors INTEGER DEFAULT 0,
  error_details JSONB DEFAULT '[]',
  duration_ms INTEGER,
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_watch_runs_broker ON ark_watch_runs(broker_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_watch_runs_status ON ark_watch_runs(status);

-- ==================== COLONNE last_contact si manquante ====================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='clients' AND column_name='last_contact'
  ) THEN
    ALTER TABLE clients ADD COLUMN last_contact TIMESTAMP;
  END IF;
END $$;

-- ==================== COLONNE resigned_at si manquante (pour reconquête) ====================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='clients' AND column_name='resigned_at'
  ) THEN
    ALTER TABLE clients ADD COLUMN resigned_at TIMESTAMP;
  END IF;
END $$;

-- ============================================================
-- FIN MIGRATION LOT 7 — ARK WATCH
-- ============================================================

-- ---------- source : backend/sql/migrations/lot8_compose.sql ----------

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

-- ---------- source : backend/sql/migrations/lot9_voice.sql ----------

-- =============================================================
-- LOT 9 : VOICE INTAKE — Transcription appels → fiche client IA
-- Migration COURTIA
-- =============================================================

-- Table principale des intakes vocaux
CREATE TABLE IF NOT EXISTS voice_intakes (
  id SERIAL PRIMARY KEY,
  broker_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
  
  -- Audio
  audio_storage_path VARCHAR(500),
  audio_duration_seconds INTEGER,
  audio_size_bytes INTEGER,
  
  -- Transcription
  transcript TEXT,
  transcript_language VARCHAR(10) DEFAULT 'fr',
  transcription_engine VARCHAR(50),
  transcription_cost_usd NUMERIC(10,6),
  
  -- Extraction IA
  extracted_data JSONB,
  suggested_client JSONB,
  suggested_needs JSONB,
  suggested_documents JSONB,
  suggested_next_action JSONB,
  
  -- Status et tracking
  status VARCHAR(40) DEFAULT 'pending',
  processed_at TIMESTAMP,
  applied_at TIMESTAMP,
  ai_cost_usd NUMERIC(10,6),
  total_latency_ms INTEGER,
  
  -- Meta
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_voice_broker ON voice_intakes(broker_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_voice_client ON voice_intakes(client_id);
CREATE INDEX IF NOT EXISTS idx_voice_status ON voice_intakes(status);

-- Commentaires
COMMENT ON TABLE voice_intakes IS 'LOT 9: Intakes vocaux (transcription appel → fiche client IA)';
COMMENT ON COLUMN voice_intakes.extracted_data IS 'JSON complet extrait par ARK (client, besoins, objections, etc)';
COMMENT ON COLUMN voice_intakes.suggested_client IS 'Suggestion de fiche client pré-remplie';
COMMENT ON COLUMN voice_intakes.suggested_needs IS 'Besoins identifiés pour devoir de conseil';
COMMENT ON COLUMN voice_intakes.suggested_documents IS 'Pièces à demander au client';
COMMENT ON COLUMN voice_intakes.suggested_next_action IS 'Prochaine action recommandée';

-- Statuts possibles:
-- pending    : Upload reçu, en attente traitement
-- processing : Transcription/extraction en cours
-- ready      : Prêt à être appliqué
-- applied    : Appliqué (client créé/mis à jour)
-- error      : Erreur durant traitement
-- cancelled  : Annulé par le courtier

SELECT 'LOT 9 Voice Intake migration applied' AS result;

-- ---------- source : backend/sql/migrations/lot10_doc_vision.sql ----------

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

-- ---------- source : backend/sql/migrations/lot11_provider_intel.sql ----------

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

-- ---------- source : backend/sql/migrations/lot12_portail.sql ----------

-- LOT 12 Portail Client
CREATE TABLE IF NOT EXISTS client_portal_accounts (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL UNIQUE REFERENCES clients(id) ON DELETE CASCADE,
  broker_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email VARCHAR(200) NOT NULL,
  password_hash VARCHAR(255),
  activation_token VARCHAR(120),
  activation_token_expires_at TIMESTAMP,
  activated_at TIMESTAMP,
  last_login_at TIMESTAMP,
  login_count INTEGER DEFAULT 0,
  status VARCHAR(40) DEFAULT 'pending',
  reset_token VARCHAR(120),
  reset_token_expires_at TIMESTAMP,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_portal_email ON client_portal_accounts(email);
CREATE INDEX IF NOT EXISTS idx_portal_broker ON client_portal_accounts(broker_id);
CREATE INDEX IF NOT EXISTS idx_portal_token ON client_portal_accounts(activation_token) WHERE activation_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_portal_reset_token ON client_portal_accounts(reset_token) WHERE reset_token IS NOT NULL;

CREATE TABLE IF NOT EXISTS client_portal_messages (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  broker_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender VARCHAR(20) NOT NULL CHECK (sender IN ('client', 'broker')),
  body TEXT NOT NULL,
  attachments JSONB DEFAULT '[]',
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_portmsg_client ON client_portal_messages(client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_portmsg_unread ON client_portal_messages(broker_id, read_at) WHERE read_at IS NULL;

CREATE TABLE IF NOT EXISTS client_portal_signatures (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  compliance_document_id INTEGER REFERENCES compliance_documents(id) ON DELETE CASCADE,
  signed_at TIMESTAMP DEFAULT NOW(),
  signature_method VARCHAR(50) DEFAULT 'click_to_sign',
  signature_proof JSONB,
  ip_address VARCHAR(50),
  user_agent VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_portsig_client ON client_portal_signatures(client_id);
CREATE INDEX IF NOT EXISTS idx_portsig_doc ON client_portal_signatures(compliance_document_id);

CREATE TABLE IF NOT EXISTS client_portal_quote_requests (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  broker_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  insurance_type VARCHAR(50) NOT NULL,
  criteria JSONB DEFAULT '{}',
  status VARCHAR(40) DEFAULT 'pending',
  quote_id INTEGER REFERENCES quotes(id) ON DELETE SET NULL,
  broker_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_portal_qr_client ON client_portal_quote_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_portal_qr_broker ON client_portal_quote_requests(broker_id, status);

CREATE TABLE IF NOT EXISTS client_document_requests (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  broker_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  document_type VARCHAR(100) NOT NULL,
  description TEXT,
  status VARCHAR(40) DEFAULT 'pending',
  uploaded_document_id INTEGER,
  requested_at TIMESTAMP DEFAULT NOW(),
  fulfilled_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_doc_req_client ON client_document_requests(client_id, status);
CREATE INDEX IF NOT EXISTS idx_doc_req_broker ON client_document_requests(broker_id, status);
