# Production Runbook — COURTIA

## Déploiement standard

1. merge PR vers `main`
2. attendre Vercel `READY`
3. vérifier commit actif
4. lancer smoke prod

## Commandes utiles

```bash
vercel inspect https://courtia.vercel.app --timeout=120s
npm --prefix backend run qa:prod-smoke
```

## Rollback

1. identifier dernier déploiement stable
2. promouvoir/redéployer ce commit via Vercel
3. rerun smoke prod

## Vérifications post-déploiement

- login e2e OK
- login Dalil + role super_admin
- `/admin` + `/admin/costs` + `/admin/growth-leads`
- `/parametres` section Intégrations visible
- `/clients/:id` onglet Activité (timeline interactions) OK
- logout OK
- `/api/api = 0`
- `auth 429 = 0`

## Variables intégrations (prod)

- `ENCRYPTION_KEY`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`
- `OUTLOOK_CLIENT_ID`, `OUTLOOK_CLIENT_SECRET`, `OUTLOOK_REDIRECT_URI`, `OUTLOOK_TENANT_ID`
- `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_BUSINESS_ACCOUNT_ID`

## Promotion admin (propre)

- utiliser script/route backend prévue, jamais de hardcode front
- vérifier ensuite via `/api/auth/me`

## Si 429 auth apparaît

- lire `Retry-After` sur `POST /api/auth/login`
- attendre la fenêtre
- relancer un unique smoke complet

## Si `/api/api` réapparaît

- vérifier `buildApiUrl` frontend (`frontend/src/api/sessionPolicy.js`)
- relancer tests unitaires frontend + smoke
