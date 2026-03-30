-- CRM Assurance - SQLite Schema (Alternative to PostgreSQL)
-- Optimized for local development on macOS

-- ==================== USERS ====================

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    role TEXT DEFAULT 'collaborator',
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ==================== CLIENTS ====================

CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    civility TEXT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    mobile TEXT,
    address TEXT,
    postal_code TEXT,
    city TEXT,
    country TEXT DEFAULT 'France',
    type TEXT,
    company_name TEXT,
    siret TEXT,
    loyalty_score INTEGER DEFAULT 0,
    risk_score INTEGER DEFAULT 50,
    lifetime_value REAL DEFAULT 0,
    status TEXT DEFAULT 'actif',
    silent_alert INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_contact DATE,
    notes TEXT
);

-- ==================== PROSPECTS ====================

CREATE TABLE IF NOT EXISTS prospects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    civility TEXT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    mobile TEXT,
    company_name TEXT,
    stage TEXT NOT NULL,
    stage_updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    estimated_value REAL,
    source TEXT,
    assigned_to INTEGER REFERENCES users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_contact DATE,
    next_action_date DATE,
    notes TEXT
);

-- ==================== CONTRACTS ====================

CREATE TABLE IF NOT EXISTS contracts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL REFERENCES clients(id),
    contract_number TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL,
    insurer TEXT,
    coverage_details TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    renewal_date DATE,
    annual_premium REAL,
    commission_rate REAL,
    commission_amount REAL,
    status TEXT DEFAULT 'actif',
    policy_file_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ==================== CLAIMS ====================

CREATE TABLE IF NOT EXISTS claims (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL REFERENCES clients(id),
    contract_id INTEGER REFERENCES contracts(id),
    claim_number TEXT UNIQUE NOT NULL,
    claim_date DATE NOT NULL,
    claim_type TEXT,
    description TEXT,
    declared_amount REAL,
    approved_amount REAL,
    paid_amount REAL,
    status TEXT DEFAULT 'déclaré',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ==================== DOCUMENTS ====================

CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER REFERENCES clients(id),
    contract_id INTEGER REFERENCES contracts(id),
    claim_id INTEGER REFERENCES claims(id),
    prospect_id INTEGER REFERENCES prospects(id),
    filename TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_type TEXT,
    file_size INTEGER,
    document_type TEXT,
    extraction_data TEXT,
    uploaded_by INTEGER REFERENCES users(id),
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    signed INTEGER DEFAULT 0,
    signed_at DATETIME,
    signed_by_id INTEGER REFERENCES users(id)
);

-- ==================== APPOINTMENTS ====================

CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER REFERENCES clients(id),
    prospect_id INTEGER REFERENCES prospects(id),
    organizer_id INTEGER NOT NULL REFERENCES users(id),
    title TEXT NOT NULL,
    description TEXT,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    timezone TEXT DEFAULT 'Europe/Paris',
    brief_generated INTEGER DEFAULT 0,
    brief_content TEXT,
    reminder_24h INTEGER DEFAULT 0,
    reminder_sent_at DATETIME,
    status TEXT DEFAULT 'planifié',
    notes_after TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ==================== COMMISSIONS ====================

CREATE TABLE IF NOT EXISTS commissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contract_id INTEGER NOT NULL REFERENCES contracts(id),
    commission_amount REAL NOT NULL,
    commission_rate REAL,
    payment_date DATE,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ==================== AUTOMATED FOLLOW-UPS ====================

CREATE TABLE IF NOT EXISTS automated_follow_ups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    prospect_id INTEGER NOT NULL REFERENCES prospects(id),
    follow_up_type TEXT,
    message_template TEXT,
    scheduled_at DATETIME,
    sent_at DATETIME,
    status TEXT DEFAULT 'pending',
    response TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ==================== ALERTS ====================

CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER REFERENCES clients(id),
    contract_id INTEGER REFERENCES contracts(id),
    prospect_id INTEGER REFERENCES prospects(id),
    alert_type TEXT,
    description TEXT,
    severity TEXT DEFAULT 'medium',
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME
);

-- ==================== AUDIT LOGS ====================

CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    entity_type TEXT,
    entity_id INTEGER,
    action TEXT,
    changes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ==================== COMPLIANCE REPORTS ====================

CREATE TABLE IF NOT EXISTS compliance_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_type TEXT,
    generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    generated_by INTEGER REFERENCES users(id),
    reporting_period_start DATE,
    reporting_period_end DATE,
    file_path TEXT,
    status TEXT DEFAULT 'draft',
    content TEXT
);

-- ==================== INDICES ====================

CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_loyalty ON clients(loyalty_score);
CREATE INDEX IF NOT EXISTS idx_contracts_client ON contracts(client_id);
CREATE INDEX IF NOT EXISTS idx_prospects_stage ON prospects(stage);
CREATE INDEX IF NOT EXISTS idx_appointments_start ON appointments(start_time);
CREATE INDEX IF NOT EXISTS idx_documents_client ON documents(client_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
