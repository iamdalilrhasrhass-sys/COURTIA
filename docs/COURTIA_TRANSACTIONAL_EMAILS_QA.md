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
- Provider configuré: ⚠️ non confirmé dans ce run
- Envoi réel test: ⚠️ non validé (pas d’envoi live requis)
- Mode fallback sans provider: ✅ prévu dans le service (email non bloquant)
- Blocage webhook en cas d’échec email: ✅ attendu non bloquant (à valider E2E après setup provider)
