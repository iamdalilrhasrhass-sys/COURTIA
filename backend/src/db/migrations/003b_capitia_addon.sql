-- ============================================================
-- MIGRATION 003b : CAPITIA ADD-ON + CLIENT SCORE FEATURES
-- COURTIA — 2026-04-15
--
-- Dépend de 003_sprint_v3_master.sql (déjà en prod).
-- Nouveautés :
--   • Add-on CAPITIA (Module Financement IOBSP) — 49€/mois
--   • 4 colonnes users : financing_module_active (admin toggle)
--                        financing_addon_active  (Stripe toggle)
--                        financing_addon_subscription_id
--                        financing_addon_started_at
--   • Table plan_addons (catalogue modules optionnels)
--   • plan_limits features : client_score_breakdown, client_ark_action_plan
-- ============================================================

BEGIN;

-- ─────────────────────────────────────────────────────────
-- 1. ALTER TABLE users — colonnes add-on CAPITIA
--    financing_module_active : activé par admin lors de la validation IOBSP
--    financing_addon_active  : activé par webhook Stripe (paiement OK)
--    Les deux doivent être TRUE + plan >= pro pour accéder à CAPITIA
-- ─────────────────────────────────────────────────────────
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS financing_module_active          BOOLEAN       DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS financing_addon_active           BOOLEAN       DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS financing_addon_subscription_id  VARCHAR(255),
  ADD COLUMN IF NOT EXISTS financing_addon_started_at       TIMESTAMP;

-- ─────────────────────────────────────────────────────────
-- 2. TABLE plan_addons — catalogue des modules optionnels payants
--    stripe_price_env : nom de la variable d'env contenant le price_id Stripe
--                       → process.env[addon.stripe_price_env] en runtime
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS plan_addons (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  key               VARCHAR(50) UNIQUE NOT NULL,
  name              VARCHAR(255) NOT NULL,
  price_monthly_eur INTEGER      NOT NULL,
  requires_plan     VARCHAR(20)  NOT NULL DEFAULT 'pro',
  description       TEXT,
  stripe_price_env  VARCHAR(100),
  active            BOOLEAN      DEFAULT TRUE,
  created_at        TIMESTAMP    DEFAULT NOW()
);

INSERT INTO plan_addons (key, name, price_monthly_eur, requires_plan, description, stripe_price_env)
VALUES (
  'capitia',
  'CAPITIA — Module Financement IOBSP',
  49,
  'pro',
  'Le module crédit propulsé par IA. Simulateurs immobilier + conso + regroupement, partenaires bancaires, ARK conseiller crédit. Commission moyenne courtier : 1% du capital (2 000–5 000€/dossier signé).',
  'STRIPE_PRICE_CAPITIA'
)
ON CONFLICT (key) DO NOTHING;

-- ─────────────────────────────────────────────────────────
-- 3. plan_limits — features de bridage Client Score
--    client_score_breakdown : Pro + Elite (Start : chiffre brut uniquement)
--    client_ark_action_plan : Elite uniquement
--    Opérateur || : merge JSONB sans écraser les clés existantes
-- ─────────────────────────────────────────────────────────
UPDATE plan_limits
SET features = features
  || '{"client_score_breakdown": false, "client_ark_action_plan": false}'::jsonb
WHERE plan = 'start';

UPDATE plan_limits
SET features = features
  || '{"client_score_breakdown": true, "client_ark_action_plan": false}'::jsonb
WHERE plan = 'pro';

UPDATE plan_limits
SET features = features
  || '{"client_score_breakdown": true, "client_ark_action_plan": true}'::jsonb
WHERE plan = 'elite';

-- ─────────────────────────────────────────────────────────
-- 4. Index
-- ─────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_users_financing_addon
  ON users(financing_addon_active, financing_module_active)
  WHERE financing_addon_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_plan_addons_key
  ON plan_addons(key);

COMMIT;
