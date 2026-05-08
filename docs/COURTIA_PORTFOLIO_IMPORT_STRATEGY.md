# COURTIA — Portfolio Import Strategy V1

Date: 2 mai 2026  
Statut: V1 opérationnelle (preview + commit + history) avec roadmap V2.

## 1) Objectif
Permettre à un courtier d’importer rapidement son portefeuille dans COURTIA sans écrasement de données existantes, avec prévisualisation, mapping et rapport d’import.

## 2) Formats supportés V1
- CSV
- XLS / XLSX

## 3) Formats futurs (V2+)
- Exports natifs d’anciens CRM (connecteurs dédiés)
- Fichiers multi-onglets complexes
- API partenaires
- Imports automatisés (mailbox/connecteurs)

## 4) Données importables V1
- Clients
- Contrats (via `quotes`)
- Tâches / échéances (via `appointments`)

## 5) Mapping colonnes V1
Champs pris en charge:
- prénom, nom, email, téléphone, adresse, code postal, ville
- type client, société, SIRET
- type contrat, compagnie, numéro contrat, prime annuelle, date effet, date échéance, statut contrat
- tâche, date rappel

## 6) Détection des doublons V1
Règles appliquées:
- email
- téléphone
- prénom + nom (+ ville si disponible)
- numéro contrat (au niveau client)

## 7) Prévisualisation avant import
`POST /api/imports/preview` retourne:
- nombre total de lignes
- estimation lignes valides / erreurs
- colonnes non reconnues
- suggestion de mapping
- aperçu des lignes mappées

## 8) Import final (commit)
`POST /api/imports/commit`:
- nécessite `import_job_id`
- applique le mapping validé
- crée clients/contrats/tâches selon les données disponibles
- produit un résumé:
  - `imported_clients`
  - `imported_contracts`
  - `imported_tasks`
  - `duplicate_rows`
  - `error_rows`

## 9) Journalisation / traçabilité
Tables V1:
- `import_jobs`
- `import_job_rows`

Elles permettent:
- historique par utilisateur
- statut du job (preview_ready/processing/completed)
- stockage du mapping et des erreurs de lignes

## 10) ARK après import
Après import, le portefeuille devient exploitable pour:
- recalcul health score
- enrichissement morning brief
- priorisation relances / échéances

Note: Aucun branchement Anthropic ajouté dans cette phase.

## 11) Risques / garde-fous
- qualité source hétérogène
- mapping incomplet
- doublons cachés
- champs métier absents
- gros fichiers

Mesures V1:
- prévisualisation obligatoire
- taille limitée
- erreur propre côté API
- import non destructif (pas de suppression auto)

## 12) Roadmap V2 recommandée
- mapping assisté IA (suggestion intelligente contrôlée)
- connecteurs CRM dédiés
- import multi-fichiers orchestré (clients + contrats + tâches)
- moteur de fusion avancé (scoring confiance)
- import monitoring + métriques qualité
