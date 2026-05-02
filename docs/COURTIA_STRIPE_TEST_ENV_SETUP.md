# COURTIA — Stripe Test Mode Env Setup

Date: 2 mai 2026

## Objectif
Configurer Stripe en **test mode** uniquement pour le tunnel d'encaissement de validation.

## Contexte fiscal/entité pré-live
- Facturation commerciale: COURTIA
- Entité juridique: Entrepreneur individuel
- TVA: applicable
- Numéro TVA: `FR12899070205`

Règle de cohérence UX:
- Landing/app affichent le prix principal en HT.
- Ajouter la mention TTC lisible (ex. TVA 20 %).
- Checkout Stripe doit rester cohérent avec cette stratégie d’affichage.

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
- Prix mensuel: 89 EUR HT (stratégie recommandée)
- Recurring monthly

2. Pro
- Prix mensuel: 159 EUR HT (stratégie recommandée)
- Recurring monthly

3. Premium
- Pas de checkout direct (sur devis / contact)

## TVA / taxes Stripe (avant live)
- Configurer Stripe Tax ou un paramétrage fiscal explicite avant passage live.
- Vérifier l’affichage TVA/HT/TTC sur facture Stripe et portail client.
- Ne pas activer `sk_live` à ce stade.

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
