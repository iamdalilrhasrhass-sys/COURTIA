-- 024_lot3_ark_runs_enhancement.sql
-- LOT 3: Amélioration tracking des appels ARK Anthropic Claude
-- Down migration: src/db/migrations/down/024_lot3_ark_runs_enhancement.down.sql

-- Ajouter colonnes supplémentaires à ark_runs si nécessaire
ALTER TABLE ark_runs
  ADD COLUMN IF NOT EXISTS client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS action VARCHAR(100),
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT NULL;

-- Index pour les recherches par client
CREATE INDEX IF NOT EXISTS idx_ark_runs_client 
  ON ark_runs(client_id) 
  WHERE client_id IS NOT NULL;

-- Index pour les recherches par feature/route
CREATE INDEX IF NOT EXISTS idx_ark_runs_feature_date 
  ON ark_runs(feature, created_at DESC);

-- Index pour le monitoring des coûts par utilisateur
CREATE INDEX IF NOT EXISTS idx_ark_runs_user_cost 
  ON ark_runs(user_id, created_at DESC, cost_micro_eur);

-- Vue pour le monitoring des coûts ARK
CREATE OR REPLACE VIEW ark_usage_daily AS
SELECT 
  user_id,
  DATE(created_at) as usage_date,
  COUNT(*) as total_calls,
  SUM(input_tokens) as total_input_tokens,
  SUM(output_tokens) as total_output_tokens,
  SUM(cost_micro_eur) as total_cost_micro_eur,
  AVG(latency_ms) as avg_latency_ms,
  COUNT(CASE WHEN status = 'success' THEN 1 END) as successful_calls,
  COUNT(CASE WHEN status = 'error' THEN 1 END) as failed_calls
FROM ark_runs
GROUP BY user_id, DATE(created_at);

-- Vue pour les métriques par feature/route
CREATE OR REPLACE VIEW ark_feature_metrics AS
SELECT 
  feature,
  model,
  COUNT(*) as total_calls,
  AVG(input_tokens) as avg_input_tokens,
  AVG(output_tokens) as avg_output_tokens,
  AVG(cost_micro_eur) as avg_cost_micro_eur,
  AVG(latency_ms) as avg_latency_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms) as p95_latency_ms
FROM ark_runs
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY feature, model;

-- Commentaires
COMMENT ON TABLE ark_runs IS 'Tracking de tous les appels ARK (Anthropic Claude) - LOT 3';
COMMENT ON COLUMN ark_runs.feature IS 'Route ou fonctionnalité ARK appelée';
COMMENT ON COLUMN ark_runs.model IS 'Modèle Claude utilisé (sonnet-4-5, haiku-4-5)';
COMMENT ON COLUMN ark_runs.cost_micro_eur IS 'Coût en micro-euros (1M = 1€)';
