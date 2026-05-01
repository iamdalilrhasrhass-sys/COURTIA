# COURTIA — Tâches restantes

## Terminé
- [x] Phase 0 Codex — Audit reprise 2M documenté
- [x] Phase 1 Codex — Tests production avant recode documentés
- [x] Phase 2 Codex — Landing premium étendue, audit Python, build et tests locaux
- [x] Phase 3 Codex — Register Pro / pricing conversion premium sans toucher Stripe
- [x] Phase 3 Codex — Register Starter premium aligné avec le funnel Pro
- [x] Phase A Codex — Funnel Pro validé en production Vercel
- [x] Phase B Codex — Landing 3D scroll premium locale, build/test/audit OK
- [x] Phase B Codex — Landing 3D scroll validée en production Vercel
- [x] Phase C Codex — Auth / funnel final local, build/test OK
- [x] Batch 0 — Vérification état de départ
- [x] Batch 1 — Erreurs techniques supprimées (37 remplacements)
- [x] Batch 2 — Admin Center frontend (7 pages + 3 composants)
- [x] Batch 3 — Aurora (spinners, empty states)
- [x] Batch 4 — SEO / favicon / og:image
- [x] Batch 5 — QA desktop + production
- [x] Batch 6 — Rapport final
- [x] Documentation /docs/ (7 fichiers)
- [x] Telegram après chaque batch

## P0 — Bloquant plateforme complète
- [x] Login demo@courtia.fr — mot de passe réinitialisé, flux OK

- [ ] Admin Center API mismatch — frontend appelle `/api/admin/analytics`, `/api/admin/users`, `/api/admin/impersonation/logs` alors que le backend réel expose `/api/admin/super/*`. Ne bloque pas landing/login/dashboard, mais bloque une déclaration "Admin Center fonctionnel à 100%".

## P1 — Important
- [ ] DNS courtiark.fr → propager nameservers Hostinger
- [ ] Stripe LIVE → obtenir clés sk_live_ + whsec_ + Price IDs
- [ ] Billing / Onboarding Stripe :
  - onboarding cabinet avec SIRET / ORIAS
  - nom du cabinet, adresse de facturation, téléphone optionnel
  - Stripe Checkout subscription
  - `trial_period_days: 7`
  - affichage “0 € aujourd’hui puis 159 € HT/mois”
  - consentement explicite avant checkout
  - webhook Stripe pour activer/désactiver le plan
  - portail client Stripe pour gérer / annuler
  - bouton “Annuler mon essai” dans COURTIA
  - email J0 confirmation essai
  - email J5 rappel avant facturation
  - email J7 confirmation démarrage abonnement ou annulation
  - gestion paiement échoué
  - statut abonnement dans Admin Center
  - ne pas faire de faux paiement 0 EUR ni collecter la carte directement dans COURTIA
- [ ] Token super_admin → tests Admin Center E2E
- [ ] AuroraPageHeader → Clients, Tâches, Parametres
- [ ] Message 429 auth rate limit à rendre plus clair côté interface
- [ ] Auth Phase C — validation production Vercel après push

## P2 — Finition
- [ ] AuroraDivider sur toutes les transitions
- [ ] AuroraButton → harmoniser toutes les pages
- [ ] Test mobile responsive complet (toutes les pages app)
- [ ] Compression og:image → PNG pour LinkedIn
- [ ] Vérifier apple-touch-icon rendu mobile
- [ ] Optimiser le chunk frontend principal supérieur à 500 kB
