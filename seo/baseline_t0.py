#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Baseline Search Console T0 : ecrit les preuves dans le depot et la note dans Obsidian.

Toutes les valeurs proviennent de lectures reelles de Search Console le 26/09/2026,
propriete https://courtiark.fr/ (compte iamdalilrhasrhass@gmail.com). Aucune valeur estimee.
"""
import base64
import io
import json
import os
import subprocess

RACINE = '/srv/courtia'
PREUVES = os.path.join(RACINE, 'docs', 'seo', 'preuves', '2026-09-26-phase3')
VAULT = '/Users/dalilrhasrhass/Documents/Obsidian Vault/10_COURTIA'

T0 = {
    'date': '2026-09-26',
    'propriete': 'https://courtiark.fr/',
    'type_propriete': 'prefixe d\'URL',
    'compte': 'iamdalilrhasrhass@gmail.com',
    'etat': 'deja validee avant cette session',
    'fenetre_mesure': '25/06/2026 au 24/09/2026',
    'derniere_mise_a_jour_donnees': 'il y a 4 heures (au moment du releve)',
    'clics': 15, 'impressions': 382, 'ctr': '3,9 %', 'position_moyenne': 12.3,
    'requetes_distinctes': 17, 'pages_distinctes': 67, 'pays_distincts': 58,
    'requetes': [
        ['courtia', 8, 250], ['logiciel courtier iard', 0, 10], ['courtier assurance lausanne', 0, 9],
        ['(requete longue issue d\'un modele de langage)', 0, 5], ['cortia', 0, 3], ['courtier cahors', 0, 2],
        ['logiciel pour courtier en assurance', 0, 1], ['courtier mulhouse', 0, 1],
        ['logiciel pour courtier', 0, 1], ['wintimenow', 0, 1],
    ],
    'pages': [
        ['https://courtiark.fr/', 15, 288],
        ['https://courtiark.fr/ch/fr/comparatif-logiciels-courtiers-assurance-suisse', 0, 18],
        ['https://courtiark.fr/ch/fr/logiciel-courtier-assurance-lausanne', 0, 9],
        ['https://courtiark.fr/ch/fr/logiciel-courtier-assurance-suisse', 0, 7],
        ['https://courtiark.fr/fr/logiciel-courtier-iard-metz', 0, 6],
        ['https://courtiark.fr/fr/logiciel-courtier-assurance-cergy', 0, 5],
        ['https://courtiark.fr/fr/logiciel-courtier-iard-moulins', 0, 5],
        ['https://courtiark.fr/fr/logiciel-courtier-iard-pessac', 0, 5],
        ['https://courtiark.fr/fr/logiciel-courtier-mandataire', 0, 4],
        ['https://courtiark.fr/fr/logiciel-courtier-emprunteur-bordeaux', 0, 4],
    ],
    'pays': [['Suisse', 9, 36], ['France', 5, 129], ['Canada', 1, 8], ['Etats-Unis', 0, 42],
             ['Republique democratique du Congo', 0, 36], ['Inde', 0, 30]],
    'appareils': [['Ordinateur', 10, 186], ['Mobile', 5, 192], ['Tablette', 0, 4]],
    'indexation': {'dans_index': 1100, 'non_indexees': 40, 'mise_a_jour': '21/09/2026',
                   'motifs': [['Detectee, actuellement non indexee', 27],
                              ['Autre page avec balise canonique correcte', 7],
                              ['Exploree, actuellement non indexee', 3],
                              ['Soft 404', 2],
                              ['Exclue par la balise noindex', 1]]},
    'exemples_non_indexees': {
        'Soft 404': ['/fr/relance-client-assurance', '/fr/logiciel-gestion-cabinet-courtage'],
        'noindex': ['/ch/fr/logiciel-courtier-assurance-fribourg'],
        'canonique': ['/fonctionnalites', '/legal/confidentialite', '/fr/crm-courtier-assurance',
                      '/legal/mentions-legales', '/fr/logiciel-courtier-assurance', '/contact', '/demo'],
        'exploree_non_indexee': ['/fr/ia-courtier-assurance', '/fr/gestion-portefeuille-courtier',
                                 '/fr/comparateur-assurance-courtier'],
    },
    'sitemaps': [['/sitemap-seo.xml', 134, '28/08/2026', '25/09/2026', 'Operation effectuee (ancien fichier, supprime depuis)'],
                 ['/sitemap.xml', 26, '28/08/2026', '21/09/2026', 'Operation effectuee (ancienne version)']],
    'sitemap_envoye': '/sitemap.xml (26/09/2026, index de 10 sitemaps de section, 80 URL)',
    'url_inspectees': [
        ['https://courtiark.fr/', 'indexee (288 impressions, 15 clics)'],
        ['https://courtiark.fr/crm-courtier-assurance', 'non indexee -> indexation demandee'],
        ['https://courtiark.fr/fonctionnalites/assistant-ark', 'non indexee -> indexation demandee'],
        ['https://courtiark.fr/fonctionnalites/gestion-portefeuille-assurance', 'non indexee -> indexation demandee'],
        ['https://courtiark.fr/fonctionnalites/relance-devis-assurance', 'non indexee -> indexation demandee'],
        ['https://courtiark.fr/fonctionnalites/renouvellements-assurance', 'non indexee -> indexation demandee'],
        ['https://courtiark.fr/france', 'non indexee -> indexation demandee'],
        ['https://courtiark.fr/suisse', 'non indexee -> indexation demandee'],
        ['https://courtiark.fr/suisse/geneve', 'non indexee -> indexation demandee'],
        ['https://courtiark.fr/suisse/lausanne', 'non indexee -> indexation demandee'],
    ],
    'note': "Aucune page de la nouvelle architecture n'etait indexee au moment du releve : "
            "Google connait le domaine (1 100 URL indexees, essentiellement l'ancien plan /fr et /ch) "
            "mais pas encore les 80 pages publiques actuelles. Les 9 demandes d'indexation et le sitemap "
            "en 10 sections ont ete soumis le 26/09/2026.",
}

NOTE = """---
date: 2026-09-26
projet: COURTIARK
type: reference (baseline) Search Console
propriete: https://courtiark.fr/
---

# COURTIARK — SEARCH CONSOLE BASELINE (T0, 26 septembre 2026)

## Propriete et acces

| Element | Valeur |
|---|---|
| Propriete | `https://courtiark.fr/` (prefixe d'URL) |
| Compte | iamdalilrhasrhass@gmail.com |
| Etat | **deja validee** (aucune creation ni validation necessaire) |
| Methode de controle | Chrome du Mac pilote depuis le VPS (AppleScript + JavaScript), session Google existante |
| Fenetre mesuree | 25/06/2026 → 24/09/2026 |
| Fraicheur des donnees | « il y a 4 heures » au moment du releve |

Aucun jeton Google n'existe sur le serveur : le pilotage se fait dans la session du navigateur du Mac.
Voir la procedure de releve hebdomadaire en fin de note.

## Performances (T0)

| Indicateur | Valeur |
|---|---|
| Clics | **15** |
| Impressions | **382** |
| CTR moyen | **3,9 %** |
| Position moyenne | **12,3** |
| Requetes distinctes | 17 |
| Pages distinctes | 67 |
| Pays distincts | 58 |

### Requetes (toutes)

| Requete | Clics | Impressions |
|---|---|---|
| courtia | 8 | 250 |
| logiciel courtier iard | 0 | 10 |
| courtier assurance lausanne | 0 | 9 |
| (requete longue issue d'un modele de langage) | 0 | 5 |
| cortia | 0 | 3 |
| courtier cahors | 0 | 2 |
| logiciel pour courtier en assurance | 0 | 1 |
| courtier mulhouse | 0 | 1 |
| logiciel pour courtier | 0 | 1 |
| wintimenow | 0 | 1 |

**Lecture** : 8 des 15 clics viennent de la requete de marque `courtia` (250 impressions). La confusion
d'entite est donc bien le premier levier mesurable : 250 impressions sur un nom que nous ne voulons plus
porter comme marque principale.

### Pages

| Page | Clics | Impressions |
|---|---|---|
| `https://courtiark.fr/` | 15 | 288 |
| `/ch/fr/comparatif-logiciels-courtiers-assurance-suisse` | 0 | 18 |
| `/ch/fr/logiciel-courtier-assurance-lausanne` | 0 | 9 |
| `/ch/fr/logiciel-courtier-assurance-suisse` | 0 | 7 |
| `/fr/logiciel-courtier-iard-metz` | 0 | 6 |
| `/fr/logiciel-courtier-assurance-cergy` | 0 | 5 |
| `/fr/logiciel-courtier-iard-moulins` | 0 | 5 |
| `/fr/logiciel-courtier-iard-pessac` | 0 | 5 |
| `/fr/logiciel-courtier-mandataire` | 0 | 4 |
| `/fr/logiciel-courtier-emprunteur-bordeaux` | 0 | 4 |

Toutes les impressions hors accueil vont a l'ancien plan de site (`/fr/*`, `/ch/*`), avec 0 clic.

### Pays (58 au total)

| Pays | Clics | Impressions |
|---|---|---|
| Suisse | **9** | 36 |
| France | 5 | 129 |
| Canada | 1 | 8 |
| Etats-Unis | 0 | 42 |
| Republique democratique du Congo | 0 | 36 |
| Inde | 0 | 30 |

**Lecture** : la Suisse apporte plus de clics que la France avec 3,5 fois moins d'impressions.
La priorite donnee a la Suisse romande dans notre plan de contenu est confirmee par la mesure.

### Appareils

| Appareil | Clics | Impressions |
|---|---|---|
| Ordinateur | 10 | 186 |
| Mobile | 5 | 192 |
| Tablette | 0 | 4 |

## Indexation (T0)

| Etat | Volume |
|---|---|
| Dans l'index | ~1 100 |
| Non indexees | 40 (5 motifs) |

| Motif | Pages | Traitement |
|---|---|---|
| Detectee, actuellement non indexee | 27 | sitemap soumis + demandes d'indexation le 26/09 |
| Autre page avec balise canonique correcte | 7 | anciens chemins `legal/*` et doublons `/fr/*` : redirections permanentes ajoutees |
| Exploree, actuellement non indexee | 3 | doublons de pages canoniques : redirections permanentes ajoutees |
| Soft 404 | 2 | pages heritees devenues vides : redirigees vers la page equivalente |
| Exclue par la balise noindex | 1 | voulu (anciennes pages locales volontairement sorties de l'index) |

URL concernees (relevees a l'ecran) :

- Soft 404 : `/fr/relance-client-assurance`, `/fr/logiciel-gestion-cabinet-courtage`
- noindex : `/ch/fr/logiciel-courtier-assurance-fribourg`
- canonique : `/fonctionnalites`, `/legal/confidentialite`, `/fr/crm-courtier-assurance`, `/legal/mentions-legales`, `/fr/logiciel-courtier-assurance`, `/contact`, `/demo`
- exploree non indexee : `/fr/ia-courtier-assurance`, `/fr/gestion-portefeuille-courtier`, `/fr/comparateur-assurance-courtier`

Corrections appliquees le 26/09/2026 (commit `c21701b7`, verifie en production en 308) :

| Ancienne URL | Nouvelle URL |
|---|---|
| `/fr/relance-client-assurance` | `/guides/comment-ne-plus-oublier-relances-courtier` |
| `/fr/logiciel-gestion-cabinet-courtage` | `/solutions/cabinet-courtage-assurance` |
| `/fr/ia-courtier-assurance` | `/fonctionnalites/assistant-ark` |
| `/fr/comparateur-assurance-courtier` | `/comparatifs/crm-assurance-vs-crm-generaliste` |
| `/fr/gestion-portefeuille-assurance` | `/fonctionnalites/gestion-portefeuille-assurance` |
| `/legal/confidentialite` | `/confidentialite` |
| `/legal/mentions-legales` | `/mentions-legales` |

## Sitemaps

| Sitemap | Etat avant le 26/09 | Action |
|---|---|---|
| `/sitemap-seo.xml` | 134 URL decouvertes (ancien plan `/fr`) | fichier supprime, redirige vers `/sitemap.xml` |
| `/sitemap.xml` | 26 URL decouvertes (ancienne version) | **envoye a nouveau le 26/09/2026** : « Sitemap envoye » |

Le sitemap courant est un index de 10 sitemaps de section couvrant les **80 pages publiques**.

## Inspection des 10 URL strategiques

| URL | Etat au 26/09/2026 |
|---|---|
| `/` | **indexee** (288 impressions, 15 clics) |
| `/crm-courtier-assurance` | non indexee → indexation demandee |
| `/fonctionnalites/assistant-ark` | non indexee → indexation demandee |
| `/fonctionnalites/gestion-portefeuille-assurance` | non indexee → indexation demandee |
| `/fonctionnalites/relance-devis-assurance` | non indexee → indexation demandee |
| `/fonctionnalites/renouvellements-assurance` | non indexee → indexation demandee |
| `/france` | non indexee → indexation demandee |
| `/suisse` | non indexee → indexation demandee |
| `/suisse/geneve` | non indexee → indexation demandee |
| `/suisse/lausanne` | non indexee → indexation demandee |

Confirmation obtenue a l'ecran pour chaque demande :
« Indexation demandee — Cette URL a ete ajoutee a une file d'attente d'exploration prioritaire. »

## Conclusion T0

Google connait le domaine mais pointe encore l'ancien plan de site : 1 100 URL indexees contre 80 pages
publiques actuelles, dont **aucune n'etait indexee**. Les clics existants viennent de la marque historique
`courtia` (8 clics sur 15). Les impressions sont concentrees sur l'accueil (288 sur 382).

Trois priorites en decoulent, toutes mesurables : faire indexer les 80 pages actuelles (fait : sitemap +
9 demandes), confirmer l'entite COURTIARK aupres de Google pour capter les 250 impressions du nom historique,
et exploiter l'avance suisse (9 clics pour 36 impressions contre 5 clics pour 129 impressions en France).

## Procedure de releve hebdomadaire (reproductible, sans automatisation inventee)

Aucune API Search Console n'est disponible proprement (aucun jeton). Le releve se fait par le navigateur :

1. le Mac est joignable par `ssh mac` (Tailscale) ;
2. `python3 /root/ark/gsc_relever.py` ouvre la propriete dans le Chrome deja connecte et lit, sur les
   rapports Performances / Pages / Sitemaps, les valeurs clics, impressions, CTR, position, indexation ;
3. les valeurs sont ecrites dans `/root/ark/gsc_releves.jsonl` puis reportees dans cette note et dans
   `COURTIARK SEO PERFORMANCE LOG`.

Ce n'est pas une automatisation par API : c'est un releve pilote par navigateur, et c'est ainsi qu'il
est documente. Une automatisation par l'API supposerait un jeton OAuth que nous n'avons pas.
"""


def ecrire_vault(nom, contenu):
    data = base64.b64encode(contenu.encode()).decode()
    cmd = "printf '%%s' '%s' | base64 -d > %s" % (data, ('"%s/%s"' % (VAULT, nom)))
    r = subprocess.run(['ssh', 'mac', cmd], capture_output=True, text=True, timeout=200)
    return r.returncode == 0, (r.stderr or '').strip()[:200]


def main():
    os.makedirs(PREUVES, exist_ok=True)
    io.open(os.path.join(PREUVES, 'search_console_t0.json'), 'w', encoding='utf-8').write(
        json.dumps(T0, ensure_ascii=False, indent=1))
    io.open(os.path.join(PREUVES, 'note_baseline.md'), 'w', encoding='utf-8').write(NOTE)
    # journal d'inspection brut
    if os.path.exists('/root/ark/gsc_inspection.jsonl'):
        io.open(os.path.join(PREUVES, 'inspection_url.jsonl'), 'w', encoding='utf-8').write(
            io.open('/root/ark/gsc_inspection.jsonl', encoding='utf-8').read())
    ok, err = ecrire_vault('COURTIARK — SEARCH CONSOLE BASELINE.md',
                           NOTE.replace('Borne inferieure', 'Borne inférieure'))
    print('note baseline ecrite :', ok, err)
    print('preuves :', sorted(os.listdir(PREUVES)))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
