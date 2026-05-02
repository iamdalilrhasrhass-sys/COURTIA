# COURTIA — Stripe Test Operational Runbook

Date: 2 mai 2026  
Scope: **test mode uniquement**.

## Variables backend attendues (VPS / PM2)
- `BILLING_MODE=test`
- `STRIPE_SECRET_KEY_TEST` (format `sk_test_...`)
- `STRIPE_WEBHOOK_SECRET_TEST` (format `whsec_...`)
- `STRIPE_STARTER_PRICE_ID_TEST` (format `price_...`)
- `STRIPE_PRO_PRICE_ID_TEST` (format `price_...`)
- `STRIPE_CUSTOMER_PORTAL_RETURN_URL=https://courtia.vercel.app/billing`
- `FRONTEND_URL=https://courtia.vercel.app`
- `BACKEND_URL=https://api.courtiark.fr`

Ne jamais exposer ces valeurs dans le repo ni dans un rapport.

## Produits/prix Stripe test attendus
- Starter: 89 € HT / mois (référence UI: 106,80 € TTC avec TVA 20 %)
- Pro: 159 € HT / mois (référence UI: 190,80 € TTC avec TVA 20 %)
- Premium: sur devis (pas de checkout direct)

## Redémarrage backend après modification env
1. Mettre à jour les variables dans l’environnement VPS.
2. Redémarrer PM2:
   - `pm2 restart courtia-api`
3. Vérifier health:
   - `curl -i https://api.courtiark.fr/api/health`

## Test minimal tunnel billing
1. Login API (`/api/auth/login`) pour token.
2. `GET /api/billing/plans`
3. `POST /api/billing/onboarding`
4. `POST /api/billing/legal-acceptance`
5. `POST /api/billing/create-checkout-session` (starter/pro)
6. `POST /api/billing/create-portal-session`
7. `POST /api/stripe/webhook` sans signature (attendu: 400 propre)

## Webhooks Stripe test
Endpoint:
- `https://api.courtiark.fr/api/stripe/webhook`

Events minimum:
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`
- `customer.subscription.trial_will_end`

## Règles d’exploitation
- jamais `sk_live`
- jamais checkout Premium direct
- idempotence obligatoire sur `event_id`
- logs sans secret
- erreurs utilisateur sans détail SQL
