# Recette CRO — parcours de conversion

| Scenario | Appareil | Page | Action | Attendu | Mesure | Verdict |
|---|---|---|---|---|---|---|
| 1 | ordinateur | `/logiciel-courtier-assurance` | clic CTA principal | demonstration interactive | `/demo/dashboard` charge | PASS |
| 2 | mobile 390 px | `/outils/checklist-renouvellement-assurance` | cocher 16 points puis CTA | resultat puis CTA visible | « 16 / 16 points renseignes », CTA visible, 0 debordement | PASS |
| 3 | ordinateur | `/suisse/geneve` | lecture puis CTA | H1 logiciel + 6 CTA | H1 « Logiciel de courtage assurance a Geneve », 6 CTA | PASS |
| 4 | ordinateur | accueil | voir le produit | demonstration publique | CTA -> `/demo/dashboard`, capture cockpit presente | PASS |
| 5 | ordinateur | `/demo` | e-mail invalide | message clair, pas d'envoi | « Cette adresse e-mail ne semble pas valide. » | PASS |
| 6 | ordinateur | 164 URL heritees | suivi des redirections | 1 saut, destination 200 | 164/164 conformes, 0 chaine | PASS |
| 7 | ordinateur | `/dashboard` sans session | acces route privee | redirection + noindex | redirige vers `/login`, `noindex, follow` | PASS |
| 8 | ordinateur | `/sitemap.xml` | lire les enfants | 10 sitemaps valides | 10/10 en 200, XML valide, 85 URL | PASS |
| 9 | agent Googlebot | `/sitemaps/features-v2.xml` | recuperation | 200 `application/xml` | 200, XML valide | PASS |
| 10 | ordinateur | `/logiciel-courtier-assurance` | canonical | auto-referente | conforme | PASS |

## Etat du formulaire de demonstration

| Champ | Present | Obligatoire |
|---|---|---|
| Prenom | oui | oui |
| Nom | oui | oui |
| Cabinet | oui | oui |
| E-mail professionnel | oui | oui |
| Ville | oui | non |
| Taille d'equipe | oui | non |
| Telephone | oui | non |
| Message | oui | non |
| Consentement | oui | oui |

Libelle du bouton : « Demander une démonstration ». Message de succes : « Votre demande est bien
enregistree. L'equipe COURTIARK dispose maintenant des informations necessaires pour vous recontacter. »
(present aussi en cas d'echec serveur : repli par e-mail avec error traçable `demo_request_failure`).

## Ce qui reste ouvert

- Le paiement en libre-service n'est pas configure (cle de prestataire absente cote serveur) : le
  parcours s'arrete volontairement a la demande de demonstration, sans promettre un essai payant.
- Aucun rendez-vous automatise : la demande est enregistree et notifiee, la prise de contact est humaine.
