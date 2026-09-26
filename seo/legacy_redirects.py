#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Genere seo/legacy_redirects.json depuis la classification des URL heritees.

Le fichier produit est la source unique des redirections heritees, lue par seo/build.py
et fusionnee dans vercel.json (sans creer de second mecanisme).
"""
import csv
import io
import json
import os

RACINE = '/srv/courtia'
PREUVES = os.path.join(RACINE, 'docs', 'seo', 'preuves', '2026-09-26-phase-index-cleanup')
SORTIE = os.path.join(RACINE, 'seo', 'legacy_redirects.json')


def main():
    chemin = os.path.join(PREUVES, '04_legacy_classification.csv')
    entrees = []
    with io.open(chemin, encoding='utf-8') as f:
        for ligne in csv.DictReader(f):
            if not ligne['recommended_action'].startswith('REDIRECT'):
                continue
            source = ligne['url'].replace('https://courtiark.fr', '')
            destination = ligne['closest_current_url'].replace('https://courtiark.fr', '')
            if not source or not destination or source == destination:
                continue
            entrees.append({
                'source': source,
                'destination': destination,
                'permanent': True,
                'reason': ligne['topic'] or 'page heritee',
                'confidence': ligne['confidence'],
            })
    entrees.sort(key=lambda x: x['source'])
    os.makedirs(os.path.dirname(SORTIE), exist_ok=True)
    with io.open(SORTIE, 'w', encoding='utf-8') as f:
        json.dump(entrees, f, ensure_ascii=False, indent=1)
    print('redirections heritees ecrites :', len(entrees))
    print('fichier :', SORTIE)
    par_cible = {}
    for e in entrees:
        par_cible[e['destination']] = par_cible.get(e['destination'], 0) + 1
    print('principales cibles :')
    for cible, n in sorted(par_cible.items(), key=lambda x: -x[1])[:12]:
        print('   %-50s %d' % (cible, n))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
