# COURTIA — Transactional Emails QA (Billing Test Mode)

Date: 2 mai 2026 (run final après passation Hermes)

## Templates présents
- `trial_activated_j0`
- `trial_reminder_j5`
- `subscription_started_j7`
- `trial_canceled`
- `payment_failed`
- `invoice_paid`
- `premium_contact_received`
- `legal_acceptance_recorded`

## État opérationnel constaté
- Provider SMTP billing: **incomplet/legacy** (logs récurrents `Missing credentials for "PLAIN"` sur autres jobs).
- Flux Stripe test principal:
  - `invoice.payment_failed` signé: ✅ traité sans crash backend.
  - `customer.subscription.updated` signé: ✅ traité sans crash backend.
- Réserve:
  - sur test synthétique `checkout.session.completed`, réponse 400 observée malgré event persisté (traitement post-webhook à durcir, probablement sur l’étape email J0).

## Orchestration J0/J5/J7
- J0: fondation en place mais robustesse à finaliser côté provider.
- J5/J7: scheduler dédié billing à confirmer avant live.

## Décision
- **Templates et service de base: prêts**
- **Chaîne email billing complète avant live: partielle**
- **Pré-live recommandation**: finaliser provider SMTP/transactionnel + job J5/J7 avant passage Stripe live.
