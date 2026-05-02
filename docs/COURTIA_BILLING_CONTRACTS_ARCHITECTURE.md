# COURTIA — Billing, Contrats, Signature : Architecture cible

Date : 2 mai 2026  
Scope : architecture produit + technique + conformité (sans activation Stripe LIVE)

## A) Parcours utilisateur complet
1. Landing publique (positionnement + offres).
2. Choix offre : Starter / Pro / Premium.
3. Création de compte COURTIA.
4. Onboarding cabinet (données entreprise + signataire).
5. Vérification des données saisies.
6. Acceptation CGV + politique confidentialité.
7. Consentement explicite essai gratuit et renouvellement auto.
8. Acceptation contractuelle robuste (Starter/Pro) ou signature électronique (Premium).
9. Checkout Stripe (Starter/Pro).
10. Webhook Stripe de confirmation.
11. Activation droits plan.
12. Envoi emails transactionnels.
13. Portail client (gestion abonnement/annulation).
14. Facturation + état abonnement dans l’app.
15. Supervision Admin Center billing/legal.

## B) Différence par offre
### Starter — 89 €
- Essai 7 jours.
- Carte obligatoire via Stripe Checkout.
- CGV/consentements obligatoires.
- Acceptation contractuelle horodatée.
- Accès fonctionnel limité.

### Pro — 159 €
- Essai 7 jours.
- Carte obligatoire via Stripe Checkout.
- CGV/consentements obligatoires.
- Acceptation contractuelle horodatée.
- Offre principale, accès cockpit complet.

### Premium — sur devis
- Pas de checkout direct obligatoire.
- Entrée via demande commerciale.
- Devis/bon de commande + contrat personnalisé.
- Signature électronique obligatoire recommandée.
- Activation manuelle après validation commerciale/légale.

## C) Données onboarding cabinet
- Prénom
- Nom
- Email
- Mot de passe
- Téléphone
- Nom du cabinet
- Forme juridique
- SIRET
- ORIAS (si courtier)
- Adresse siège
- Code postal
- Ville
- Pays
- Email de facturation
- Responsable légal
- Fonction du signataire
- Acceptation CGV
- Acceptation politique confidentialité
- Acceptation essai gratuit
- Acceptation renouvellement automatique
- Horodatage
- IP
- User-Agent
- Version CGV acceptée
- Version contrat acceptée

## D) Consentement essai gratuit (wording produit)
Texte générique :
> J’accepte l’essai gratuit de 7 jours. Je comprends que 0 € est facturé aujourd’hui et que, sans annulation avant la fin de l’essai, mon abonnement sera automatiquement facturé selon l’offre choisie.

Starter :
> 0 € aujourd’hui, puis 89 € / mois après le 7e jour.

Pro :
> 0 € aujourd’hui, puis 159 € / mois après le 7e jour.

Note fiscale : le suffixe HT/TVA doit être piloté par configuration.

## E) Documents contractuels nécessaires
1. CGV SaaS B2B
2. Conditions d’utilisation
3. Politique de confidentialité
4. DPA / accord de sous-traitance RGPD
5. Politique cookies
6. Mentions légales
7. Contrat SaaS / bon de commande Premium
8. Clauses mandat/autorisation (si automatisation future)
9. Clause essai gratuit / renouvellement / résiliation
10. Clause support / disponibilité / limites de responsabilité
11. Clause sécurité / données / sauvegardes
12. Clause réversibilité / export
13. Clause suspension compte / impayés
14. Clause évolution tarifaire
15. Clause propriété intellectuelle
16. Clause confidentialité

## F) Signature électronique
- Starter/Pro : acceptation contractuelle robuste possible via cases + horodatage + IP + UA + version document + preuve checkout Stripe.
- Premium : signature électronique externe recommandée/obligatoire.

Prestataires compatibles (phase ultérieure) :
- Yousign
- DocuSign
- Dropbox Sign
- Universign

Abstractions à prévoir :
- `contract_acceptances`
- `signature_requests`
- `signed_documents`
- `legal_documents_versions`

## G) Tables DB à prévoir (proposition)
### `billing_plans`
- `id`, `code`, `display_name`, `price_amount`, `currency`, `interval`, `features_json`, `is_active`
- Référentiel des offres.

### `organization_profiles`
- `id`, `owner_user_id`, `cabinet_name`, `legal_form`, `siret`, `orias`, `billing_email`, `address_json`, `legal_signatory_name`, `legal_signatory_role`
- Profil cabinet.

### `customer_billing_profiles`
- `id`, `organization_id`, `stripe_customer_id`, `tax_mode`, `vat_applicable`, `vat_label`, `seller_status_snapshot`
- Couche billing client.

### `subscriptions`
- `id`, `organization_id`, `plan_id`, `provider`, `provider_subscription_id`, `status`, `trial_start_at`, `trial_end_at`, `current_period_start`, `current_period_end`, `cancel_at_period_end`
- État d’abonnement.

### `checkout_sessions`
- `id`, `organization_id`, `plan_id`, `provider_session_id`, `status`, `created_at`, `completed_at`, `raw_payload`
- Traçabilité checkout.

### `payment_events`
- `id`, `provider`, `event_id`, `event_type`, `organization_id`, `subscription_id`, `processed_at`, `is_idempotent`, `payload_json`
- Journal webhooks.

### `invoices`
- `id`, `organization_id`, `provider_invoice_id`, `status`, `amount`, `currency`, `invoice_url`, `paid_at`, `due_at`
- Vision facturation.

### `legal_documents`
- `id`, `doc_type`, `version`, `title`, `storage_url`, `published_at`, `is_active`
- Référentiel documentaire.

### `legal_acceptances`
- `id`, `organization_id`, `user_id`, `doc_type`, `doc_version`, `accepted_at`, `ip`, `user_agent`, `consent_context_json`
- Preuves de consentement.

### `signature_requests`
- `id`, `organization_id`, `provider`, `provider_request_id`, `status`, `requested_at`, `signed_at`, `document_version`
- Workflow de signature.

### `signed_documents`
- `id`, `organization_id`, `signature_request_id`, `provider_document_id`, `storage_url`, `checksum`, `signed_at`
- Archivage des contrats signés.

## H) Stripe — architecture cible
- Checkout Session `mode=subscription`.
- Price IDs séparés Starter/Pro.
- `trial_period_days=7`.
- Customer Portal activé.
- Validation webhook signature `whsec`.
- Idempotency keys.
- Journalisation webhooks.
- Sync statuts abonnement app.

Webhooks minimum :
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`
- `customer.subscription.trial_will_end`

## I) Emails transactionnels
- J0 : essai activé
- J5 : rappel fin essai
- J7 : abonnement démarré
- Essai annulé
- Paiement échoué
- Facture payée
- Compte suspendu
- Contrat signé
- Demande Premium reçue

## J) Admin Center Billing
- Plan actif
- Statut abonnement
- Début/fin essai
- Statut paiement
- SIRET / ORIAS
- Contrat accepté/signé
- Version CGV acceptée
- Lien customer Stripe
- Suspension/réactivation
- Historique événements billing

## K) Risques légaux / conformité
- Fiscalité micro-entreprise à confirmer (TVA/franchise en base).
- Textes contractuels finaux à valider par juriste/avocat.
- Cadrage RGPD strict (données clients de courtiers).
- Conservation des preuves de consentement.
- Réversibilité des données client.
- Sécurité, journalisation, sauvegardes, sous-traitants.

## L) Plan d’implémentation recommandé
1. Architecture + écrans non connectés + wording final.
2. Migrations DB billing/legal.
3. Stripe en test mode.
4. Webhooks + idempotence.
5. Emails transactionnels.
6. Signature électronique Premium.
7. Passage Stripe LIVE après validation juridique/fiscale.

## Paramétrage fiscal requis (micro-entreprise)
Configurer côté app et templates :
- `tax_mode`
- `vat_applicable`
- `vat_label`
- `legal_seller_status`

Exemples d’affichage selon configuration :
- `89 € / mois`
- `89 € HT / mois`
- `TVA non applicable, art. 293 B du CGI`

## État de scaffolding déjà présent (audit Phase 4)
- Routes existantes :
  - `backend/src/routes/billing.js`
  - `backend/src/routes/stripe.js`
- Services existants :
  - `backend/src/services/stripeService.js`
  - `backend/src/services/planService.js`
- Frontend existant :
  - page billing déjà présente (`/billing`), parcours auth/register actifs.
  - onboarding billing ajouté (`/onboarding?plan=starter|pro|premium`)

### Variables d’environnement actuellement attendues
- `BILLING_MODE=test`
- `STRIPE_SECRET_KEY_TEST`
- `STRIPE_WEBHOOK_SECRET_TEST`
- `STRIPE_STARTER_PRICE_ID_TEST`
- `STRIPE_PRO_PRICE_ID_TEST`
- `STRIPE_CUSTOMER_PORTAL_RETURN_URL`
- `FRONTEND_URL`
- `BACKEND_URL`

### Actions sûres recommandées avant implémentation supplémentaire
1. Configurer les variables test mode côté backend (sans commiter de secrets).
2. Vérifier en environnement de test les webhooks Stripe (idempotence + statuts abonnement).
3. Finaliser la rotation des secrets legacy documentés par l’audit.
4. Intégrer la signature électronique Premium via provider externe, jamais via “signature maison”.

## Implémentation réalisée (2 mai 2026)
- Endpoints backend ajoutés pour onboarding, consentements légaux, checkout session, webhook, status et portail client.
- Traçabilité légale ajoutée (`legal_acceptances`) avec timestamp, IP, user-agent et contexte de consentement.
- Fondations DB billing/legal ajoutées en migration non destructive (`20260502_billing_legal_foundation.sql`).
- Vues Admin billing ajoutées (`/api/admin/super/billing` + détail organisation).
- UI onboarding/billing ajoutée côté frontend sans bloquer la démo hors paiement.

---

## Limite assumée de ce document
Ce document cadre l’architecture technique et produit.  
La conformité contractuelle/fiscale finale avant commercialisation payante doit être validée par un professionnel du droit et de la comptabilité.
