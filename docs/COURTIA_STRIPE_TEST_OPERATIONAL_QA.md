# COURTIA — Stripe Test Operational QA

Date: 2 mai 2026 (run final après passation Hermes)

## Résumé
Validation runtime effectuée sur le backend officiel VPS/PM2 (`https://api.courtiark.fr`), sans exposition de secrets.

## Vérifications
| Test | Résultat |
|---|---|
| Variables Stripe test (`BILLING_MODE`, `STRIPE_SECRET_KEY_TEST`, `STRIPE_WEBHOOK_SECRET_TEST`, `STRIPE_STARTER_PRICE_ID_TEST`, `STRIPE_PRO_PRICE_ID_TEST`, `STRIPE_CUSTOMER_PORTAL_RETURN_URL`) | ✅ présentes et format valide |
| PM2 `courtia-api` | ✅ online après `pm2 restart --update-env` |
| `GET /api/health` local VPS | ✅ 200 |
| `GET /api/health` public | ✅ 200 |
| `GET /api/billing/plans` | ✅ 200 |
| `GET /api/billing/status` sans token | ✅ 401 propre |
| `GET /api/billing/status` avec token | ✅ 200 |
| `POST /api/billing/onboarding` | ✅ 200 |
| `POST /api/billing/legal-acceptance` | ✅ 200 (`legal_acceptance_id` présent) |
| Checkout Starter | ✅ session Stripe test créée |
| Checkout Pro | ✅ session Stripe test créée |
| Checkout Premium | ✅ 409 `premium_contact_required` |
| Customer Portal | ✅ URL session portal renvoyée |
| Webhook sans signature | ✅ 400 `missing_signature` |
| Webhook signé `invoice.payment_failed` | ✅ 200 |
| Webhook signé `customer.subscription.updated` | ✅ 200 |
| Rejeu même event signé | ✅ idempotent (pas de doublon `event_id`) |
| Non-régression import CSV (`preview`/`commit`/`history`) | ✅ OK |

## Vérification DB webhook
- `payment_events` alimenté.
- `duplicate_event_ids=0` (idempotence confirmée).

## Réserve connue
- Un test synthétique signé `checkout.session.completed` a répondu `400` (alors que l’`event_id` a bien été persisté).  
  Hypothèse principale: traitement post-event (email J0) non totalement durci quand le provider SMTP est incomplet.

## Décision
- **Stripe test mode opérationnel backend: OUI** (Starter/Pro/Portal + webhook signé + idempotence + `invoice.payment_failed` prouvés).
- **Stripe live: NON** (validation juridique/comptable finale obligatoire).
