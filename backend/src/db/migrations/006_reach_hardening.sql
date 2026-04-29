-- ============================================================
-- COURTIA REACH — Hardening & missing elements
-- Migration 006_reach_hardening.sql
-- 
-- ADDS (no modification to 005_reach.sql) :
--   1. Missing columns on reach_prospects, reach_campaigns, reach_replies
--   2. New tables: reach_opt_outs, reach_settings
--   3. FK fix on reach_prospects.converted_client_id -> clients(id)
--   4. Missing indexes for performance
--
-- All statements are idempotent (IF NOT EXISTS / DO blocks).
-- ============================================================

-- ============================================================
-- 1. MISSING COLUMNS: reach_prospects
-- ============================================================
ALTER TABLE reach_prospects ADD COLUMN IF NOT EXISTS postal_code VARCHAR(10);
ALTER TABLE reach_prospects ADD COLUMN IF NOT EXISTS compliance_status VARCHAR(30) DEFAULT 'pending';
ALTER TABLE reach_prospects ADD COLUMN IF NOT EXISTS opt_out BOOLEAN DEFAULT false;
ALTER TABLE reach_prospects ADD COLUMN IF NOT EXISTS premium_potential_score INTEGER DEFAULT 0;
ALTER TABLE reach_prospects ADD COLUMN IF NOT EXISTS conversion_likelihood INTEGER DEFAULT 0;
ALTER TABLE reach_prospects ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMPTZ;
ALTER TABLE reach_prospects ADD COLUMN IF NOT EXISTS next_action_at TIMESTAMPTZ;

-- ============================================================
-- 2. MISSING COLUMNS: reach_campaigns
-- ============================================================
ALTER TABLE reach_campaigns ADD COLUMN IF NOT EXISTS target_category VARCHAR(100);
ALTER TABLE reach_campaigns ADD COLUMN IF NOT EXISTS tone VARCHAR(30) DEFAULT 'professionnel';
ALTER TABLE reach_campaigns ADD COLUMN IF NOT EXISTS human_validation_required BOOLEAN DEFAULT true;

-- ============================================================
-- 3. MISSING COLUMNS: reach_replies
-- ============================================================
ALTER TABLE reach_replies ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE reach_replies ADD COLUMN IF NOT EXISTS campaign_id INTEGER REFERENCES reach_campaigns(id) ON DELETE SET NULL;

-- ============================================================
-- 4. NEW TABLE: reach_opt_outs
--    Tracks users who opted out from REACH campaigns.
-- ============================================================
CREATE TABLE IF NOT EXISTS reach_opt_outs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  prospect_id INTEGER REFERENCES reach_prospects(id) ON DELETE CASCADE,
  email VARCHAR(255),
  phone VARCHAR(30),
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 5. NEW TABLE: reach_settings
--    Per-user REACH preferences & feature flags.
-- ============================================================
CREATE TABLE IF NOT EXISTS reach_settings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  google_places_enabled BOOLEAN DEFAULT false,
  ai_enabled BOOLEAN DEFAULT false,
  default_city VARCHAR(100),
  default_category VARCHAR(100),
  auto_validate_messages BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 6. FK FIX: reach_prospects.converted_client_id -> clients(id)
--    Idempotent: adds constraint only if it does not already exist.
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_reach_prospects_converted_client'
      AND conrelid = 'reach_prospects'::regclass
  ) THEN
    ALTER TABLE reach_prospects
      ADD CONSTRAINT fk_reach_prospects_converted_client
      FOREIGN KEY (converted_client_id) REFERENCES clients(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================
-- 7. MISSING INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_reach_replies_user_id      ON reach_replies(user_id);
CREATE INDEX IF NOT EXISTS idx_reach_replies_campaign_id   ON reach_replies(campaign_id);
CREATE INDEX IF NOT EXISTS idx_reach_campaigns_status      ON reach_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_reach_opt_outs_user_id      ON reach_opt_outs(user_id);
