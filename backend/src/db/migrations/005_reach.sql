-- ============================================================
-- COURTIA REACH — Module d'acquisition IA pour courtiers
-- Migration 005_reach.sql
-- Tables : reach_prospects, reach_campaigns, reach_messages, etc.
-- ============================================================

-- 1. Sources de prospects
CREATE TABLE IF NOT EXISTS reach_sources (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(30) DEFAULT 'manual',  -- google_places, csv, manual, api, directory
  config JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Prospects Reach (enrichis, scorés, prêts pour campagne)
CREATE TABLE IF NOT EXISTS reach_prospects (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  source_id INTEGER REFERENCES reach_sources(id) ON DELETE SET NULL,

  -- Identité
  company_name VARCHAR(255),
  contact_first_name VARCHAR(100),
  contact_last_name VARCHAR(100),
  role VARCHAR(150),

  -- Catégorisation assurance
  category VARCHAR(100),          -- garage, agent_assurance, courtier, artisan, taxi, mandataire
  niche VARCHAR(100),             -- auto, rc_pro, decennale, flotte, sante, prevoyance, multirisque
  insurance_need VARCHAR(150),    -- flotte_auto, rc_pro, decennale, mutuelle, local_commercial

  -- Contact
  city VARCHAR(100),
  address TEXT,
  phone VARCHAR(30),
  email VARCHAR(255),
  website VARCHAR(500),
  linkedin_url VARCHAR(500),
  google_maps_url TEXT,

  -- Geo
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),

  -- Réputation
  rating DECIMAL(2,1) DEFAULT 0,
  review_count INTEGER DEFAULT 0,

  -- Scoring assurance (ARK)
  opportunity_score INTEGER DEFAULT 0,  -- /100
  urgency_score INTEGER DEFAULT 0,      -- /100
  ease_score INTEGER DEFAULT 0,         -- /100
  estimated_annual_premium INTEGER,     -- € estimation prime annuelle
  recommended_product VARCHAR(150),
  approach_angle TEXT,
  probable_objection TEXT,

  -- Statut pipeline
  status VARCHAR(30) DEFAULT 'nouveau',
    -- nouveau, a_contacter, contacte, interesse, rdv_pris, signe, perdu

  -- Conversion CRM
  converted_client_id INTEGER,  -- FK clients.id
  converted_at TIMESTAMPTZ,

  -- Audit
  raw_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Analyses ARK détaillées (peut être régénéré)
CREATE TABLE IF NOT EXISTS reach_analyses (
  id SERIAL PRIMARY KEY,
  prospect_id INTEGER REFERENCES reach_prospects(id) ON DELETE CASCADE,
  problems_detected JSONB DEFAULT '[]',
  opportunities JSONB DEFAULT '[]',
  call_script TEXT,
  linkedin_message TEXT,
  email_template TEXT,
  sms_template TEXT,
  next_best_action TEXT,
  score_details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Campagnes Reach
CREATE TABLE IF NOT EXISTS reach_campaigns (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  target_description TEXT,
  channel VARCHAR(30) DEFAULT 'email',  -- email, call, sms, linkedin_assisted
  status VARCHAR(20) DEFAULT 'draft',   -- draft, active, paused, completed
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Étapes de campagne (séquences)
CREATE TABLE IF NOT EXISTS reach_campaign_steps (
  id SERIAL PRIMARY KEY,
  campaign_id INTEGER REFERENCES reach_campaigns(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  delay_days INTEGER DEFAULT 0,      -- J+0, J+2, J+5, J+10
  channel VARCHAR(20) DEFAULT 'email',
  subject_template TEXT,
  body_template TEXT,
  is_approved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Prospects dans une campagne
CREATE TABLE IF NOT EXISTS reach_campaign_prospects (
  id SERIAL PRIMARY KEY,
  campaign_id INTEGER REFERENCES reach_campaigns(id) ON DELETE CASCADE,
  prospect_id INTEGER REFERENCES reach_prospects(id) ON DELETE CASCADE,
  current_step INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending',  -- pending, sent, replied, bounced, unsubscribed
  added_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Messages envoyés / reçus
CREATE TABLE IF NOT EXISTS reach_messages (
  id SERIAL PRIMARY KEY,
  prospect_id INTEGER REFERENCES reach_prospects(id) ON DELETE CASCADE,
  campaign_id INTEGER REFERENCES reach_campaigns(id) ON DELETE SET NULL,
  direction VARCHAR(10) DEFAULT 'outbound',  -- outbound, inbound
  channel VARCHAR(20) DEFAULT 'email',
  subject TEXT,
  body TEXT,
  status VARCHAR(20) DEFAULT 'pending',     -- pending, sent, delivered, failed
  reply_to_id INTEGER REFERENCES reach_messages(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ
);

-- 8. Réponses (Inbox)
CREATE TABLE IF NOT EXISTS reach_replies (
  id SERIAL PRIMARY KEY,
  message_id INTEGER REFERENCES reach_messages(id) ON DELETE SET NULL,
  prospect_id INTEGER REFERENCES reach_prospects(id) ON DELETE CASCADE,
  from_address VARCHAR(255),
  subject TEXT,
  body TEXT,
  sentiment VARCHAR(20),  -- interested, cold, objection, not_now, quote_request
  is_read BOOLEAN DEFAULT false,
  ark_recommended_reply TEXT,
  task_created BOOLEAN DEFAULT false,
  client_created BOOLEAN DEFAULT false,
  received_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Notes
CREATE TABLE IF NOT EXISTS reach_notes (
  id SERIAL PRIMARY KEY,
  prospect_id INTEGER REFERENCES reach_prospects(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Journal d'activité
CREATE TABLE IF NOT EXISTS reach_activity_log (
  id SERIAL PRIMARY KEY,
  prospect_id INTEGER REFERENCES reach_prospects(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL,  -- created, scored, contacted, replied, converted, note_added
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_reach_prospects_user ON reach_prospects(user_id);
CREATE INDEX IF NOT EXISTS idx_reach_prospects_status ON reach_prospects(status);
CREATE INDEX IF NOT EXISTS idx_reach_prospects_category ON reach_prospects(category);
CREATE INDEX IF NOT EXISTS idx_reach_prospects_city ON reach_prospects(city);
CREATE INDEX IF NOT EXISTS idx_reach_prospects_score ON reach_prospects(opportunity_score DESC);
CREATE INDEX IF NOT EXISTS idx_reach_analyses_prospect ON reach_analyses(prospect_id);
CREATE INDEX IF NOT EXISTS idx_reach_campaigns_user ON reach_campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_reach_messages_prospect ON reach_messages(prospect_id);
CREATE INDEX IF NOT EXISTS idx_reach_replies_prospect ON reach_replies(prospect_id);
CREATE INDEX IF NOT EXISTS idx_reach_notes_prospect ON reach_notes(prospect_id);
CREATE INDEX IF NOT EXISTS idx_reach_activity_prospect ON reach_activity_log(prospect_id);
