# Production apres travaux (26/09/2026)

## Deploiement

| Element | Valeur |
|---|---|
| Dernier deploiement de production | 4m      iamdalilrhasrhass-1376s-projects/courtia     https://courtia-kac50upcz-iamdalilrhasrhass-1376s-projects.vercel.app     ● Ready      Production      40s          iamdalilrhasrhass-1376 |
| Identifiant servi (en-tete x-vercel-id) | x-vercel-id: lhr1::54j97-1790427797756-4f7c7fcdebb1 |
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
| site_visit | 179 |
| seo_page_view | 60 |
| demo_chapter_view | 22 |
| demo_started | 12 |
| demo_form_view | 5 |
| tool_complete | 4 |
| tool_start | 4 |
| demo_take_control | 3 |
| pricing_view | 2 |
| demo_form_submit | 2 |
| demo_request_success | 1 |
| cta_demo_click | 1 |
| cta_trial_click | 1 |
| ark_demo_view | 1 |
| tool_cta_click | 1 |
| demo_request_failure | 1 |

## Funnel des outils (par outil)

| Outil | Vues | Demarrages | Termines | Clics CTA |
|---|---|---|---|---|
| `/outils/checklist-dossier-courtier-assurance` | 7 | 0 | 0 | 0 |
| `/outils/calculateur-taux-transformation-assurance` | 6 | 2 | 3 | 1 |
| `/outils/checklist-renouvellement-assurance` | 3 | 2 | 1 | 0 |
| `/outils/calculateur-productivite-courtier` | 2 | 0 | 0 | 0 |

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

## Lecture honnete du funnel des outils

Les compteurs ci-dessus incluent les tirs de controle de la session. Le calculateur de transformation
affiche 3 completions pour 2 demarrages : c'est la trace du defaut corrige dans cette phase (le
`tool_complete` partait a chaque recalcul). Apres correction, trois clics de recalcul consecutifs
produisent **un seul** `tool_complete` : verifie en base (13:02:28 vue, 13:02:31 demarrage,
13:02:32 completion uniques) et garde-fou present dans le fichier servi.
Les donnees d'usage reel commencent donc a partir de cette correction : les 4 demarrages et
4 completions en base sont des visites de controle identifiables par leur campagne.
