# Production apres travaux (26/09/2026)

## Deploiement

| Element | Valeur |
|---|---|
| Dernier deploiement de production | 4m      iamdalilrhasrhass-1376s-projects/courtia     https://courtia-ilmy187mo-iamdalilrhasrhass-1376s-projects.vercel.app     ● Ready      Production      45s          iamdalilrhasrhass-1376 |
| Identifiant servi (en-tete x-vercel-id) | x-vercel-id: lhr1::nmttv-1790427539311-d3b6d0a72e3f |
| Alias | courtiark.fr |
| /logiciel-courtier-assurance | HTTP 200 |
| Redirections dans vercel.json | 163 (aucun doublon, aucune auto-redirection) |
| Gate production | PRODUCTION : 80 URL testées · 0 en échec |

## Controle des redirections (en production)

| Mesure | Valeur |
|---|---|
| Redirections testees | 147 |
| Conformes (source -> destination attendue -> 200, 1 seul saut) | 147 |
| Non conformes | 0 |
| Chaines detectees (>1 saut interne) | 0 |

## Evenements en base (marketing_events)

| Evenement | Nombre |
|---|---|
| LINE 1: ...' | |count(*) from marketing_events group by 1 order by 2 desc |

## Funnel des outils (par outil)

| Outil | Vues | Demarrages | Termines | Clics CTA |
|---|---|---|---|---|

## Performance (Lighthouse 12, mobile, production)

| Page | Performance | Accessibilite | Bonnes pratiques | SEO | LCP | TBT | CLS |
|---|---|---|---|---|---|---|---|
| /logiciel-courtier-assurance | 100 | 100 | 100 | 100 | 0,9 s | 0 ms | 0 |
| /suisse/geneve | 100 | 100 | 100 | 100 | 0,9 s | 0 ms | 0 |
| /outils/calculateur-taux-transformation-assurance | 100 | 100 | 100 | 100 | 1,0 s | 0 ms | 0 |

Preuves JSON : /tmp/lh_p4_*.json (session du 26/09).

## Responsive

20 combinaisons testees (360, 375, 390, 768, 1440, 1920 px sur accueil, money page, outil, Geneve) :
aucun debordement horizontal, un seul H1 par page, CTA visible a toutes les largeurs.
