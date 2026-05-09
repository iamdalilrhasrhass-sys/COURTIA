CREATE TABLE IF NOT EXISTS yousign_webhook_events (
  id SERIAL PRIMARY KEY,
  event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  signature_request_id TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_yousign_webhook_events_request
  ON yousign_webhook_events(signature_request_id, processed_at DESC);

INSERT INTO feature_flags (key, description, default_enabled)
VALUES
  ('v1_yousign_signature', 'V1 Yousign e-signature for DDA documents', TRUE)
ON CONFLICT (key) DO UPDATE SET
  description = EXCLUDED.description,
  default_enabled = EXCLUDED.default_enabled;
