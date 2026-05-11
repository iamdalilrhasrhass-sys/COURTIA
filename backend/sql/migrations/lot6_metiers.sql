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

CREATE INDEX IF NOT EXISTS idx_relances_broker ON relances(broker_id, status);
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
