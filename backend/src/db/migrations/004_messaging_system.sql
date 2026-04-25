-- ============================================================
-- MIGRATION 004 : MESSAGING SYSTEM
-- COURTIA — 2026-04-25
--
-- Ajoute :
--   • Colonne preferred_canal sur clients (email, sms, telegram, whatsapp)
--   • Table messages (historique complet des envois)
--   • Colonne external_id sur messages (ID fournisseur externe)
-- ============================================================

BEGIN;

-- ─────────────────────────────────────────────────────────
-- 1. ALTER TABLE clients — canal de communication préféré
--    Valeurs : email, sms, telegram, whatsapp
--    Défaut : email (compatible existant)
-- ─────────────────────────────────────────────────────────
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS preferred_canal VARCHAR(20) DEFAULT 'email';

-- Vérifier que phone existe déjà (présent dans schema.sql)

-- ─────────────────────────────────────────────────────────
-- 2. CREATE TABLE messages — historique des messages envoyés
--    direction : 'outgoing' (courtier → client) ou 'incoming' (réponse)
--    status    : 'sent', 'failed', 'pending', 'delivered'
--    external_id : ID chez le fournisseur (TextBelt textId, etc.)
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
    id              SERIAL PRIMARY KEY,
    client_id       INTEGER          REFERENCES clients(id) ON DELETE SET NULL,
    canal           VARCHAR(20)      NOT NULL,               -- email, sms, telegram, whatsapp
    direction       VARCHAR(10)      DEFAULT 'outgoing',     -- outgoing, incoming
    content         TEXT             NOT NULL,
    status          VARCHAR(20)      DEFAULT 'pending',      -- pending, sent, failed, delivered
    external_id     VARCHAR(255),                            -- ID fournisseur externe
    error           TEXT,                                    -- Message d'erreur si échec
    created_at      TIMESTAMPTZ      DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────
-- 3. Index pour les requêtes fréquentes
-- ─────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_messages_client
  ON messages(client_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_canal
  ON messages(canal, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_status
  ON messages(status);

CREATE INDEX IF NOT EXISTS idx_clients_preferred_canal
  ON clients(preferred_canal);

COMMIT;
