# HTML servi sans JavaScript (mesure du 26/09/2026)

Controle : `curl` sans moteur, aucune execution de script. Un crawler doit trouver le titre, la description, le H1, le texte, les liens internes, le CTA et les donnees structurees.

| Page | Poids | title | H1 | JSON-LD | CTA | Liens internes | Texte | Verdict |
|---|---|---|---|---|---|---|---|---|
| `/` | 21423 o | oui | 1 | 4 | 7 | 34 | 15719 car. | PASS |
| `/logiciel-courtier-assurance` | 29370 o | oui | 1 | 4 | 7 | 36 | 20871 car. | PASS |
| `/suisse` | 18454 o | oui | 1 | 5 | 7 | 43 | 13034 car. | PASS |
| `/suisse/geneve` | 17081 o | oui | 1 | 5 | 7 | 31 | 12434 car. | PASS |
| `/assurances` | 13895 o | oui | 1 | 4 | 7 | 34 | 9728 car. | PASS |
| `/etudes/courtage-assurance-france-2026` | 35355 o | oui | 1 | 5 | 7 | 33 | 17204 car. | PASS |
| `/etudes/methodologie-cartographie-courtage-france` | 15162 o | oui | 1 | 4 | 7 | 31 | 10908 car. | PASS |
| `/conformite/controle-acpr-courtier` | 14914 o | oui | 1 | 3 | 7 | 32 | 10568 car. | PASS |
| `/fonctionnalites/assistant-ark` | 16656 o | oui | 1 | 4 | 7 | 31 | 12130 car. | PASS |
| `/france/densite-courtage` | 16217 o | oui | 1 | 3 | 7 | 31 | 11464 car. | PASS |
| `/demo` | 13418 o | oui | 1 | 3 | 8 | 29 | 8284 car. | PASS |
| `/presse` | 15178 o | oui | 1 | 3 | 7 | 32 | 10599 car. | PASS |
| `/sources` | 14691 o | oui | 1 | 3 | 7 | 33 | 9836 car. | PASS |
| `/politique-editoriale` | 14656 o | oui | 1 | 3 | 7 | 31 | 10477 car. | PASS |
| `/ressources/reglementation-courtier-assurance-france` | 16219 o | oui | 1 | 4 | 7 | 36 | 10989 car. | PASS |
| `/ressources/reglementation-intermediaire-assurance-suisse` | 15573 o | oui | 1 | 4 | 7 | 33 | 10659 car. | PASS |

Resultat : 16/16 pages conformes.
