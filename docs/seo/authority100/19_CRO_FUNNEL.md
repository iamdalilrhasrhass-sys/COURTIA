# Funnel de conversion mesure (26/09/2026)

| Etape | Evenement | Compte en base |
|---|---|---|
| site_visit | 208 |
| seo_page_view | 73 |
| demo_chapter_view | 51 |
| demo_started | 37 |
| demo_form_view | 6 |
| demo_take_control | 6 |
| tool_start | 5 |
| tool_complete | 5 |
| demo_page_view | 4 |
| demo_form_submit | 3 |
| demo_form_start | 2 |
| demo_request_success | 2 |
| pricing_view | 2 |
| cta_demo_interactive_click | 1 |
| demo_cta_click | 1 |
| cta_trial_click | 1 |
| cta_demo_click | 1 |
| ark_demo_view | 1 |
| tool_cta_click | 1 |
| demo_request_failure | 1 |

## Lecture

- Les comptes incluent les visites de recette (identifiables par leur campagne) : le nombre de demandes
  de demonstration reelles est **0**, le reste etant des tests explicitement marques `is_test`.
- Le tunnel complet a ete verifie de bout en bout en production avec un meme identifiant de visite :
  page money -> CTA demonstration interactive -> page de demonstration -> debut de saisie -> envoi ->
  succes, puis demande enregistree avec premier et dernier contact.
- Cause racine corrigee cette phase : la demonstration interactive renvoyait au mur de connexion des le
  premier clic (navigation vers les routes reelles au lieu des routes `/demo`).

## Ce qui n'est pas mesurable aujourd'hui

- Le trafic organique par page : aucun outil d'analyse d'audience n'est installe cote site ; Search
  Console fournit les clics et impressions, pas les sessions avec attribution.
- Le passage essai -> client : le paiement en ligne n'est pas configure, la conversion se fait par
  contact direct, sans instrumentation.
