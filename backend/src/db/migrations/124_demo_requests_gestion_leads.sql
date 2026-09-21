-- 124 — Gestion des demandes de démonstration : colonnes attendues par la route de lecture.
--
-- Constaté en production le 21/09/2026 : GET /api/leads/demo-requests et /export échouent
-- (« column "opt_out" does not exist ») parce que la migration 003a crée demo_requests sans
-- opt_out, notes ni updated_at, alors que les deux routes de lecture les demandent.
--
-- Ajout idempotent, additif et sans perte de données (réversible par DROP COLUMN) :
--   * opt_out     : indispensable pour honorer une demande de désinscription (RGPD, phase 13) ;
--   * notes       : suivi interne d'un lead (déjà accepté par la route d'écriture) ;
--   * updated_at  : horodatage de dernière modification, attendu par les deux lectures.
--
-- Aucune donnée existante n'est touchée : les lignes déjà présentes prennent les valeurs par défaut.

ALTER TABLE demo_requests ADD COLUMN IF NOT EXISTS opt_out BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE demo_requests ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE demo_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_demo_requests_created_at ON demo_requests (created_at DESC);
