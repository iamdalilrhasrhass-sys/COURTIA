# COURTIA · ARK — Carte Produit

Un seul moteur, trois métiers, un parcours courtier complet.

## Parcours

`lead → qualification → collecte_pieces → tarification → conseil → souscription → actif → renouvellement`

- LOT 1 : journal immuable, machine à états, policy gate, Command Center.
- LOT 2 : provenance, extraction documentaire, scoring dossier.
- LOT 3 : intake WhatsApp.
- LOT 4 : handoff inter-verticales, immobilier → crédit → assurance.
- LOT 5 : note de devoir de conseil, préparée par ARK et validée par humain.
- Agents ARK : Marketing, Visibilité, Prospection, Finances, Juridique, Recrutement, Accueil.
- Prospection : import CSV → séquence → brouillons → validation → envoi Brevo + opt-out.

## Gates de production

1. `npm run migrate` avec `DATABASE_URL`.
2. Configurer `ANTHROPIC_API_KEY`, Meta WhatsApp, `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`.
3. Vérifier `/api/ark/actions/:id/execute` sur une action approuvée.
4. Lancer le worker Morning Brief sous PM2.
5. Faire un smoke test bout-en-bout avec un vrai dossier : `cd backend && npm run smoke`.

## Positionnement

Le moat n’est pas “plus de features” : c’est la profondeur métier + conformité traçable + flywheel multi-verticales.
