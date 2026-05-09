# Suivi commissions COURTIA V1

Le module commissions aide le cabinet à suivre les commissions attendues, encaissées et restantes par contrat, compagnie et apporteur.

## Feature flag

- Clé : `v1_commissions`
- Défaut : activé
- Dégradation : si le flag est désactivé, l’API renvoie `feature_disabled` et l’interface affiche un état propre.

## Routes API

- `GET /api/commissions` : liste filtrable.
- `GET /api/commissions/stats?year=2026` : agrégats annuels par mois, compagnie et apporteur.
- `POST /api/commissions/import` : import CSV via `{ "csv": "..." }`.
- `POST /api/contracts/:id/commissions` : crée ou met à jour une commission mensuelle sur un contrat.
- `POST /api/commissions/contracts/:id` : alias interne compatible.

## Format CSV

Colonnes acceptées :

```csv
compagnie,contrat_ref,periode,montant_attendu,montant_recu,statut,notes
AXA,AUTO-42,2026-05,120.50,100,paid,Premier règlement
```

`contrat_ref` peut être :

- l’identifiant COURTIA du contrat (`quotes.id`),
- le numéro de contrat dans `quote_data.numero`,
- ou `quote_data.policy_number`.

## Statuts

- `expected` : prévue.
- `partial` : partielle.
- `paid` : payée.
- `overdue` : en retard.
- `cancelled` : annulée.

## Sécurité

- Toutes les routes sont authentifiées.
- Le contrat doit appartenir au courtier connecté.
- Les brokers ne voient que leurs commissions d’apporteur.
- `owner`, `manager`, `admin` et `super_admin` voient l’ensemble du cabinet selon le modèle de rôles V1.

## Limites V1

- Le module s’appuie sur les contrats COURTIA stockés dans `quotes`.
- Les imports compagnie complexes nécessiteront des mappings avancés en V1.1.
- Le rapprochement automatique bancaire n’est pas inclus.
