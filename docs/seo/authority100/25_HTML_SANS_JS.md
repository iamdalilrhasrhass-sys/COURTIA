# HTML servi sans JavaScript (mesure du 26/09/2026)

Controle : `curl` sans moteur, aucune execution de script. Un crawler doit trouver le titre, la description, le H1, le texte, les liens internes, le CTA et les donnees structurees.

| Page | Poids | title | H1 | JSON-LD | CTA | Liens internes | Texte | Verdict |
|---|---|---|---|---|---|---|---|---|
| `/` | 21284 o | oui | 1 | 4 | 7 | 34 | 15580 car. | PASS |
| `/logiciel-courtier-assurance` | 29231 o | oui | 1 | 4 | 7 | 36 | 20732 car. | PASS |
| `/suisse` | 18315 o | oui | 1 | 5 | 7 | 43 | 12895 car. | PASS |
| `/suisse/geneve` | 16942 o | oui | 1 | 5 | 7 | 31 | 12295 car. | PASS |
| `/assurances` | 13756 o | oui | 1 | 4 | 7 | 34 | 9589 car. | PASS |
| `/etudes/courtage-assurance-france-2026` | 4951 o | oui | 0 | 2 | 0 | 0 | 894 car. | ECHEC |
| `/conformite/controle-acpr-courtier` | 14914 o | oui | 1 | 3 | 7 | 32 | 10568 car. | PASS |
| `/fonctionnalites/assistant-ark` | 16517 o | oui | 1 | 4 | 7 | 31 | 11991 car. | PASS |
| `/france/densite-courtage` | 15912 o | oui | 1 | 3 | 7 | 30 | 11210 car. | PASS |
| `/demo` | 13418 o | oui | 1 | 3 | 8 | 29 | 8284 car. | PASS |

Resultat : 9/10 pages conformes.
