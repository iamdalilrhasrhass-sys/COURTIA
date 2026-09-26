#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Obsidian : note « COURTIARK — INDEX CLEANUP 2026-09-26 » et mise a jour des notes de suivi."""
import base64
import csv
import io
import json
import os
import subprocess

VAULT = '/Users/dalilrhasrhass/Documents/Obsidian Vault/10_COURTIA'
RACINE = '/srv/courtia'
PREUVES = os.path.join(RACINE, 'docs', 'seo', 'preuves', '2026-09-26-phase-index-cleanup')


def lire_csv(nom):
    chemin = os.path.join(PREUVES, nom)
    if not os.path.exists(chemin):
        return []
    with io.open(chemin, encoding='utf-8') as f:
        return list(csv.DictReader(f))


def ecrire(nom, contenu):
    data = base64.b64encode(contenu.encode()).decode()
    cmd = "printf '%%s' '%s' | base64 -d > %s" % (data, ('"%s/%s"' % (VAULT, nom)))
    r = subprocess.run(['ssh', 'mac', cmd], capture_output=True, text=True, timeout=200)
    return r.returncode == 0, (r.stderr or '').strip()[:160]


def lire(nom):
    r = subprocess.run(['ssh', 'mac', 'cat "%s/%s"' % (VAULT, nom)], capture_output=True, text=True, timeout=120)
    return r.stdout if r.returncode == 0 else ''


def ajouter(nom, marqueur, section):
    contenu = lire(nom) or '# %s\n' % nom.replace('.md', '')
    if marqueur in contenu:
        return True, 'deja presente'
    return ecrire(nom, contenu.rstrip() + '\n\n' + section.strip() + '\n')


def main():
    legacy = lire_csv('04_legacy_classification.csv')
    actuelles = lire_csv('02_current_urls.csv')
    actions = {}
    for l in legacy:
        actions[l['recommended_action']] = actions.get(l['recommended_action'], 0) + 1
    motifs = {}
    for l in legacy:
        motifs[l['legacy_pattern']] = motifs.get(l['legacy_pattern'], 0) + 1
    redir = lire_csv('05_redirect_map.csv')
    ok = len([l for l in redir if l.get('passed') == 'oui'])
    ko = len([l for l in redir if l.get('passed') == 'non'])
    chains = len([l for l in redir if l.get('hops', '0').isdigit() and int(l['hops']) > 1])
    indexables = [l for l in actuelles if l['indexable'] == 'oui']
    dans_sitemap = [l for l in actuelles if l['in_sitemap'] == 'oui']

    note = """---
date: 2026-09-26
projet: COURTIARK
type: chantier — nettoyage de l'index et acquisition
---

# COURTIARK — INDEX CLEANUP 2026-09-26

## Pourquoi cette note

Google connaissait le domaine avec environ **1 100 URL indexées** alors que l'architecture
actuelle compte **80 pages publiques**. Cette note explique le chiffre, classe chaque URL heritée,
documente les redirections posees et l'ecart du sitemap.

## 1. Inventaire

| Element | Valeur |
|---|---|
| URL inventoriees (disque + sitemaps) | %d |
| dont indexables | %d |
| dont en noindex volontaire | %d |
| dont declarees dans un sitemap | %d |
| URL heritees (hors 80 pages actuelles) | %d |

Repartition des URL heritees par motif :

| Pattern | Nombre |
|---|---|
%s

## 2. Classification (une action par URL, aucune cellule vide)

| Action | Nombre |
|---|---|
%s

Les 1 065 pages de villes (`/fr/logiciel-courtier-*-<ville>`) etaient deja en noindex volontaire :
elles ne sont ni supprimees ni redirigees, Google doit les retirer progressivement
(statut **PENDING_GOOGLE**).

## 3. Redirections

- %d redirections heritees ajoutees, portees par `seo/legacy_redirects.json` (source unique lue
  par `seo/build.py`) : aucun second mecanisme cree.
- La destination est choisie par sujet : relance vers relance, portefeuille vers portefeuille,
  Suisse vers Suisse, Geneve vers Geneve. **Aucune redirection en masse vers l'accueil.**
- Controle automatise `seo/check_redirects.py` : %d conformes, %d en echec, %d chaine(s) detectee(s).

## 4. Le chiffre « 1 100 indexees »

Search Console affiche environ 1 100 URL indexees pour le domaine : ce sont presque exclusivement
les URL de l'ancien plan de site (`/fr/*`, `/ch/*`), dont les 1 065 pages locales deja sorties de
l'index volontairement. L'interface n'expose pas la liste complete : elle donne des volumes, des
motifs et des exemples.

URL individuellement identifiees pendant cette phase : **%s** (rapport de performances) +
**13** exemples nommes par les motifs d'exclusion + **%s** URL heritees inventoriees dans le depot.
**Le reste n'est pas inventorie faute d'export disponible, et n'est pas invente.**

## 5. Sitemaps

- 10 sitemaps de section + 1 index : **%s URL** au total, toutes presentes dans le gate (80).
- L'ecart « 42 URL decouvertes » correspond a une lecture partielle de l'index par Google a cette
  date ; trois sections ont ete soumises separement et lues (france 11, switzerland 13, tools 5).
- `features.xml` refuse par Google (« impossible de recuperer ») alors que le fichier etait
  identique en tout point a un sitemap accepte (HTTP, type, taille, BOM, encodage, XML, reponse a
  Googlebot) : **regeneré en `features-v2.xml`**, reference dans l'index, ancien chemin redirige.
  Statut **PENDING_GOOGLE** pour la lecture de la nouvelle version.

## 6. Money page « logiciel pour courtier en assurance »

- Position T0 : 13,0. URL cible unique : `/logiciel-courtier-assurance`.
- Page reconstruite : title dedie, H1 unique, 12 sections H2, comparatif Excel / CRM generaliste /
  COURTIARK (formulations non absolues), FAQ de 6 questions d'intention, 4 blocs JSON-LD.
- Maillage : **18 pages** lient la money page, avec des ancres variees
  (« logiciel pour courtier en assurance », « logiciel de courtage », « CRM assurance »,
  « CRM pour courtier », « piloter un cabinet de courtage », « COURTIAARK »).
- SERP analysee le 26/09 : lyaprotect, assur3d, peritus, modulr, orisha, applied, custy, duplix,
  korint, creatio. Attentes retenues : perimetre explicite, vocabulaire metier, FAQ, preuve, essai.

## 7. Metriques : CTR n'est pas conversion

Sur la periode T0, le CTR observe est plus eleve sur l'echantillon suisse (9 clics / 36 impressions)
que francais (5 clics / 129 impressions), **mais le volume est faible et cela ne mesure pas la
conversion business**. Aucune superiorite de conversion n'est demontree : les demandes de demo et
les essais par pays ne sont pas mesurables aujourd'hui (aucun lead reel).

Definitions retenues : CTR SERP = clics/impressions · CTA Rate = clics CTA/sessions organiques ·
Demo Rate = demos/sessions · Trial Rate = essais/sessions · Activation Rate = activations/essais ·
Customer Rate = clients/sessions.

## 8. Tracking

Verifies en base : `seo_page_view`, `cta_trial_click`, `cta_demo_click`, `ark_demo_view`,
`pricing_view`, `demo_form_view`, `demo_form_submit`, `demo_request_success`, `demo_request_failure`,
`tool_start`, `tool_complete`, et **`tool_cta_click`** ajoute dans cette phase avec les champs
`tool_slug`, `cta_target`, `landing_page`, `timestamp`.

## 9. Autorite

44 domaines notes (aucun indicateur d'autorite invente). Top 5 revalide avec contact reel et email
source : Courtage Magazine (Laurent Lemonnier), Digital et Assurance (Alexandre Pengloan), ACA
(secretariat@aca-courtiers.info), Orica, AsCourtage (formulaire). Cinq messages et leurs relances
J+5 et J+12 sont prets dans `docs/seo/OUTREACH_DRAFTS.md`. **Statut : READY_FOR_SEND, aucun envoi.**

## 10. Etat final

- gate local : 80 pages, 0 erreur, 0 duplication ; `gate --prod` : 80 URL, 0 echec.
- Lighthouse mobile : 100/100/100/100 sur la money page (LCP 0,9 s, TBT 0 ms, CLS 0).
- Responsive : 20 combinaisons (360 a 1920 px), aucun debordement.
- Statuts Google restants : indexation des 80 pages, lecture de `features-v2.xml`, retrait des
  1 065 pages locales, evolutions de position. Tout cela est **PENDING_GOOGLE**, pas termine.
""" % (len(actuelles), len(indexables), len([l for l in actuelles if l['indexable'] == 'non']),
       len(dans_sitemap), len(legacy),
       '\n'.join('| %s | %d |' % (p, n) for p, n in sorted(motifs.items(), key=lambda x: -x[1])),
       '\n'.join('| %s | %d |' % (a, n) for a, n in sorted(actions.items(), key=lambda x: -x[1])),
       len(redir), ok, ko, chains, '67', len(legacy), len(dans_sitemap))

    ok_e, err = ecrire('COURTIARK — INDEX CLEANUP 2026-09-26.md', note)
    print('note index cleanup :', ok_e, err)

    section = """
## Chantier index cleanup (%s)

- %d URL heritees inventoriees et classees (fichier `04_legacy_classification.csv`).
- %d redirections heritees posees via `seo/legacy_redirects.json` ; %d conformes en production,
  %d chaine(s) detectee(s).
- `features.xml` remplace par `features-v2.xml` (ancien chemin redirige), statut PENDING_GOOGLE.
- Money page « logiciel pour courtier en assurance » reconstruite (12 sections, comparatif, FAQ)
  et reliee par 18 pages.
- `tool_cta_click` ajoute au tracking.
- Note complete : **COURTIARK — INDEX CLEANUP 2026-09-26**.
""" % ('2026-09-26', len(legacy), len(redir), ok, chains)
    for nom, marqueur in [('COURTIARK — SEO ACQUISITION MASTER EXECUTION.md', 'Chantier index cleanup'),
                          ('COURTIARK SEO DEPLOYMENT LOG.md', 'Chantier index cleanup'),
                          ('COURTIARK SEO PERFORMANCE LOG.md', 'Chantier index cleanup')]:
        ok_a, msg = ajouter(nom, marqueur, section)
        print('%-52s %s %s' % (nom, 'OK' if ok_a else 'ECHEC', msg))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
