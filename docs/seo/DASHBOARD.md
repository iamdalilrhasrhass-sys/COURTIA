# COURTIARK — Tableau de bord acquisition / conversion / SEO

Généré le 2026-09-26 12:18 UTC par `seo/dashboard.py` (lecture seule, base de production).

## Acquisition

| Indicateur | Valeur | Source |
|---|---|---|
| Événements de visite (site_visit) | 179 | marketing_events |
| Pages publiques vues (seo_page_view) | 28 | marketing_events |
| Demandes de démo (toutes) | 3 | demo_requests |
| Demandes de démo réelles (hors adresses de test) | 0 | demo_requests |
| Demandes de démo sur 30 jours | 0 | demo_requests |
| Cabinets enregistrés | 14 | cabinets |
| Abonnements en essai | 0 | subscriptions |
| Abonnements payants actifs | 0 | subscriptions |

## Conversion (entonnoir)

| Étape | Volume | Taux |
|---|---|---|
| Visite → clic CTA | 2 clics pour 207 visites | 1,0 % |
| Affichage du formulaire → envoi | 2 envois pour 5 affichages | 40,0 % |
| Envoi → demande enregistrée | 1 pour 2 envois | 50,0 % |
| Demande → essai créé | 0 essais pour 0 demandes réelles | non calculable |
| Essai → abonnement payant | 0 payants pour 0 essais | non calculable |

Détail des événements mesurés : site_visit 179, seo_page_view 28, demo_chapter_view 22, demo_started 12, demo_form_view 5, demo_take_control 3, demo_form_submit 2, pricing_view 2, ark_demo_view 1, demo_request_success 1, cta_trial_click 1, cta_demo_click 1, demo_request_failure 1.

## Conversion par page d’atterrissage

| Page d’atterrissage | Vues | Clics CTA | Formulaire | Demandes |
|---|---|---|---|---|
| `/` | 22 | 0 | 0 | 0 |
| `/login` | 13 | 0 | 0 | 0 |
| `/parametres?section=securite` | 13 | 0 | 0 | 0 |
| `/dashboard` | 11 | 0 | 0 | 0 |
| `/clients` | 10 | 0 | 0 | 0 |
| `/clients/208` | 9 | 0 | 0 | 0 |
| `/crm-courtier-assurancehttps:/courtiark.fr/crm-courtier-assurance` | 7 | 0 | 0 | 0 |
| `/demo/dashboard` | 6 | 0 | 0 | 0 |
| `/morning-brief` | 5 | 0 | 0 | 0 |
| `/register` | 4 | 0 | 0 | 0 |
| `/demo-public` | 4 | 0 | 5 | 1 |
| `/tarifs` | 4 | 0 | 0 | 0 |
| `/equipe` | 3 | 0 | 0 | 0 |
| `/import` | 3 | 0 | 0 | 0 |
| `/abonnement` | 3 | 0 | 0 | 0 |
| `/clients/new` | 3 | 0 | 0 | 0 |
| `/documents` | 3 | 0 | 0 | 0 |
| `/contrats` | 3 | 0 | 0 | 0 |
| `/parametres` | 3 | 0 | 0 | 0 |
| `/france/paris` | 3 | 1 | 0 | 0 |
| `/onboarding` | 3 | 0 | 0 | 0 |
| `/conformite` | 3 | 0 | 0 | 0 |
| `/prospection` | 2 | 0 | 0 | 0 |
| `/sante-portefeuille` | 2 | 0 | 0 | 0 |
| `/outils/checklist-dossier-courtier-assurance` | 2 | 0 | 0 | 0 |

## Attribution

| Medium | Campagne | Visites |
|---|---|---|
| direct | aucune | 192 |
| test | mesure-ark | 7 |
| test | phase2 | 5 |
| verification | gsc_t0 | 3 |

## 1. SEARCH — Search Console (2026-09-26)

Propriété `https://courtiark.fr/` (prefixe d'URL), compte iamdalilrhasrhass@gmail.com, fenêtre 25/06/2026 au 24/09/2026.

| Indicateur | Valeur |
|---|---|
| Impressions | 382 |
| Clics | 15 |
| CTR moyen | 3,9 % |
| Position moyenne | 12.3 |
| Requêtes distinctes | 17 |
| Pages distinctes | 67 |
| Pays distincts | 58 |

Pays (top) : Suisse 9 clics / 36 impressions · France 5 clics / 129 impressions · Canada 1 clics / 8 impressions · Etats-Unis 0 clics / 42 impressions

Appareils : Ordinateur 10 clics / 186 impressions · Mobile 5 clics / 192 impressions · Tablette 0 clics / 4 impressions

Sitemaps : /sitemap.xml (26/09/2026, index de 10 sitemaps de section, 80 URL)

## 2. INDEXATION

| Indicateur | Valeur |
|---|---|
| Pages publiées (architecture actuelle) | 80 |
| URL dans l’index Google (domaine entier, ancien plan inclus) | 1100 |
| URL non indexées | 40 |
| Mise à jour du rapport | 21/09/2026 |

| Motif de non-indexation | Pages |
|---|---|
| Detectee, actuellement non indexee | 27 |
| Autre page avec balise canonique correcte | 7 |
| Exploree, actuellement non indexee | 3 |
| Soft 404 | 2 |
| Exclue par la balise noindex | 1 |

Traitement : 7 redirections permanentes ajoutées le 26/09/2026 (commit `c21701b7`), sitemap en 10 sections envoyé, 9 demandes d’indexation déposées sur les URL stratégiques.

## 3. CONVERSION (mesure first-party, base de production)

| Étape | Volume | Taux |
|---|---|---|
| Visites mesurées | 207 | — |
| Clics CTA | 2 | 1,0 % |
| Affichages du formulaire | 5 | — |
| Envois du formulaire | 2 | 40,0 % |
| Demandes enregistrées | 1 | — |
| Demandes réelles (hors adresses de test) | 0 | — |
| Essais en cours | 0 | — |
| Abonnements payants actifs | 0 | — |

Détail des événements mesurés : site_visit 179, seo_page_view 28, demo_chapter_view 22, demo_started 12, demo_form_view 5, demo_take_control 3, demo_form_submit 2, pricing_view 2, ark_demo_view 1, demo_request_success 1, cta_trial_click 1, cta_demo_click 1, demo_request_failure 1.

## 4. BUSINESS

| Indicateur | Valeur | Source |
|---|---|---|
| Cabinets enregistrés | 14 | cabinets |
| Essais en cours | 0 | subscriptions |
| Abonnements payants | 0 | subscriptions |
| Revenu récurrent (MRR) | non disponible : aucun abonnement payant enregistré | subscriptions |
| Clients issus du SEO | non disponible : aucun lead réel issu du SEO à ce jour | demo_requests |

## 5. Conversion par page d’atterrissage

| Page d’atterrissage | Vues | Clics CTA | Formulaire | Demandes |
|---|---|---|---|---|
| `/` | 22 | 0 | 0 | 0 |
| `/login` | 13 | 0 | 0 | 0 |
| `/parametres?section=securite` | 13 | 0 | 0 | 0 |
| `/dashboard` | 11 | 0 | 0 | 0 |
| `/clients` | 10 | 0 | 0 | 0 |
| `/clients/208` | 9 | 0 | 0 | 0 |
| `/crm-courtier-assurancehttps:/courtiark.fr/crm-courtier-assurance` | 7 | 0 | 0 | 0 |
| `/demo/dashboard` | 6 | 0 | 0 | 0 |
| `/morning-brief` | 5 | 0 | 0 | 0 |
| `/register` | 4 | 0 | 0 | 0 |
| `/demo-public` | 4 | 0 | 5 | 1 |
| `/tarifs` | 4 | 0 | 0 | 0 |
| `/equipe` | 3 | 0 | 0 | 0 |
| `/import` | 3 | 0 | 0 | 0 |
| `/abonnement` | 3 | 0 | 0 | 0 |
| `/clients/new` | 3 | 0 | 0 | 0 |
| `/documents` | 3 | 0 | 0 | 0 |
| `/contrats` | 3 | 0 | 0 | 0 |
| `/parametres` | 3 | 0 | 0 | 0 |
| `/france/paris` | 3 | 1 | 0 | 0 |
| `/onboarding` | 3 | 0 | 0 | 0 |
| `/conformite` | 3 | 0 | 0 | 0 |
| `/prospection` | 2 | 0 | 0 | 0 |
| `/sante-portefeuille` | 2 | 0 | 0 | 0 |
| `/outils/checklist-dossier-courtier-assurance` | 2 | 0 | 0 | 0 |

## 6. KPI par requête (Search Console) et groupe d’action

| Requête | Clics | Impressions | CTR | Position | Groupe |
|---|---|---|---|---|---|
| courtia | 8 | 250 | 3,2 % | 5.6 | B — viser le top 3 |
| logiciel pour courtier en assurance | 0 | 1 | 0 % | 13.0 | C — viser le top 10 |
| courtier mulhouse | 0 | 1 | 0 % | 22.0 | D — à analyser |
| logiciel pour courtier | 0 | 1 | 0 % | 26.0 | D — à analyser |
| wintimenow | 0 | 1 | 0 % | 30.0 | D — à analyser |
| logiciel courtier en assurance | 0 | 1 | 0 % | 32.0 | D — à analyser |
| courtier lannion | 0 | 1 | 0 % | 40.0 | D — à analyser |
| entre descartes underwriting et swiss re corpora | 0 | 5 | 0 % | 48.6 | D — à analyser |
| courtier cahors | 0 | 2 | 0 % | 49.5 | D — à analyser |
| courtisia | 0 | 1 | 0 % | 53.0 | D — à analyser |
| courtier haguenau | 0 | 1 | 0 % | 57.0 | D — à analyser |
| courtier assurance lausanne | 0 | 9 | 0 % | 58.2 | D — à analyser |
| courtier libourne | 0 | 1 | 0 % | 59.0 | D — à analyser |
| logiciel courtier iard | 0 | 10 | 0 % | 59.3 | D — à analyser |
| courtier geneve | 0 | 1 | 0 % | 76.0 | D — à analyser |
| courtpilot | 0 | 1 | 0 % | 82.0 | D — à analyser |
| cortia | 0 | 3 | 0 % | 82.7 | D — à analyser |

## Attribution

| Medium | Campagne | Visites |
|---|---|---|
| direct | aucune | 192 |
| test | mesure-ark | 7 |
| test | phase2 | 5 |
| verification | gsc_t0 | 3 |

## Limites de lecture

- `site_visit` compte les visites mesurées par le script first-party, pas les sessions côté Google.
- Un même visiteur peut produire plusieurs événements : ce sont des volumes, pas des personnes.
- Les adresses de test (`@example.invalid`) sont exclues du décompte des demandes réelles.
- Les données Search Console portent sur le domaine entier, ancien plan `/fr` et `/ch` inclus.
- Aucune donnée personnelle (nom, e-mail, téléphone) ne figure dans ce rapport.
