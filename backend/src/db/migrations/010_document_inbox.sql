-- Migration 010: Documents Inbox — Uploads, requests, checklists, submissions
-- ================================================================

-- 1. Document Uploads (fichiers déposés par client ou courtier)
CREATE TABLE IF NOT EXISTS document_uploads (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id     INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  file_name     VARCHAR(512) NOT NULL,
  file_size     INTEGER NOT NULL DEFAULT 0,
  mime_type     VARCHAR(128) NOT NULL DEFAULT 'application/octet-stream',
  storage_path  TEXT NOT NULL,
  checksum      VARCHAR(64),
  document_category VARCHAR(64) DEFAULT 'autre',
  status        VARCHAR(32) NOT NULL DEFAULT 'reçu',
  -- reçu | en_analyse | à_vérifier | accepté | rejeté
  confidence    REAL DEFAULT 0,
  extracted_data JSONB DEFAULT '{}',
  source        VARCHAR(32) NOT NULL DEFAULT 'upload',
  -- upload | request | email | courtier
  request_id    INTEGER,
  notes         TEXT,
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doc_uploads_user ON document_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_doc_uploads_client ON document_uploads(client_id);
CREATE INDEX IF NOT EXISTS idx_doc_uploads_status ON document_uploads(status);

-- 2. Document Requests (demande de pièces envoyée au client)
CREATE TABLE IF NOT EXISTS document_requests (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id     INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  token         VARCHAR(64) NOT NULL UNIQUE,
  required_docs JSONB DEFAULT '[]',
  message       TEXT,
  expires_at    TIMESTAMP NOT NULL,
  status        VARCHAR(32) NOT NULL DEFAULT 'pending',
  -- pending | sent | partial | complete | expired | cancelled
  recipient_email VARCHAR(255),
  sent_at       TIMESTAMP,
  completed_at  TIMESTAMP,
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doc_req_user ON document_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_doc_req_client ON document_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_doc_req_token ON document_requests(token);
CREATE INDEX IF NOT EXISTS idx_doc_req_status ON document_requests(status);

-- 3. Document Checklists (pièces requises / reçues / manquantes)
CREATE TABLE IF NOT EXISTS document_checklists (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id     INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  contract_id   INTEGER REFERENCES contracts(id) ON DELETE SET NULL,
  title         VARCHAR(255) DEFAULT 'Dossier',
  required_docs JSONB DEFAULT '[]',
  received_docs JSONB DEFAULT '[]',
  missing_docs  JSONB DEFAULT '[]',
  status        VARCHAR(32) NOT NULL DEFAULT 'incomplete',
  -- incomplete | partial | complete | submitted
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doc_cl_user ON document_checklists(user_id);
CREATE INDEX IF NOT EXISTS idx_doc_cl_client ON document_checklists(client_id);

-- 4. Insurance Submissions (envoi à l'assurance)
CREATE TABLE IF NOT EXISTS insurance_submissions (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id       INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  contract_id     INTEGER REFERENCES contracts(id) ON DELETE SET NULL,
  insurer_name    VARCHAR(255),
  insurer_email   VARCHAR(255) NOT NULL,
  subject         TEXT NOT NULL,
  body            TEXT NOT NULL,
  attachment_ids  JSONB DEFAULT '[]',
  status          VARCHAR(32) NOT NULL DEFAULT 'draft',
  -- draft | ready | sent | failed
  sent_at         TIMESTAMP,
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ins_sub_user ON insurance_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_ins_sub_client ON insurance_submissions(client_id);
CREATE INDEX IF NOT EXISTS idx_ins_sub_status ON insurance_submissions(status);

-- 5. Document Actions Log (audit trail)
CREATE TABLE IF NOT EXISTS document_actions (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  document_id   INTEGER REFERENCES document_uploads(id) ON DELETE SET NULL,
  action        VARCHAR(64) NOT NULL,
  metadata      JSONB DEFAULT '{}',
  ip_address    VARCHAR(45),
  created_at    TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doc_act_user ON document_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_doc_act_doc ON document_actions(document_id);
