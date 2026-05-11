-- LOT 22 — Commissions Auto + Comptabilité FEC
-- Migration 027

-- Règles de commissions par produit/compagnie
CREATE TABLE IF NOT EXISTS commission_rules (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_type VARCHAR(100),
  company VARCHAR(200),
  rate_percent DECIMAL(6,3) DEFAULT 0,
  flat_fee_cents INTEGER DEFAULT 0,
  conditions JSONB DEFAULT '{}'::jsonb,
  applies_from DATE,
  applies_until DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_commission_rules_user ON commission_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_commission_rules_product ON commission_rules(product_type);
CREATE INDEX IF NOT EXISTS idx_commission_rules_company ON commission_rules(company);
CREATE INDEX IF NOT EXISTS idx_commission_rules_active ON commission_rules(is_active);

-- Enrichissement table commissions
ALTER TABLE commissions ADD COLUMN IF NOT EXISTS rule_id INTEGER REFERENCES commission_rules(id);
ALTER TABLE commissions ADD COLUMN IF NOT EXISTS reconciled_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE commissions ADD COLUMN IF NOT EXISTS reconciliation_batch_id UUID;
ALTER TABLE commissions ADD COLUMN IF NOT EXISTS expected_date DATE;
ALTER TABLE commissions ADD COLUMN IF NOT EXISTS received_date DATE;
ALTER TABLE commissions ADD COLUMN IF NOT EXISTS variance_cents INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_commissions_reconciled ON commissions(reconciled_at);
CREATE INDEX IF NOT EXISTS idx_commissions_batch ON commissions(reconciliation_batch_id);

-- Rapprochements mensuels
CREATE TABLE IF NOT EXISTS commission_reconciliations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL,
  company VARCHAR(200),
  expected_total_cents BIGINT DEFAULT 0,
  received_total_cents BIGINT DEFAULT 0,
  variance_cents BIGINT DEFAULT 0,
  commission_count INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  validated_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, period_year, period_month, company)
);

CREATE INDEX IF NOT EXISTS idx_reconciliations_user ON commission_reconciliations(user_id);
CREATE INDEX IF NOT EXISTS idx_reconciliations_period ON commission_reconciliations(period_year, period_month);

-- Écritures comptables pour FEC
CREATE TABLE IF NOT EXISTS accounting_entries (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  journal_code VARCHAR(10) NOT NULL DEFAULT 'VE',
  journal_lib VARCHAR(100) DEFAULT 'Journal des ventes',
  ecriture_num INTEGER NOT NULL,
  ecriture_date DATE NOT NULL,
  compte_num VARCHAR(20) NOT NULL,
  compte_lib VARCHAR(200) NOT NULL,
  comp_aux_num VARCHAR(50),
  comp_aux_lib VARCHAR(200),
  piece_ref VARCHAR(100),
  piece_date DATE,
  ecriture_lib VARCHAR(500) NOT NULL,
  debit_cents BIGINT DEFAULT 0,
  credit_cents BIGINT DEFAULT 0,
  ecriture_let VARCHAR(20),
  date_let DATE,
  valid_date DATE,
  montant_devise DECIMAL(15,2),
  idevise VARCHAR(3) DEFAULT 'EUR',
  source_type VARCHAR(50),
  source_id INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_accounting_user ON accounting_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_accounting_date ON accounting_entries(ecriture_date);
CREATE INDEX IF NOT EXISTS idx_accounting_compte ON accounting_entries(compte_num);
CREATE INDEX IF NOT EXISTS idx_accounting_journal ON accounting_entries(journal_code);

-- Séquences écritures par utilisateur
CREATE TABLE IF NOT EXISTS accounting_sequences (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  current_ecriture_num INTEGER DEFAULT 0,
  fiscal_year INTEGER DEFAULT EXTRACT(YEAR FROM NOW())::INTEGER,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- LOT 22 Complete
