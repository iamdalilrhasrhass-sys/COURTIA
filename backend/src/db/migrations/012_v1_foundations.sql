-- 012_v1_foundations.sql
-- Foundations V1 launch: feature flags and audit log.
-- Down migration: src/db/migrations/down/012_v1_foundations.down.sql

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  description TEXT,
  default_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS feature_flag_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  cabinet_id TEXT,
  flag_key TEXT NOT NULL REFERENCES feature_flags(key) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (user_id IS NOT NULL OR cabinet_id IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_feature_flag_overrides_user
  ON feature_flag_overrides(user_id, flag_key)
  WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_feature_flag_overrides_cabinet
  ON feature_flag_overrides(cabinet_id, flag_key)
  WHERE cabinet_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS audit_log (
  id BIGSERIAL PRIMARY KEY,
  cabinet_id TEXT,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_cabinet_created ON audit_log(cabinet_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_user_created ON audit_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity_type, entity_id);

INSERT INTO feature_flags (key, description, default_enabled)
VALUES
  ('v1_foundations', 'Socle V1: audit, redaction, chiffrement et UI tokens.', TRUE),
  ('dda_documents', 'Documents métier DDA et archivage client.', FALSE),
  ('google_calendar', 'Connexion Google Calendar et synchronisation des rendez-vous.', FALSE),
  ('gmail', 'Connexion Gmail, sync légère et envoi depuis COURTIA.', FALSE),
  ('stripe_self_serve', 'Billing Stripe self-serve.', FALSE),
  ('ark_v1_structured', 'ARK V1 structuré avec budgets et recommandations.', FALSE)
ON CONFLICT (key) DO UPDATE SET
  description = EXCLUDED.description,
  default_enabled = EXCLUDED.default_enabled;
