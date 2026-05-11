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
