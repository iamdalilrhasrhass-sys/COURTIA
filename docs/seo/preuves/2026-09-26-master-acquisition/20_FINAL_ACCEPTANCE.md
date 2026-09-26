# Recette finale — master acquisition (26/09/2026)

## A — Technique

| Controle | Mesure | Verdict |
|---|---|---|
| Gate local | 85 pages, 0 erreur, 0 duplication | PASS |
| Gate production | 85 URL, 0 echec | PASS |
| Redirections | 178 testees, 178 conformes, 0 chaine, 0 destination morte | PASS |
| Sitemaps | 10 fichiers, 85 URL, XML valide | PASS |
| Canonical auto-referente | 85/85 | PASS |
| H1 unique | 85/85 | PASS |
| JSON-LD valide | 85/85, aucun avis ni prix fictif | PASS |
| Titles / descriptions en doublon | 0 | PASS |
| Routes privees | `noindex, follow` + redirection vers `/login` | PASS |
| Erreurs console sur pages SEO | aucune observee | PASS |

## B — SEO / indexation

| Controle | Mesure | Verdict |
|---|---|---|
| 21 URL `INVESTIGATE` | 21/21 decidees et implementees (5 restaurees, 16 redirigees) | PASS |
| Pages publiques | 85 (80 avant) | PASS |
| Requetes classees | 17 (3 marque, 4 logicielles, 8 locales, 2 hors sujet) | PASS |
| Priorites P1 | definies dans `05_KEYWORD_PRIORITY.csv` | PASS |
| Watchlist T0 | `15_GSC_WATCHLIST.csv` (requetes + pages) | PASS |
| Indexation Google | **PENDING_GOOGLE** (aucune reindexation forcee) | — |
| Propriete Domaine Search Console | non creee (secondaire, DNS non touche) | — |

## C — Preuve produit

| Controle | Mesure | Verdict |
|---|---|---|
| Captures reelles | 7 (minimum demande : 4) | PASS |
| Donnees clients reelles dans les captures | aucune (environnement de demonstration, cabinet fictif) | PASS |
| Optimisation | WebP, 36 a 64 Ko, dimensions declarees | PASS |
| Integration | accueil + money page | PASS |
| Performance apres integration | 100/100/100/100, LCP 0,9 a 1,1 s | PASS |

## D — CRO

| Controle | Mesure | Verdict |
|---|---|---|
| CTA principal | « Voir COURTIARK en action » -> demonstration interactive | PASS |
| CTA secondaire | « Demander une demonstration » | PASS |
| Demonstration interactive publique | utilisable (defaut de navigation corrige) | PASS |
| Formulaire | valide, erreurs explicites, message de succes conforme | PASS |
| Mobile 390 px | 0 debordement, CTA visible, outil utilisable | PASS |
| Marque affichee | COURTIARK partout (261 chaines corrigees) | PASS |

## E — Analytics

| Controle | Mesure | Verdict |
|---|---|---|
| Evenements recus | 20 distincts en base | PASS |
| `tool_start` / `tool_complete` / `tool_cta_click` | oui, verifies | PASS |
| `cta_demo_interactive_click` | oui, avec position, libelle et cible | PASS |
| `demo_page_view`, `demo_form_start` | oui | PASS |
| Attribution | `session_id` + premier et dernier contact stockes sur la demande | PASS |
| Demandes de test exclues | `is_test = true`, dashboard filtre | PASS |

## F — Autorite

| Controle | Mesure | Verdict |
|---|---|---|
| Top 5 avec contact reel et e-mail source | 5/5 | READY |
| Messages et relances personnalises | 5/5 (voir `docs/seo/OUTREACH_DRAFTS.md`) | READY |
| Liens obtenus et verifies | **0** | PENDING_EXTERNAL |
| Envoi | non effectue (aucune autorisation active) | READY_FOR_SEND |

## G — Business

| Indicateur | Valeur reelle |
|---|---|
| Leads organiques reels | **0** |
| Demandes de demonstration (reelles) | **0** (3 demandes en base, toutes marquees de test) |
| Essais crees via le SEO | 0 |
| Essais actives | 0 |
| Clients | 0 |
| MRR SEO | non calculable (paiement non configure) |
| Backlinks live | 0 |

## H — En attente externe

- Google : indexation des 85 pages, lecture de `features-v2.xml`, retrait progressif des 1 065 pages locales, evolution des positions. Statut **PENDING_GOOGLE**.
- Prospects backlinks : reponses attendues apres envoi (non envoye). Statut **PENDING_EXTERNAL**.
- Paiement en ligne : cle de prestataire a fournir cote serveur (action humaine). Sans elle, aucun essai ne peut se convertir en client en libre-service.
