# Validation du tracking (26/09/2026)

## Evenements attendus et etat reel

| Evenement | Emis par | Recu en base | Preuve |
|---|---|---|---|
| seo_page_view | /js/mesure.js | oui | marketing_events, page_path renseigne |
| cta_trial_click | /js/mesure.js | oui | test controle du 26/09 |
| cta_demo_click | /js/mesure.js | oui | test controle du 26/09 (landing /crm-courtier-assurance) |
| ark_demo_view | /js/mesure.js | oui | test controle du 26/09 |
| pricing_view | /js/mesure.js | oui | 2 evenements |
| demo_form_view | /js/formulaire-demo.js | oui | 5 evenements |
| demo_form_submit | /js/formulaire-demo.js | oui | 2 evenements |
| demo_request_success | /api/leads/demo-request | oui | 1 evenement, lead cree |
| demo_request_failure | /api/leads/demo-request | oui | 1 evenement |
| tool_start | JS des outils | oui | test du 26/09 (checklist renouvellement) |
| tool_complete | JS des outils | oui | test du 26/09 (calculateur de transformation) |
| tool_cta_click | /js/mesure.js (pages /outils/) | ajoute dans cette phase, verifie apres deploiement | voir 11_final_production.md |

## Champs d'attribution

Chaque evenement porte : source, page_path, et dans `payload` : medium, campagne, contenu, landing,
referrer, langue, landing_page, timestamp. Les evenements d'outil ajoutent `tool_slug` et `cta_target`.

## Evenements de test

Les visites de controle utilisent des campagnes explicites (`test_ark_p3`, `test_ark_outils`,
`gsc_t0`). Les evenements correspondants restent en base avec ces prefixes : ils ne sont pas
supprimes (le mecanisme ne permet pas une suppression ciblee sans risque) et sont donc identifies
comme tests par leur campagne.

## Ce qui n'est pas mesure

- Les sessions organiques reelles par pays : Search Console donne impressions et clics par pays,
  pas les sessions avec attribution cote site. Aucune valeur n'est inventee.
- La conversion business par pays : aucun lead reel a ce jour, donc aucun taux calculable.
