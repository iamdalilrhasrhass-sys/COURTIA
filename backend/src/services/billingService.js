const pool = require('../db');
const planService = require('./planService');

const TRIAL_DAYS = Number(process.env.BILLING_TRIAL_DAYS || 7);
const FISCAL_LABEL = process.env.BILLING_FISCAL_LABEL || 'Prix indiqués hors taxes. TVA applicable au taux en vigueur.';

let foundationReady = false;

function safeUserId(user) {
  return user?.id || user?.userId || null;
}

async function ensureBillingFoundation() {
  if (foundationReady) return;

  await pool.query(`
    CREATE TABLE IF NOT EXISTS organization_profiles (
      id SERIAL PRIMARY KEY,
      owner_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      cabinet_name VARCHAR(255),
      legal_form VARCHAR(120),
      siret VARCHAR(32),
      orias VARCHAR(64),
      billing_email VARCHAR(255),
      phone VARCHAR(40),
      address_line1 VARCHAR(255),
      postal_code VARCHAR(20),
      city VARCHAR(120),
      country VARCHAR(120) DEFAULT 'France',
      legal_signatory_name VARCHAR(255),
      legal_signatory_role VARCHAR(255),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_org_profiles_owner_user ON organization_profiles(owner_user_id);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS billing_plans (
      id SERIAL PRIMARY KEY,
      code VARCHAR(32) NOT NULL UNIQUE,
      display_name VARCHAR(120) NOT NULL,
      price_amount_cents INTEGER,
      currency VARCHAR(8) NOT NULL DEFAULT 'EUR',
      interval VARCHAR(16) NOT NULL DEFAULT 'month',
      stripe_price_id_test VARCHAR(128),
      stripe_price_id_live VARCHAR(128),
      features_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    INSERT INTO billing_plans (code, display_name, price_amount_cents, currency, interval, is_active)
    VALUES
      ('starter', 'Starter', 8900, 'EUR', 'month', TRUE),
      ('pro', 'Pro', 15900, 'EUR', 'month', TRUE),
      ('premium', 'Premium', NULL, 'EUR', 'month', TRUE)
    ON CONFLICT (code) DO NOTHING;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS customer_billing_profiles (
      id SERIAL PRIMARY KEY,
      organization_id INTEGER NOT NULL REFERENCES organization_profiles(id) ON DELETE CASCADE,
      stripe_customer_id VARCHAR(128),
      tax_mode VARCHAR(32),
      vat_applicable BOOLEAN,
      vat_label VARCHAR(255),
      seller_status_snapshot VARCHAR(255),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_billing_profiles_org ON customer_billing_profiles(organization_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_billing_profiles_stripe_customer ON customer_billing_profiles(stripe_customer_id);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id SERIAL PRIMARY KEY,
      organization_id INTEGER NOT NULL REFERENCES organization_profiles(id) ON DELETE CASCADE,
      plan_id INTEGER REFERENCES billing_plans(id),
      provider VARCHAR(32) NOT NULL DEFAULT 'stripe',
      provider_subscription_id VARCHAR(128),
      status VARCHAR(64) NOT NULL DEFAULT 'inactive',
      trial_start_at TIMESTAMPTZ,
      trial_end_at TIMESTAMPTZ,
      current_period_start TIMESTAMPTZ,
      current_period_end TIMESTAMPTZ,
      cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_provider_sub_id ON subscriptions(provider_subscription_id);
    CREATE INDEX IF NOT EXISTS idx_subscriptions_org ON subscriptions(organization_id);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS checkout_sessions (
      id SERIAL PRIMARY KEY,
      organization_id INTEGER REFERENCES organization_profiles(id) ON DELETE SET NULL,
      plan_id INTEGER REFERENCES billing_plans(id),
      provider_session_id VARCHAR(128),
      status VARCHAR(64) NOT NULL DEFAULT 'created',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      completed_at TIMESTAMPTZ,
      raw_payload_json JSONB NOT NULL DEFAULT '{}'::jsonb
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_checkout_sessions_provider_id ON checkout_sessions(provider_session_id);
    CREATE INDEX IF NOT EXISTS idx_checkout_sessions_org ON checkout_sessions(organization_id);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS payment_events (
      id SERIAL PRIMARY KEY,
      provider VARCHAR(32) NOT NULL DEFAULT 'stripe',
      event_id VARCHAR(128) NOT NULL UNIQUE,
      event_type VARCHAR(128) NOT NULL,
      organization_id INTEGER REFERENCES organization_profiles(id) ON DELETE SET NULL,
      subscription_id INTEGER REFERENCES subscriptions(id) ON DELETE SET NULL,
      processed_at TIMESTAMPTZ,
      is_idempotent BOOLEAN NOT NULL DEFAULT TRUE,
      payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS invoices (
      id SERIAL PRIMARY KEY,
      organization_id INTEGER NOT NULL REFERENCES organization_profiles(id) ON DELETE CASCADE,
      provider_invoice_id VARCHAR(128),
      status VARCHAR(64),
      amount_cents INTEGER,
      currency VARCHAR(8) DEFAULT 'EUR',
      invoice_url TEXT,
      paid_at TIMESTAMPTZ,
      due_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_provider_invoice_id ON invoices(provider_invoice_id);
    CREATE INDEX IF NOT EXISTS idx_invoices_org ON invoices(organization_id);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS legal_documents (
      id SERIAL PRIMARY KEY,
      doc_type VARCHAR(64) NOT NULL,
      version VARCHAR(32) NOT NULL,
      title VARCHAR(255) NOT NULL,
      storage_url TEXT,
      published_at TIMESTAMPTZ,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(doc_type, version)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS legal_acceptances (
      id SERIAL PRIMARY KEY,
      organization_id INTEGER NOT NULL REFERENCES organization_profiles(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      doc_type VARCHAR(64) NOT NULL,
      doc_version VARCHAR(32) NOT NULL,
      accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      ip VARCHAR(64),
      user_agent TEXT,
      consent_context_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_legal_acceptances_org ON legal_acceptances(organization_id);
    CREATE INDEX IF NOT EXISTS idx_legal_acceptances_user ON legal_acceptances(user_id);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS signature_requests (
      id SERIAL PRIMARY KEY,
      organization_id INTEGER NOT NULL REFERENCES organization_profiles(id) ON DELETE CASCADE,
      provider VARCHAR(64),
      provider_request_id VARCHAR(128),
      status VARCHAR(64) NOT NULL DEFAULT 'pending',
      requested_at TIMESTAMPTZ,
      signed_at TIMESTAMPTZ,
      document_version VARCHAR(32),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS signed_documents (
      id SERIAL PRIMARY KEY,
      organization_id INTEGER NOT NULL REFERENCES organization_profiles(id) ON DELETE CASCADE,
      signature_request_id INTEGER REFERENCES signature_requests(id) ON DELETE SET NULL,
      provider_document_id VARCHAR(128),
      storage_url TEXT,
      checksum VARCHAR(255),
      signed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  foundationReady = true;
}

function normalizePlanCode(code) {
  if (!code) return null;
  const v = String(code).trim().toLowerCase();
  return ['starter', 'pro', 'premium'].includes(v) ? v : null;
}

function getPlans() {
  const all = planService.getAllPlans();
  return all.map((p) => ({
    display_price_ht: p.price ? `${Number(p.price).toFixed(0)} € HT / mois` : 'Sur devis',
    display_price_ttc:
      p.price
        ? `${(Number(p.price) * 1.2).toFixed(2).replace('.', ',')} € TTC / mois avec TVA 20 %`
        : null,
    code: p.id,
    name: p.name,
    price: p.price,
    currency: p.currency,
    interval: p.interval,
    highlighted: p.highlighted,
    trial_days: p.id === 'premium' ? 0 : TRIAL_DAYS,
    has_checkout: p.id !== 'premium',
    fiscal_label: FISCAL_LABEL,
    features: p.features,
  }));
}

async function getOrCreateOrganization(userId) {
  await ensureBillingFoundation();
  const existing = await pool.query(
    'SELECT * FROM organization_profiles WHERE owner_user_id = $1 LIMIT 1',
    [userId]
  );
  if (existing.rows[0]) return existing.rows[0];

  const userRes = await pool.query(
    `SELECT id, first_name, last_name, email FROM users WHERE id=$1`,
    [userId]
  );
  const user = userRes.rows[0];
  if (!user) throw new Error('user_not_found');

  const created = await pool.query(
    `INSERT INTO organization_profiles (
      owner_user_id, cabinet_name, billing_email, legal_signatory_name
    )
    VALUES ($1, $2, $3, $4)
    RETURNING *`,
    [
      userId,
      null,
      user.email || null,
      [user.first_name, user.last_name].filter(Boolean).join(' ') || null,
    ]
  );
  return created.rows[0];
}

async function upsertOrganizationProfile(userId, payload = {}) {
  const org = await getOrCreateOrganization(userId);
  const next = {
    cabinet_name: payload.cabinet_name ?? org.cabinet_name,
    legal_form: payload.legal_form ?? org.legal_form,
    siret: payload.siret ?? org.siret,
    orias: payload.orias ?? org.orias,
    billing_email: payload.billing_email ?? org.billing_email,
    phone: payload.phone ?? org.phone,
    address_line1: payload.address_line1 ?? org.address_line1,
    postal_code: payload.postal_code ?? org.postal_code,
    city: payload.city ?? org.city,
    country: payload.country ?? org.country,
    legal_signatory_name: payload.legal_signatory_name ?? org.legal_signatory_name,
    legal_signatory_role: payload.legal_signatory_role ?? org.legal_signatory_role,
  };

  const updated = await pool.query(
    `UPDATE organization_profiles
      SET cabinet_name=$1, legal_form=$2, siret=$3, orias=$4,
          billing_email=$5, phone=$6, address_line1=$7, postal_code=$8,
          city=$9, country=$10, legal_signatory_name=$11, legal_signatory_role=$12,
          updated_at=NOW()
      WHERE id=$13
      RETURNING *`,
    [
      next.cabinet_name,
      next.legal_form,
      next.siret,
      next.orias,
      next.billing_email,
      next.phone,
      next.address_line1,
      next.postal_code,
      next.city,
      next.country,
      next.legal_signatory_name,
      next.legal_signatory_role,
      org.id,
    ]
  );

  return updated.rows[0];
}

async function getPlanId(planCode) {
  const row = await pool.query('SELECT id FROM billing_plans WHERE code=$1 LIMIT 1', [planCode]);
  return row.rows[0]?.id || null;
}

async function getBillingStatus(userId) {
  await ensureBillingFoundation();
  const org = await getOrCreateOrganization(userId);
  const row = await pool.query(
    `SELECT s.status, s.trial_start_at, s.trial_end_at, s.current_period_start,
            s.current_period_end, s.cancel_at_period_end,
            bp.code AS plan_code, bp.display_name AS plan_name,
            cbp.stripe_customer_id
      FROM subscriptions s
      LEFT JOIN billing_plans bp ON bp.id = s.plan_id
      LEFT JOIN customer_billing_profiles cbp ON cbp.organization_id = s.organization_id
      WHERE s.organization_id=$1
      ORDER BY s.updated_at DESC, s.id DESC
      LIMIT 1`,
    [org.id]
  );

  if (!row.rows[0]) {
    return {
      organization_id: org.id,
      plan_code: 'starter',
      status: 'not_started',
      trial_start_at: null,
      trial_end_at: null,
      current_period_start: null,
      current_period_end: null,
      cancel_at_period_end: false,
      portal_available: false,
    };
  }

  const sub = row.rows[0];
  return {
    organization_id: org.id,
    plan_code: sub.plan_code || 'starter',
    plan_name: sub.plan_name || 'Starter',
    status: sub.status,
    trial_start_at: sub.trial_start_at,
    trial_end_at: sub.trial_end_at,
    current_period_start: sub.current_period_start,
    current_period_end: sub.current_period_end,
    cancel_at_period_end: !!sub.cancel_at_period_end,
    portal_available: !!sub.stripe_customer_id,
    stripe_customer_id_masked: sub.stripe_customer_id
      ? `${sub.stripe_customer_id.slice(0, 6)}***${sub.stripe_customer_id.slice(-4)}`
      : null,
  };
}

module.exports = {
  TRIAL_DAYS,
  FISCAL_LABEL,
  safeUserId,
  ensureBillingFoundation,
  normalizePlanCode,
  getPlans,
  getOrCreateOrganization,
  upsertOrganizationProfile,
  getPlanId,
  getBillingStatus,
};
