# Incident Runbook COURTIA

## Controle rapide

```bash
curl -fsS https://api.courtiark.fr/api/health
curl -fsS https://api.courtiark.fr/api/status
```

Verifier:

- frontend Vercel
- API
- DB cible `crm_assurance`
- login
- `/api/auth/me`
- role Dalil `super_admin`
- `/admin`
- `/admin/costs`
- logout
- absence de `/api/api`

## Backend VPS

```bash
pm2 status
pm2 logs courtia-api --lines 120
pm2 restart courtia-api --update-env
```

Utiliser `pm2 restart courtia-api --update-env` si une variable d'environnement change.

## Vercel rollback

1. Ouvrir le dashboard Vercel.
2. Selectionner le dernier deploiement sain.
3. Promote/Rollback.
4. Relancer le smoke.

## Smoke

```bash
PROD_URL="https://courtia.vercel.app" SMOKE_LIGHT=1 SMOKE_STEP_DELAY_MS=1100 npm --prefix backend run qa:prod-smoke
```
