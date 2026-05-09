# Import Clients COURTIA

Objectif: importer un portefeuille client simple sans assistance technique.

## Formats supportes

- CSV
- XLS
- XLSX

Limites configurables:

- `IMPORT_MAX_ROWS` par defaut `10000`
- `IMPORT_MAX_MB` par defaut `10`

## Workflow

1. Ouvrir `/import`.
2. Telecharger `templates/import/clients-template.csv`.
3. Charger le fichier client.
4. Verifier la preview.
5. Ajuster le mapping colonnes.
6. Lire la simulation.
7. Confirmer l'import final.

## Colonnes reconnues

- prenom
- nom
- email
- telephone
- adresse
- ville
- code_postal
- type_client
- statut
- notes
- societe
- siret
- compagnie
- type_contrat
- numero_contrat
- prime_annuelle
- date_effet
- date_echeance
- statut_contrat
- tache
- date_rappel

## Securite import

- Aucun import n'est fait pendant la preview.
- Le commit final s'execute en transaction.
- Les doublons email/telephone sont detectes.
- Les lignes invalides sont marquees en erreur dans le rapport.
- Les colonnes non mappees sont listees comme inconnues.
