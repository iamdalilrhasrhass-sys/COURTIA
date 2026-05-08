# COURTIA — Landing 3D Final

Date : 2 mai 2026

## Objectif
Finaliser la landing en expérience Aurora premium continue, orientée conversion courtier, sans casser la performance ni le parcours auth.

## Ajustements livrés
- Wording pricing harmonisé en `HT / mois` avec mention `TTC` visible (TVA applicable).
- Mentions essai renforcées : `0 € aujourd’hui`, `7 jours`, `annulation en ligne`.
- Mention globale ajoutée : `Prix indiqués hors taxes. TVA applicable au taux en vigueur.`
- Conserver le flux 3 actes + profondeur (parallax, perspective, cartes hover, Aurora rails subtils).

## Contrôles
- Build frontend : OK
- Tests frontend : 33/33
- Aucun retour de ligne bleue centrale agressive dans le code actuel (rail déplacé et adouci).
- Routes landing/auth toujours accessibles.

## Notes
- Pas de changement Stripe.
- Pas de changement backend.
- Pas de dépendance lourde ajoutée.
