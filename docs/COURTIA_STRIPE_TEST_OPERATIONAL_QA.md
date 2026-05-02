# COURTIA — Stripe Test Operational QA

Date: 2 mai 2026

## Scope
Validation opérationnelle du tunnel billing test mode:
- plans
- onboarding
- consentements
- checkout session
- status
- portail client

## Résultats (à compléter après exécution)
| Test | Attendu | Résultat |
|---|---|---|
| GET `/api/billing/plans` | 200 + starter/pro/premium + labels fiscaux | ✅ 200 |
| GET `/api/billing/status` sans token | 401 propre | ✅ 401 |
| GET `/api/billing/status` avec token | 200 | ✅ 200 |
| POST `/api/billing/onboarding` | 200 upsert profil org | ✅ 200 |
| POST `/api/billing/legal-acceptance` | 200 + acceptance id | ⚠️ 400 sur backend déployé actuel (payload `accepted_*`) |
| POST `/api/billing/create-checkout-session` starter | 200 + checkout_url | ⚠️ 400 dans ce run (consentement non validé) |
| POST `/api/billing/create-checkout-session` pro | 200 + checkout_url | ✅ 200 |
| POST `/api/billing/create-checkout-session` premium | 409 `premium_contact_required` | ✅ 409 |
| POST `/api/billing/create-portal-session` | 200 + portal_url ou erreur propre config | ✅ 200 |

## Notes
- Si les variables Stripe test sont absentes, le système doit répondre proprement (`billing_test_mode_not_configured`) sans crash.
- Toute validation "TBD" doit être remplacée par une preuve curl/dashboard avant passage live.
- Un patch de compatibilité `accepted_*` + hardening test-only (`*_TEST`) est prêt dans le repo; il doit être déployé sur VPS pour aligner les résultats runtime.
