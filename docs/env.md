# COURTIA Environment Variables

This document is the source of truth for runtime configuration. Never commit real secret values.

## Core

- `NODE_ENV`: runtime mode, usually `production`.
- `DATABASE_URL`: PostgreSQL connection string.
- `JWT_SECRET`: JWT signing secret.
- `CORS_ORIGIN`: comma-separated extra allowed origins.
- `TRUST_PROXY`: Express trust proxy setting for Render/Vercel proxying.

## Security Foundations

- `ENCRYPTION_KEY`: required for token encryption. Base64-encoded 32-byte key. Generate with `openssl rand -base64 32`.
- `LOG_LEVEL`: backend log level for structured logs.
- `LOG_HTTP_REQUESTS`: set to `true` to enable structured HTTP request logs with PII redaction.

## Sentry

- `SENTRY_DSN_BACKEND`: backend Sentry DSN. If missing, backend Sentry is disabled cleanly.
- `VITE_SENTRY_DSN_FRONTEND`: frontend Sentry DSN. If missing, frontend Sentry is disabled cleanly.

## Google

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`: callback OAuth combiné Google Agenda + Gmail (`/api/integrations/google/oauth/callback`).
- `GOOGLE_CALENDAR_REDIRECT_URI`: callback optionnel Agenda seul (`/api/integrations/google-calendar/callback`).
- `GOOGLE_GMAIL_REDIRECT_URI`: callback optionnel Gmail seul (`/api/integrations/gmail/callback`).

## Stripe

Checkout utilise les Prices Stripe, pas les anciens Plans Stripe. En mode `BILLING_MODE=test`, les variables `*_TEST` sont prioritaires si présentes.

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_STARTER`
- `STRIPE_PRICE_PRO`
- `STRIPE_PRICE_CABINET`
- `STRIPE_CUSTOMER_PORTAL_RETURN_URL`
- `FRONTEND_URL`
- `STRIPE_SECRET_KEY_TEST` (optionnel, priorité en mode test)
- `STRIPE_WEBHOOK_SECRET_TEST` (optionnel, priorité en mode test)
- `STRIPE_STARTER_PRICE_ID_TEST` (optionnel)
- `STRIPE_PRO_PRICE_ID_TEST` (optionnel)
- `STRIPE_CABINET_PRICE_ID_TEST` (optionnel)

## WhatsApp Business

- `WHATSAPP_VERIFY_TOKEN`
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_BUSINESS_ACCOUNT_ID`
- `WHATSAPP_APP_SECRET`

## Yousign

- `YOUSIGN_API_KEY`: clé API Yousign v3 utilisée côté backend uniquement.
- `YOUSIGN_WEBHOOK_SECRET`: secret HMAC pour vérifier les webhooks entrants.
- `YOUSIGN_BASE_URL`: optionnel, défaut `https://api.yousign.app/v3`.

## Anthropic / ARK

- `ANTHROPIC_API_KEY`
- `ARK_DEFAULT_MODEL`
- `ARK_LIGHT_MODEL`

## Storage

- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET`
