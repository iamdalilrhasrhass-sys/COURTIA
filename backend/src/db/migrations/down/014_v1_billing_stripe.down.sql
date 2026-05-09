DELETE FROM feature_flags WHERE key = 'v1_billing_stripe';
DROP TABLE IF EXISTS billing_invoices;
DROP TABLE IF EXISTS billing_subscriptions;
