# Lighthouse 12 — mobile, production (26/09/2026)

| URL | Performance | Accessibilite | Bonnes pratiques | SEO | LCP | TBT | CLS |
|---|---|---|---|---|---|---|---|
| `/` (accueil) | 100 | 100 | 100 | 100 | 1,0 s | 0 ms | 0 |
| `/logiciel-courtier-assurance` | 100 | 100 | 100 | 100 | 1,1 s | 0 ms | 0 |
| `/demo` | 100 | 100 | 100 | 100 | 0,9 s | 0 ms | 0 |
| `/suisse/geneve` | 100 | 100 | 100 | 100 | 0,9 s | 0 ms | 0 |
| `/outils/calculateur-taux-transformation-assurance` | 100 | 100 | 100 | 100 | 0,9 s | 0 ms | 0 |

Objectifs terrain : LCP <= 2,5 s (mesure : 0,9 a 1,1 s), CLS <= 0,1 (mesure : 0), INP : le TBT
mesure 0 ms, l'interaction principale est un calcul local sans appel reseau.

Aucun ajustement cosmetique n'a ete fait pour gagner un point : ces mesures sont celles de la
production apres l'ajout des 7 captures produit (l'image de l'accueil est declaree `fetchpriority="high"`
car elle est l'element LCP, les six autres sont en `loading="lazy"`).

Rapports JSON : `/tmp/lh_master_*.json` (session du 26/09/2026).
