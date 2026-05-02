# COURTIA — Stripe Webhook Signed QA

Date: 2 mai 2026

## Scope
Validation des webhooks Stripe test:
- signature requise
- traitement idempotent
- événements clés abonnement/facture

## Tests cibles
1. Sans signature:
- `POST /api/stripe/webhook`
- attendu: `400` + `missing_signature`

2. Avec signature Stripe test:
- attendu: `200`
- événement enregistré dans `payment_events`

3. Rejeu même `event_id`:
- attendu: pas de double traitement (idempotence)

## Events minimum
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `invoice.paid`
- `invoice.payment_failed`
- `customer.subscription.trial_will_end`

## État actuel (à compléter)
- Sans signature: ⚠️ actuellement `200 {"received":true,"note":"stripe_not_configured"}` (normal tant que config Stripe test absente)
- Signé: ❌ non validé sur ce run (secret webhook test non configuré sur VPS)
- Idempotence: ❌ non validée sur ce run

## Blocages possibles
- `STRIPE_WEBHOOK_SECRET_TEST` absent sur VPS
- `STRIPE_SECRET_KEY_TEST` absent sur VPS
- endpoint webhook non configuré côté dashboard Stripe test
- Stripe CLI indisponible sur l'environnement d'exécution

## Règle de vérité
Ne pas déclarer “Stripe test complet” tant qu’un webhook signé + rejeu idempotent n’a pas été prouvé.
