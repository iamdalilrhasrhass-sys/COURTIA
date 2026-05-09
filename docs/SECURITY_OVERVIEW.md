# COURTIA — Security Overview

Mise à jour : 9 mai 2026.

## Objectif
COURTIA vise une base sécurité lisible pour les cabinets de courtage : accès contrôlés, secrets côté backend, logs maîtrisés et dégradation propre des intégrations non configurées.

## Contrôles actuels
- Authentification JWT avec routes protégées côté backend.
- Rôle `super_admin` vérifié par API/DB, jamais par hardcode frontend.
- Routes admin protégées : `/admin`, `/admin/costs`, utilisateurs, système, support.
- Feature flags pour activer les modules sensibles par cabinet.
- Audit log pour les actions structurantes.
- Redaction PII dans les logs backend.
- Sentry backend/frontend prêt via variables d’environnement.
- Tokens OAuth et tokens intégrations conservés côté backend uniquement.
- Intégrations non configurées en état `Configuration requise`, sans 500 façade.

## Sous-traitants techniques possibles
- Vercel : hébergement frontend et previews.
- Render / PostgreSQL : API et base applicative selon environnement.
- Stripe : paiement et portail abonnement.
- Resend : emails transactionnels.
- Anthropic : assistance ARK si configurée.
- Google / Microsoft : OAuth agenda/email si activés.
- Meta WhatsApp : WhatsApp Business Cloud API si activé.
- Yousign : signature électronique si configurée.
- Cloudflare R2 : stockage documents si configuré.

## Secrets
Aucun secret ne doit être commité. Les valeurs sensibles passent par Vercel/Render/env vars documentées dans `docs/env.md`.

## Vérifications release
- `npm --prefix backend test`
- `npm --prefix frontend test -- --run`
- `npm --prefix frontend run build`
- `rg -n "api/api" frontend/src backend/src backend/server.js || true`
- Smoke prod : `PROD_URL="https://courtia.vercel.app" SMOKE_LIGHT=1 SMOKE_STEP_DELAY_MS=1100 npm --prefix backend run qa:prod-smoke`

## Limites assumées
COURTIA aide à structurer l’exploitation et la sécurité, mais ne remplace pas un audit SSI ou juridique complet avant déploiement grand compte.
