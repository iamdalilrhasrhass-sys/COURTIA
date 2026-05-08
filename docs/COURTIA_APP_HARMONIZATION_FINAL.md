# COURTIA — App Harmonization Final

Date : 2 mai 2026

## Objectif
Rapprocher l’application interne du niveau premium de la landing, avec cohérence cockpit Aurora et lisibilité métier.

## Modifications principales
- `Rapports` : header Aurora ajouté, loader générique remplacé par `CourtiaLogoLoader`.
- `Paramètres` : header Aurora ajouté, loader générique remplacé par `CourtiaLogoLoader`.
- Routes secondaires passées en lazy loading pour alléger le bundle principal.

## Effet produit
- Meilleure continuité visuelle landing -> auth -> cockpit.
- Chargements plus qualitatifs sur pages métier.
- Navigation perçue plus fluide grâce au code-splitting.

## Validation
- Build frontend : OK
- Tests frontend : 33/33
- QA Python : 0 P0 / 0 P1

