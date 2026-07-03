-- ============================================================
-- MIGRATION 003a : RECONCILIATION SCHEMA LEGACY PROD (VPS)
-- COURTIA — 2026-07-02
--
-- La base crm_assurance provient d'une lignée antérieure au
-- baseline attendu par 003b+. Cette migration crée les
-- prérequis manquants. Idempotente : aucun effet sur une base
-- déjà conforme.
-- ============================================================

BEGIN;

-- ─────────────────────────────────────────────────────────
-- 1. plan_limits — attendue par 003b/003d (features JSONB par plan)
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS plan_limits (
  plan       VARCHAR(20) PRIMARY KEY,
  features   JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO plan_limits (plan) VALUES ('start'), ('pro'), ('elite')
ON CONFLICT (plan) DO NOTHING;

-- ─────────────────────────────────────────────────────────
-- 2. demo_requests — attendue par 011 + routes leads
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS demo_requests (
  id SERIAL PRIMARY KEY,
  first_name  VARCHAR(100),
  last_name   VARCHAR(100),
  company_name VARCHAR(200),
  email       VARCHAR(255),
  phone       VARCHAR(50),
  city        VARCHAR(120),
  team_size   VARCHAR(50),
  current_tools TEXT,
  wants_google_calendar BOOLEAN DEFAULT false,
  wants_whatsapp        BOOLEAN DEFAULT false,
  wants_email_sync      BOOLEAN DEFAULT false,
  message     TEXT,
  consent     BOOLEAN DEFAULT false,
  source      VARCHAR(100),
  status      VARCHAR(30) DEFAULT 'new',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────
-- 3. Tables legacy existantes sans les colonnes attendues
--    (guardées : ne s'exécutent que si la table existe déjà)
-- ─────────────────────────────────────────────────────────
DO $$
BEGIN
  IF to_regclass('public.signature_requests') IS NOT NULL THEN
    ALTER TABLE signature_requests
      ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
  END IF;

  IF to_regclass('public.onboarding_progress') IS NOT NULL THEN
    ALTER TABLE onboarding_progress
      ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
    CREATE UNIQUE INDEX IF NOT EXISTS uq_onboarding_progress_user
      ON onboarding_progress(user_id);
  END IF;

  IF to_regclass('public.audit_logs') IS NOT NULL THEN
    ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS resource_type VARCHAR(50);
    ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS resource_id   VARCHAR(100);
    ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS old_values    JSONB;
    ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS new_values    JSONB;
  END IF;
END $$;

COMMIT;
