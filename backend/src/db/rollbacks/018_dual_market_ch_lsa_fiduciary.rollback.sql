DROP TABLE IF EXISTS nlpd_processing_activities;
DROP TABLE IF EXISTS fiduciary_payroll_employees;
DROP TABLE IF EXISTS fiduciary_documents;
DROP TABLE IF EXISTS fiduciary_deadlines;
DROP TABLE IF EXISTS fiduciary_mandates;
DROP TABLE IF EXISTS cantons;
DROP TABLE IF EXISTS lsa_information_documents;
DROP TRIGGER IF EXISTS trg_prevent_lsa_step_update ON lsa_advisory_steps;
DROP FUNCTION IF EXISTS prevent_lsa_step_mutation();
DROP TABLE IF EXISTS lsa_advisory_steps;
DROP TABLE IF EXISTS lsa_advisory_sessions;
DROP TABLE IF EXISTS market_billing_plans;

ALTER TABLE IF EXISTS checkout_sessions
  DROP COLUMN IF EXISTS setup_waived,
  DROP COLUMN IF EXISTS setup_amount_cents,
  DROP COLUMN IF EXISTS market;

ALTER TABLE IF EXISTS organization_profiles
  DROP COLUMN IF EXISTS next_training_due,
  DROP COLUMN IF EXISTS lsa_compliant_since,
  DROP COLUMN IF EXISTS intermediary_type,
  DROP COLUMN IF EXISTS finma_register_number,
  DROP COLUMN IF EXISTS setup_checkout_session_id,
  DROP COLUMN IF EXISTS setup_paid_at,
  DROP COLUMN IF EXISTS setup_waived,
  DROP COLUMN IF EXISTS preferred_locale,
  DROP COLUMN IF EXISTS market_override,
  DROP COLUMN IF EXISTS market;

ALTER TABLE IF EXISTS users
  DROP COLUMN IF EXISTS next_training_due,
  DROP COLUMN IF EXISTS setup_checkout_session_id,
  DROP COLUMN IF EXISTS setup_paid_at,
  DROP COLUMN IF EXISTS setup_waived,
  DROP COLUMN IF EXISTS preferred_locale,
  DROP COLUMN IF EXISTS market_override,
  DROP COLUMN IF EXISTS market;

DO $$
BEGIN
  IF to_regclass('public.tenants') IS NOT NULL THEN
    ALTER TABLE tenants
      DROP COLUMN IF EXISTS next_training_due,
      DROP COLUMN IF EXISTS lsa_compliant_since,
      DROP COLUMN IF EXISTS intermediary_type,
      DROP COLUMN IF EXISTS finma_register_number,
      DROP COLUMN IF EXISTS setup_checkout_session_id,
      DROP COLUMN IF EXISTS setup_paid_at,
      DROP COLUMN IF EXISTS setup_waived,
      DROP COLUMN IF EXISTS preferred_locale,
      DROP COLUMN IF EXISTS market_override,
      DROP COLUMN IF EXISTS market;
  END IF;
END $$;
