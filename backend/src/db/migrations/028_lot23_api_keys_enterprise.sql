-- LOT 23 — API Publique + Marketplace + Enterprise
-- Migration 028

-- ==================== API KEYS ====================
CREATE TABLE IF NOT EXISTS api_keys (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key_hash VARCHAR(128) NOT NULL UNIQUE,
  key_prefix VARCHAR(20) NOT NULL,
  name VARCHAR(200) NOT NULL DEFAULT 'Default API Key',
  scopes TEXT[] DEFAULT ARRAY['read:clients', 'read:contracts', 'read:commissions'],
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  revoked_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(user_id) WHERE revoked_at IS NULL;

-- ==================== API USAGE / RATE LIMITING ====================
CREATE TABLE IF NOT EXISTS api_usage (
  id SERIAL PRIMARY KEY,
  api_key_id INTEGER NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  endpoint VARCHAR(200) NOT NULL,
  method VARCHAR(10) NOT NULL DEFAULT 'GET',
  status_code INTEGER,
  response_time_ms INTEGER,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_usage_key ON api_usage(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_created ON api_usage(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_hourly ON api_usage(api_key_id, created_at);

-- ==================== WEBHOOKS ====================
CREATE TABLE IF NOT EXISTS api_webhooks (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  url VARCHAR(500) NOT NULL,
  events TEXT[] DEFAULT ARRAY['client.created', 'contract.created', 'commission.received'],
  secret VARCHAR(128),
  is_active BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMP WITH TIME ZONE,
  failure_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_webhooks_user ON api_webhooks(user_id);
CREATE INDEX IF NOT EXISTS idx_api_webhooks_active ON api_webhooks(is_active);

-- ==================== MARKETPLACE INTEGRATIONS ====================
CREATE TABLE IF NOT EXISTS marketplace_integrations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  connector_type VARCHAR(100) NOT NULL,
  config_encrypted TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  last_sync_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, connector_type)
);

CREATE INDEX IF NOT EXISTS idx_mkt_integrations_user ON marketplace_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_mkt_integrations_type ON marketplace_integrations(connector_type);
CREATE INDEX IF NOT EXISTS idx_mkt_integrations_status ON marketplace_integrations(status);

-- ==================== AUDIT LOGS ====================
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  resource_id VARCHAR(100),
  old_values JSONB,
  new_values JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

-- ==================== ROLES & PERMISSIONS ====================
CREATE TABLE IF NOT EXISTS enterprise_roles (
  id SERIAL PRIMARY KEY,
  cabinet_id INTEGER,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_enterprise_roles_cabinet ON enterprise_roles(cabinet_id);

INSERT INTO enterprise_roles (cabinet_id, name, description, permissions, is_system)
SELECT NULL, 'admin', 'Accès complet à toutes les fonctionnalités', 
  '{"clients":"write","contracts":"write","documents":"write","commissions":"write","settings":"write","users":"write","audit":"read"}'::jsonb, true
WHERE NOT EXISTS (SELECT 1 FROM enterprise_roles WHERE name = 'admin' AND is_system = true);

INSERT INTO enterprise_roles (cabinet_id, name, description, permissions, is_system)
SELECT NULL, 'manager', 'Gestion clients et contrats, lecture commissions',
  '{"clients":"write","contracts":"write","documents":"write","commissions":"read","settings":"read","users":"read","audit":"read"}'::jsonb, true
WHERE NOT EXISTS (SELECT 1 FROM enterprise_roles WHERE name = 'manager' AND is_system = true);

INSERT INTO enterprise_roles (cabinet_id, name, description, permissions, is_system)
SELECT NULL, 'viewer', 'Consultation seule',
  '{"clients":"read","contracts":"read","documents":"read","commissions":"none","settings":"none","users":"none","audit":"none"}'::jsonb, true
WHERE NOT EXISTS (SELECT 1 FROM enterprise_roles WHERE name = 'viewer' AND is_system = true);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id INTEGER NOT NULL REFERENCES enterprise_roles(id) ON DELETE CASCADE,
  granted_by INTEGER REFERENCES users(id),
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role_id);

-- ==================== SSO CONFIG (PLACEHOLDER) ====================
CREATE TABLE IF NOT EXISTS sso_configurations (
  id SERIAL PRIMARY KEY,
  cabinet_id INTEGER NOT NULL,
  provider VARCHAR(50) NOT NULL,
  entity_id VARCHAR(500),
  sso_url VARCHAR(500),
  certificate TEXT,
  client_id VARCHAR(200),
  client_secret TEXT,
  is_active BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sso_config_cabinet ON sso_configurations(cabinet_id);
