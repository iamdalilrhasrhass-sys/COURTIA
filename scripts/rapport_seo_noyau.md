# Noyau SEO — 10 pages ville prioritaires : mesure AVANT / APRÈS

Mesure produite par `scripts/ameliorer_pages_ville.py` (lancer `--snapshot-avant` avant modification, puis le script complet).

- Pages `/fr/**` dans le silo : **1100**
- Pages `/fr/**` avant intervention : **1100** (aucune page supprimée)
- Page ville de contrôle, non retouchée : `/fr/logiciel-courtier-assurance-agen`

## 1. Liens entrants par page (maillage)

| Page | Liens entrants AVANT | Liens entrants APRÈS | Taille AVANT | Taille APRÈS |
|---|---:|---:|---:|---:|
| `/fr/logiciel-courtier-assurance-paris` | 1 | 7 | 6269 | 14528 |
| `/fr/logiciel-courtier-assurance-lyon` | 1 | 7 | 6253 | 13687 |
| `/fr/logiciel-courtier-assurance-marseille` | 1 | 7 | 6337 | 13540 |
| `/fr/logiciel-courtier-assurance-bordeaux` | 1 | 7 | 6423 | 13365 |
| `/fr/logiciel-courtier-assurance-toulouse` | 1 | 7 | 6393 | 13193 |
| `/fr/logiciel-courtier-assurance-nantes` | 1 | 7 | 6244 | 13316 |
| `/fr/logiciel-courtier-assurance-lille` | 1 | 7 | 6241 | 13258 |
| `/fr/logiciel-courtier-assurance-strasbourg` | 1 | 7 | 6437 | 13119 |
| `/fr/logiciel-courtier-assurance-montpellier` | 1 | 7 | 6456 | 13077 |
| `/fr/logiciel-courtier-assurance-nice` | 1 | 7 | 6259 | 13245 |
| `/fr/logiciel-courtier-assurance` | 180 | 180 | 18666 | 21029 |
| `/fr/logiciel-courtier-iard` | 180 | 190 | 19572 | 21935 |
| `/fr/logiciel-courtier-emprunteur` | 180 | 190 | 20943 | 23306 |
| `/fr/logiciel-courtier-sante` | 180 | 190 | 17690 | 20053 |
| `/fr/logiciel-courtier-prevoyance` | 180 | 190 | 20558 | 22921 |
| `/fr/logiciel-courtier-mutuelle` | 180 | 190 | 18295 | 20658 |
| `/fr/alternative-courtigo` | 1 | 11 | 6407 | 6407 |
| `/fr/alternative-lya` | 1 | 11 | 6300 | 6300 |
| `/fr/alternative-kase` | 1 | 11 | 6253 | 6253 |
| `/fr/alternative-oggo-data` | 1 | 11 | 6214 | 6214 |
| `/fr/guide/dda-15h` | 1 | 11 | 6107 | 6107 |
| `/fr/guide/devoir-de-conseil` | 1 | 11 | 5864 | 5864 |
| `/fr/guide/verification-orias` | 1 | 11 | 5894 | 5894 |
| `/fr/guide/audit-acpr` | 1 | 11 | 5871 | 5871 |
| `/fr/guide/conformite-2026` | 1 | 11 | 5868 | 5868 |
| `/fr/guide/ipid` | 1 | 11 | 5969 | 5969 |
| `/fr/guide/lcb-ft` | 1 | 11 | 5873 | 5873 |
| `/fr/guide/rgpd-courtier` | 1 | 11 | 5984 | 5984 |
| `/fr/guide/sanctions-acpr` | 1 | 11 | 5934 | 5934 |
| `/fr/guide/reforme-courtage` | 1 | 11 | 6079 | 6079 |
| `/fr` | 0 | 10 | 11439 | 13167 |
| `/fr/logiciel-courtier-assurance-agen` | 1 | 1 | 6230 | 6230 |

Le hub `/fr/logiciel-courtier-assurance` garde le même nombre de pages entrantes : les 10 pages prioritaires le citaient déjà dans leur fil d'Ariane. Ce sont leur contenu, leurs ancres et leurs liens sortants qui ont changé. La page de contrôle `/fr/logiciel-courtier-assurance-agen` n'a volontairement pas été modifiée (taille et liens entrants identiques).

## 2. Unicité du contenu

Similarité = Jaccard sur les n-grammes de 8 mots. « Part du texte » = part des n-grammes d'une page qui se retrouvent dans au moins une autre page du lot des 10. « Corps » = texte de l'`<article id="corps">` (le contenu éditorial propre à la ville, hors en-tête, liens et pied de page).

| Mesure (10 pages) | AVANT | APRÈS |
|---|---:|---:|
| Similarité médiane entre pages (texte complet) | 0.4148 | 0.1844 |
| Similarité maximale entre pages (texte complet) | 0.6789 | 0.2041 |
| Part de texte partagée, médiane (texte complet) | 0.7998 | 0.3352 |
| Similarité médiane entre pages (corps éditorial) | 0.0 | 0.0015 |
| Similarité maximale entre pages (corps éditorial) | 0.0 | 0.0314 |
| Part de texte partagée, médiane (corps éditorial) | 0.0 | 0.0216 |

### Comparaison avec `/fr/logiciel-courtier-assurance-agen` (page ville NON retouchée)

| Page retravaillée | Similarité AVANT vs contrôle | Similarité APRÈS vs contrôle |
|---|---:|---:|
| `/fr/logiciel-courtier-assurance-paris` | 0.4858 | 0.0 |
| `/fr/logiciel-courtier-assurance-lyon` | 0.4866 | 0.0 |
| `/fr/logiciel-courtier-assurance-marseille` | 0.383 | 0.0 |
| `/fr/logiciel-courtier-assurance-bordeaux` | 0.3855 | 0.0 |
| `/fr/logiciel-courtier-assurance-toulouse` | 0.6386 | 0.0026 |
| `/fr/logiciel-courtier-assurance-nantes` | 0.2621 | 0.0 |
| `/fr/logiciel-courtier-assurance-lille` | 0.3836 | 0.0 |
| `/fr/logiciel-courtier-assurance-strasbourg` | 0.4875 | 0.0 |
| `/fr/logiciel-courtier-assurance-montpellier` | 0.6386 | 0.0 |
| `/fr/logiciel-courtier-assurance-nice` | 0.4858 | 0.0 |

### Part de texte propre à chaque page APRÈS (corps éditorial)

| Page | N-grammes du corps | Part du corps retrouvée ailleurs dans le lot |
|---|---:|---:|
| `/fr/logiciel-courtier-assurance-paris` | 490 | 0.0061 |
| `/fr/logiciel-courtier-assurance-lyon` | 394 | 0.0381 |
| `/fr/logiciel-courtier-assurance-marseille` | 352 | 0.0653 |
| `/fr/logiciel-courtier-assurance-bordeaux` | 343 | 0.0087 |
| `/fr/logiciel-courtier-assurance-toulouse` | 339 | 0.0206 |
| `/fr/logiciel-courtier-assurance-nantes` | 344 | 0.0349 |
| `/fr/logiciel-courtier-assurance-lille` | 342 | 0.0205 |
| `/fr/logiciel-courtier-assurance-strasbourg` | 306 | 0.0033 |
| `/fr/logiciel-courtier-assurance-montpellier` | 311 | 0.0225 |
| `/fr/logiciel-courtier-assurance-nice` | 338 | 0.0651 |

## 3. Éléments techniques et commerciaux par page

| Page | H1 | Canonical self | JSON-LD | CTA /demo-public | Lien /tarifs | Mots |
|---|---|---|---|---|---|---:|
| `/fr/logiciel-courtier-assurance-paris` | 1 — Logiciel et CRM pour courtier d'assurance à Paris | oui | Organization, BreadcrumbList, SoftwareApplication, FAQPage | oui | oui | 896 |
| `/fr/logiciel-courtier-assurance-lyon` | 1 — Logiciel et CRM pour courtier d'assurance à Lyon | oui | Organization, BreadcrumbList, SoftwareApplication, FAQPage | oui | oui | 796 |
| `/fr/logiciel-courtier-assurance-marseille` | 1 — Logiciel et CRM pour courtier d'assurance à Marseille | oui | Organization, BreadcrumbList, SoftwareApplication, FAQPage | oui | oui | 751 |
| `/fr/logiciel-courtier-assurance-bordeaux` | 1 — Logiciel et CRM pour courtier d'assurance à Bordeaux | oui | Organization, BreadcrumbList, SoftwareApplication, FAQPage | oui | oui | 733 |
| `/fr/logiciel-courtier-assurance-toulouse` | 1 — Logiciel et CRM pour courtier d'assurance à Toulouse | oui | Organization, BreadcrumbList, SoftwareApplication, FAQPage | oui | oui | 712 |
| `/fr/logiciel-courtier-assurance-nantes` | 1 — Logiciel et CRM pour courtier d'assurance à Nantes | oui | Organization, BreadcrumbList, SoftwareApplication, FAQPage | oui | oui | 734 |
| `/fr/logiciel-courtier-assurance-lille` | 1 — Logiciel et CRM pour courtier d'assurance à Lille | oui | Organization, BreadcrumbList, SoftwareApplication, FAQPage | oui | oui | 728 |
| `/fr/logiciel-courtier-assurance-strasbourg` | 1 — Logiciel et CRM pour courtier d'assurance à Strasbourg | oui | Organization, BreadcrumbList, SoftwareApplication, FAQPage | oui | oui | 689 |
| `/fr/logiciel-courtier-assurance-montpellier` | 1 — Logiciel et CRM pour courtier d'assurance à Montpellier | oui | Organization, BreadcrumbList, SoftwareApplication, FAQPage | oui | oui | 689 |
| `/fr/logiciel-courtier-assurance-nice` | 1 — Logiciel et CRM pour courtier d'assurance à Nice | oui | Organization, BreadcrumbList, SoftwareApplication, FAQPage | oui | oui | 720 |

## 4. Sitemap

- `/fr/logiciel-courtier-assurance-paris` : présent
- `/fr/logiciel-courtier-assurance-lyon` : présent
- `/fr/logiciel-courtier-assurance-marseille` : présent
- `/fr/logiciel-courtier-assurance-bordeaux` : présent
- `/fr/logiciel-courtier-assurance-toulouse` : présent
- `/fr/logiciel-courtier-assurance-nantes` : présent
- `/fr/logiciel-courtier-assurance-lille` : présent
- `/fr/logiciel-courtier-assurance-strasbourg` : présent
- `/fr/logiciel-courtier-assurance-montpellier` : présent
- `/fr/logiciel-courtier-assurance-nice` : présent

## 5. Requêtes auparavant absentes du silo

Trois expressions signalées comme totalement absentes de l'audit SEO sont désormais présentes sur les 10 pages (comptage direct dans le HTML) :

| Expression | Pages où elle apparaît (sur 10) |
|---|---:|
| « automatisation courtier assurance » | 10 |
| « CRM courtier assurance » | 10 |
| « logiciel gestion courtage » | 10 |

## 6. Ce qui n'a pas été touché

- Les 1090 autres pages `/fr/**` (dont les 1 064 pages ville non prioritaires) n'ont pas été modifiées.
- Aucune page supprimée, aucune URL renommée, aucun redirection ajoutée.
- Aucune donnée inventée : ni avis, ni nombre de clients, ni chiffre d'activité, ni garantie de conformité. Les références régionales sont des généralités économiques documentées (filière viticole et siège du conseil régional à Bordeaux, port à Marseille, filière aéronautique à Toulouse, institutions européennes et zone frontalière à Strasbourg, position frontalière à Lille, campus santé à Montpellier, siège de l'ORIAS et de l'ACPR à Paris).
- Le style et les balises existantes des hubs ont été conservés ; les ajouts sont délimités par les commentaires `seo-noyau:*` et donc réversibles.

