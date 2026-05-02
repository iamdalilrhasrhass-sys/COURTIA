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

## Résultats (run VPS prod du 2 mai 2026)
| Test | Attendu | Résultat |
|---|---|---|
| GET `/api/billing/plans` | 200 + starter/pro/premium + labels fiscaux | ✅ 200 |
| GET `/api/billing/status` sans token | 401 propre | ✅ 401 |
| GET `/api/billing/status` avec token | 200 | ✅ 200 |
| POST `/api/billing/onboarding` | 200 upsert profil org | ✅ 200 |
| POST `/api/billing/legal-acceptance` | 200 + acceptance id | ✅ 200 (`acceptance_id`) |
| POST `/api/billing/create-checkout-session` starter | 200 + checkout_url | ⚠️ erreur propre `billing_test_mode_not_configured` |
| POST `/api/billing/create-checkout-session` pro | 200 + checkout_url | ⚠️ erreur propre `billing_test_mode_not_configured` |
| POST `/api/billing/create-checkout-session` premium | 409 `premium_contact_required` | ✅ 409 |
| POST `/api/billing/create-portal-session` | 200 + portal_url ou erreur propre config | ⚠️ erreur propre `billing_test_mode_not_configured` |

## Notes
- Le backend prod est bien en mode défensif: sans variables `_TEST`, il refuse checkout/portal sans crash.
- Variables manquantes côté VPS: `STRIPE_SECRET_KEY_TEST`, `STRIPE_WEBHOOK_SECRET_TEST`, `STRIPE_STARTER_PRICE_ID_TEST`, `STRIPE_PRO_PRICE_ID_TEST`, `BILLING_MODE`, `STRIPE_CUSTOMER_PORTAL_RETURN_URL`.
- Présence d'une clé legacy `STRIPE_SECRET_KEY` de type live détectée; non utilisée dans cette mission.
- Stripe test complet ne peut pas être déclaré tant que les variables test réelles ne sont pas configurées et retestées.
