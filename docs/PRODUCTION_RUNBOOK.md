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
- logout OK
- `/api/api = 0`
- `auth 429 = 0`

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
