# COURTIA — Emails Transactionnels Billing (Test Mode)

Date: 2 mai 2026

## Objectif
Préparer les emails transactionnels liés au tunnel billing Stripe test mode sans bloquer la plateforme quand aucun provider email n’est configuré.

## Implémentation
- Service: `backend/src/services/emailService.js`
- Templates: `backend/src/emails/templates/billingTemplates.js`

## Variables d’environnement
- `EMAIL_PROVIDER` (`smtp`, `gmail`, `disabled`)
- `EMAIL_FROM`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` (si SMTP)
- `GMAIL_USER`, `GMAIL_APP_PASSWORD` (si Gmail)

## Comportement de sécurité
- Si provider absent/incomplet: le webhook n’échoue pas.
- Le service retourne un statut `skipped` (pas de crash bloquant).
- Aucune clé email n’est exposée au frontend.

## Événements/templates prévus
1. `trial_activated_j0`
2. `trial_reminder_j5`
3. `subscription_started_j7`
4. `trial_canceled`
5. `payment_failed`
6. `invoice_paid`
7. `premium_contact_received`
8. `legal_acceptance_recorded`

## Limites actuelles
- Le scheduling J5/J7 n’est pas automatisé dans ce batch.
- Les templates sont prêts, l’orchestration fine dépend du job scheduler à brancher.

## Validation avant live
1. Configurer un provider email test.
2. Déclencher chaque template en environnement de test.
3. Vérifier contenu, délivrabilité et anti-spam.
4. Journaliser les envois (ou table dédiée) avant passage live.
