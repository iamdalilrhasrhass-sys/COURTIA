# COURTIA — Billing Test Mode Final Report

Date: 2 mai 2026

## 1. Objectif
Mettre en place un tunnel d’encaissement propre en Stripe test mode (sans live), avec consentements, traçabilité légale et visibilité admin.

## 2. Implémenté
- Onboarding cabinet (`/onboarding`) + champs organisation.
- Consentements obligatoires (CGV/privacy/DPA/essai/renouvellement) enregistrés.
- Création checkout session Stripe test mode.
- Webhook Stripe avec vérification de signature + idempotence.
- Statut abonnement (`/api/billing/status`).
- Customer Portal session (`/api/billing/create-portal-session`).
- Admin billing views (`/api/admin/super/billing`).
- Templates d’emails transactionnels préparés.
- Déploiement backend VPS/PM2 effectué (service `courtia-api` redémarré).
- Endpoint public `GET https://api.courtiark.fr/api/billing/plans` actif.
- Guard sécurité ajouté dans le code: en `BILLING_MODE=test`, plus de fallback implicite vers clé live.

## 3. Documents légaux
Base draft:
- `docs/legal-drafts/COURTIA_CGV_SAAS_B2B_DRAFT.md`
- `docs/legal-drafts/COURTIA_PRIVACY_POLICY_DRAFT.md`
- `docs/legal-drafts/COURTIA_DPA_DRAFT.md`
- `docs/legal-drafts/COURTIA_COOKIES_POLICY_DRAFT.md`
- `docs/legal-drafts/COURTIA_MENTIONS_LEGALES_DRAFT.md`

Version pré-live à relire/valider:
- `docs/legal-drafts/COURTIA_CGV_SAAS_B2B_PRELIVE.md`
- `docs/legal-drafts/COURTIA_PRIVACY_POLICY_PRELIVE.md`
- `docs/legal-drafts/COURTIA_DPA_PRELIVE.md`
- `docs/legal-drafts/COURTIA_COOKIES_POLICY_PRELIVE.md`
- `docs/legal-drafts/COURTIA_MENTIONS_LEGALES_PRELIVE.md`

## 4. Base de données
- Migration non destructive créée:
  - `backend/migrations/20260502_billing_legal_foundation.sql`
- Exécution production non forcée dans ce batch.

## 5. Variables d’environnement
- Setup documenté dans:
  - `docs/COURTIA_STRIPE_TEST_ENV_SETUP.md`
- Valeurs réelles non commitées.

## 6. Limites actuelles
- Variables Stripe test `_TEST` absentes sur le backend VPS actuel (à configurer avant validation complète).
- Stripe test E2E complet dépend des clés test réelles + config webhook Stripe Dashboard.
- Validation juridique/comptable des textes non terminée.
- Validation fiscale finale (paramétrage HT/TTC/TVA Stripe) à confirmer avec comptable.
- Scheduling J5/J7 emails non branché automatiquement.
- Événements webhook signés Stripe (idempotence en situation réelle) à rejouer via Stripe CLI/dashboard.

## 7. Go / No-Go
- Démo produit: **GO**
- Stripe test mode (code): **GO**
- Stripe test mode (opérationnel complet): **GO conditionnel** après config env `_TEST` + redeploy backend
- Stripe live: **NO GO**
- Commercialisation payante live: **NO GO** tant que validation juridique/comptable n’est pas signée.

## 8. Passage live — checklist minimale
1. Rotation secrets terminée (JWT/DB/Stripe).
2. Validation juriste des documents contractuels.
3. Validation comptable du régime fiscal affiché.
4. Test E2E Stripe test complet (checkout/webhooks/portal/fails).
5. Validation sécurité finale + monitoring.
6. Activation contrôlée Stripe live.
