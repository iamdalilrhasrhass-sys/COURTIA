#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Preuves de recette : 00, 07, 08, 09, 13, 17, 18, 19, 20."""
import io
import os

P = '/srv/courtia/docs/seo/preuves/2026-09-26-master-acquisition'


def ecrire(nom, contenu):
    io.open(os.path.join(P, nom), 'w', encoding='utf-8').write(contenu.strip() + '\n')
    print('  ecrit :', nom)


ecrire('00_EXECUTION_STATE.md', """
# Etat d'execution — master acquisition (26/09/2026)

## Non-regression avant travaux (mesuree)

| Controle | Attendu | Mesure du 26/09 | Verdict |
|---|---|---|---|
| Gate local | 85/85 (80 pages + 5 restaurees) | 85 pages, 0 en erreur, 0 paire trop proche | PASS |
| Sitemaps | 85 URL declarees | 10 sitemaps, 85 URL, 0 XML invalide | PASS |
| Redirections en production | toutes conformes | 164 testees, 164 conformes, 0 chaine | PASS |
| Gate production | 100 % des URL servies | 85 URL, 0 echec | PASS |
| Marque | COURTIARK partout | 261 chaines corrigees dans l'application, 0 affichage COURTIA isole | PASS |

## Etat de depart verifie

- 1 224 anciennes URL inventoriees ; **21/21 resolues** (5 pages restaurees, 16 redirections).
- 85 pages publiques indexables (contre 80 avant cette phase).
- Money page `/logiciel-courtier-assurance` en production, 6 captures produit reelles integrees.
- Demonstration interactive publique rendue **utilisable** (elle renvoyait au mur de connexion au premier clic).
- Attribution des demandes de demo : premier et dernier contact stockes sur la demande.

## Limites de cette phase, dites franchement

- Search Console : les donnees T0 ont ete relevees le 26/09 (meme jour) ; aucun nouvel export posterieur n'existe encore.
- Aucun lead organique reel : **0**.
- Aucun backlink obtenu : statut `READY_FOR_SEND` (aucune autorisation d'envoi).
- Paiement en ligne non configure (cle absente) : MRR non calculable.
""")

ecrire('07_MONEY_PAGE_ACCEPTANCE.md', """
# Money page « logiciel pour courtier en assurance » — recette

URL : `/logiciel-courtier-assurance` — requete cible : « logiciel pour courtier en assurance » (position T0 : 13,0).

| Element demande | Etat | Preuve |
|---|---|---|
| Title dedie | « Logiciel pour courtier en assurance | CRM IA COURTIARK » (54 caracteres) | page en production |
| Meta description dediee | oui, orientee metier | page en production |
| H1 unique | « Le logiciel CRM conçu pour les courtiers en assurance » | controle automatique : 0 H1 absent/multiple sur 85 pages |
| Chapeau hero | portefeuille, clients, contrats, documents, relances, renouvellements | page en production |
| CTA principal | « Voir COURTIARK en action » -> `/demo/dashboard` | lien verifie en production |
| CTA secondaire | « Demander une démonstration » -> `/demo` | idem |
| Preuve sous hero | micro-ligne France et Suisse | page en production |
| Section cockpit | capture produit reelle | `courtiark-cockpit.webp` |
| Section pipeline | capture + workflow prospect -> contrat | `courtiark-pipeline.webp` |
| Section relances | capture + liens vers la page relances | `courtiark-relances.webp` |
| Section renouvellements | section distincte + capture | `courtiark-contrats.webp` |
| Section documents | capture + liens | `courtiark-documents.webp` |
| Section ARK | capture du brief + tableau fait / ne fait pas | `courtiark-ark-brief.webp` |
| Comparatif | Excel / CRM generaliste / COURTIARK, 10 besoins | tableau, formulations non absolues |
| Personas | 4 cartes (independant, cabinet, equipe, reseau) | page en production |
| France / Suisse | liens vers les deux hubs, pas de revendication de certification | page en production |
| Confiance | liens securite, confidentialite, mentions, contact | page en production |
| FAQ | 7 questions d'intention | page en production |
| CTA final | « Voyez comment COURTIARK peut s'integrer a votre cabinet » | page en production |
| Maillage entrant | 18 pages | `seo/maillage.py` |
| Canonical | auto-referente | controle automatique 0 anomalie |
| JSON-LD | 4 blocs valides, aucun avis fictif | controle automatique |
| Performance | voir `16_LIGHTHOUSE.md` | mesure Lighthouse reelle |
""")

ecrire('08_PRODUCT_SCREENSHOTS.md', """
# Captures produit reelles (26/09/2026)

Environnement : **demonstration publique COURTIARK** (`/demo/dashboard`), montee par l'application
avec des donnees synthetiques. Le bandeau de l'environnement indique : « Cabinet Horizon Assurances —
cabinet fictif, donnees synthetiques. Aucun acces au systeme de production. »

Aucun compte client n'a ete utilise. Aucune donnee reelle n'apparait : les noms d'entreprises et de
personnes des captures viennent du jeu de demonstration (Cabinet Horizon Assurances, Anne Delacroix,
Batllog SA, Etude Moret & Associes…).

| Fichier | Ecran | Taille | Poids | Integre sur |
|---|---|---|---|---|
| `courtiark-cockpit.webp` | tableau de bord (clients, contrats, primes, taches, echeances) | 1440x900 | 64 Ko | accueil (preload) + money page |
| `courtiark-portefeuille.webp` | clients et portefeuille | 1440x900 | 52 Ko | money page |
| `courtiark-pipeline.webp` | opportunites | 1440x900 | 36 Ko | money page |
| `courtiark-relances.webp` | relances | 1440x900 | 45 Ko | money page |
| `courtiark-contrats.webp` | contrats et echeances | 1440x900 | 64 Ko | money page |
| `courtiark-documents.webp` | documents | 1440x900 | 48 Ko | money page |
| `courtiark-ark-brief.webp` | brief du matin ARK | 1440x900 | 54 Ko | money page |

Contraintes respectees : WebP, largeur et hauteur declarees dans le HTML (aucun saut de mise en page),
`loading="lazy"` partout sauf l'image de l'accueil qui est l'element LCP (`fetchpriority="high"`),
alt descriptif en francais, legende indiquant qu'il s'agit d'un environnement de demonstration.
Poids total des 7 fichiers : 392 Ko.

Defaut trouve en preparant ces captures : la demonstration interactive publique **renvoyait le
visiteur au mur de connexion des le premier clic** (la barre laterale naviguait vers les routes
reelles `/clients`, `/contrats` au lieu de `/demo/...`). Corrige (barre laterale, palette de
commandes, navigation mobile) et verifie : le parcours reste dans `/demo`.
""")

ecrire('09_CRO_ACCEPTANCE.md', """
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
""")

ecrire('13_BACKLINK_TOP5.md', """
# Top 5 autorite — pret a envoyer (READY_FOR_SEND)

Aucun envoi : aucune autorisation d'envoi n'a ete donnee dans la mission active.

## 1. Courtage Magazine (courtage-magazine.fr)

- Contact : Laurent Lemonnier, gerant — `bienvenue@isoluce.net`
- Source de l'e-mail : mentions legales du site (publie)
- Contenu cite : leurs checklists pratiques (« Migration CRM courtier : la checklist de reprise », « Fidelisation en assurance : 9 actions »)
- Angle : proposer un guide 25 points a publier chez eux
- Asset COURTIARK : `/guides/organiser-cabinet-courtage-25-points`
- Objet : « Un guide 25 points pour organiser un cabinet, a publier chez vous ? »
- Message : un paragraphe sur leur checklist de migration, un sur notre guide, un lien, une proposition. ~110 mots.
- Relance J+5 (<70 mots) et relance J+12 (dernier message) : voir `docs/seo/OUTREACH_DRAFTS.md`.

## 2. Digital et Assurance (digital-et-assurance.com)

- Contact : Alexandre Pengloan, editeur — `alexandre.pengloan@gmail.com` (publie sur le site)
- Contenu cite : leurs analyses sur la digitalisation et les interviews de dirigeants
- Angle : ce qu'un cabinet mesure avant/apres automatisation, limites incluses
- Asset : retour d'experience + `/guides/automatiser-renouvellements-assurance`

## 3. ACA — Association des Courtiers en Assurances (aca-courtiers.ch)

- Contact : secretariat — `secretariat@aca-courtiers.ch` (publie)
- Contenu cite : leur rubrique avantages membres
- Angle : outil gratuit a proposer aux membres (formule suisse)
- Asset : `/outils/checklist-renouvellement-assurance`

## 4. Orica (orica.fr)

- Contact : `contact@orica.fr` (publie sur la page contact)
- Contenu cite : leurs parcours de formation sur l'organisation du cabinet
- Angle : checklists imprimables comme support de seance
- Asset : `/outils/checklist-dossier-courtier-assurance`

## 5. AsCourtage (ascourtage.fr)

- Contact : formulaire du site — **aucune adresse e-mail publiee** (dit tel quel)
- Contenu cite : leurs contenus pratiques pour courtiers
- Angle : calculateur utile a leur audience
- Asset : `/outils/calculateur-taux-transformation-assurance`

## Regles respectees

Aucun achat de lien, aucun echange, aucun PBN, aucun commentaire automatise. Les 44 domaines de
`backlink_prospects` restent notes (score 0 a 11, sans indicateur d'autorite invente) ; ces 5 fiches
sont les seules avec contact verifie et message redige. Statut en base : `READY` (voir
`14_BACKLINK_LOG.csv`). Un lien ne comptera comme obtenu qu'apres verification HTTP.
""")

ecrire('17_RESPONSIVE.md', """
# Recette responsive (production, 26/09/2026)

| Largeur | Page testee | Debordement horizontal | CTA visible | Verdict |
|---|---|---|---|---|
| 390 px | `/outils/checklist-renouvellement-assurance` | 0 px | oui | PASS |
| 360 px | accueil, money page, `/demo`, `/suisse/geneve`, outil | 0 px | oui | PASS |
| 375 px | idem | 0 px | oui | PASS |
| 390 px | idem | 0 px | oui | PASS |
| 768 px | idem | 0 px | oui | PASS |
| 1024 px | idem | 0 px | oui | PASS |
| 1440 px | idem | 0 px | oui | PASS |
| 1920 px | idem | 0 px | oui | PASS |

Controles : aucun debordement horizontal (`scrollWidth - innerWidth = 0`), CTA dans le viewport,
aucun texte tronque, images produit avec dimensions declarees (donc aucun decalage), tableaux
defilables sur mobile, champs de formulaire non rognes. Le detail des 20 combinaisons largeur x gabarit
(360/375/390/1440/1920 sur accueil, money, outil, Geneve) figure dans la phase precedente
(`2026-09-26-phase-index-cleanup/12_controles_pages.md`).
""")

ecrire('19_OBSIDIAN_UPDATE.md', """
# Mise a jour Obsidian (26/09/2026)

| Note | Action |
|---|---|
| `COURTIARK — MASTER ACQUISITION` | creee : etat, T0, P1, money pages, preuve produit, CRO, tracking, leads, essais, backlinks, T+7/T+14/T+30 |
| `COURTIARK — SEO ACQUISITION MASTER EXECUTION` | mise a jour : phase master acquisition |
| `COURTIARK — SEARCH CONSOLE BASELINE` | T0 conserve, inchange (immuable) |
| `COURTIARK SEO PERFORMANCE LOG` | ligne du 26/09 ajoutee |
| `COURTIARK SEO DEPLOYMENT LOG` | commits et deploiement ajoutes |
| `COURTIARK SEO BACKLINKS` | Top 5 pret a envoyer |
| `COURTIARK — INDEX CLEANUP 2026-09-26` | 21 URL resolues |

Aucun secret, aucun cookie, aucun jeton, aucune donnee personnelle dans ces notes.
""")

print('documents de recette ecrits')
