-- Migration 007: REACH — Validation humaine + Rate limiting
-- Ajoute les colonnes nécessaires à la sécurité des envois

ALTER TABLE reach_prospects
  ADD COLUMN IF NOT EXISTS human_validation_required BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS rate_limit_reset_at TIMESTAMPTZ;

-- Index pour les requêtes du worker
CREATE INDEX IF NOT EXISTS idx_reach_prospects_validation
  ON reach_prospects (human_validation_required)
  WHERE human_validation_required = true;

-- Table de tracking des envois pour rate limiting
CREATE TABLE IF NOT EXISTS reach_send_log (
  id SERIAL PRIMARY KEY,
  campaign_id INTEGER REFERENCES reach_campaigns(id) ON DELETE CASCADE,
  prospect_id INTEGER REFERENCES reach_prospects(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  channel VARCHAR(20) NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  message_id INTEGER REFERENCES reach_messages(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_reach_send_log_sent_at
  ON reach_send_log (user_id, sent_at);
CREATE INDEX IF NOT EXISTS idx_reach_send_log_campaign
  ON reach_send_log (campaign_id, sent_at);

-- Log migration
INSERT INTO reach_activity_log (prospect_id, user_id, action, details)
VALUES (0, 0, 'system_migration', '{"migration": "007_reach_human_validation", "note": "Ajout human_validation_required + rate_limit_reset_at + send_log"}');
