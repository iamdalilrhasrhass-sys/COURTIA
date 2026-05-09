# Billing Stripe — COURTIA

## Endpoints
- `POST /api/billing/checkout`
- `POST /api/billing/portal`
- `GET /api/billing/status`
- `POST /api/billing/webhook`

## Plans
- Starter: 89 € HT / mois
- Pro: 199 € HT / mois
- Cabinet/Premium: sur devis

## Variables
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_STARTER`
- `STRIPE_PRICE_PRO`
- `STRIPE_PRICE_CABINET`
- `FRONTEND_URL`

## Événements webhook gérés
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_failed`
- `invoice.paid`

## Mode non configuré
Si les clés Stripe sont absentes:
- UI affiche état "configuration requise"
- aucune activation fake
