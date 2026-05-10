# Import clients COURTIA

Document court utilisé pour la démo client. Le guide complet reste dans `docs/import-clients.md`.

## Parcours recommandé

1. Ouvrir `/import`.
2. Télécharger le template CSV.
3. Charger un fichier `.csv`, `.xls` ou `.xlsx`.
4. Vérifier la prévisualisation.
5. Ajuster le mapping colonnes si COURTIA n'a pas reconnu un intitulé.
6. Lire la simulation: lignes prêtes, lignes à corriger, colonnes ignorées.
7. Confirmer l'import final.
8. Après succès: ouvrir les clients importés, lancer ARK ou créer une tâche de relance.

## Formats et limites

- Formats: CSV, XLS, XLSX.
- Taille: `IMPORT_MAX_MB`, par défaut 10 Mo.
- Lignes: `IMPORT_MAX_ROWS`, par défaut 10000.
- Encodage CSV: UTF-8 recommandé. Les accents français sont supportés.

## Colonnes métier supportées

- prénom, nom, email, téléphone
- adresse, ville, code postal
- type client, statut, notes
- société, SIRET
- compagnie, type contrat, numéro contrat
- prime annuelle, date effet, date échéance, statut contrat
- tâche, date rappel

## Garde-fous

- La preview n'écrit rien en base.
- Le commit final s'exécute en transaction.
- Les doublons email/téléphone sont détectés.
- Les erreurs sont remontées dans le rapport, pas masquées.
- Une colonne inconnue n'est jamais importée silencieusement.

