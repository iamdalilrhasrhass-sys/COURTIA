-- CRM Assurance - PostgreSQL Schema (Fixed)

-- Users
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role VARCHAR(50) DEFAULT 'collaborator',
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Clients
CREATE TABLE IF NOT EXISTS clients (
    id SERIAL PRIMARY KEY,
    civility VARCHAR(10),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    mobile VARCHAR(20),
    address VARCHAR(255),
    postal_code VARCHAR(10),
    city VARCHAR(100),
    country VARCHAR(100) DEFAULT 'France',
    type VARCHAR(20),
    company_name VARCHAR(255),
    siret VARCHAR(20),
    loyalty_score INT DEFAULT 0,
    risk_score INT DEFAULT 50,
    lifetime_value DECIMAL(10, 2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'actif',
    silent_alert BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_contact DATE,
    notes TEXT
);

-- Prospects
CREATE TABLE IF NOT EXISTS prospects (
    id SERIAL PRIMARY KEY,
    civility VARCHAR(10),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    mobile VARCHAR(20),
    company_name VARCHAR(255),
    stage VARCHAR(50) NOT NULL,
    stage_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    estimated_value DECIMAL(10, 2),
    source VARCHAR(50),
    assigned_to INT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_contact DATE,
    next_action_date DATE,
    notes TEXT
);

-- Contracts
CREATE TABLE IF NOT EXISTS contracts (
    id SERIAL PRIMARY KEY,
    client_id INT NOT NULL REFERENCES clients(id),
    contract_number VARCHAR(100) UNIQUE NOT NULL,
    type VARCHAR(50) NOT NULL,
    insurer VARCHAR(100),
    coverage_details JSONB,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    renewal_date DATE,
    annual_premium DECIMAL(10, 2),
    commission_rate DECIMAL(5, 2),
    commission_amount DECIMAL(10, 2),
    status VARCHAR(20) DEFAULT 'actif',
    policy_file_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Claims
CREATE TABLE IF NOT EXISTS claims (
    id SERIAL PRIMARY KEY,
    client_id INT NOT NULL REFERENCES clients(id),
    contract_id INT REFERENCES contracts(id),
    claim_number VARCHAR(100) UNIQUE NOT NULL,
    claim_date DATE NOT NULL,
    claim_type VARCHAR(50),
    description TEXT,
    declared_amount DECIMAL(10, 2),
    approved_amount DECIMAL(10, 2),
    paid_amount DECIMAL(10, 2),
    status VARCHAR(20) DEFAULT 'déclarer',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Documents
CREATE TABLE IF NOT EXISTS documents (
    id SERIAL PRIMARY KEY,
    client_id INT REFERENCES clients(id),
    contract_id INT REFERENCES contracts(id),
    claim_id INT REFERENCES claims(id),
    prospect_id INT REFERENCES prospects(id),
    filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(50),
    file_size INT,
    document_type VARCHAR(50),
    extraction_data JSONB,
    uploaded_by INT REFERENCES users(id),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    signed BOOLEAN DEFAULT FALSE,
    signed_at TIMESTAMP,
    signed_by_id INT REFERENCES users(id)
);

-- Appointments
CREATE TABLE IF NOT EXISTS appointments (
    id SERIAL PRIMARY KEY,
    client_id INT REFERENCES clients(id),
    prospect_id INT REFERENCES prospects(id),
    organizer_id INT NOT NULL REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    timezone VARCHAR(50) DEFAULT 'Europe/Paris',
    brief_generated BOOLEAN DEFAULT FALSE,
    brief_content TEXT,
    reminder_24h BOOLEAN DEFAULT FALSE,
    reminder_sent_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'planifié',
    notes_after TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Commissions
CREATE TABLE IF NOT EXISTS commissions (
    id SERIAL PRIMARY KEY,
    contract_id INT NOT NULL REFERENCES contracts(id),
    commission_amount DECIMAL(10, 2) NOT NULL,
    commission_rate DECIMAL(5, 2),
    payment_date DATE,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Automated Follow-ups
CREATE TABLE IF NOT EXISTS automated_follow_ups (
    id SERIAL PRIMARY KEY,
    prospect_id INT NOT NULL REFERENCES prospects(id),
    follow_up_type VARCHAR(50),
    message_template VARCHAR(500),
    scheduled_at TIMESTAMP,
    sent_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'pending',
    response TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Alerts
CREATE TABLE IF NOT EXISTS alerts (
    id SERIAL PRIMARY KEY,
    client_id INT REFERENCES clients(id),
    contract_id INT REFERENCES contracts(id),
    prospect_id INT REFERENCES prospects(id),
    alert_type VARCHAR(50),
    description TEXT,
    severity VARCHAR(20) DEFAULT 'medium',
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP
);

-- Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    entity_type VARCHAR(50),
    entity_id INT,
    action VARCHAR(50),
    changes JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Compliance Reports
CREATE TABLE IF NOT EXISTS compliance_reports (
    id SERIAL PRIMARY KEY,
    report_type VARCHAR(50),
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    generated_by INT REFERENCES users(id),
    reporting_period_start DATE,
    reporting_period_end DATE,
    file_path VARCHAR(500),
    status VARCHAR(20) DEFAULT 'draft',
    content TEXT
);

-- Indices
CREATE INDEX idx_clients_email ON clients(email);
CREATE INDEX idx_clients_status ON clients(status);
CREATE INDEX idx_clients_loyalty ON clients(loyalty_score DESC);
CREATE INDEX idx_contracts_client ON contracts(client_id);
CREATE INDEX idx_prospects_stage ON prospects(stage);
CREATE INDEX idx_appointments_start ON appointments(start_time);
CREATE INDEX idx_documents_client ON documents(client_id);
CREATE INDEX idx_audit_user ON audit_logs(user_id);
