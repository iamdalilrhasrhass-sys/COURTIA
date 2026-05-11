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
