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
    ALTER TABLE signature_requests ADD COLUMN IF NOT EXISTS document_id INTEGER;
    ALTER TABLE signature_requests ADD COLUMN IF NOT EXISTS client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL;
    ALTER TABLE signature_requests ADD COLUMN IF NOT EXISTS yousign_request_id VARCHAR(255);
    ALTER TABLE signature_requests ADD COLUMN IF NOT EXISTS signer_email VARCHAR(255);
    ALTER TABLE signature_requests ADD COLUMN IF NOT EXISTS signer_name VARCHAR(255);
    ALTER TABLE signature_requests ADD COLUMN IF NOT EXISTS signature_url TEXT;
    ALTER TABLE signature_requests ADD COLUMN IF NOT EXISTS last_reminder_at TIMESTAMPTZ;
    ALTER TABLE signature_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;

  IF to_regclass('public.whatsapp_messages') IS NOT NULL THEN
    ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
    ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL;
    ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
    ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS message_type VARCHAR(50) DEFAULT 'text';
    ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS message TEXT;
    ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS template_name VARCHAR(100);
    ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS template_params JSONB DEFAULT '[]'::jsonb;
    ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS whatsapp_message_id VARCHAR(200);
    ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS error_message TEXT;
    ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
    ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;
    ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;

  -- onboarding_progress legacy (clé cabinet_id) = ancienne table du module cabinet.
  -- Renommée en cabinet_onboarding_progress (013 corrigé l'utilise désormais),
  -- ce qui libère le nom onboarding_progress pour la version user_id/badges (025).
  IF to_regclass('public.onboarding_progress') IS NOT NULL
     AND EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='onboarding_progress' AND column_name='cabinet_id')
     AND to_regclass('public.cabinet_onboarding_progress') IS NULL THEN
    ALTER TABLE onboarding_progress RENAME TO cabinet_onboarding_progress;
  END IF;

  IF to_regclass('public.calendar_events') IS NOT NULL THEN
    ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS event_date TIMESTAMPTZ;
    ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS end_date TIMESTAMPTZ;
    ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS google_event_id VARCHAR(255);
    ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS event_type VARCHAR(50) DEFAULT 'rdv';
    ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT FALSE;
  END IF;

  IF to_regclass('public.audit_logs') IS NOT NULL THEN
    ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS resource_type VARCHAR(50);
    ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS resource_id   VARCHAR(100);
    ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS old_values    JSONB;
    ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS new_values    JSONB;
  END IF;
END $$;

COMMIT;
