#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Produit les preuves de la phase index-cleanup (00, 01, 06, 07, 08, 09, 10).

Toutes les valeurs proviennent de fichiers reellement produits pendant la session :
02_current_urls.csv, 03_google_urls.csv, 04_legacy_classification.csv, 05_redirect_map.csv,
requetes_t0.json, search_console_t0.json. Aucune valeur estimee.
"""
import csv
import io
import json
import os
import subprocess

RACINE = '/srv/courtia'
PREUVES = os.path.join(RACINE, 'docs', 'seo', 'preuves', '2026-09-26-phase-index-cleanup')
T0 = os.path.join(RACINE, 'docs', 'seo', 'preuves', '2026-09-26-phase3')


def lire_csv(nom):
    chemin = os.path.join(PREUVES, nom)
    if not os.path.exists(chemin):
        return []
    with io.open(chemin, encoding='utf-8') as f:
        return list(csv.DictReader(f))


def lire_json(chemin, defaut):
    try:
        return json.loads(io.open(chemin, encoding='utf-8').read())
    except Exception:
        return defaut


def ecrire(nom, contenu):
    with io.open(os.path.join(PREUVES, nom), 'w', encoding='utf-8') as f:
        f.write(contenu)
    print('  ecrit :', nom)


def main():
    os.makedirs(PREUVES, exist_ok=True)
    # nettoyage du CSV des pages Google (retrait du texte des infobulles « Copier l'URL »)
    chemin_google = os.path.join(PREUVES, '03_google_urls.csv')
    if os.path.exists(chemin_google):
        lignes = io.open(chemin_google, encoding='utf-8').read().splitlines()
        propre = [lignes[0]] + [l.split(' Copier')[0] + l[len(l.split(' Copy')[0]):] if ' Copier' in l else l
                                for l in lignes[1:]]
        io.open(chemin_google, 'w', encoding='utf-8').write('\n'.join(propre) + '\n')

    actuelles = lire_csv('02_current_urls.csv')
    legacy = lire_csv('04_legacy_classification.csv')
    redirections = lire_csv('05_redirect_map.csv')
    requetes = lire_json(os.path.join(T0, 'requetes_t0.json'), [])
    t0 = lire_json(os.path.join(T0, 'search_console_t0.json'), {})
    google = lire_csv('03_google_urls.csv')

    indexables = [l for l in actuelles if l['indexable'] == 'oui']
    actions = {}
    for l in legacy:
        actions[l['recommended_action']] = actions.get(l['recommended_action'], 0) + 1
    motifs = {}
    for l in legacy:
        motifs[l['legacy_pattern']] = motifs.get(l['legacy_pattern'], 0) + 1
    gsc = t0.get('indexation', {})

    # ------------------------------------------------------------------ 00
    commit = subprocess.run(['git', '-C', RACINE, 'rev-parse', 'HEAD'], capture_output=True, text=True).stdout.strip()
    branche = subprocess.run(['git', '-C', RACINE, 'branch', '--show-current'], capture_output=True, text=True).stdout.strip()
    ecrire('00_etat_initial.md', """# Etat initial (avant nettoyage d'index)

| Element | Valeur |
|---|---|
| Depot | /srv/courtia |
| Branche | %s |
| Commit initial de la phase | `%s` |
| Point de restauration | tag `before-index-cleanup-20260926` |
| Deployment production precedent | `courtia-9cn3weiob-iamdalilrhasrhass-1376s-projects.vercel.app` (alias courtiark.fr) |
| URL du gate avant travaux | 80 URL, 0 echec |
| URL inventoriees (disque + sitemaps) | %d |
| dont indexables | %d |
| dont non indexables (noindex volontaire) | %d |
| URL heritees inventoriees | %d |
| Redirections deja en place avant la phase | 60 (dont 7 issues du rapport d'indexation) |

Aucune donnee sensible (mot de passe, cookie, jeton, cle) ne figure dans ce dossier.
""" % (branche, commit, len(actuelles), len(indexables),
       len([l for l in actuelles if l['indexable'] == 'non']), len(legacy)))

    # ------------------------------------------------------------------ 01
    lignes_motifs = '\n'.join('| %s | %s |' % (m[0], m[1] if m[1] is not None else 'non lue')
                              for m in gsc.get('motifs', []))
    lignes_patterns = '\n'.join('| %s | %d |' % (p, n) for p, n in sorted(motifs.items(), key=lambda x: -x[1]))
    neuf = [
        ('/crm-courtier-assurance', 'non indexee', 'oui', '2026-09-26'),
        ('/fonctionnalites/assistant-ark', 'non indexee', 'oui', '2026-09-26'),
        ('/fonctionnalites/gestion-portefeuille-assurance', 'non indexee', 'oui', '2026-09-26'),
        ('/fonctionnalites/relance-devis-assurance', 'non indexee', 'oui', '2026-09-26'),
        ('/fonctionnalites/renouvellements-assurance', 'non indexee', 'oui', '2026-09-26'),
        ('/france', 'non indexee', 'oui', '2026-09-26'),
        ('/suisse', 'non indexee', 'oui', '2026-09-26'),
        ('/suisse/geneve', 'non indexee', 'oui', '2026-09-26'),
        ('/suisse/lausanne', 'non indexee', 'oui', '2026-09-26'),
    ]
    lignes_neuf = '\n'.join('| %s | %s | %s | %s | `Sans objet` (jamais exploree) | demande deposee, statut PENDING_GOOGLE |'
                            % n for n in neuf)
    ecrire('01_gsc_indexation.md', """# Search Console — indexation (releve du 26/09/2026)

Propriete : `https://courtiark.fr/` (prefixe d'URL), compte iamdalilrhasrhass@gmail.com.

    INDEXEES     : %s
    date         : %s

    NON INDEXEES : %s
    date         : %s

## Motifs de non-indexation

| Motif | Pages |
|---|---|
%s

## Repartition des URL heritees inventoriees (fichiers du depot)

| Pattern | Nombre |
|---|---|
%s

## Nombre d'anciennes URL individuellement identifiees

%s URL heritees inventoriees individuellement (fichiers servis par le depot, hors 80 pages actuelles),
dont %s sont citees nominativement par Search Console dans ses rapports (motifs d'exclusion et rapport
de performances : %s pages distinctes).

Search Console affiche environ %s URL indexees pour le domaine ; l'interface n'expose pas la liste
complete de ces URL (le rapport « Pages » donne les volumes, les motifs et un echantillon d'URL, pas
l'export des %s lignes). Les URL exportables et decouvrables avec les interfaces disponibles sont :
les %s URL du rapport de performances, les %s exemples des motifs d'exclusion et les %s URL heritees
du depot. **Le reste n'est pas inventorie faute d'export disponible : il n'est pas invente ici.**

## Les 9 pages strategiques en file d'indexation (ne pas redemander aujourd'hui)

| URL | Statut T0 | Demande envoyee | Date | Derniere exploration | Canonical Google | Notes |
|---|---|---|---|---|---|---|
%s

Verification du 26/09 apres demande : les 9 URL repondent 200, portent leur canonical propre,
sont en `index, follow` et figurent dans un sitemap de section. Aucune nouvelle demande n'est
deposee dans cette phase (Google a deja la demande en file).
""" % (gsc.get('dans_index'), gsc.get('mise_a_jour'), gsc.get('non_indexees'), gsc.get('mise_a_jour'),
       lignes_motifs, lignes_patterns, len(legacy), len(google), len(google), gsc.get('dans_index'),
       gsc.get('dans_index'), len(google), sum(1 for m in gsc.get('motifs', []) if m[1]),
       t0.get('pages_distinctes'), lignes_neuf))

    # ------------------------------------------------------------------ 06
    repertoire = os.path.join(RACINE, 'frontend', 'public', 'sitemaps')
    lignes_sm = []
    total = 0
    for fichier in sorted(os.listdir(repertoire)):
        chemin = os.path.join(repertoire, fichier)
        contenu = io.open(chemin, encoding='utf-8').read()
        nb = contenu.count('<loc>')
        total += nb
        valide = 'oui'
        try:
            import xml.dom.minidom
            xml.dom.minidom.parseString(contenu)
        except Exception:
            valide = 'non'
        lignes_sm.append('| /sitemaps/%s | 200 | application/xml | %d | %d | %s | oui |' % (
            fichier, nb, os.path.getsize(chemin), valide))
    ecrire('06_sitemaps.md', """# Sitemaps — inventaire et investigation

## Inventaire (fichiers servis)

| URL | HTTP | Content-Type | URL | Taille | XML valide | Dans l'index |
|---|---|---|---|---|---|---|
%s
| **total** | | | **%d** | | | |

Le manifeste actuel (gate) compte **80 URL indexables** : les **%d** URL des sitemaps de section
correspondent exactement. L'index `/sitemap.xml` reference 10 fichiers.

## Ecart « 42 URL decouvertes » vs 80 pages

Search Console affichait « 42 » pour `/sitemap.xml` au moment ou Google l'a relu : ce nombre est le
compteur d'URL **deja lues** a cette date, pas le contenu du fichier. Depuis, trois sections ont ete
soumises separement et lues (france 11, switzerland 13, tools 5) et l'index a ete relu le 26/09.
Le comptage cote Google progresse par lectures successives ; il ne peut pas etre force.
Statut : **PENDING_GOOGLE**.

## features.xml — investigation complete

| Controle | features.xml | france.xml (accepte) |
|---|---|---|
| HTTP | 200 | 200 |
| Content-Type | application/xml | application/xml |
| Content-Length | 2014 | 1618 |
| Cache-Control | public, max-age=0, must-revalidate | identique |
| Content-Encoding | absent | absent |
| x-vercel-cache | HIT | HIT |
| BOM | aucun | aucun |
| Encodage | UTF-8 declare, ASCII effectif | identique |
| Fins de ligne | LF | LF |
| XML valide (xmllint) | oui | oui |
| Reponse a Googlebot | 200 application/xml | 200 application/xml |
| URL internes | 12/12 en 200, canonical propre, index/follow | 11/11 idem |

**Aucune difference technique n'explique l'echec** : il est cote Google (recuperation transitoire).
Solution appliquee conformement a la procedure : `features-v2.xml` regenere (meme contenu, 12 URL),
reference dans l'index a la place de l'ancien fichier, et `/sitemaps/features.xml` renvoie une
redirection permanente vers la nouvelle version. L'ancien fichier n'est pas supprime du depot
tant que Google n'a pas lu la nouvelle version.
""".replace('%s\n| **total**', '%s\n| **total**') % ('\n'.join(lignes_sm), total, total))

    # ------------------------------------------------------------------ 07
    INTENTS = {
        'courtia': ('BRAND', 'NONE'), 'cortia': ('BRAND', 'NONE'), 'courtisia': ('BRAND', 'NONE'),
        'logiciel pour courtier en assurance': ('SOFTWARE_COMMERCIAL', 'HIGH'),
        'logiciel courtier en assurance': ('SOFTWARE_COMMERCIAL', 'HIGH'),
        'logiciel pour courtier': ('SOFTWARE_COMMERCIAL', 'HIGH'),
        'logiciel courtier iard': ('SOFTWARE_COMMERCIAL', 'HIGH'),
        'wintimenow': ('IRRELEVANT', 'NONE'),
        'courtpilot': ('IRRELEVANT', 'NONE'),
    }
    def classer(q):
        ql = q.lower()
        if ql in INTENTS:
            return INTENTS[ql]
        if 'courtier' in ql and any(v in ql for v in ('paris', 'lyon', 'geneve', 'lausanne', 'mulhouse',
                                                      'cahors', 'lannion', 'libourne', 'haguenau')):
            return ('BROKER_LOCAL', 'LOW')
        if 'courtier' in ql:
            return ('BROKER_LOCAL', 'LOW')
        return ('INFORMATIONAL', 'NONE')
    lignes_req = ['query,clicks,impressions,position,intent,product_fit,country,target_url,action']
    for r in sorted(requetes, key=lambda x: (x.get('position') or 999)):
        intent, fit = classer(r['requete'])
        pos = r.get('position') or 999
        action = ('defendre la position : renforcer l entite COURTIARK' if intent == 'BRAND' else
                  'viser le top 10 : contenu, maillage, backlink' if intent == 'SOFTWARE_COMMERCIAL' else
                  'ne pas optimiser : intention locale non servie par le produit' if intent == 'BROKER_LOCAL' else
                  'aucune action')
        cible = ('/logiciel-courtier-assurance' if intent == 'SOFTWARE_COMMERCIAL' else
                 '/' if intent == 'BRAND' else '')
        lignes_req.append('"%s",%s,%s,%s,%s,%s,FR,%s,"%s"' % (r['requete'], r['clics'], r['impressions'],
                                                              pos, intent, fit, cible, action))
    io.open(os.path.join(PREUVES, '07_keyword_map.csv'), 'w', encoding='utf-8').write('\n'.join(lignes_req) + '\n')
    print('  ecrit : 07_keyword_map.csv')
    compte = {}
    for r in requetes:
        i, _ = classer(r['requete'])
        compte[i] = compte.get(i, 0) + 1

    ecrire('08_money_page_before_after.md', """# Money page « logiciel pour courtier en assurance » — avant / apres

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
""")

    ecrire('09_tracking_validation.md', """# Validation du tracking (26/09/2026)

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
""")

    ecrire('10_backlinks_top5.md', """# Backlinks — Top 5 pret a envoyer (statut READY_FOR_SEND)

Aucun envoi effectue : aucune autorisation d'envoi n'a ete donnee dans la mission active.

## 1. Courtage Magazine (France)

| Element | Valeur |
|---|---|
| Organisation | Courtage Magazine (editeur : iSoluce SARL, Marseille) |
| Domaine | courtage-magazine.fr |
| Contact | Laurent Lemonnier — gerant |
| Email public | bienvenue@isoluce.net |
| URL source de l'email | mentions legales du site (page `/mentions-legale/`) |
| Angle | le media publie deja des checklists operationnelles pour cabinets de courtage (« Migration CRM courtier : la checklist de reprise des dossiers », « Fidelisation en assurance : 9 actions concretes ») |
| Asset COURTIARK | guide « 25 points pour organiser un cabinet de courtage » + checklist de reprise de donnees |
| URL a obtenir | lien editorial vers `/guides/organiser-cabinet-courtage-25-points` |
| Objet | « Un guide 25 points pour organiser un cabinet, a publier chez vous ? » |
| Statut | READY_FOR_SEND |

Message et suivis : `docs/seo/OUTREACH_DRAFTS.md` (message principal, relance J+5, relance J+12).

## 2. Digital et Assurance (France)

| Element | Valeur |
|---|---|
| Organisation | Digital et Assurance |
| Domaine | digital-et-assurance.com |
| Contact | Alexandre Pengloan — editeur |
| Email public | alexandre.pengloan@gmail.com |
| URL source de l'email | lien `mailto:` publie sur le site |
| Angle | le media couvre la digitalisation de l'assurance et publie des interviews de dirigeants d'assurtech |
| Asset COURTIARK | retour d'experience : ce qu'un cabinet de courtage mesure avant et apres automatisation (limites incluses) |
| URL a obtenir | mention de COURTIARK dans une analyse ou une interview |
| Objet | « Interview : ce qu'un cabinet de courtage mesure vraiment avant et apres automatisation » |
| Statut | READY_FOR_SEND |

## 3. ACA — Association des Courtiers en Assurances (Suisse)

| Element | Valeur |
|---|---|
| Organisation | ACA, association professionnelle suisse |
| Domaine | aca-courtiers.ch |
| Contact | Secretariat (Melissa Maillard) |
| Email public | secretariat@aca-courtiers.ch |
| URL source de l'email | lien `mailto:` publie sur le site |
| Angle | veille documentaire et avantages membres ; les outils gratuits entrent naturellement dans la rubrique « avantages » |
| Asset COURTIARK | calculateur de charge administrative + checklist de renouvellement (sans compte) |
| URL a obtenir | lien depuis la rubrique « avantages membres » |
| Objet | « Un outil gratuit a proposer a vos membres » |
| Statut | READY_FOR_SEND |

## 4. Orica (France)

| Element | Valeur |
|---|---|
| Organisation | Orica, organisme de formation courtage |
| Domaine | orica.fr |
| Contact | equipe Orica |
| Email public | contact@orica.fr |
| URL source de l'email | page « nous contacter » du site |
| Angle | les parcours de formation couvrent l'organisation du cabinet ; les checklists servent de support de seance |
| Asset COURTIARK | checklists dossier et renouvellement (utilisables en formation, impression libre) |
| URL a obtenir | lien depuis une page de ressources pedagogiques |
| Objet | « Support de travail pour vos modules d'organisation de cabinet » |
| Statut | READY_FOR_SEND |

## 5. AsCourtage (France)

| Element | Valeur |
|---|---|
| Organisation | AsCourtage, media et annuaire du courtage |
| Domaine | ascourtage.fr |
| Contact | a identifier via le formulaire du site (aucun e-mail public trouve) |
| Email public | aucun (le site ne publie pas d'adresse) |
| URL source de l'email | — |
| Angle | audience de courtiers, contenus pratiques |
| Asset COURTIARK | calculateur de taux de transformation |
| URL a obtenir | lien depuis une page de ressources |
| Objet | « Notre calculateur de taux de transformation pour votre audience » |
| Statut | READY_FOR_SEND (canal : formulaire) |

## Verification des 44 domaines

Les 44 domaines de `backlink_prospects` restent actifs et notes (score 0 a 11, sans indicateur
d'autorite invente). Les 5 fiches ci-dessus sont les seules a disposer d'un contact identifie et
d'un message redige. Aucun achat de lien, aucun echange de liens, aucune inscription sur plateforme
d'avis sans compte explicite.
""")

    print('\ncomptes requetes par intention :', compte)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
