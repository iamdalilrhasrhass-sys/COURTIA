# COURTIA — Security Overview

## Authentification
- JWT côté API
- routes sensibles protégées (`verifyToken`)
- séparation stricte des rôles (`broker`, `admin`, `super_admin`)

## OAuth intégrations
- Google Agenda / Gmail: callback serveur + stockage backend
- aucun token OAuth exposé au frontend
- tokens chiffrés via `ENCRYPTION_KEY`

## Données sensibles
- ne pas logger secrets (`DATABASE_URL`, tokens, clés)
- limiter les métadonnées techniques retournées aux clients

## Protection API
- rate limits login et `/auth/me` séparés
- contrôles ownership (`courtier_id`) sur données client
- guard anti double prefix API (`/api/api`) conservé

## Admin
- pas de bypass par email côté front
- rôle admin lu depuis API/DB uniquement

## Recommandations
- rotation régulière des secrets
- surveillance erreurs auth/429
- smoke tests après chaque release
