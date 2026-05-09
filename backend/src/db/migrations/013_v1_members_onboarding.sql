CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS cabinets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'Cabinet COURTIA',
  orias_number TEXT,
  ias_categories TEXT[] NOT NULL DEFAULT '{}',
  rc_pro_company TEXT,
  rc_pro_number TEXT,
  rc_pro_amount_cents BIGINT,
  address_line1 TEXT,
  postal_code TEXT,
  city TEXT,
  country TEXT DEFAULT 'France',
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cabinet_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cabinet_id UUID NOT NULL REFERENCES cabinets(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'broker', 'assistant', 'viewer')),
  removed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (cabinet_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_cabinet_members_user ON cabinet_members(user_id) WHERE removed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_cabinet_members_cabinet ON cabinet_members(cabinet_id) WHERE removed_at IS NULL;

CREATE TABLE IF NOT EXISTS cabinet_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cabinet_id UUID NOT NULL REFERENCES cabinets(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'broker', 'assistant', 'viewer')),
  token_hash TEXT NOT NULL UNIQUE,
  token_preview TEXT,
  invited_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  accepted_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cabinet_invitations_cabinet ON cabinet_invitations(cabinet_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cabinet_invitations_email ON cabinet_invitations(LOWER(email));

CREATE TABLE IF NOT EXISTS onboarding_progress (
  cabinet_id UUID PRIMARY KEY REFERENCES cabinets(id) ON DELETE CASCADE,
  step_profile_done BOOLEAN NOT NULL DEFAULT FALSE,
  step_import_done BOOLEAN NOT NULL DEFAULT FALSE,
  step_google_done BOOLEAN NOT NULL DEFAULT FALSE,
  step_first_client_done BOOLEAN NOT NULL DEFAULT FALSE,
  step_first_brief_done BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO feature_flags (key, description, default_enabled)
VALUES
  ('v1_members_onboarding', 'V1 multi-utilisateurs, invitations et onboarding cabinet', TRUE)
ON CONFLICT (key) DO UPDATE SET
  description = EXCLUDED.description,
  default_enabled = EXCLUDED.default_enabled;
