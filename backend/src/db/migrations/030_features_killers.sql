-- LOT FEATURES KILLERS — F1..F8
-- Migration 030

-- ============================================================
-- F1 — ARK PREDICTIVE INTELLIGENCE
-- ============================================================

-- Scores de churn ML par client
CREATE TABLE IF NOT EXISTS ark_churn_scores (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 0, -- 0..100
  risk_level VARCHAR(20) DEFAULT 'low', -- low|medium|high|critical
  factors JSONB DEFAULT '[]'::jsonb, -- liste facteurs identifiés
  retention_plan JSONB DEFAULT '{}'::jsonb, -- plan ARK généré
  computed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, client_id)
);
CREATE INDEX IF NOT EXISTS idx_churn_user ON ark_churn_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_churn_score ON ark_churn_scores(score DESC);

-- Cross-sell recommandations par client × produit
CREATE TABLE IF NOT EXISTS ark_cross_sell_recommendations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
  product VARCHAR(80) NOT NULL, -- Auto, MRH, Santé...
  opportunity_score INTEGER NOT NULL DEFAULT 0, -- 0..100
  estimated_eur_year INTEGER DEFAULT 0,
  rationale TEXT,
  status VARCHAR(30) DEFAULT 'new', -- new|engaged|quoted|won|lost
  computed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, client_id, product)
);
CREATE INDEX IF NOT EXISTS idx_xsell_user ON ark_cross_sell_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_xsell_score ON ark_cross_sell_recommendations(opportunity_score DESC);

-- Renewal optimizations (recommandations pour contrats à échéance)
CREATE TABLE IF NOT EXISTS ark_renewal_optimizations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
  contract_ref VARCHAR(120),
  product VARCHAR(80),
  current_provider VARCHAR(120),
  current_premium_cents BIGINT DEFAULT 0,
  recommendation VARCHAR(20) DEFAULT 'renew', -- renew|migrate
  recommended_provider VARCHAR(120),
  estimated_saving_cents BIGINT DEFAULT 0,
  echeance_date DATE,
  rationale TEXT,
  status VARCHAR(30) DEFAULT 'pending', -- pending|action_taken|completed
  computed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_renewals_user ON ark_renewal_optimizations(user_id);
CREATE INDEX IF NOT EXISTS idx_renewals_echeance ON ark_renewal_optimizations(echeance_date);

-- ============================================================
-- F2 — COMPARATOR (déjà quote_requests/results existent)
-- ============================================================
CREATE TABLE IF NOT EXISTS comparator_runs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
  product VARCHAR(80) NOT NULL,
  profile JSONB DEFAULT '{}'::jsonb,
  quotes JSONB DEFAULT '[]'::jsonb,
  best_provider VARCHAR(120),
  best_premium_cents BIGINT,
  ark_recommendation TEXT,
  pdf_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_comp_runs_user ON comparator_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_comp_runs_client ON comparator_runs(client_id);

-- ============================================================
-- F3 — DEVIS (wizard + relances)
-- ============================================================
CREATE TABLE IF NOT EXISTS devis_wizard (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
  product VARCHAR(80) NOT NULL,
  preset VARCHAR(40) DEFAULT 'confort', -- essentiel|confort|premium|sur_mesure
  garanties JSONB DEFAULT '{}'::jsonb,
  selected_providers JSONB DEFAULT '[]'::jsonb,
  pdf_path TEXT,
  status VARCHAR(30) DEFAULT 'draft', -- draft|sent|opened|signed|refused|expired
  email_open_count INTEGER DEFAULT 0,
  signed_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_devis_wizard_user ON devis_wizard(user_id);
CREATE INDEX IF NOT EXISTS idx_devis_wizard_status ON devis_wizard(status);

CREATE TABLE IF NOT EXISTS devis_relances (
  id SERIAL PRIMARY KEY,
  devis_id INTEGER REFERENCES devis_wizard(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  channel VARCHAR(20) DEFAULT 'email',
  template_key VARCHAR(40),
  status VARCHAR(30) DEFAULT 'scheduled', -- scheduled|sent|cancelled
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_devis_relances_devis ON devis_relances(devis_id);

-- ============================================================
-- F4 — AUTOMATIONS (workflows)
-- ============================================================
CREATE TABLE IF NOT EXISTS automations (
  id SERIAL PRIMARY KEY,
  courtier_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(160) NOT NULL,
  description TEXT,
  trigger_type VARCHAR(60), -- new_client|contract_expiring|silent|birthday|claim_closed|custom
  trigger_config JSONB DEFAULT '{}'::jsonb,
  steps JSONB DEFAULT '[]'::jsonb, -- liste actions ordonnées
  is_active BOOLEAN DEFAULT true,
  template_key VARCHAR(60), -- si issue d'un template pré-fait
  total_runs INTEGER DEFAULT 0,
  last_run_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_automations_courtier ON automations(courtier_id);
CREATE INDEX IF NOT EXISTS idx_automations_active ON automations(is_active);

CREATE TABLE IF NOT EXISTS automation_runs (
  id SERIAL PRIMARY KEY,
  automation_id INTEGER REFERENCES automations(id) ON DELETE CASCADE,
  client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
  status VARCHAR(30) DEFAULT 'running', -- running|completed|failed
  steps_done JSONB DEFAULT '[]'::jsonb,
  error TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX IF NOT EXISTS idx_automation_runs_automation ON automation_runs(automation_id);

-- ============================================================
-- F5 — OBJECTIFS & COMMISSIONS GAMIFIÉS
-- ============================================================
CREATE TABLE IF NOT EXISTS objectifs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  cabinet_id INTEGER,
  year INTEGER NOT NULL,
  ca_target_cents BIGINT DEFAULT 0,
  new_clients_target INTEGER DEFAULT 0,
  new_contracts_target INTEGER DEFAULT 0,
  commissions_target_cents BIGINT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, year)
);
CREATE INDEX IF NOT EXISTS idx_objectifs_user ON objectifs(user_id);

CREATE TABLE IF NOT EXISTS gamification_badges (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  badge_key VARCHAR(60) NOT NULL,
  label VARCHAR(120),
  awarded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_badges_user ON gamification_badges(user_id);

-- ============================================================
-- F6 — CONFORMITÉ (DDA, KYC, mandats)
-- ============================================================
CREATE TABLE IF NOT EXISTS dda_checklists (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
  besoin_exprime BOOLEAN DEFAULT false,
  devoir_conseil BOOLEAN DEFAULT false,
  document_remis BOOLEAN DEFAULT false,
  informations_marche BOOLEAN DEFAULT false,
  fiche_synthese BOOLEAN DEFAULT false,
  notes TEXT,
  status VARCHAR(20) DEFAULT 'pending', -- pending|conforme|incomplete
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, client_id)
);
CREATE INDEX IF NOT EXISTS idx_dda_user ON dda_checklists(user_id);

CREATE TABLE IF NOT EXISTS kyc_records (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
  identity_document_type VARCHAR(40), -- cni|passeport|titre_sejour
  identity_document_number VARCHAR(80),
  identity_verified BOOLEAN DEFAULT false,
  address_verified BOOLEAN DEFAULT false,
  pep BOOLEAN DEFAULT false,
  sanction_check BOOLEAN DEFAULT false,
  document_path TEXT,
  status VARCHAR(20) DEFAULT 'pending', -- pending|verified|rejected
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, client_id)
);
CREATE INDEX IF NOT EXISTS idx_kyc_user ON kyc_records(user_id);

CREATE TABLE IF NOT EXISTS mandats (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
  reference VARCHAR(120),
  signed_at DATE,
  expires_at DATE,
  scope TEXT,
  document_path TEXT,
  status VARCHAR(20) DEFAULT 'active', -- active|expired|revoked
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mandats_user ON mandats(user_id);

-- ============================================================
-- F7 — INTEGRATIONS (table existe déjà : integrations, integration_credentials)
-- ============================================================
CREATE TABLE IF NOT EXISTS integration_configs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  integration_key VARCHAR(60) NOT NULL, -- google_calendar|outlook|whatsapp|yousign|stripe|pennylane|webhook
  status VARCHAR(30) DEFAULT 'disconnected', -- connected|disconnected|error
  config JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  connected_at TIMESTAMP WITH TIME ZONE,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, integration_key)
);
CREATE INDEX IF NOT EXISTS idx_integration_configs_user ON integration_configs(user_id);

-- ============================================================
-- F8 — REACH (renforcement KPIs)
-- ============================================================
CREATE TABLE IF NOT EXISTS reach_ai_drafts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  prompt TEXT,
  channel VARCHAR(20),
  draft TEXT,
  variant VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reach_drafts_user ON reach_ai_drafts(user_id);

