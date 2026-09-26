# COURTIARK — Tableau de bord acquisition / conversion / SEO

Généré le 2026-09-26 11:27 UTC par `seo/dashboard.py` (lecture seule, base de production).

## Acquisition

| Indicateur | Valeur | Source |
|---|---|---|
| Événements de visite (site_visit) | 172 | marketing_events |
| Pages publiques vues (seo_page_view) | 23 | marketing_events |
| Demandes de démo (toutes) | 3 | demo_requests |
| Demandes de démo réelles (hors adresses de test) | 0 | demo_requests |
| Demandes de démo sur 30 jours | 0 | demo_requests |
| Cabinets enregistrés | 14 | cabinets |
| Abonnements en essai | 0 | subscriptions |
| Abonnements payants actifs | 0 | subscriptions |

## Conversion (entonnoir)

| Étape | Volume | Taux |
|---|---|---|
| Visite → clic CTA | 1 clics pour 195 visites | 0,5 % |
| Affichage du formulaire → envoi | 2 envois pour 5 affichages | 40,0 % |
| Envoi → demande enregistrée | 1 pour 2 envois | 50,0 % |
| Demande → essai créé | 0 essais pour 0 demandes réelles | non calculable |
| Essai → abonnement payant | 0 payants pour 0 essais | non calculable |

Détail des événements mesurés : site_visit 172, seo_page_view 23, demo_chapter_view 22, demo_started 12, demo_form_view 5, demo_take_control 3, demo_form_submit 2, pricing_view 2, cta_trial_click 1, demo_request_failure 1, demo_request_success 1.

## Conversion par page d’atterrissage

| Page d’atterrissage | Vues | Clics CTA | Formulaire | Demandes |
|---|---|---|---|---|
| `/` | 22 | 0 | 0 | 0 |
| `/login` | 13 | 0 | 0 | 0 |
| `/parametres?section=securite` | 13 | 0 | 0 | 0 |
| `/dashboard` | 11 | 0 | 0 | 0 |
| `/clients` | 10 | 0 | 0 | 0 |
| `/clients/208` | 9 | 0 | 0 | 0 |
| `/demo/dashboard` | 6 | 0 | 0 | 0 |
| `/morning-brief` | 5 | 0 | 0 | 0 |
| `/register` | 4 | 0 | 0 | 0 |
| `/demo-public` | 4 | 0 | 5 | 1 |
| `/equipe` | 3 | 0 | 0 | 0 |
| `/abonnement` | 3 | 0 | 0 | 0 |
| `/import` | 3 | 0 | 0 | 0 |
| `/documents` | 3 | 0 | 0 | 0 |
| `/contrats` | 3 | 0 | 0 | 0 |
| `/parametres` | 3 | 0 | 0 | 0 |
| `/clients/new` | 3 | 0 | 0 | 0 |
| `/france/paris` | 3 | 1 | 0 | 0 |
| `/tarifs` | 3 | 0 | 0 | 0 |
| `/onboarding` | 3 | 0 | 0 | 0 |
| `/conformite` | 3 | 0 | 0 | 0 |
| `/prospection` | 2 | 0 | 0 | 0 |
| `/sante-portefeuille` | 2 | 0 | 0 | 0 |
| `/outils/checklist-dossier-courtier-assurance` | 2 | 0 | 0 | 0 |
| `/outils/calculateur-taux-transformation-assurance` | 2 | 0 | 0 | 0 |

## Attribution

| Medium | Campagne | Visites |
|---|---|---|
| direct | aucune | 183 |
| test | mesure-ark | 7 |
| test | phase2 | 5 |

## SEO — impressions, clics, position

Non disponible : aucune propriété Search Console n’est accessible depuis ce serveur (ni jeton Google, ni session navigateur pilotable). Les impressions, clics, CTR et positions moyennes ne peuvent donc pas être mesurés ni affirmés. La mesure first-party ci-dessus (visites, clics CTA, formulaires, demandes) est la seule source exploitable aujourd’hui.

## Limites de lecture

- `site_visit` compte les visites mesurées par le script first-party, pas les sessions côté Google.
- Un même visiteur peut produire plusieurs événements : ce sont des volumes, pas des personnes.
- Les adresses de test (`@example.invalid`) sont exclues du décompte des demandes réelles.
- Aucune donnée personnelle (nom, e-mail, téléphone) ne figure dans ce rapport.