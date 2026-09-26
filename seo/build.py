#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Construction du site public COURTIARK : pages HTML, sitemaps, robots, reecritures Vercel, llms.txt.

Usage : python3 seo/build.py           (ecrit dans frontend/public et met a jour vercel.json)
"""
from __future__ import annotations

import io
import json
import os
import re
import sys
from collections import Counter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from moteur import SITE, rendre, url_of  # noqa: E402
from contenu_core import pages_core  # noqa: E402
from contenu_geo import pages_geo  # noqa: E402
from contenu_ressources import pages_ressources, TRACK_JS  # noqa: E402

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC = os.path.join(RACINE, 'frontend', 'public')
VERCEL = os.path.join(RACINE, 'vercel.json')

SECTIONS = {
    'core': ['', '/crm-courtier-assurance'],
    'features': ['/fonctionnalites/', '/fonctionnalites/'],
    'solutions': ['/solutions/', '/solutions/'],
    'assurances': ['/assurances/', '/assurances/'],
    'france': ['/france/', '/france/'],
    'switzerland': ['/suisse/', '/suisse/'],
    'resources': ['/guides/', '/guides/'],
    'tools': ['/outils/', '/outils/'],
    'comparatifs': ['/comparatifs/', '/comparatifs/'],
    'trust': ['/securite', '/securite'],
}

def fichier_de(path: str) -> str:
    p = path.strip('/')
    return os.path.join(PUBLIC, 'index.html') if not p else os.path.join(PUBLIC, p, 'index.html')

TRUST = ('/securite', '/a-propos', '/contact', '/mentions-legales', '/confidentialite', '/demo/', '/demo-public')

def section_de(path: str) -> str:
    if path == '' or path == '/crm-courtier-assurance':
        return 'core'
    if path in TRUST:
        return 'trust'
    for nom, motif in [('features', '/fonctionnalites/'), ('solutions', '/solutions/'), ('assurances', '/assurances/'),
                       ('france', '/france/'), ('switzerland', '/suisse/'), ('resources', '/guides/'),
                       ('tools', '/outils/'), ('comparatifs', '/comparatifs/')]:
        if path.startswith(motif):
            return nom
    return 'core'


def main():
    pages = pages_core() + pages_geo() + pages_ressources()
    chemins = [p['path'] for p in pages]
    doublons = [c for c, n in Counter(chemins).items() if n > 1]
    if doublons:
        raise SystemExit(f'Chemins dupliques : {doublons}')

    ecrits = []
    for page in pages:
        html = rendre(page)
        html = html.replace('</body>', TRACK_JS + '</body>')
        dest = fichier_de(page['path'])
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        io.open(dest, 'w', encoding='utf-8').write(html)
        page['_octets'] = len(html.encode('utf-8'))
        page['_section'] = section_de(page['path'])
        ecrits.append((page['path'], os.path.relpath(dest, RACINE), page['_octets']))

    # ---------------------------------------------------------------- sitemaps
    par_section = {}
    for page in pages:
        if not page.get('indexable', True):
            continue
        par_section.setdefault(page['_section'], []).append(page)

    os.makedirs(os.path.join(PUBLIC, 'sitemaps'), exist_ok=True)
    for nom in sorted(os.listdir(os.path.join(PUBLIC, 'sitemaps'))):
        if nom.endswith('.xml'):
            os.remove(os.path.join(PUBLIC, 'sitemaps', nom))

    entrees_index = []
    for section, liste in sorted(par_section.items()):
        lignes = ['<?xml version="1.0" encoding="UTF-8"?>',
                  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" '
                  'xmlns:xhtml="http://www.w3.org/1999/xhtml">']
        for page in sorted(liste, key=lambda x: x['path']):
            u = url_of(page['path'])
            alt = ''
            if page.get('alternate'):
                lang = 'fr-CH' if page.get('country') == 'CH' else 'fr-FR'
                autre = 'fr-FR' if lang == 'fr-CH' else 'fr-CH'
                alt = (f'\n    <xhtml:link rel="alternate" hreflang="{lang}" href="{u}"/>'
                       f'\n    <xhtml:link rel="alternate" hreflang="{autre}" href="{url_of(page["alternate"])}"/>')
            lignes.append(f'  <url>\n    <loc>{u}</loc>{alt}\n    <changefreq>monthly</changefreq>'
                          f'\n    <priority>{"1.0" if page["path"] == "" else "0.8"}</priority>\n  </url>')
        lignes.append('</urlset>')
        chemin = os.path.join(PUBLIC, 'sitemaps', f'{section}.xml')
        io.open(chemin, 'w', encoding='utf-8').write('\n'.join(lignes))
        entrees_index.append(f'  <sitemap>\n    <loc>{SITE}/sitemaps/{section}.xml</loc>\n  </sitemap>')

    index = ('<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
             + '\n'.join(entrees_index) + '\n</sitemapindex>\n')
    io.open(os.path.join(PUBLIC, 'sitemap.xml'), 'w', encoding='utf-8').write(index)

    # ---------------------------------------------------------------- robots.txt
    robots = io.open(os.path.join(PUBLIC, 'robots.txt'), encoding='utf-8').read()
    robots = re.sub(r'# robots\.txt — .*', '# robots.txt — courtiark.fr (COURTIARK) — CRM et cockpit IA pour courtiers en assurance', robots, count=1)
    robots = re.sub(r'(?m)^#\s*Mise à jour\s*:.*$', '# Mise à jour : 2026-09-26 (refonte SEO : marque COURTIARK, site public statique).', robots, count=1)
    deja = re.findall(r'(?m)^Sitemap: (.*)$', robots)
    nouveaux = [f'{SITE}/sitemap.xml'] + [f'{SITE}/sitemaps/{s}.xml' for s in sorted(par_section)]
    bloc = '\n'.join(f'Sitemap: {u}' for u in nouveaux)
    robots = re.sub(r'(?m)^Sitemap: .*$', '', robots).rstrip() + '\n\n' + bloc + '\n'
    io.open(os.path.join(PUBLIC, 'robots.txt'), 'w', encoding='utf-8').write(robots)

    # ---------------------------------------------------------------- llms.txt
    llms = [f'# {SITE.split("//")[1]}', '', '> COURTIARK — CRM et cockpit IA pour cabinets de courtage en assurance (France et Suisse).',
            '', "Categorie produit : CRM courtier assurance, logiciel de courtage, gestion de portefeuille d'assurance.",
            'Essai : 7 jours. France : 89 EUR HT/mois (Starter), 159 EUR HT/mois (Pro). Suisse : 199 CHF HT/mois (Independant), 349 CHF HT/mois (Cabinet).',
            '', '## Pages principales']
    for page in sorted(pages, key=lambda x: x['path']):
        if page.get('indexable', True):
            llms.append(f"- [{page['h1']}]({url_of(page['path'])}): {page['description']}")
    io.open(os.path.join(PUBLIC, 'llms.txt'), 'w', encoding='utf-8').write('\n'.join(llms) + '\n')

    # ---------------------------------------------------------------- vercel.json
    cfg = json.load(io.open(VERCEL, encoding='utf-8'))
    rewrites = [r for r in cfg.get('rewrites', []) if r['source'].startswith('/api/')]
    for page in sorted(pages, key=lambda x: -len(x['path'])):
        if page['path'] == '':
            continue
        source = page['path'].rstrip('/')
        rewrites.append({'source': source, 'destination': source + '/index.html'})
        rewrites.append({'source': source + '/', 'destination': source + '/index.html'})
    rewrites.append({'source': '/ch', 'destination': '/ch/index.html'})
    rewrites.append({'source': '/fr', 'destination': '/fr/index.html'})
    rewrites.append({'source': '/(.*)', 'destination': '/app.html'})
    cfg['rewrites'] = rewrites
    io.open(VERCEL, 'w', encoding='utf-8').write(json.dumps(cfg, ensure_ascii=False, indent=2) + '\n')

    # ---------------------------------------------------------------- rapport
    print(f'{len(pages)} pages ecrites')
    for path, rel, octets in ecrits:
        print(f'  {path or "/":52s} -> {rel:70s} {octets:>7d} o')
    print('\nsections sitemap :', {k: len(v) for k, v in sorted(par_section.items())})
    print('total URL indexables :', sum(len(v) for v in par_section.values()))
    json.dump([{k: v for k, v in p.items() if not k.startswith('_')} | {'slug': p['path'], '_octets': p.get('_octets'), '_section': p.get('_section')}
               for p in pages],
              io.open(os.path.join(RACINE, 'seo', 'pages.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
