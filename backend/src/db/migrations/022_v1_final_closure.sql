-- 022_v1_final_closure.sql
-- Final V1 closure: product events, feedback loop, usage counters.
-- Down migration: src/db/migrations/down/022_v1_final_closure.down.sql

CREATE TABLE IF NOT EXISTS product_events (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  organization_id INTEGER,
  event_name TEXT NOT NULL,
  properties JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_events_created
  ON product_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_events_user_created
  ON product_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_events_event_created
  ON product_events(event_name, created_at DESC);

CREATE TABLE IF NOT EXISTS feedback_items (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('bug', 'idea', 'friction', 'praise')),
  page TEXT,
  message TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'seen', 'resolved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_items_created
  ON feedback_items(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_items_status_created
  ON feedback_items(status, created_at DESC);

CREATE TABLE IF NOT EXISTS plan_usage_events (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  usage_type TEXT NOT NULL,
  amount INTEGER NOT NULL DEFAULT 1 CHECK (amount > 0),
  period_start DATE NOT NULL DEFAULT date_trunc('month', NOW())::date,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_plan_usage_events_user_type_period
  ON plan_usage_events(user_id, usage_type, period_start);

INSERT INTO feature_flags (key, description, default_enabled)
VALUES ('v1_final_closure', 'V1 closure: feedback, product observability, usage counters and status hardening', TRUE)
ON CONFLICT (key) DO UPDATE SET
  description = EXCLUDED.description,
  default_enabled = EXCLUDED.default_enabled;
