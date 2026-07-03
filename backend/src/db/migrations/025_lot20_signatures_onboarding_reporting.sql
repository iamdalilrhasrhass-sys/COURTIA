-- ═══════════════════════════════════════════════════════════════════════════════
-- LOT 20 — Signature Électronique + Onboarding Gamifié + Reporting + Calendrier
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- PARTIE 1 : Signature Électronique (Yousign)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS signature_requests (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  document_id INTEGER REFERENCES documents(id) ON DELETE SET NULL,
  client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
  yousign_request_id VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  signer_email VARCHAR(255) NOT NULL,
  signer_name VARCHAR(255),
  signature_url TEXT,
  last_reminder_at TIMESTAMPTZ,
  signed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_signature_requests_user ON signature_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_signature_requests_client ON signature_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_signature_requests_status ON signature_requests(status);
CREATE INDEX IF NOT EXISTS idx_signature_requests_yousign_id ON signature_requests(yousign_request_id);

-- Table pour les événements webhook
CREATE TABLE IF NOT EXISTS webhook_events (
  id SERIAL PRIMARY KEY,
  source VARCHAR(50) NOT NULL,
  event_id VARCHAR(255),
  event_type VARCHAR(100),
  payload JSONB,
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(source, event_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- PARTIE 2 : Onboarding Gamifié
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS onboarding_progress (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  step_create_client BOOLEAN DEFAULT FALSE,
  step_analyze_portfolio BOOLEAN DEFAULT FALSE,
  step_generate_document BOOLEAN DEFAULT FALSE,
  step_activate_ark_watch BOOLEAN DEFAULT FALSE,
  step_invite_colleague BOOLEAN DEFAULT FALSE,
  badge_courtier_connecte BOOLEAN DEFAULT FALSE,
  badge_analyste_ark BOOLEAN DEFAULT FALSE,
  badge_maitre_docs BOOLEAN DEFAULT FALSE,
  badge_sentinelle BOOLEAN DEFAULT FALSE,
  badge_ambassadeur BOOLEAN DEFAULT FALSE,
  total_badges INTEGER DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_onboarding_progress_user ON onboarding_progress(user_id);

-- Trigger pour compter les badges automatiquement
CREATE OR REPLACE FUNCTION update_onboarding_badges()
RETURNS TRIGGER AS $$
BEGIN
  NEW.total_badges := (
    CASE WHEN NEW.badge_courtier_connecte THEN 1 ELSE 0 END +
    CASE WHEN NEW.badge_analyste_ark THEN 1 ELSE 0 END +
    CASE WHEN NEW.badge_maitre_docs THEN 1 ELSE 0 END +
    CASE WHEN NEW.badge_sentinelle THEN 1 ELSE 0 END +
    CASE WHEN NEW.badge_ambassadeur THEN 1 ELSE 0 END
  );

  IF NEW.total_badges = 5 AND OLD.total_badges < 5 THEN
    NEW.completed_at := NOW();
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_onboarding_badges ON onboarding_progress;
CREATE TRIGGER trg_update_onboarding_badges
  BEFORE UPDATE ON onboarding_progress
  FOR EACH ROW EXECUTE FUNCTION update_onboarding_badges();

-- ─────────────────────────────────────────────────────────────────────────────
-- PARTIE 3 : Reporting Avancé
-- ─────────────────────────────────────────────────────────────────────────────

-- Statistiques agrégées quotidiennes pour performance
CREATE TABLE IF NOT EXISTS daily_stats (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  stat_date DATE NOT NULL,
  clients_count INTEGER DEFAULT 0,
  contracts_count INTEGER DEFAULT 0,
  contracts_value DECIMAL(12,2) DEFAULT 0,
  quotes_count INTEGER DEFAULT 0,
  quotes_value DECIMAL(12,2) DEFAULT 0,
  opportunities_count INTEGER DEFAULT 0,
  opportunities_value DECIMAL(12,2) DEFAULT 0,
  ark_signals_count INTEGER DEFAULT 0,
  documents_generated INTEGER DEFAULT 0,
  signatures_sent INTEGER DEFAULT 0,
  signatures_completed INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, stat_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_stats_user_date ON daily_stats(user_id, stat_date DESC);

-- Vue matérialisée pour les KPIs (refresh hebdomadaire recommandé)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_user_kpis AS
SELECT
  u.id as user_id,
  COUNT(DISTINCT c.id) as total_clients,
  COUNT(DISTINCT ct.id) as total_contracts,
  COALESCE(SUM(ct.prime_annuelle), 0) as total_premium,
  COUNT(DISTINCT CASE WHEN ct.date_echeance BETWEEN NOW() AND NOW() + INTERVAL '90 days' THEN ct.id END) as contracts_expiring_90d,
  0 as total_documents,
  0::numeric as avg_ark_score
FROM users u
LEFT JOIN clients c ON c.courtier_id = u.id
LEFT JOIN contrats ct ON ct.client_id = c.id
GROUP BY u.id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_user_kpis_user ON mv_user_kpis(user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- PARTIE 4 : Intégration Calendrier
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS calendar_events (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
  google_event_id VARCHAR(255),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  event_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  event_type VARCHAR(50) DEFAULT 'rdv',
  location VARCHAR(255),
  reminder_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calendar_events_user ON calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON calendar_events(event_date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_client ON calendar_events(client_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_google_id ON calendar_events(google_event_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Ajout colonne is_new_user pour redirection onboarding
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- Initialiser onboarding_progress pour les utilisateurs existants
INSERT INTO onboarding_progress (user_id)
SELECT id FROM users WHERE id NOT IN (SELECT user_id FROM onboarding_progress WHERE user_id IS NOT NULL)
ON CONFLICT DO NOTHING;