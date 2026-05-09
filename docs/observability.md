# Observabilite COURTIA

## Sentry

Backend et frontend initialisent Sentry uniquement via les DSN d'environnement. Les logs applicatifs utilisent pino avec redaction PII.

## Product analytics

COURTIA stocke les evenements produit dans `product_events`.

Evenements suivis:

- `login`
- `client_created`
- `document_generated`
- `ark_morning_brief_opened`
- `billing_checkout_started`
- `import_completed`
- `feedback_sent`

PostHog est optionnel:

- `POSTHOG_KEY`
- `POSTHOG_HOST`

Sans `POSTHOG_KEY`, aucun tracking externe n'est effectue; les evenements restent locaux.

## Admin

`/admin` affiche:

- cabinets actifs 30j
- evenements produit recents
- feedback par statut
- MRR
- usage ARK
- sante portefeuille
