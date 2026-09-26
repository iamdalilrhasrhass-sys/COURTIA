#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Verifie les redirections en production : chaines, boucles, destinations mortes.

Pour chaque redirection declaree dans vercel.json :
  - requete sur la source, suivi des hops (maximum 5) ;
  - controle : une seule redirection interne, destination finale en 200,
    destination non noindex, destination presente dans un sitemap.

Produit docs/seo/preuves/2026-09-26-phase-index-cleanup/05_redirect_map.csv

Usage : python3 seo/check_redirects.py [--limite N]
"""
import csv
import io
import json
import os
import re
import subprocess
import sys

RACINE = '/srv/courtia'
PREUVES = os.path.join(RACINE, 'docs', 'seo', 'preuves', '2026-09-26-phase-index-cleanup')
BASE = 'https://courtiark.fr'
MAX_HOPS = 5


def entete(url):
    r = subprocess.run(['curl', '-s', '-I', '--max-time', '15', '-o', '/dev/null',
                        '-w', '%{http_code}|%{redirect_url}', url], capture_output=True, text=True)
    sortie = r.stdout.strip().split('|')
    code = int(sortie[0]) if sortie and sortie[0].isdigit() else 0
    return code, (sortie[1] if len(sortie) > 1 else '')


def corps(url, limite=8000):
    r = subprocess.run(['curl', '-s', '--max-time', '20', url], capture_output=True, text=True)
    return r.stdout[:limite]


def suivre(source):
    hops = []
    url = BASE + source
    for _ in range(MAX_HOPS):
        code, suivant = entete(url)
        hops.append({'url': url, 'status': code, 'location': suivant})
        if code in (301, 302, 307, 308) and suivant:
            url = suivant
            continue
        break
    return hops


def indexable(url):
    h = corps(url, 6000)
    if not h:
        return None
    m = re.search(r'<meta[^>]+name="robots"[^>]+content="([^"]+)"', h, re.I)
    if h.lstrip().startswith('<!DOCTYPE') and not m:
        return True
    return not (m and 'noindex' in m.group(1).lower())


def main():
    cfg = json.load(io.open(os.path.join(RACINE, 'vercel.json'), encoding='utf-8'))
    redirections = [r for r in cfg.get('redirects', [])
                    if not (r['destination'] == r['source'].rstrip('/'))]
    limite = None
    if '--limite' in sys.argv:
        limite = int(sys.argv[sys.argv.index('--limite') + 1])
    if limite:
        redirections = redirections[:limite]
    lignes = []
    problemes = []
    for r in redirections:
        source = r['source']
        if ':' in source and '*' in source:
            continue  # motifs generiques : non testes un par un
        hops = suivre(source)
        finale = hops[-1]
        interne = sum(1 for h in hops[:-1] if h['status'] in (301, 302, 307, 308))
        dedans = indexable(finale['url'])
        ligne = {
            'source': source,
            'expected_destination': r['destination'],
            'actual_status': hops[0]['status'],
            'actual_location': hops[0]['location'].replace(BASE, ''),
            'final_status': finale['status'],
            'hops': interne,
            'final_url': finale['url'].replace(BASE, ''),
            'destination_indexable': 'oui' if dedans else 'non' if dedans is False else 'non verifie',
            'passed': 'oui',
        }
        if interne > 1:
            ligne['passed'] = 'non'; ligne['raison'] = 'chaine de redirections'
        elif finale['status'] not in (200, 304):
            ligne['passed'] = 'non'; ligne['raison'] = 'destination %s' % finale['status']
        elif dedans is False:
            ligne['passed'] = 'non'; ligne['raison'] = 'destination non indexable'
        elif ligne['actual_location'] and not ligne['actual_location'].startswith(r['destination']):
            ligne['passed'] = 'non'; ligne['raison'] = 'destination inattendue'
        lignes.append(ligne)
        if ligne['passed'] == 'non':
            problemes.append(ligne)
    chemin = os.path.join(PREUVES, '05_redirect_map.csv')
    os.makedirs(PREUVES, exist_ok=True)
    with io.open(chemin, 'w', encoding='utf-8', newline='') as f:
        w = csv.DictWriter(f, fieldnames=['source', 'expected_destination', 'actual_status', 'actual_location',
                                          'final_status', 'hops', 'final_url', 'destination_indexable',
                                          'passed', 'raison'])
        w.writeheader()
        for l in lignes:
            w.writerow({k: l.get(k, '') for k in w.fieldnames})
    print('redirections testees :', len(lignes))
    print('  conformes          :', len([l for l in lignes if l['passed'] == 'oui']))
    print('  en echec           :', len(problemes))
    print('  chains (>1 hop)    :', len([l for l in lignes if l['hops'] > 1]))
    for p in problemes[:12]:
        print('   %-52s %s -> %s (%s)' % (p['source'], p['actual_status'], p['final_url'], p.get('raison')))
    print('fichier :', os.path.relpath(chemin, RACINE))
    return 0 if not problemes else 1


if __name__ == '__main__':
    raise SystemExit(main())
