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
