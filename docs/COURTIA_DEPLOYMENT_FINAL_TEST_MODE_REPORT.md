# COURTIA — Deployment Final Test Mode Report

Date: 2 mai 2026

## 0. Run complémentaire (2 mai 2026 — mission finale Stripe TEST)
- Tentative de récupération autonome des variables Stripe test: effectuée.
- Stripe CLI local: indisponible (`command not found`).
- Stripe CLI VPS: indisponible.
- Accès Dashboard Stripe via cet environnement: non disponible.
- Conséquence: impossible de récupérer automatiquement `sk_test`, `whsec` et les 2 `price_` test sans intervention utilisateur côté Stripe.
- Render: non-prod confirmé; coupure Auto-Deploy à faire manuellement dans le dashboard Render (non pilotable depuis cet environnement).

## 1. Contexte
- Commit source attendu: `a2558a9`
- Merge production réalisé: `fcf70c3` (inclut `a2558a9`)
- Frontend prod: https://courtia.vercel.app
- Backend prod: https://api.courtiark.fr

## 2. Déploiement
- Push `main` effectué: `c75b80e..fcf70c3`
- VPS sync backend effectué (`/root/courtia_new` -> `/srv/courtia/backend`)
- Backup runtime effectué avant sync (`/srv/courtia/backend_backup_YYYYMMDD_HHMMSS`)
- `npm ci --omit=dev` exécuté sur VPS
- `pm2 restart courtia-api --update-env` + `pm2 save` effectués

## 3. Santé production
- `GET https://courtia.vercel.app` -> 200
- `GET https://courtia.vercel.app/import` -> 200
- `GET https://api.courtiark.fr/api/health` -> 200
- `GET http://127.0.0.1:9998/api/health` (VPS) -> 200

## 4. Stripe test mode (runtime)
- `GET /api/billing/plans` -> 200
- `GET /api/billing/status` sans token -> 401
- `GET /api/billing/status` avec token -> 200
- `POST /api/billing/onboarding` -> 200
- `POST /api/billing/legal-acceptance` -> 200 (retour `acceptance_id`)
- `POST /api/billing/create-checkout-session` starter -> erreur propre `Billing test mode non configuré côté backend.`
- `POST /api/billing/create-checkout-session` pro -> erreur propre `Billing test mode non configuré côté backend.`
- `POST /api/billing/create-checkout-session` premium -> 409 `premium_contact_required`
- `POST /api/billing/create-portal-session` -> erreur propre `Billing test mode non configuré côté backend.`

### Cause exacte du blocage Stripe E2E
Variables Stripe `_TEST` absentes côté VPS:
- `STRIPE_SECRET_KEY_TEST`
- `STRIPE_WEBHOOK_SECRET_TEST`
- `STRIPE_STARTER_PRICE_ID_TEST`
- `STRIPE_PRO_PRICE_ID_TEST`

Variables test non secrètes configurées côté VPS:
- `BILLING_MODE=test`
- `STRIPE_CUSTOMER_PORTAL_RETURN_URL=https://courtia.vercel.app/billing`

Variables legacy présentes:
- `STRIPE_SECRET_KEY` détectée en format live (`sk_live_...`) -> non utilisable dans cette mission.
- `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_PRO` présents.

## 5. Webhooks Stripe
- Sans signature: réponse `200 {"received":true,"note":"stripe_not_configured"}` (normal tant que Stripe test non configuré côté backend)
- Signés: non testés
- Idempotence: non prouvée en runtime
- `invoice.payment_failed`: non testé en webhook signé

## 6. Import portefeuille V1
- `POST /api/imports/preview` -> 200 (`import_job_id` retourné)
- `POST /api/imports/commit` -> 200 (`status: completed`, `summary` retourné)
- `GET /api/imports/history` -> 200 (historique présent)
- Validation sur CSV simple: clients/contrats/tâches créés
- Rejeu CSV: détection de doublons clients observée (`duplicate_rows > 0`)

## 7. Admin billing
- `GET /api/admin/super/billing` sans token -> 401
- `GET /api/admin/super/billing` token broker -> 403
- Test super_admin: non réalisé (token non fourni)

## 8. Décision Go / No-Go
- Déploiement prod app/api: **GO**
- Import portefeuille V1 (CSV preview+commit): **GO**
- Stripe test mode opérationnel complet signé: **NO GO**
- Stripe live: **NO GO**
- Encaissement live: **NO GO**

## 9. Action immédiate pour fermer Stripe test complet
1. Renseigner sur VPS les variables `_TEST` réelles (sans exposer les secrets).
2. Redémarrer PM2 avec `--update-env`.
3. Rejouer Starter + Pro + Portal.
4. Configurer webhook Stripe test signé.
5. Rejouer au moins: `checkout.session.completed`, `customer.subscription.updated`, `invoice.payment_failed`.
6. Rejouer un même `event_id` pour prouver l’idempotence.
7. Couper Auto-Deploy du service Render `srv-d7561hsr85hc73a9c6i0` (dashboard Render), pour stopper les alertes non-prod.
