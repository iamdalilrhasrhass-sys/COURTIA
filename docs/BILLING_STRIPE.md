# COURTIA V1 — Billing Stripe self-serve

COURTIA utilise Stripe Checkout pour les abonnements et Stripe Customer Portal pour la gestion self-serve. COURTIA ne collecte jamais de numéro de carte côté application.

## Plans V1

| Plan | Prix HT/mois | Positionnement | Checkout |
| --- | ---: | --- | --- |
| Starter | 89 € | 1 utilisateur, CRM cockpit essentiel | Oui |
| Pro | 199 € | Offre principale avec ARK, intégrations et documents métier | Oui |
| Cabinet | 399 € | Équipe jusqu'à 10 utilisateurs, reporting et support renforcé | Oui |
| Premium | Sur devis | Déploiement sur mesure | Non, contact commercial |

## Variables d'environnement

Backend :

```bash
BILLING_MODE=test
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_STARTER=
STRIPE_PRICE_PRO=
STRIPE_PRICE_CABINET=
STRIPE_CUSTOMER_PORTAL_RETURN_URL=https://courtia.vercel.app/billing
```

Overrides optionnels en mode test :

```bash
STRIPE_SECRET_KEY_TEST=
STRIPE_WEBHOOK_SECRET_TEST=
STRIPE_STARTER_PRICE_ID_TEST=
STRIPE_PRO_PRICE_ID_TEST=
STRIPE_CABINET_PRICE_ID_TEST=
```

Frontend :

```bash
VITE_PUBLIC_STRIPE_KEY=
```

## Routes backend

- `GET /api/billing/plans` : plans publics + statut de configuration Stripe.
- `GET /api/billing/status` : abonnement courant du cabinet/utilisateur.
- `POST /api/billing/checkout-session` : crée une Checkout Session Stripe.
- `POST /api/billing/portal-session` : crée une session Customer Portal.
- `POST /api/billing/stripe-webhook` : webhook Stripe signé.

Routes historiques conservées :

- `POST /api/billing/create-checkout-session`
- `POST /api/billing/checkout`
- `POST /api/billing/create-portal-session`
- `POST /api/billing/portal`
- `POST /api/billing/webhook`

## Dégradation propre

Si Stripe n'est pas configuré, l'API renvoie `stripe_configuration_required` ou `stripe_price_configuration_required` avec la liste des variables manquantes. L'UI affiche un état premium “Configuration Stripe requise” au lieu de planter.

## Webhooks gérés

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`

Les événements sont idempotents via `payment_events.event_id`. Les tables V1 `billing_subscriptions` et `billing_invoices` servent de vue durable pour la V1 self-serve.

## Sécurité

- Webhook signé avec `STRIPE_WEBHOOK_SECRET` avant traitement.
- Raw body préservé pour `/api/billing/webhook` et `/api/billing/stripe-webhook`.
- Aucun secret Stripe exposé côté front.
- Aucun numéro de carte stocké par COURTIA.
