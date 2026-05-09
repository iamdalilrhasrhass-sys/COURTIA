-- 020_v1_ark_proactive.sql
-- ARK V1 proactive: budgeted runs, recommendations, deterministic client risk scores.

CREATE TABLE IF NOT EXISTS ark_runs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  feature TEXT NOT NULL,
  model TEXT NOT NULL,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cost_micro_eur BIGINT NOT NULL DEFAULT 0,
  latency_ms INTEGER,
  status TEXT NOT NULL,
  error TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ark_runs_user_created
  ON ark_runs(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS ark_recommendations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 50 CHECK (priority BETWEEN 0 AND 100),
  title TEXT NOT NULL,
  rationale TEXT NOT NULL,
  suggested_action JSONB NOT NULL DEFAULT '{}',
  expires_at TIMESTAMP,
  acted_on_at TIMESTAMP,
  dismissed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ark_recommendations_user_created
  ON ark_recommendations(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ark_recommendations_client
  ON ark_recommendations(client_id);

CREATE TABLE IF NOT EXISTS client_risk_scores (
  client_id INTEGER PRIMARY KEY REFERENCES clients(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  churn_score INTEGER NOT NULL CHECK (churn_score BETWEEN 0 AND 100),
  factors JSONB NOT NULL DEFAULT '{}',
  computed_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_risk_scores_user_score
  ON client_risk_scores(user_id, churn_score DESC);

CREATE TABLE IF NOT EXISTS ark_budgets (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  monthly_cap_micro_eur BIGINT NOT NULL DEFAULT 15000000,
  hard_cap_micro_eur BIGINT NOT NULL DEFAULT 25000000,
  current_period_start DATE NOT NULL DEFAULT date_trunc('month', NOW())::date,
  current_spend_micro_eur BIGINT NOT NULL DEFAULT 0,
  paused BOOLEAN NOT NULL DEFAULT FALSE
);

INSERT INTO feature_flags (key, description, default_enabled)
VALUES ('v1_ark_proactive', 'V1 ARK proactive recommendations, morning brief and budget guard', TRUE)
ON CONFLICT (key) DO UPDATE SET
  description = EXCLUDED.description,
  default_enabled = EXCLUDED.default_enabled;
