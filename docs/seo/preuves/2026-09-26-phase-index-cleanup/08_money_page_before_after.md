# Money page « logiciel pour courtier en assurance » — avant / apres

## Avant

| Element | Etat avant la phase |
|---|---|
| URL cible | aucune URL dediee : l'intention etait portee par `/logiciel-courtier-assurance` (page courte, orientee criteres de choix) |
| Position T0 | 13,0 (Search Console, 26/09/2026) sur la requete exacte |
| Title | « Logiciel courtier assurance : perimetre, modules et criteres de choix | COURTIARK » |
| H1 | « Logiciel courtier assurance : ce qu'il doit couvrir » |
| Comparatif | absent sur la page |
| FAQ orientee intention | 4 questions generiques |
| Liens internes entrants | 2 |
| Preuve produit | lien vers la demonstration publique |

## SERP observee le 26/09/2026 (recherche « logiciel pour courtier en assurance », France)

| Position | Domaine | Angle principal | Presence comparatif | FAQ | Outil gratuit | Preuve |
|---|---|---|---|---|---|---|
| 1 | lyaprotect.com | logiciel de courtage tout-en-un (CRM, conseil, vente) | non | oui | non | oui |
| 2 | assur3d.com | CRM courtier tout-en-un + conformite (LCB-FT, RGPD, DDA) | non | oui (4 questions) | non | oui |
| 3 | peritusformation.com | liste comparative de 6 CRM pour courtiers | oui | non | non | oui |
| 4 | modulr.fr | logiciel de courtage, CRM, GED | non | non | non | oui |
| 5 | orisha.com | guide editorial sur les fonctionnalites | non | non | non | non |
| 6 | appliedsystems.com | systeme de gestion enterprise | non | non | non | oui |
| 7 | custy.com | article sur l'investissement dans un logiciel | non | non | non | partiel |
| 8 | duplix.io | tarification et suppression de la ressaisie | non | non | non | oui |
| 9 | korint.io | criteres de choix | non | non | non | non |
| 10 | creatio.com | guide CRM assurance (angle international) | oui (8 solutions) | non | non | non |

Attentes de l'intention : perimetre fonctionnel explicite, vocabulaire metier (contrats, commissions,
renouvellements, conformite), reponse aux objections dans une FAQ, preuve du produit, essai ou demo.

## Apres (modifications de cette phase)

| Element | Etat apres | Preuve |
|---|---|---|
| URL cible unique | `/logiciel-courtier-assurance` (declaree dans `07_keyword_map.csv`) | fichier |
| Title | « Logiciel pour courtier en assurance | CRM IA COURTIARK » (54 caracteres) | page en production |
| Meta description | « COURTIARK centralise clients, contrats, documents, renouvellements et relances dans un CRM IA concu pour les courtiers en assurance, en France et en Suisse. » | page en production |
| H1 | « Le logiciel CRM concu pour les courtiers en assurance » (unique) | page en production |
| Sections H2 | 12 (perimetre, workflow prospect vers contrat, relances et renouvellements, documents, ARK, comparatif, profils, France/Suisse, produit, FAQ, a lire) | page en production |
| Comparatif | tableau Excel / CRM generaliste / COURTIARK, 10 besoins, formulations non absolues (« manuel », « configuration necessaire ») | page en production |
| FAQ | 6 questions d'intention, reponses courtes puis detail | page en production |
| Liens internes entrants | 18 pages lient la page money (ancres variees) | `seo/maillage.py` |
| JSON-LD | 4 blocs (Organization, SoftwareApplication, BreadcrumbList, FAQPage) | page en production |
| Canonical | auto-referente | page en production |

Aucune fonctionnalite inventee : chaque ligne du comparatif correspond a une capacite presente dans
l'application, et les mentions relatives aux concurrents sont limitees a des formulations generiques.
