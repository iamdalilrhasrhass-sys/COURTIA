# Sentry Setup — COURTIA

## Objectif
Mettre en place une observabilité erreurs progressive sans fuite de données sensibles.

## Backend (Node/Express)
1. Installer:
```bash
npm --prefix backend i @sentry/node @sentry/profiling-node
```
2. Variables:
```bash
SENTRY_DSN=
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1
```
3. Initialiser au démarrage serveur avant les routes.
4. Filtrer les données sensibles:
- `Authorization`
- cookies
- tokens OAuth / Stripe
- `DATABASE_URL`

## Frontend (Vite/React)
1. Installer:
```bash
npm --prefix frontend i @sentry/react @sentry/browser
```
2. Variables:
```bash
VITE_SENTRY_DSN=
VITE_SENTRY_ENVIRONMENT=production
```
3. Initialiser dans l'entrée app.
4. Conserver `ErrorBoundary` local même avec Sentry (fallback UX).

## Politique recommandée
- Capturer 100% des erreurs fatales.
- Échantillonnage traces faible au départ (5-10%).
- Désactiver toute capture de payload business intégral.
- Revue hebdomadaire des erreurs top impact.
