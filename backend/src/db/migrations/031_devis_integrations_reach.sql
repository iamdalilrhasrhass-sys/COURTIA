-- LOT F3 + F7 + F8 — Compléments devis / intégrations / reach
-- Migration 031

-- ============================================================
-- F3 — DEVIS WIZARD (compléments) + table sequences/runs reach
-- ============================================================

ALTER TABLE devis_wizard
  ADD COLUMN IF NOT EXISTS reference VARCHAR(64),
  ADD COLUMN IF NOT EXISTS subject TEXT,
  ADD COLUMN IF NOT EXISTS total_premium_cents BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS client_email_cache VARCHAR(255),
  ADD COLUMN IF NOT EXISTS client_name_cache VARCHAR(255),
  ADD COLUMN IF NOT EXISTS cabinet_name_cache VARCHAR(255),
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS first_opened_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS validity_days INTEGER DEFAULT 30,
  ADD COLUMN IF NOT EXISTS ark_summary TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_devis_wizard_reference
  ON devis_wizard(reference)
  WHERE reference IS NOT NULL;

CREATE TABLE IF NOT EXISTS devis_activity (
  id SERIAL PRIMARY KEY,
  devis_id INTEGER REFERENCES devis_wizard(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  event VARCHAR(60) NOT NULL,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_devis_activity_devis ON devis_activity(devis_id);

-- ============================================================
-- F7 — Intégrations (compléments tooltip / scopes / external_id)
-- ============================================================

ALTER TABLE integration_configs
  ADD COLUMN IF NOT EXISTS external_account VARCHAR(255),
  ADD COLUMN IF NOT EXISTS scope TEXT,
  ADD COLUMN IF NOT EXISTS access_token_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS refresh_token_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_integration_configs_key
  ON integration_configs(integration_key);

-- ============================================================
-- F8 — Reach séquences / runs (manquent dans 005)
-- ============================================================

CREATE TABLE IF NOT EXISTS reach_audiences (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(160) NOT NULL,
  description TEXT,
  filters JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reach_audiences_user ON reach_audiences(user_id);

CREATE TABLE IF NOT EXISTS reach_sequences (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  audience_id INTEGER REFERENCES reach_audiences(id) ON DELETE SET NULL,
  name VARCHAR(160) NOT NULL,
  channel VARCHAR(20) DEFAULT 'email',
  template TEXT,
  steps_json JSONB DEFAULT '[]'::jsonb,
  template_key VARCHAR(60),
  status VARCHAR(20) DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reach_sequences_user ON reach_sequences(user_id);

CREATE TABLE IF NOT EXISTS reach_sequence_runs (
  id SERIAL PRIMARY KEY,
  sequence_id INTEGER REFERENCES reach_sequences(id) ON DELETE CASCADE,
  prospect_id INTEGER REFERENCES reach_prospects(id) ON DELETE CASCADE,
  current_step INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active', -- active|paused|done|stopped
  next_run_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_action_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(sequence_id, prospect_id)
);
CREATE INDEX IF NOT EXISTS idx_reach_seq_runs_status ON reach_sequence_runs(status);
CREATE INDEX IF NOT EXISTS idx_reach_seq_runs_next ON reach_sequence_runs(next_run_at);

-- KPIs Reach par cabinet (calcul à la volée mais matérialisé chaque heure)
CREATE TABLE IF NOT EXISTS reach_kpis_snapshot (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  total_prospects INTEGER DEFAULT 0,
  total_messages INTEGER DEFAULT 0,
  total_opens INTEGER DEFAULT 0,
  total_clicks INTEGER DEFAULT 0,
  total_replies INTEGER DEFAULT 0,
  total_meetings INTEGER DEFAULT 0,
  open_rate NUMERIC(5,2) DEFAULT 0,
  click_rate NUMERIC(5,2) DEFAULT 0,
  reply_rate NUMERIC(5,2) DEFAULT 0,
  meeting_rate NUMERIC(5,2) DEFAULT 0,
  best_day VARCHAR(10),
  best_hour INTEGER,
  trend_30d JSONB DEFAULT '[]'::jsonb,
  computed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMIT;
