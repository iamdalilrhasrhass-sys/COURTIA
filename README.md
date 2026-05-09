# COURTIA

COURTIA est un cockpit IA pour courtiers en assurance français.

## Positionnement produit

- cockpit quotidien orienté actions
- portefeuille vivant (risques, échéances, opportunités)
- ARK intégré aux pages métier
- admin sécurisé + suivi coûts IA

## Architecture

- `frontend/` — React + Vite (application + landing marketing)
- `backend/` — Express + PostgreSQL (API métier)
- `growth/` — acquisition, leads, scripts RGPD-first
- `marketing/videos/` — storyboards et scripts génération vidéo
- `docs/` — runbooks, checklist QA, stratégie produit/growth

## Environnements

- Production app: [https://courtia.vercel.app](https://courtia.vercel.app)
- API production: `https://api.courtiark.fr/api`

## Installation locale

### 1) Backend

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

### 2) Frontend

```bash
cd frontend
npm install
npm run dev
```

## Variables d'environnement clés

### Backend

- `DATABASE_URL`
- `JWT_SECRET`
- `ENCRYPTION_KEY`
- `AUTH_LOGIN_RATE_LIMIT_MAX`
- `AUTH_ME_RATE_LIMIT_MAX`
- `TRUST_PROXY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`
- `OUTLOOK_CLIENT_ID`
- `OUTLOOK_CLIENT_SECRET`
- `OUTLOOK_REDIRECT_URI`
- `OUTLOOK_TENANT_ID`
- `WHATSAPP_VERIFY_TOKEN`
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_BUSINESS_ACCOUNT_ID`

### Frontend

- `VITE_API_URL` (default: `/api`)
- `VITE_USE_MOCKS` (default: `false`)
- `VITE_SESSION_USER_CACHE_TTL_MS`

## Build & tests

### Frontend

```bash
npm --prefix frontend run build
npm --prefix frontend test
npm --prefix frontend run lint
```

### Backend

```bash
npm --prefix backend test
```

## Smoke tests

### Preview

```bash
PREVIEW_URL="https://<preview>.vercel.app/?_vercel_share=<token>" npm --prefix backend run qa:preview-smoke
```

### Production

```bash
npm --prefix backend run qa:prod-smoke
```

Rapport JSON généré dans `backend/test-results/`.

## Contrôles qualité critiques

- `failures = 0`
- `doubleApiRequests (/api/api) = 0`
- `authMe429Responses = 0`
- `authLogin429Responses = 0`
- `networkErrors = 0`

## Admin & rôles

- Rôles API: `broker`, `admin`, `super_admin`
- `broker` doit être refusé sur `/admin` et `/admin/costs`
- `super_admin` doit accéder à `/admin`, `/admin/costs`, `/admin/growth-leads`
- Aucune logique de bypass admin côté frontend par email

## Landing & conversion

Routes marketing:

- `/`
- `/fonctionnalites`
- `/tarifs`
- `/demo`
- `/contact`
- `/legal/mentions-legales`
- `/legal/confidentialite`
- `/legal/cookies`

Formulaire démo connecté à `POST /api/leads/demo-request`.

## Intégrations cockpit

Le module `/parametres` inclut un centre d’intégrations:

- Google Agenda (OAuth + sync événements)
- WhatsApp Business Cloud API (status/webhook/templates/send)
- Gmail (architecture OAuth V1)
- Outlook (architecture OAuth V1)

Activation front contrôlée:

- `VITE_INTEGRATIONS_API_ENABLED=true` active les appels API d’intégration
- valeur par défaut (absente/false): UI visible avec état "configuration requise", sans appels backend d’intégration

Les interactions multi-canaux sont exposées dans la fiche client via:

- `GET /api/clients/:id/interactions`

Activation front contrôlée:

- `VITE_INTEGRATIONS_API_ENABLED=true` active les appels API d’intégration
- valeur par défaut (absente/false): UI visible avec état "configuration requise", sans appels backend d’intégration

Endpoints complémentaires:

- import clients explicite:
  - `POST /api/import/clients/preview`
  - `POST /api/import/clients/confirm`
- notifications in-app:
  - `GET /api/notifications`
  - `POST /api/notifications/:id/read`
  - `POST /api/notifications/read-all`
- webhooks automation:
  - `POST /api/webhooks/incoming`
  - `POST /api/webhooks/outgoing/test`

## Growth leads

Pipeline dans `growth/leads`:

```bash
node growth/leads/scripts/import_manual_csv.js
node growth/leads/scripts/normalize_leads.js
node growth/leads/scripts/score_leads.js
node growth/leads/scripts/dedupe_leads.js
node growth/leads/scripts/export_leads_csv.js
node growth/leads/scripts/validate_rgpd_fields.js
```

## Déploiement

Workflow recommandé:

1. branche dédiée
2. build/tests/lint
3. preview Vercel
4. smoke preview
5. merge PR
6. prod READY
7. smoke prod

## Documentation associée

- `docs/QA_CHECKLIST.md`
- `docs/PRODUCTION_RUNBOOK.md`
- `docs/ARK_PRODUCT_ROADMAP.md`
- `docs/INTEGRATIONS_GOOGLE_CALENDAR.md`
- `docs/INTEGRATIONS_WHATSAPP.md`
- `docs/INTEGRATIONS_EMAIL.md`
- `docs/RGPD_INTEGRATIONS.md`
- `docs/GROWTH_PLAYBOOK.md`
- `docs/LANDING_PAGE_STRATEGY.md`
- `docs/WEBHOOKS_AUTOMATION_ROADMAP.md`
- `docs/SENTRY_SETUP.md`
- `docs/NEW_CABINET_SETUP.md`
- `growth/leads/RGPD_PROSPECTION.md`

Kit démo commercial:

- `sales/demo/DEMO_SCRIPT.md`
- `sales/demo/COURTIA_PITCH_2_MIN.md`
- `sales/demo/COURTIA_PITCH_10_MIN.md`
- `sales/demo/FAQ_COMMERCIALE.md`
- `sales/demo/OBJECTIONS_COURTIERS.md`
- `sales/demo/EMAIL_AFTER_DEMO.md`
