# Captures produit reelles (26/09/2026)

Environnement : **demonstration publique COURTIARK** (`/demo/dashboard`), montee par l'application
avec des donnees synthetiques. Le bandeau de l'environnement indique : « Cabinet Horizon Assurances —
cabinet fictif, donnees synthetiques. Aucun acces au systeme de production. »

Aucun compte client n'a ete utilise. Aucune donnee reelle n'apparait : les noms d'entreprises et de
personnes des captures viennent du jeu de demonstration (Cabinet Horizon Assurances, Anne Delacroix,
Batllog SA, Etude Moret & Associes…).

| Fichier | Ecran | Taille | Poids | Integre sur |
|---|---|---|---|---|
| `courtiark-cockpit.webp` | tableau de bord (clients, contrats, primes, taches, echeances) | 1440x900 | 64 Ko | accueil (preload) + money page |
| `courtiark-portefeuille.webp` | clients et portefeuille | 1440x900 | 52 Ko | money page |
| `courtiark-pipeline.webp` | opportunites | 1440x900 | 36 Ko | money page |
| `courtiark-relances.webp` | relances | 1440x900 | 45 Ko | money page |
| `courtiark-contrats.webp` | contrats et echeances | 1440x900 | 64 Ko | money page |
| `courtiark-documents.webp` | documents | 1440x900 | 48 Ko | money page |
| `courtiark-ark-brief.webp` | brief du matin ARK | 1440x900 | 54 Ko | money page |

Contraintes respectees : WebP, largeur et hauteur declarees dans le HTML (aucun saut de mise en page),
`loading="lazy"` partout sauf l'image de l'accueil qui est l'element LCP (`fetchpriority="high"`),
alt descriptif en francais, legende indiquant qu'il s'agit d'un environnement de demonstration.
Poids total des 7 fichiers : 392 Ko.

Defaut trouve en preparant ces captures : la demonstration interactive publique **renvoyait le
visiteur au mur de connexion des le premier clic** (la barre laterale naviguait vers les routes
reelles `/clients`, `/contrats` au lieu de `/demo/...`). Corrige (barre laterale, palette de
commandes, navigation mobile) et verifie : le parcours reste dans `/demo`.
