-- ============================================================================
-- 106 — COLONNES RÉCLAMÉES PAR LE CODE ET ABSENTES DES TABLES EXISTANTES
-- ============================================================================
-- POURQUOI CETTE MIGRATION EXISTE
--
-- Mesure après reconstruction complète (database/schema.sql + 103 migrations) :
--   scripts/audit_colonnes_code.py -> 11 colonnes utilisées par le code et absentes
--   de la base, sur 3 tables POURTANT existantes (opportunites, client_documents,
--   quote_requests). C'est la 2e classe de défaut du dépôt : la table existe, la
--   colonne non.
--
-- Chaque rajout porte sa preuve (fichier:ligne) et son type déduit de l'usage.
-- Aucun NOT NULL : uniquement des colonnes ajoutées à des tables pouvant contenir
-- des lignes (règle de la skill postgres-schema-reconciliation).
-- Idempotent : ALTER TABLE ... ADD COLUMN IF NOT EXISTS.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- opportunites — intakeProcessor.js:277-283
--   INSERT INTO opportunites
--     (user_id, client_id, type_assurance, description, statut, priorite, source, created_at)
--   VALUES ($1, $2, $3, $4, 'nouveau', $5, 'voice_intake', NOW())
-- user_id      : identifiant du courtier (brokerId) -> INTEGER
-- statut       : 'nouveau' / 'signe' / 'perdu' (emailParser.js:174/181) -> VARCHAR
-- type_assurance, description, priorite, source : libellés -> TEXT
-- updated_at   : emailParser.js:181 « UPDATE opportunites SET status=$1, updated_at=NOW() »
-- ---------------------------------------------------------------------------
ALTER TABLE opportunites ADD COLUMN IF NOT EXISTS user_id INTEGER;
ALTER TABLE opportunites ADD COLUMN IF NOT EXISTS type_assurance VARCHAR(64);
ALTER TABLE opportunites ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE opportunites ADD COLUMN IF NOT EXISTS statut VARCHAR(32);
ALTER TABLE opportunites ADD COLUMN IF NOT EXISTS priorite VARCHAR(32);
ALTER TABLE opportunites ADD COLUMN IF NOT EXISTS source VARCHAR(64);
ALTER TABLE opportunites ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_opportunites_user ON opportunites(user_id);

-- ---------------------------------------------------------------------------
-- client_documents — portalClient.js:193 (SELECT ... file_name, file_path ...),
--   :216 (doc.file_name), :282 (INSERT client_documents
--        (client_id, broker_id, document_type, file_name, file_path, status))
-- Les fichiers du portail client sont référencés par nom + chemin -> TEXT.
-- ---------------------------------------------------------------------------
ALTER TABLE client_documents ADD COLUMN IF NOT EXISTS file_name TEXT;
ALTER TABLE client_documents ADD COLUMN IF NOT EXISTS file_path TEXT;

-- ---------------------------------------------------------------------------
-- quote_requests — quoteIntel.js:176 « qr.insurance_type, qr.criteria »,
--   relances.js:609 « qr.criteria », devis.js:310 (corps JSON `criteria` accepté
--   par POST /api/devis), devis.js:316 (INSERT ... normalized_data, target_providers).
-- criteria      : structure JSON (critères de recherche) -> JSONB
-- insurance_type: libellé produit ('auto', 'sante'...) -> TEXT
-- ---------------------------------------------------------------------------
ALTER TABLE quote_requests ADD COLUMN IF NOT EXISTS criteria JSONB;
ALTER TABLE quote_requests ADD COLUMN IF NOT EXISTS insurance_type VARCHAR(64);

COMMIT;
