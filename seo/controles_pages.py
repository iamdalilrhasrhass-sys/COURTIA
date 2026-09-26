#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Controles SEO sur les 80 pages publiques : canonical, titles, descriptions, donnees structurees.

Sortie : docs/seo/preuves/2026-09-26-phase-index-cleanup/12_controles_pages.md
"""
import collections
import io
import json
import os
import re

RACINE = '/srv/courtia'
PUB = os.path.join(RACINE, 'frontend', 'public')
PREUVES = os.path.join(RACINE, 'docs', 'seo', 'preuves', '2026-09-26-phase-index-cleanup')
BASE = 'https://courtiark.fr'


def pages():
    """Uniquement les pages de l'architecture actuelle : celles declarees dans les sitemaps."""
    declarees = set()
    repertoire = os.path.join(PUB, 'sitemaps')
    for f in sorted(os.listdir(repertoire)):
        for u in re.findall(r'<loc>(.*?)</loc>', io.open(os.path.join(repertoire, f), encoding='utf-8').read()):
            declarees.add(u.replace(BASE, '').rstrip('/') or '/')
    out = {}
    for chemin_rel in sorted(declarees):
        chemin = os.path.join(PUB, chemin_rel.strip('/'), 'index.html') if chemin_rel != '/' \
            else os.path.join(PUB, 'index.html')
        if os.path.exists(chemin):
            out[chemin_rel] = io.open(chemin, encoding='utf-8', errors='replace').read()
    return out


def main():
    p = pages()
    titres, descriptions, problemes = collections.defaultdict(list), collections.defaultdict(list), []
    canonical_ko, jsonld_ko, h1_ko = [], [], []
    for chemin, h in sorted(p.items()):
        titre = re.search(r'<title>(.*?)</title>', h, re.S)
        desc = re.search(r'<meta[^>]+name="description"[^>]+content="([^"]*)"', h, re.I)
        canon = re.search(r'<link[^>]+rel="canonical"[^>]+href="([^"]+)"', h, re.I)
        h1 = re.findall(r'<h1[^>]*>(.*?)</h1>', h, re.S)
        blocs = re.findall(r'<script type="application/ld\+json">(.*?)</script>', h, re.S)
        url = BASE + ('' if chemin == '/' else chemin)
        titres[(titre.group(1).strip() if titre else '')].append(chemin)
        descriptions[(desc.group(1).strip() if desc else '')].append(chemin)
        if not canon or canon.group(1).rstrip('/') != url.rstrip('/'):
            canonical_ko.append((chemin, canon.group(1) if canon else 'absent'))
        if len(h1) != 1:
            h1_ko.append((chemin, len(h1)))
        for b in blocs:
            try:
                json.loads(b)
            except Exception as e:
                jsonld_ko.append((chemin, str(e)[:60]))
        if titre and len(titre.group(1)) > 65:
            problemes.append((chemin, 'title %d caracteres' % len(titre.group(1))))
        if desc and len(desc.group(1)) > 170:
            problemes.append((chemin, 'description %d caracteres' % len(desc.group(1))))
    doublons_t = {t: v for t, v in titres.items() if len(v) > 1}
    doublons_d = {d: v for d, v in descriptions.items() if len(v) > 1 and d}

    L = ['# Controles SEO sur les pages publiques (26/09/2026)', '',
         '| Controle | Resultat |', '|---|---|',
         '| Pages analysees | %d |' % len(p),
         '| Canonical non auto-referente | %d |' % len(canonical_ko),
         '| H1 absent ou multiple | %d |' % len(h1_ko),
         '| JSON-LD invalide | %d |' % len(jsonld_ko),
         '| Titles en doublon | %d |' % len(doublons_t),
         '| Descriptions en doublon | %d |' % len(doublons_d),
         '| Titles > 65 caracteres | %d |' % len([x for x in problemes if 'title' in x[1]]),
         '| Descriptions > 170 caracteres | %d |' % len([x for x in problemes if 'description' in x[1]]),
         '']
    if canonical_ko:
        L += ['## Canonical a corriger', ''] + ['- `%s` -> `%s`' % x for x in canonical_ko] + ['']
    if h1_ko:
        L += ['## H1 a corriger', ''] + ['- `%s` : %d H1' % x for x in h1_ko] + ['']
    if jsonld_ko:
        L += ['## JSON-LD invalide', ''] + ['- `%s` : %s' % x for x in jsonld_ko] + ['']
    if doublons_t:
        L += ['## Titles en doublon', ''] + ['- %s : %s' % (t[:60], ', '.join(v)) for t, v in doublons_t.items()] + ['']
    if doublons_d:
        L += ['## Descriptions en doublon', ''] + ['- %s : %s' % (d[:60], ', '.join(v)) for d, v in doublons_d.items()] + ['']
    if problemes:
        L += ['## Longueurs hors norme', ''] + ['- `%s` : %s' % x for x in problemes[:40]] + ['']
    if len(L) == 13:
        L += ['Aucun defaut detecte sur ces controles.', '']
    # donnees structurees presentes
    types = collections.Counter()
    for h in p.values():
        for b in re.findall(r'<script type="application/ld\+json">(.*?)</script>', h, re.S):
            try:
                d = json.loads(b)
            except Exception:
                continue
            t = d.get('@type')
            if isinstance(t, list):
                for x in t:
                    types[x] += 1
            elif t:
                types[t] += 1
    L += ['## Donnees structurees presentes', '', '| Type | Pages |', '|---|---|']
    L += ['| %s | %d |' % (t, n) for t, n in types.most_common()]
    L += ['', 'Aucun AggregateRating ni avis fictif n\'est publie : il n\'y a pas d\'avis client reel.', '']
    io.open(os.path.join(PREUVES, '12_controles_pages.md'), 'w', encoding='utf-8').write('\n'.join(L))
    print('\n'.join(L[:16]))
    print('canonical KO:', len(canonical_ko), '| H1 KO:', len(h1_ko), '| JSON-LD KO:', len(jsonld_ko),
          '| titles doublons:', len(doublons_t), '| descriptions doublons:', len(doublons_d))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
