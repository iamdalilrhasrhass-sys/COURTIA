-- ============================================================
-- MIGRATION 004 : VISION DOCUMENTS — Analyse IA via Gemini Flash
-- COURTIA — 2026-04-26
-- ============================================================
-- Ajoute :
--   • colonne documents JSONB sur clients
--   • table documents_indexes pour les documents analysés
-- ============================================================

BEGIN;

-- 1. Ajouter la colonne documents JSONB à clients (si pas déjà présente)
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS documents JSONB DEFAULT '[]'::jsonb;

-- 2. Créer la table documents_indexes
CREATE TABLE IF NOT EXISTS documents_indexes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  categorie VARCHAR(50),
  donnees_extraites JSONB DEFAULT '{}'::jsonb,
  confiance FLOAT,
  source VARCHAR(20) DEFAULT 'upload',
  fichier_nom VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Index pour requêtes rapides
CREATE INDEX IF NOT EXISTS idx_documents_indexes_client_id
  ON documents_indexes(client_id);

CREATE INDEX IF NOT EXISTS idx_documents_indexes_user_id
  ON documents_indexes(user_id);

CREATE INDEX IF NOT EXISTS idx_documents_indexes_categorie
  ON documents_indexes(categorie);

COMMIT;
