-- CRM Assurance - Schéma PostgreSQL complet

-- ==================== TABLES DE BASE ====================

-- Utilisateurs (Courtiers, Collaborateurs)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role VARCHAR(50) DEFAULT 'collaborator', -- admin, courtier, collaborator
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==================== CLIENTS ====================

CREATE TABLE IF NOT EXISTS clients (
    id SERIAL PRIMARY KEY,
    civility VARCHAR(10), -- M, Mme, autre
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    mobile VARCHAR(20),
    address VARCHAR(255),
    postal_code VARCHAR(10),
    city VARCHAR(100),
    country VARCHAR(100) DEFAULT 'France',
    
    -- Données d'affaires
    type VARCHAR(20), -- particulier, entreprise, professionnel
    company_name VARCHAR(255),
    siret VARCHAR(20),
    
    -- Scores
    loyalty_score INT DEFAULT 0, -- 0-100
    risk_score INT DEFAULT 50, -- 0-100
    lifetime_value DECIMAL(10, 2) DEFAULT 0,
    
    -- Statut
    status VARCHAR(20) DEFAULT 'actif', -- actif, inactif, prospect, suspect
    silent_alert BOOLEAN DEFAULT FALSE, -- Aucun contact depuis 6 mois
    
    -- Dates
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_contact DATE,
    
    -- Notes
    notes TEXT,
    
    CONSTRAINT check_loyalty_score CHECK (loyalty_score >= 0 AND loyalty_score <= 100),
    CONSTRAINT check_risk_score CHECK (risk_score >= 0 AND risk_score <= 100)
);

-- ==================== PROSPECTS ====================

CREATE TABLE IF NOT EXISTS prospects (
    id SERIAL PRIMARY KEY,
    civility VARCHAR(10),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    mobile VARCHAR(20),
    company_name VARCHAR(255),
    
    -- Pipeline
    stage VARCHAR(50) NOT NULL, -- prospection, qualification, proposition, negociation, clotured
    stage_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    estimated_value DECIMAL(10, 2),
    
    -- Contact
    source VARCHAR(50), -- recommandation, web, appel, salon, autre
    assigned_to INT REFERENCES users(id),
    
    -- Dates
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_contact DATE,
    next_action_date DATE,
    
    -- Notes
    notes TEXT,
    
    INDEX idx_stage (stage),
    INDEX idx_assigned (assigned_to),
    INDEX idx_created (created_at)
);

-- ==================== CONTRATS ====================

CREATE TABLE IF NOT EXISTS contracts (
    id SERIAL PRIMARY KEY,
    client_id INT NOT NULL REFERENCES clients(id),
    
    -- Infos contrat
    contract_number VARCHAR(100) UNIQUE NOT NULL,
    type VARCHAR(50) NOT NULL, -- auto, habitation, sante, responsabilite, autre
    insurer VARCHAR(100), -- Nom assureur
    
    -- Couvertures
    coverage_details JSONB, -- {"responsabilite": true, "incendie": true, ...}
    
    -- Dates
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    renewal_date DATE,
    
    -- Financier
    annual_premium DECIMAL(10, 2),
    commission_rate DECIMAL(5, 2), -- %
    commission_amount DECIMAL(10, 2),
    
    -- Statut
    status VARCHAR(20) DEFAULT 'actif', -- actif, renouvelé, résilié, suspendu
    
    -- Documents
    policy_file_id INT REFERENCES documents(id),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_client (client_id),
    INDEX idx_renewal (renewal_date),
    INDEX idx_insurer (insurer)
);

-- ==================== SINISTRES ====================

CREATE TABLE IF NOT EXISTS claims (
    id SERIAL PRIMARY KEY,
    client_id INT NOT NULL REFERENCES clients(id),
    contract_id INT REFERENCES contracts(id),
    
    claim_number VARCHAR(100) UNIQUE NOT NULL,
    claim_date DATE NOT NULL,
    claim_type VARCHAR(50), -- accident, dégâts, perte, autre
    description TEXT,
    
    -- Montants
    declared_amount DECIMAL(10, 2),
    approved_amount DECIMAL(10, 2),
    paid_amount DECIMAL(10, 2),
    
    -- Statut
    status VARCHAR(20) DEFAULT 'déclarer', -- déclaré, accepté, rejeté, payé, clôturé
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_client (client_id),
    INDEX idx_status (status)
);

-- ==================== DOCUMENTS ====================

CREATE TABLE IF NOT EXISTS documents (
    id SERIAL PRIMARY KEY,
    
    -- Références
    client_id INT REFERENCES clients(id),
    contract_id INT REFERENCES contracts(id),
    claim_id INT REFERENCES claims(id),
    prospect_id INT REFERENCES prospects(id),
    
    -- Fichier
    filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(50), -- pdf, docx, jpg, png, autre
    file_size INT, -- bytes
    
    -- Contenu & Métadonnées
    document_type VARCHAR(50), -- police, quittance, sinistre, pièce_justificative, devis, autre
    extraction_data JSONB, -- Données extraites par OCR {nom, date, montant, ...}
    
    -- Gestion
    uploaded_by INT REFERENCES users(id),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Signature
    signed BOOLEAN DEFAULT FALSE,
    signed_at TIMESTAMP,
    signed_by_id INT REFERENCES users(id),
    
    INDEX idx_client (client_id),
    INDEX idx_type (document_type)
);

-- ==================== RENDEZ-VOUS ====================

CREATE TABLE IF NOT EXISTS appointments (
    id SERIAL PRIMARY KEY,
    
    client_id INT REFERENCES clients(id),
    prospect_id INT REFERENCES prospects(id),
    organizer_id INT NOT NULL REFERENCES users(id),
    
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Timing
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    timezone VARCHAR(50) DEFAULT 'Europe/Paris',
    
    -- Préparation automatique
    brief_generated BOOLEAN DEFAULT FALSE,
    brief_content TEXT,
    
    -- Alertes & Rappels
    reminder_24h BOOLEAN DEFAULT FALSE,
    reminder_sent_at TIMESTAMP,
    
    -- Suivi
    status VARCHAR(20) DEFAULT 'planifié', -- planifié, terminé, annulé, reporté
    notes_after LONGTEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_client (client_id),
    INDEX idx_start (start_time)
);

-- ==================== COMMISSIONS ====================

CREATE TABLE IF NOT EXISTS commissions (
    id SERIAL PRIMARY KEY,
    contract_id INT NOT NULL REFERENCES contracts(id),
    
    commission_amount DECIMAL(10, 2) NOT NULL,
    commission_rate DECIMAL(5, 2),
    
    -- Paiement
    payment_date DATE,
    status VARCHAR(20) DEFAULT 'pending', -- pending, paid, disputed
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_contract (contract_id),
    INDEX idx_status (status)
);

-- ==================== RELANCES AUTOMATIQUES ====================

CREATE TABLE IF NOT EXISTS automated_follow_ups (
    id SERIAL PRIMARY KEY,
    prospect_id INT NOT NULL REFERENCES prospects(id),
    
    follow_up_type VARCHAR(50), -- telegram, whatsapp, email, sms
    message_template VARCHAR(500),
    
    scheduled_at TIMESTAMP,
    sent_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'pending',
    
    response LONGTEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==================== ALERTES & SURVEILLANCE ====================

CREATE TABLE IF NOT EXISTS alerts (
    id SERIAL PRIMARY KEY,
    
    client_id INT REFERENCES clients(id),
    contract_id INT REFERENCES contracts(id),
    prospect_id INT REFERENCES prospects(id),
    
    alert_type VARCHAR(50), -- silent_client, contract_renewal, competitor_renewal, risk, autre
    description TEXT,
    severity VARCHAR(20) DEFAULT 'medium', -- low, medium, high, critical
    
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    
    INDEX idx_client (client_id),
    INDEX idx_type (alert_type)
);

-- ==================== LOGS & AUDIT ====================

CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    
    entity_type VARCHAR(50), -- client, contract, claim, appointment
    entity_id INT,
    
    action VARCHAR(50), -- create, update, delete, view
    changes JSONB,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_user (user_id),
    INDEX idx_entity (entity_type, entity_id)
);

-- ==================== RAPPORTS RÉGLEMENTAIRES ====================

CREATE TABLE IF NOT EXISTS compliance_reports (
    id SERIAL PRIMARY KEY,
    
    report_type VARCHAR(50), -- DDA, RGPD, autre
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    generated_by INT REFERENCES users(id),
    
    reporting_period_start DATE,
    reporting_period_end DATE,
    
    file_path VARCHAR(500),
    status VARCHAR(20) DEFAULT 'draft', -- draft, generated, sent, validated
    
    content LONGTEXT,
    
    INDEX idx_type (report_type)
);

-- ==================== INDICES DE PERFORMANCE ====================

CREATE INDEX idx_clients_email ON clients(email);
CREATE INDEX idx_clients_status ON clients(status);
CREATE INDEX idx_clients_loyalty ON clients(loyalty_score DESC);
CREATE INDEX idx_contracts_client ON contracts(client_id);
CREATE INDEX idx_prospects_stage ON prospects(stage);
CREATE INDEX idx_appointments_start ON appointments(start_time);
CREATE INDEX idx_documents_client ON documents(client_id);

-- ==================== COMMENTAIRE ====================
-- Schéma prêt pour la phase 2: Population de données test
-- Phase 3: Intégrations APIs
-- Phase 4: Automations

-- ÉTAPE 8: Rôles et permissions
CREATE TYPE user_role AS ENUM ('admin', 'courtier_senior', 'courtier_junior', 'assistant');

ALTER TABLE users ADD COLUMN role user_role DEFAULT 'courtier_junior';
ALTER TABLE users ADD COLUMN permissions jsonb DEFAULT '{"read": true, "write": false, "delete": false}';

CREATE TABLE role_permissions (
  role user_role PRIMARY KEY,
  can_create_client BOOLEAN,
  can_edit_client BOOLEAN,
  can_delete_client BOOLEAN,
  can_view_reports BOOLEAN,
  can_manage_users BOOLEAN,
  can_access_admin BOOLEAN
);

INSERT INTO role_permissions VALUES
('admin', true, true, true, true, true, true),
('courtier_senior', true, true, true, true, false, false),
('courtier_junior', true, true, false, true, false, false),
('assistant', false, false, false, true, false, false);

-- ÉTAPE 14: Gestion sinistres
CREATE TABLE claims (
  id SERIAL PRIMARY KEY,
  client_id INTEGER REFERENCES clients(id),
  claim_number VARCHAR(50) UNIQUE,
  type VARCHAR(50),
  description TEXT,
  opening_date TIMESTAMP,
  estimated_closure DATE,
  amount DECIMAL(10,2),
  status VARCHAR(20) DEFAULT 'open',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE claim_exchanges (
  id SERIAL PRIMARY KEY,
  claim_id INTEGER REFERENCES claims(id),
  date TIMESTAMP,
  message TEXT,
  from_insurer BOOLEAN
);
CREATE TABLE client_tags (id SERIAL PRIMARY KEY, client_id INTEGER, tag VARCHAR(50), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE partners (id SERIAL PRIMARY KEY, name VARCHAR(100), specialties TEXT, commission_rate DECIMAL(5,2), contact VARCHAR(100));
CREATE TABLE quotes (id SERIAL PRIMARY KEY, client_id INTEGER, quote_data JSONB, status VARCHAR(20), created_at TIMESTAMP);
CREATE TABLE audit_trail (id SERIAL PRIMARY KEY, action VARCHAR(255), user_id INTEGER, timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP, details JSONB);
CREATE TABLE user_alerts_config (id SERIAL PRIMARY KEY, user_id INTEGER, alert_type VARCHAR(50), enabled BOOLEAN, created_at TIMESTAMP);
CREATE TABLE training_certifications (id SERIAL PRIMARY KEY, user_id INTEGER, certification VARCHAR(100), completion_date DATE, expiry_date DATE);
CREATE TABLE complaints (id SERIAL PRIMARY KEY, client_id INTEGER, complaint_type VARCHAR(50), status VARCHAR(20), opening_date TIMESTAMP, closing_date TIMESTAMP, resolution TEXT);
CREATE TABLE field_visits (id SERIAL PRIMARY KEY, courtier_id INTEGER, client_id INTEGER, scheduled_date DATE, location POINT, status VARCHAR(20));
CREATE TABLE ab_tests (id SERIAL PRIMARY KEY, test_name VARCHAR(100), variant_a TEXT, variant_b TEXT, metric VARCHAR(50), results JSONB);
CREATE TABLE optional_coverage (id SERIAL PRIMARY KEY, contract_id INTEGER, coverage_name VARCHAR(100), premium DECIMAL(10,2), status VARCHAR(20));
CREATE TABLE network_reporting (id SERIAL PRIMARY KEY, period_start DATE, period_end DATE, total_revenue DECIMAL(12,2), total_clients INTEGER);
CREATE TABLE recruitment_applications (id SERIAL PRIMARY KEY, applicant_name VARCHAR(100), email VARCHAR(100), region VARCHAR(50), application_date TIMESTAMP, status VARCHAR(20));

-- ==================== OPTION 4: AI COST MANAGEMENT ====================

-- Ajouter colonne pricing_tier et api_quota_remaining à users (si pas existe)
ALTER TABLE users ADD COLUMN IF NOT EXISTS pricing_tier VARCHAR(50) DEFAULT 'Starter'; -- Starter, Pro, Premium
ALTER TABLE users ADD COLUMN IF NOT EXISTS api_quota_remaining INT DEFAULT 50;
ALTER TABLE users ADD COLUMN IF NOT EXISTS api_quota_reset_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Table: Logs de requêtes API
CREATE TABLE IF NOT EXISTS api_request_logs (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    model_used VARCHAR(50) NOT NULL, -- haiku, opus
    request_type VARCHAR(100), -- email, relance, analyse, etc.
    tokens_input INT,
    tokens_output INT,
    cost_usd DECIMAL(10, 4),
    confidence_score DECIMAL(3, 2), -- 0.0-1.0 si fallback Opus
    status VARCHAR(20) DEFAULT 'success', -- success, failed, fallback_used
    request_summary TEXT, -- 100 premiers chars de la requête
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_user_date (user_id, created_at),
    INDEX idx_model (model_used),
    INDEX idx_request_type (request_type)
);

-- Table: Alertes de quota
CREATE TABLE IF NOT EXISTS api_quota_alerts (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    alert_type VARCHAR(50) DEFAULT '80percent', -- 80percent, 95percent, exceeded
    alert_sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    telegram_message_id VARCHAR(255),
    acknowledged_at TIMESTAMP,
    
    INDEX idx_user_alert (user_id, alert_type)
);

-- Table: Configuration de pricing
CREATE TABLE IF NOT EXISTS pricing_config (
    id SERIAL PRIMARY KEY,
    tier_name VARCHAR(50) UNIQUE NOT NULL, -- Starter, Pro, Premium
    monthly_price_eur DECIMAL(10, 2),
    haiku_quota_monthly INT,
    opus_quota_monthly INT,
    features TEXT, -- JSON ou texte
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insérer les tiers de pricing par défaut
INSERT INTO pricing_config (tier_name, monthly_price_eur, haiku_quota_monthly, opus_quota_monthly, features)
VALUES 
    ('Starter', 15.00, 50, 0, '{"features": ["Haiku uniquement", "Support email", "Dashboard basique"]}'),
    ('Pro', 50.00, 200, 20, '{"features": ["Haiku + Opus limité", "Support prioritaire", "Dashboard avancé"]}'),
    ('Premium', 200.00, 999999, 999999, '{"features": ["Haiku + Opus illimité", "Support 24/7", "API personnalisée"]}')
ON CONFLICT (tier_name) DO NOTHING;

