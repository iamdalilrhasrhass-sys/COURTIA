# COURTIA — Transactional Emails QA (Billing Test Mode)

Date: 2 mai 2026

## Templates ciblés
- `trial_activated_j0`
- `trial_reminder_j5`
- `subscription_started_j7`
- `trial_canceled`
- `payment_failed`
- `invoice_paid`
- `premium_contact_received`
- `legal_acceptance_recorded`

## Vérifications attendues
1. Templates présents et rendus sans erreur.
2. Service email non bloquant:
   - si provider absent, mode `disabled/skipped` propre.
   - webhook Stripe ne doit pas échouer à cause d’un envoi email.
3. Messages cohérents:
   - essai 7 jours
   - 0 € aujourd’hui
   - annulation via portail Stripe

## Orchestration
- J0: prêt (trigger événement activation)
- J5/J7: nécessite scheduler/cron opérationnel + règles d’envoi

## État actuel (à compléter)
- Provider configuré: ⚠️ non validé pour billing test mode (logs runtime montrent encore des erreurs SMTP legacy `Missing credentials for "PLAIN"` sur scheduler relance)
- Envoi réel test: ❌ non validé (aucun envoi de facturation Stripe testé en réel)
- Mode fallback sans provider: ✅ service prévu pour ne pas bloquer le flux billing
- Blocage webhook en cas d’échec email: ⚠️ non prouvé E2E webhook signé (Stripe test non configuré côté VPS)

## Conclusion QA email (mission actuelle)
- Templates: ✅ présents
- J0: prêt côté template/service
- J5/J7: ⚠️ orchestration scheduler dédiée à finaliser avant live
- Décision: **email billing prêt côté fondation, non validé bout-en-bout en test mode signé**
