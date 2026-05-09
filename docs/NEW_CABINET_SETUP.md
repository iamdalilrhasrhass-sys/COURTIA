# New Cabinet Setup — COURTIA

## Objectif
Rendre un nouveau cabinet opérationnel en quelques minutes sans casser la conformité métier.

## Étapes
1. Créer le compte courtier et vérifier `/api/auth/me`.
2. Compléter `/onboarding` étape cabinet (nom, ORIAS, contact, facturation).
3. Compléter la conformité (RC Pro, représentant légal, mentions DDA) dans `/parametres`.
4. Importer le portefeuille via `/import` (CSV/XLSX + mapping + preview).
5. Connecter Google Agenda et Gmail depuis `/parametres` > Intégrations.
6. Générer un premier Morning Brief et vérifier les priorités.
7. Générer un document DDA test sur une fiche client et valider son cycle de statut.
8. Activer ou vérifier l’abonnement dans `/billing`.

## Contrôles finaux
- dashboard, clients, fiche client, contrats, tâches, rapports, morning brief
- admin guard conforme au rôle
- `/api/api = 0` et `auth 429 = 0` au smoke
