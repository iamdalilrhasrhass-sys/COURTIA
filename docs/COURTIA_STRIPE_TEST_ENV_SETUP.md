# COURTIA — Stripe Test Mode Env Setup

Date: 2 mai 2026

## Objectif
Configurer Stripe en **test mode** uniquement pour le tunnel d'encaissement de validation.

## Variables backend requises
- `BILLING_MODE=test`
- `STRIPE_SECRET_KEY_TEST=sk_test_xxx`
- `STRIPE_WEBHOOK_SECRET_TEST=whsec_xxx`
- `STRIPE_STARTER_PRICE_ID_TEST=price_xxx`
- `STRIPE_PRO_PRICE_ID_TEST=price_xxx`
- `STRIPE_CUSTOMER_PORTAL_RETURN_URL=https://courtia.vercel.app/billing`
- `FRONTEND_URL=https://courtia.vercel.app`
- `BACKEND_URL=https://api.courtiark.fr`

## Produits Stripe test à créer
1. Starter
- Prix mensuel: 89 EUR
- Recurring monthly

2. Pro
- Prix mensuel: 159 EUR
- Recurring monthly

3. Premium
- Pas de checkout direct (sur devis / contact)

## Webhooks à configurer (test)
Endpoint:
- `https://api.courtiark.fr/api/stripe/webhook`

Events:
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`
- `customer.subscription.trial_will_end`

## Règles
- Ne jamais utiliser `sk_live` dans cette phase.
- Ne jamais exposer `STRIPE_SECRET_KEY_TEST` dans le frontend.
- Aucun secret en dur dans le code.

## Vérifications
- `/api/billing/plans` retourne starter/pro/premium.
- `/api/billing/create-checkout-session` crée URL checkout test.
- `/api/billing/create-portal-session` crée URL portail test.
- Webhooks idempotents (event déjà traité ignoré proprement).
