CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS billing_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id INTEGER UNIQUE,
  cabinet_id UUID REFERENCES cabinets(id) ON DELETE SET NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT UNIQUE,
  plan TEXT NOT NULL DEFAULT 'starter' CHECK (plan IN ('starter', 'pro', 'cabinet', 'premium')),
  status TEXT NOT NULL DEFAULT 'trialing',
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_billing_subscriptions_cabinet ON billing_subscriptions(cabinet_id);
CREATE INDEX IF NOT EXISTS idx_billing_subscriptions_user ON billing_subscriptions(user_id);

CREATE TABLE IF NOT EXISTS billing_invoices (
  id TEXT PRIMARY KEY,
  organization_id INTEGER,
  cabinet_id UUID REFERENCES cabinets(id) ON DELETE SET NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  amount_due_cents INTEGER NOT NULL DEFAULT 0,
  amount_paid_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'eur',
  status TEXT NOT NULL DEFAULT 'draft',
  hosted_invoice_url TEXT,
  pdf_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_billing_invoices_cabinet ON billing_invoices(cabinet_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_billing_invoices_user ON billing_invoices(user_id, created_at DESC);

INSERT INTO feature_flags (key, description, default_enabled)
VALUES
  ('v1_billing_stripe', 'V1 Stripe checkout, customer portal and self-serve billing', TRUE)
ON CONFLICT (key) DO UPDATE SET
  description = EXCLUDED.description,
  default_enabled = EXCLUDED.default_enabled;

DO $$
BEGIN
  IF to_regclass('public.billing_plans') IS NOT NULL THEN
    INSERT INTO billing_plans (code, display_name, price_amount_cents, currency, interval, is_active)
    VALUES
      ('starter', 'Starter', 8900, 'EUR', 'month', TRUE),
      ('pro', 'Pro', 19900, 'EUR', 'month', TRUE),
      ('cabinet', 'Cabinet', 39900, 'EUR', 'month', TRUE),
      ('premium', 'Premium', NULL, 'EUR', 'month', TRUE)
    ON CONFLICT (code) DO UPDATE SET
      display_name = EXCLUDED.display_name,
      price_amount_cents = EXCLUDED.price_amount_cents,
      currency = EXCLUDED.currency,
      interval = EXCLUDED.interval,
      is_active = EXCLUDED.is_active,
      updated_at = NOW();
  END IF;
END $$;
