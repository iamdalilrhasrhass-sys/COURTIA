# COURTIA — Secret Rotation Checklist

Date : 2 mai 2026

## Périmètre
- Environnements officiels concernés : Vercel (frontend), VPS/PM2 (backend).
- Render est non-prod/secondaire : rotation des secrets Render uniquement si encore actifs.
- Objectif : aucune valeur secrète en dur dans le repo et aucune dépendance à un secret potentiellement exposé.

## Priorité haute (avant Stripe test mode)
- [ ] Régénérer `JWT_SECRET` production (VPS) et invalider les tokens actifs si nécessaire.
- [ ] Régénérer credentials `DATABASE_URL` si la chaîne a circulé hors canaux sûrs.
- [ ] Révoquer/renouveler toute clé Render API mentionnée dans les historiques/outils.
- [ ] Vérifier qu'aucune clé secrète n'est exposée via variables frontend (`VITE_*`).
- [ ] Vérifier que les logs backend n'impriment pas de secrets.

## Stripe (test mode uniquement)
- [ ] Créer nouvelles clés `sk_test` dédiées COURTIA (pas de réutilisation ancienne).
- [ ] Créer nouveau `whsec` pour l'endpoint webhook test officiel.
- [ ] Créer `price_id` test Starter/Pro.
- [ ] Vérifier que seule l’API backend lit les secrets Stripe.
- [ ] Confirmer `BILLING_MODE=test` sur l'environnement backend de test.

## Anthropic (phase ultérieure, non branchée)
- [ ] Générer `ANTHROPIC_API_KEY` dédiée backend.
- [ ] Interdire exposition en `VITE_*`.
- [ ] Activer rate limit par user + organisation avant branchement réel.

## Planning opérationnel de rotation
- [ ] J0 :
  - [ ] Créer nouvelles valeurs (`JWT_SECRET`, DB credentials, clés Stripe test).
  - [ ] Mettre à jour env manager (VPS / Vercel, selon besoin).
  - [ ] Redémarrer process backend et vérifier health/auth.
- [ ] J+1 :
  - [ ] Contrôler logs d'erreur auth/billing.
  - [ ] Vérifier absence d'appel avec anciennes clés.
- [ ] J+7 :
  - [ ] Audit de confirmation (script + revue manuelle).
  - [ ] Clôturer le ticket rotation dans la doc sécurité.

## Vérifications post-rotation
- [ ] `GET /api/health` = 200
- [ ] login/register = OK
- [ ] `/api/portfolio/morning-brief` = 200
- [ ] `/api/portfolio/health-score` = 200
- [ ] `/api/admin/super/analytics` non autorisé = 401/403 propre
- [ ] Aucun secret détecté dans le bundle frontend

## Outils
- Script d'audit : `python3 scripts/courtia_secret_audit.py`
- Rapport généré : `docs/COURTIA_SECRET_AUDIT_REPORT.md`
