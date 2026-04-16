-- ============================================================
-- MIGRATION 003d — Plan Features : Reset Complet & Canonique
-- COURTIA — 2026-04-16
-- ============================================================
--
-- RÈGLE DE GOUVERNANCE PERMANENTE :
-- Toute modification future des features de plan_limits DOIT
-- utiliser un SET COMPLET (réécriture totale du JSONB),
-- JAMAIS un merge via l'opérateur || (jsonb_concat).
-- Raison : || ne peut pas descendre une valeur existante de
-- TRUE à FALSE ni supprimer une clé obsolète.
--
-- FEATURES : 34 clés booléennes pures, pas de nombres dedans.
-- LIMITS NUMÉRIQUES : colonnes dédiées (max_xxx INTEGER).
-- ============================================================

BEGIN;

-- 1. Colonne dédiée pour la limite numérique Morning Brief
ALTER TABLE plan_limits
  ADD COLUMN IF NOT EXISTS max_morning_brief_actions INTEGER;

-- 2. PLAN START (39€) — réécriture complète
UPDATE plan_limits
SET features = '{
  "morning_brief": true,
  "morning_brief_full": false,
  "morning_brief_advanced_insights": false,
  "client_score_basic": true,
  "client_score_breakdown": false,
  "client_ark_action_plan": false,
  "tags": true,
  "kanban": false,
  "calendar_sync": false,
  "calendar_multi": false,
  "email_templates_ai": false,
  "automations": false,
  "newsletters": false,
  "generated_docs": true,
  "dda_quiz": true,
  "lead_scoring": false,
  "benchmarks": false,
  "executive_dashboard": false,
  "analytics_advanced": false,
  "compliance_dashboard": false,
  "compliance_report": false,
  "monthly_reports": false,
  "profitability_analysis": false,
  "regulatory_assistant": false,
  "csv_import": false,
  "data_export": false,
  "data_export_advanced": false,
  "public_api": false,
  "white_label": false,
  "multi_agencies": false,
  "ark_premium": false,
  "sales_coach_waitlist": true,
  "support_priority": false,
  "dedicated_manager": false
}'::jsonb,
max_morning_brief_actions = 3
WHERE plan = 'start';

-- 3. PLAN PRO (69€) — réécriture complète
UPDATE plan_limits
SET features = '{
  "morning_brief": true,
  "morning_brief_full": true,
  "morning_brief_advanced_insights": false,
  "client_score_basic": true,
  "client_score_breakdown": true,
  "client_ark_action_plan": false,
  "tags": true,
  "kanban": true,
  "calendar_sync": true,
  "calendar_multi": false,
  "email_templates_ai": true,
  "automations": true,
  "newsletters": true,
  "generated_docs": true,
  "dda_quiz": true,
  "lead_scoring": true,
  "benchmarks": false,
  "executive_dashboard": true,
  "analytics_advanced": true,
  "compliance_dashboard": true,
  "compliance_report": true,
  "monthly_reports": true,
  "profitability_analysis": false,
  "regulatory_assistant": true,
  "csv_import": true,
  "data_export": true,
  "data_export_advanced": false,
  "public_api": false,
  "white_label": false,
  "multi_agencies": false,
  "ark_premium": true,
  "sales_coach_waitlist": true,
  "support_priority": true,
  "dedicated_manager": false
}'::jsonb,
max_morning_brief_actions = NULL
WHERE plan = 'pro';

-- 4. PLAN ELITE (129€) — réécriture complète
UPDATE plan_limits
SET features = '{
  "morning_brief": true,
  "morning_brief_full": true,
  "morning_brief_advanced_insights": true,
  "client_score_basic": true,
  "client_score_breakdown": true,
  "client_ark_action_plan": true,
  "tags": true,
  "kanban": true,
  "calendar_sync": true,
  "calendar_multi": true,
  "email_templates_ai": true,
  "automations": true,
  "newsletters": true,
  "generated_docs": true,
  "dda_quiz": true,
  "lead_scoring": true,
  "benchmarks": true,
  "executive_dashboard": true,
  "analytics_advanced": true,
  "compliance_dashboard": true,
  "compliance_report": true,
  "monthly_reports": true,
  "profitability_analysis": true,
  "regulatory_assistant": true,
  "csv_import": true,
  "data_export": true,
  "data_export_advanced": true,
  "public_api": true,
  "white_label": true,
  "multi_agencies": true,
  "ark_premium": true,
  "sales_coach_waitlist": true,
  "support_priority": true,
  "dedicated_manager": true
}'::jsonb,
max_morning_brief_actions = NULL
WHERE plan = 'elite';

-- 5. Vérification finale — doit retourner 3 lignes avec les bonnes features
SELECT
  plan,
  max_morning_brief_actions,
  jsonb_pretty(features) AS features_pretty
FROM plan_limits
ORDER BY
  CASE plan
    WHEN 'start' THEN 1
    WHEN 'pro' THEN 2
    WHEN 'elite' THEN 3
  END;

COMMIT;
