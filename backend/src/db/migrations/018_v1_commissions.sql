CREATE TABLE IF NOT EXISTS commissions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contract_id INTEGER NOT NULL,
  insurer TEXT NOT NULL,
  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  expected_amount_cents BIGINT NOT NULL DEFAULT 0,
  received_amount_cents BIGINT NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'eur',
  status TEXT NOT NULL DEFAULT 'expected',
  apporteur_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  apporteur_share_bps INTEGER NOT NULL DEFAULT 0 CHECK (apporteur_share_bps BETWEEN 0 AND 10000),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, contract_id, period_year, period_month)
);

CREATE INDEX IF NOT EXISTS idx_commissions_user_period
  ON commissions(user_id, period_year DESC, period_month DESC);

CREATE INDEX IF NOT EXISTS idx_commissions_user_insurer
  ON commissions(user_id, insurer);

CREATE INDEX IF NOT EXISTS idx_commissions_apporteur_period
  ON commissions(apporteur_user_id, period_year DESC, period_month DESC);

INSERT INTO feature_flags (key, description, default_enabled)
VALUES
  ('v1_commissions', 'V1 suivi commissions courtier: saisie, import CSV, stats et exports', TRUE)
ON CONFLICT (key) DO UPDATE SET
  description = EXCLUDED.description,
  default_enabled = EXCLUDED.default_enabled;
