-- Migration: Option 4 - AI Cost Management
-- Date: 2026-03-30
-- Description: Add tables and columns for pricing tiers, quota management, and API cost tracking

BEGIN TRANSACTION;

-- ==================== ALTER EXISTING TABLES ====================

-- Add columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS pricing_tier VARCHAR(50) DEFAULT 'Starter';
ALTER TABLE users ADD COLUMN IF NOT EXISTS api_quota_remaining INT DEFAULT 50;
ALTER TABLE users ADD COLUMN IF NOT EXISTS api_quota_reset_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- ==================== CREATE NEW TABLES ====================

-- Table: API Request Logs
CREATE TABLE IF NOT EXISTS api_request_logs (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    model_used VARCHAR(50) NOT NULL,
    request_type VARCHAR(100),
    tokens_input INT,
    tokens_output INT,
    cost_usd DECIMAL(10, 4),
    confidence_score DECIMAL(3, 2),
    status VARCHAR(20) DEFAULT 'success',
    request_summary TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_api_logs_user_date ON api_request_logs(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_api_logs_model ON api_request_logs(model_used);
CREATE INDEX IF NOT EXISTS idx_api_logs_request_type ON api_request_logs(request_type);

-- Table: API Quota Alerts
CREATE TABLE IF NOT EXISTS api_quota_alerts (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    alert_type VARCHAR(50) DEFAULT '80percent',
    alert_sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    telegram_message_id VARCHAR(255),
    acknowledged_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_quota_alerts_user ON api_quota_alerts(user_id, alert_type);

-- Table: Pricing Configuration
CREATE TABLE IF NOT EXISTS pricing_config (
    id SERIAL PRIMARY KEY,
    tier_name VARCHAR(50) UNIQUE NOT NULL,
    monthly_price_eur DECIMAL(10, 2),
    haiku_quota_monthly INT,
    opus_quota_monthly INT,
    features TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==================== INSERT DEFAULT DATA ====================

INSERT INTO pricing_config (tier_name, monthly_price_eur, haiku_quota_monthly, opus_quota_monthly, features)
VALUES 
    ('Starter', 15.00, 50, 0, '{"features": ["Haiku uniquement", "Support email", "Dashboard basique"]}'),
    ('Pro', 50.00, 200, 20, '{"features": ["Haiku + Opus limité", "Support prioritaire", "Dashboard avancé"]}'),
    ('Premium', 200.00, 999999, 999999, '{"features": ["Haiku + Opus illimité", "Support 24/7", "API personnalisée"]}')
ON CONFLICT (tier_name) DO NOTHING;

-- ==================== CREATE FUNCTIONS ====================

-- Function: Reset monthly quotas (à exécuter le 1er de chaque mois)
CREATE OR REPLACE FUNCTION reset_monthly_quotas()
RETURNS void AS $$
BEGIN
    UPDATE users
    SET api_quota_reset_at = CURRENT_TIMESTAMP
    WHERE pricing_tier IN ('Starter', 'Pro', 'Premium');
    
    RAISE NOTICE 'Monthly quotas reset for all users';
END;
$$ LANGUAGE plpgsql;

-- Function: Check if user exceeded quota
CREATE OR REPLACE FUNCTION check_user_quota(p_user_id INT, p_model_type VARCHAR)
RETURNS TABLE (allowed BOOLEAN, reason TEXT, usage INT, quota INT) AS $$
DECLARE
    v_tier VARCHAR(50);
    v_monthly_quota INT;
    v_usage INT;
BEGIN
    -- Get user tier
    SELECT pricing_tier INTO v_tier FROM users WHERE id = p_user_id;
    
    -- Get quota for tier and model
    IF p_model_type = 'opus' THEN
        SELECT opus_quota_monthly INTO v_monthly_quota 
        FROM pricing_config WHERE tier_name = v_tier;
    ELSE
        SELECT haiku_quota_monthly INTO v_monthly_quota 
        FROM pricing_config WHERE tier_name = v_tier;
    END IF;
    
    -- Count usage this month
    SELECT COUNT(*) INTO v_usage
    FROM api_request_logs
    WHERE user_id = p_user_id
    AND (p_model_type = 'opus' AND model_used = 'claude-3-5-opus-20241022'
         OR p_model_type = 'haiku' AND model_used = 'claude-3-5-haiku-20241022')
    AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_TIMESTAMP);
    
    RETURN QUERY SELECT
        (v_usage < v_monthly_quota)::BOOLEAN,
        CASE WHEN v_usage >= v_monthly_quota THEN 'Quota exceeded' ELSE 'OK' END,
        v_usage,
        v_monthly_quota;
END;
$$ LANGUAGE plpgsql;

-- ==================== GRANT PERMISSIONS ====================

GRANT SELECT, INSERT ON api_request_logs TO postgres;
GRANT SELECT, INSERT ON api_quota_alerts TO postgres;
GRANT SELECT ON pricing_config TO postgres;
GRANT EXECUTE ON FUNCTION reset_monthly_quotas() TO postgres;
GRANT EXECUTE ON FUNCTION check_user_quota(INT, VARCHAR) TO postgres;

COMMIT;

-- ==================== POST-MIGRATION CHECKS ====================

-- Verify tables were created
SELECT 
    schemaname,
    tablename
FROM pg_tables
WHERE tablename IN ('api_request_logs', 'api_quota_alerts', 'pricing_config')
AND schemaname != 'pg_catalog';

-- Verify users table was altered
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'users'
AND column_name IN ('pricing_tier', 'api_quota_remaining', 'api_quota_reset_at');
