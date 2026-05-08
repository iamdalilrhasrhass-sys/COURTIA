# COURTIA — QA Stripe Test Mode

Date: 2 mai 2026
Scope: implémentation code + validations locales (sans activation Stripe LIVE)

## 1. Vérifications techniques exécutées
- Frontend build: `npm run build` ✅
- Frontend tests: `npm run test` ✅ (33/33)
- Backend syntax:
  - `node -c server.js` ✅
  - `node -c src/routes/billing.js` ✅
  - `node -c src/routes/stripe.js` ✅
  - `node -c src/services/stripeService.js` ✅
  - `node -c src/services/billingService.js` ✅
  - `node -c src/services/legalAcceptanceService.js` ✅
  - `node -c src/services/emailService.js` ✅
- `node -c src/routes/adminSuperAdmin.js` ✅

## 2. Vérifications runtime API (VPS/public)
- `GET /api/billing/plans` -> `200`
- `POST /api/billing/onboarding` (auth demo) -> `200`
- `POST /api/billing/legal-acceptance` (auth demo) -> `200`
- `POST /api/billing/create-checkout-session` (plan pro, consentement OK) -> `200` + `checkout_url`
- `POST /api/billing/create-checkout-session` (plan premium) -> `409 premium_contact_required`
- `POST /api/billing/create-checkout-session` (starter sans consentement) -> `400 legal_acceptance_required`
- `GET /api/billing/status` sans auth -> `401`
- `GET /api/billing/status` auth demo -> `200`
- `POST /api/billing/create-portal-session` auth demo -> `200` + URL portail
- `POST /api/stripe/webhook` sans signature -> `400 missing_signature`
- `GET /api/admin/super/billing` sans auth -> `401`
- `GET /api/admin/super/billing` broker -> `403`

## 2. Couverture fonctionnelle implémentée
- `GET /api/billing/plans`
- `POST /api/billing/onboarding`
- `POST /api/billing/legal-acceptance`
- `POST /api/billing/create-checkout-session`
- `GET /api/billing/status`
- `POST /api/billing/create-portal-session`
- `POST /api/billing/cancel-trial`
- `POST /api/billing/webhook`
- Admin:
  - `GET /api/admin/super/billing`
  - `GET /api/admin/super/billing/:organizationId`

## 3. Couverture fonctionnelle implémentée
- Checkout uniquement via Stripe (pas de carte stockée côté COURTIA).
- Signature webhook vérifiée côté backend.
- Idempotence webhook via `payment_events.event_id` unique.
- Erreurs de configuration Stripe renvoyées proprement (`billing_test_mode_not_configured`).
- Aucune clé Stripe secrète ajoutée au frontend.

## 4. Sécurité / robustesse
- Checkout uniquement via Stripe (pas de carte stockée côté COURTIA).
- Signature webhook vérifiée côté backend.
- Idempotence webhook via `payment_events.event_id` unique.
- Erreurs de configuration Stripe renvoyées proprement (`billing_test_mode_not_configured`).
- Aucune clé Stripe secrète ajoutée au frontend.

## 5. Tests E2E Stripe restant à exécuter (environnement connecté)
1. Créer products/prices test (Starter/Pro) dans Stripe.
2. Configurer `STRIPE_SECRET_KEY_TEST`, `STRIPE_WEBHOOK_SECRET_TEST`, `STRIPE_*_PRICE_ID_TEST`.
3. Lancer checkout test Starter/Pro.
4. Vérifier événements webhook:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `invoice.paid`
   - `invoice.payment_failed`
5. Vérifier statut `/api/billing/status` après événements.
6. Vérifier création session Customer Portal.

## 6. Verdict
- Foundation Stripe test mode: prête côté code ✅
- Validation Stripe Dashboard/CLI complète: en attente ⚠️
- Stripe LIVE: non concerné ❌
