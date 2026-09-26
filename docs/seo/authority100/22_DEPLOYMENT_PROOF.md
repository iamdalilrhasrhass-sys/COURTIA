
# Preuve de deploiement (26/09/2026)

| Element | Valeur |
|---|---|
| Commit | `668d668d` |
| Deploiement | Age     Project                                      Deployment                                                                Status       Environment     Duration     Username |
| Alias | courtiark.fr |
| En-tete servi | `x-vercel-id: lhr1::dd8xn-1790434326561-1e6fd9034120` |
| Gate production | PRODUCTION : 93 URL testées · 0 en échec |

## Verifications par le contenu (jamais par le statut)

| URL | Code | Verifie |
|---|---|---|
| /etudes | 200 | page servie |
| /etudes/courtage-assurance-france-2026 | 200 | etude + Dataset JSON-LD |
| /etudes/methodologie-cartographie-courtage-france | 200 | methodologie |
| /presse | 200 | kit presse |
| /sources | 200 | sources officielles et etat de verification |
| /politique-editoriale | 200 | politique editoriale |
| /ressources/reglementation-courtier-assurance-france | 200 | hub France |
| /ressources/reglementation-intermediaire-assurance-suisse | 200 | hub Suisse |
| /donnees/courtage-france-2026.csv | 200 | `text/csv` |
| /logiciel-courtier-assurance | 200 | 6 captures produit chargees 1440x900 |

Test HTML sans JavaScript : **16/16 pages conformes** (titre, description, H1 unique, texte, liens
internes, CTA, donnees structurees visibles sans executer de script).
