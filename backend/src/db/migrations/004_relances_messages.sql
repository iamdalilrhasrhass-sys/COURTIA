-- ============================================================
-- Migration: tables relances + messages
-- Pour inboundProcessor + relanceScheduler
-- Exécution: node scripts/migrate.js (ou intégré au démarrage)
-- ============================================================

-- Table relances (suivi des relances automatiques)
CREATE TABLE IF NOT EXISTS relances (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    etape INTEGER DEFAULT 1,
    derniere_relance TIMESTAMPTZ,
    prochaine_relance TIMESTAMPTZ,
    canal VARCHAR(20) DEFAULT 'email',
    statut VARCHAR(20) DEFAULT 'en_attente',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les relances
CREATE INDEX IF NOT EXISTS idx_relances_client_id ON relances(client_id);
CREATE INDEX IF NOT EXISTS idx_relances_statut ON relances(statut);
CREATE INDEX IF NOT EXISTS idx_relances_prochaine ON relances(prochaine_relance);

-- Table messages (historique des échanges inbound/outbound)
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
    direction VARCHAR(10) NOT NULL DEFAULT 'in',
    canal VARCHAR(20) NOT NULL DEFAULT 'email',
    sujet VARCHAR(500),
    corps TEXT,
    analyse_type VARCHAR(30),
    analyse_confiance DECIMAL(3,2),
    analyse_resume TEXT,
    action_effectuee VARCHAR(50),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les messages
CREATE INDEX IF NOT EXISTS idx_messages_client_id ON messages(client_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_direction ON messages(direction);
