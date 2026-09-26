# Recette responsive (production, 26/09/2026)

| Largeur | Page testee | Debordement horizontal | CTA visible | Verdict |
|---|---|---|---|---|
| 390 px | `/outils/checklist-renouvellement-assurance` | 0 px | oui | PASS |
| 360 px | accueil, money page, `/demo`, `/suisse/geneve`, outil | 0 px | oui | PASS |
| 375 px | idem | 0 px | oui | PASS |
| 390 px | idem | 0 px | oui | PASS |
| 768 px | idem | 0 px | oui | PASS |
| 1024 px | idem | 0 px | oui | PASS |
| 1440 px | idem | 0 px | oui | PASS |
| 1920 px | idem | 0 px | oui | PASS |

Controles : aucun debordement horizontal (`scrollWidth - innerWidth = 0`), CTA dans le viewport,
aucun texte tronque, images produit avec dimensions declarees (donc aucun decalage), tableaux
defilables sur mobile, champs de formulaire non rognes. Le detail des 20 combinaisons largeur x gabarit
(360/375/390/1440/1920 sur accueil, money, outil, Geneve) figure dans la phase precedente
(`2026-09-26-phase-index-cleanup/12_controles_pages.md`).
