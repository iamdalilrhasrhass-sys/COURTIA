-- 032: Étend la table `relances` (schéma minimal du LOT6/scheduler)
-- pour supporter le nouveau routeur API src/routes/relances.js
-- (liste, stats, envoi réel email/SMS/WhatsApp, contenu généré par ARK).
--
-- IMPORTANT: purement additif — ne touche à aucune colonne existante
-- (etape, derniere_relance, prochaine_relance, canal, statut) utilisée
-- par jobs/relanceScheduler.js (cron quotidien), afin de ne rien casser.
--
-- Pas de colonne broker_id/courtier_id : l'appartenance d'une relance à
-- un courtier est dérivée via relances.client_id -> clients.courtier_id,
-- comme pour la table `quotes` (cf. routes/contrats.js).

ALTER TABLE IF EXISTS relances
  ADD COLUMN IF NOT EXISTS quote_id INTEGER REFERENCES quotes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS quote_request_id INTEGER,
  ADD COLUMN IF NOT EXISTS type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS channel VARCHAR(20) DEFAULT 'email',
  ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS subject TEXT,
  ADD COLUMN IF NOT EXISTS content TEXT,
  ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ai_generated BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_reasoning TEXT,
  ADD COLUMN IF NOT EXISTS response_received BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS response_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_relances_status_new ON relances(status);
CREATE INDEX IF NOT EXISTS idx_relances_quote_id ON relances(quote_id);
