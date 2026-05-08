# COURTIA — Deployment Final Test Mode Report

Date: 2 mai 2026 (clôture après passation Hermes)

## 1) Commit et déploiement
- Commit backend correctif Stripe customer stale: `4f16806`
- Push production: `main` mis à jour sur GitHub
- VPS déployé depuis `/root/courtia_new` vers `/srv/courtia/backend`
- PM2 redémarré avec env: `pm2 restart courtia-api --update-env`

## 2) Santé production
- Frontend officiel: `https://courtia.vercel.app` ✅ 200
- Backend officiel: `https://api.courtiark.fr/api/health` ✅ 200
- PM2 `courtia-api` ✅ online

## 3) Stripe test mode (runtime réel)
- Variables test présentes/valides (masquées): ✅
- Plans / status / onboarding / legal acceptance: ✅
- Checkout Starter: ✅
- Checkout Pro: ✅
- Premium sur devis: ✅ (409 `premium_contact_required`)
- Customer Portal: ✅

## 4) Webhooks
- Sans signature: ✅ 400 `missing_signature`
- Signé `invoice.payment_failed`: ✅ 200
- Signé `customer.subscription.updated`: ✅ 200
- Rejeu même event: ✅ idempotent
- Doublons `payment_events.event_id`: ✅ 0

## 5) Import portefeuille V1 (non-régression)
- `POST /api/imports/preview`: ✅
- `POST /api/imports/commit`: ✅
- `GET /api/imports/history`: ✅
- Rejeu CSV: doublons détectés (au moins clients) ✅

## 6) Limites restantes
- Email billing J0/J5/J7: templates prêts, mais provider/scheduler non finalisés pour un run “production-grade”.
- `checkout.session.completed` signé synthétique: event persisté mais réponse HTTP 400 (durcissement post-traitement recommandé côté email J0).

## 7) Décision GO/NO-GO
- Déploiement VPS/PM2: **GO**
- Stripe test mode opérationnel backend: **GO**
- Stripe live: **NO GO**
- Encaissement live: **NO GO** (validation juriste/comptable finale obligatoire)
