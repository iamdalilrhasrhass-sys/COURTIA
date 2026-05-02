# COURTIA — Billing & Legal DB Schema (non-destructif)

Date: 2 mai 2026  
Migration proposée: `/Users/dalilrhasrhass/Documents/Codex/courtia-origin-main/backend/migrations/20260502_billing_legal_foundation.sql`

## Objectif
Préparer le socle Stripe test mode + consentements légaux sans casser l'existant.

## Principes
- `CREATE TABLE IF NOT EXISTS`
- `CREATE INDEX IF NOT EXISTS`
- Aucun `DROP`, aucun `TRUNCATE`, aucune suppression de données.
- Déploiement manuel à planifier sur environnement cible.

## Tables
1. `organization_profiles`
- Profil cabinet (SIRET, ORIAS, signataire, facturation).

2. `billing_plans`
- Catalogue plans (`starter`, `pro`, `premium`) + `stripe_price_id_test/live`.

3. `customer_billing_profiles`
- Lien org <-> customer Stripe + configuration fiscale.

4. `subscriptions`
- Statut abonnement, période d'essai, période courante, cancel_at_period_end.

5. `checkout_sessions`
- Historique sessions checkout (statut + payload brut utile audit).

6. `payment_events`
- Idempotence webhook via `event_id` unique.

7. `invoices`
- Métadonnées facture (statut, montant, URL, échéance).

8. `legal_documents`
- Versioning des documents légaux publiés.

9. `legal_acceptances`
- Preuve d'acceptation (doc/version/date/ip/user_agent/contexte).

10. `signature_requests`
- Suivi demandes de signature électronique (notamment Premium).

11. `signed_documents`
- Suivi documents signés et empreinte de contrôle.

## Sécurité et conformité
- Les secrets restent hors DB et hors repo.
- Les preuves de consentement sont tracées.
- La politique fiscale reste configurable (`tax_mode`, `vat_label`) et non figée.

## Rollback (procédural)
- Cette migration est additive.
- En cas d'incident, rollback recommandé par désactivation des routes billing concernées.
- Pas de rollback destructif automatique fourni.
