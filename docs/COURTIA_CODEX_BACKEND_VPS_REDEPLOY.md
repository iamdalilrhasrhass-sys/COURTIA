# COURTIA — Backend VPS / PM2 Redeploy (P0)

Date : 2 mai 2026

## 1. Problème
- Le frontend Vercel était revenu en `READY`, mais le P0 global restait côté backend VPS.
- Les endpoints portfolio pouvaient encore tomber en erreur en production si le schéma `portfolio_insights` ne contenait pas toutes les colonnes attendues.

## 2. Cause
- Le process PM2 actif (`courtia-api`) tourne depuis `/srv/courtia/backend`, qui n'est pas un clone Git direct.
- Le hotfix de compatibilité schéma portfolio devait être redéployé manuellement vers ce dossier runtime.

## 3. Action de déploiement
- Clone de référence VPS aligné sur `origin/main` : `bc09e93` (incluant `1a749f1`).
- Synchronisation backend vers runtime PM2 :
  - source : `/root/courtia_new/backend`
  - cible : `/srv/courtia/backend`
  - sync : `rsync -a --delete --exclude .env --exclude node_modules`
- Dépendances backend : `npm install --omit=dev`
- Redémarrage process : `pm2 restart courtia-api`

## 4. Vérifications techniques
- Syntax checks :
  - `server.js`
  - `src/routes/portfolio.js`
  - `src/routes/adminSuperAdmin.js`
  - `src/services/portfolioAnalyzer.js`
  - `src/utils/portfolioSchema.js`
  - Résultat : OK

## 5. Résultats API (redeploy final readiness)
- Local VPS :
  - `GET /api/health` -> `200`
  - `GET /api/portfolio/morning-brief` -> `200`
  - `GET /api/portfolio/health-score` -> `200`
- Public :
  - `GET https://api.courtiark.fr/api/health` -> `200`
  - `GET /api/portfolio/morning-brief` -> `200`
  - `GET /api/portfolio/health-score` -> `200`

Réponse `health-score` observée sur le compte demo :
- `status: "portfolio_empty"`
- `source: "computed_live"`
- message explicite d'amorçage portefeuille
- aucun `500`, aucune fuite SQL

## 6. Conclusion
- P0 backend maintenu levé : plus d'erreur `500` portfolio.
- P1 `health-score 503` levé : endpoint désormais en `200` avec état exploitable, y compris portefeuille vide.
