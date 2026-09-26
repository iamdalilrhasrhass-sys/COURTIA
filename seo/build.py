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
from contenu_villes import pages_villes  # noqa: E402
from contenu_intentions import pages_intentions  # noqa: E402
from contenu_outils import pages_outils  # noqa: E402
from contenu_glossaire import pages_glossaire  # noqa: E402
from scripts_js import (MESURE_JS, FORMULAIRE_JS, OUTIL_JS, TRANSFORMATION_JS,  # noqa: E402
                        CHECKLIST_DOSSIER_JS, CHECKLIST_RENOUV_JS)

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC = os.path.join(RACINE, 'frontend', 'public')
VERCEL = os.path.join(RACINE, 'vercel.json')


# Redirections permanentes : les variantes d'une meme intention pointent vers UNE page canonique.
# Objectif : repondre aux URL attendues sans creer de contenu en double (cannibalisation).
ALIAS = {
    # variantes d'intention couvertes par une page canonique existante
    '/crm-assurance': '/crm-courtier-assurance',
    '/gestion-portefeuille-assurance': '/fonctionnalites/gestion-portefeuille-assurance',
    '/logiciel-relance-devis-assurance': '/fonctionnalites/relance-devis-assurance',
    '/logiciel-renouvellement-assurance': '/fonctionnalites/renouvellements-assurance',
    '/logiciel-gestion-documents-assurance': '/fonctionnalites/gestion-documents-assurance',
    '/crm-courtier-independant': '/solutions/courtier-assurance-independant',
    '/crm-cabinet-courtage': '/solutions/cabinet-courtage-assurance',
    '/crm-assurance-suisse': '/suisse/crm-courtier-assurance',
    '/logiciel-courtier-suisse': '/suisse/crm-courtier-assurance',
    '/crm-courtier-geneve': '/suisse/geneve',
    '/crm-courtier-lausanne': '/suisse/lausanne',
    '/guides/comment-relancer-devis-assurance': '/guides/comment-ne-plus-oublier-relances-courtier',
    '/guides/comment-organiser-portefeuille-assurance': '/guides/organiser-portefeuille-assurance',
    '/guides/comment-suivre-renouvellements-assurance': '/guides/automatiser-renouvellements-assurance',
    '/guides/comment-centraliser-documents-clients-assurance': '/guides/centraliser-documents-clients-assurance',
    '/guides/comment-reduire-saisie-courtier': '/guides/reduire-saisie-manuelle-courtier',
    '/guides/comment-suivre-prospects-assurance': '/guides/automatiser-suivi-prospects-assurance',
    # pages historiques de marque ou de branche sans equivalent dans le nouveau moteur
    '/fr/alternative-courtigo': '/comparatifs/crm-assurance-vs-crm-generaliste',
    '/fr/alternative-kase': '/comparatifs/crm-assurance-vs-crm-generaliste',
    '/fr/alternative-lya': '/comparatifs/crm-assurance-vs-crm-generaliste',
    '/fr/alternative-oggo-data': '/comparatifs/crm-assurance-vs-crm-generaliste',
    '/fr/logiciel-courtier-habitation': '/assurances',
    '/fr/logiciel-courtier-grossiste': '/assurances',
    '/fr/logiciel-courtier-mandataire': '/assurances',
    '/fr/demo-et-essai-gratuit': '/demo',
    '/fr/outil-courtier-assurance': '/outils',
    # hubs historiques : consolidation vers les hubs de marque COURTIARK
    '/fr': '/france',
    '/ch': '/suisse',
    '/fr/evaluer-crm-courtier-assurance': '/comparatifs/crm-assurance-vs-crm-generaliste',
    '/fr/guide/choisir-crm-cabinet-courtage': '/logiciel-courtier-assurance',
    # page d'atterrissage historique : meme intention que l'accueil, marque anterieure
    '/landing': '/',
    # consolidation : anciens clusters et doublons /fr et /ch
    '/ch/glossaire': '/glossaire',
    '/ch/crm-courtier-assurance-suisse': '/suisse/crm-courtier-assurance',
    '/ch/logiciel-courtier-assurance-suisse': '/suisse/crm-courtier-assurance',
    '/ch/logiciel-intermediaire-assurance-suisse': '/suisse/crm-courtier-assurance',
    '/ch/gestion-portefeuille-assurance-suisse': '/fonctionnalites/gestion-portefeuille-assurance',
    '/ch/gestion-documentaire-courtier-assurance-suisse': '/fonctionnalites/gestion-documents-assurance',
    '/ch/relances-courtier-assurance-suisse': '/fonctionnalites/relance-devis-assurance',
    '/ch/logiciel-devis-courtier-assurance-suisse': '/fonctionnalites/relance-devis-assurance',
    '/ch/outils/calculateur-temps-administratif-suisse': '/outils/calculateur-productivite-courtier',
    '/ch/tarifs-logiciel-courtier-chf': '/tarifs',
    '/fr/tarifs-logiciel-courtier': '/tarifs',
    '/fr/outils/calculateur-temps-administratif': '/outils/calculateur-productivite-courtier',
    '/fr/outils/calculateur-manipulations-administratives': '/outils/calculateur-productivite-courtier',
    '/fr/guide/centraliser-dossiers-clients': '/guides/centraliser-documents-clients-assurance',
    '/fr/gestion-documentaire-courtier-assurance': '/fonctionnalites/gestion-documents-assurance',
    '/fr/gestion-commissions-courtier-assurance': '/fonctionnalites/gestion-clients',
    '/fr/comparatif/crm-courtier-vs-excel': '/comparatifs/excel-vs-crm-courtier-assurance',
    '/fr/comparatif/crm-specialise-vs-crm-generaliste': '/comparatifs/crm-assurance-vs-crm-generaliste',
    # consolidation : les anciennes pages /fr redondantes renvoient vers la page canonique
    '/fr/crm-courtier-assurance': '/crm-courtier-assurance',
    '/fr/logiciel-courtier-assurance': '/logiciel-courtier-assurance',
    '/fr/automatisation-courtier-assurance': '/automatisation-courtier-assurance',
    '/fr/courtia-logiciel-courtage-assurance': '/logiciel-courtage-assurance',
    '/fr/gestion-portefeuille-courtier': '/fonctionnalites/gestion-portefeuille-assurance',
    '/fr/glossaire': '/glossaire',
}

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
    if path == '/glossaire':
        return 'resources'
    if path == '/tarifs':
        return 'core'
    for nom, motif in [('features', '/fonctionnalites/'), ('solutions', '/solutions/'), ('assurances', '/assurances/'),
                       ('france', '/france/'), ('switzerland', '/suisse/'), ('resources', '/guides/'),
                       ('tools', '/outils/'), ('comparatifs', '/comparatifs/')]:
        if path.startswith(motif):
            return nom
    return 'core'


def main():
    pages = (pages_core() + pages_geo() + pages_villes() + pages_intentions() + pages_outils()
             + pages_glossaire() + pages_ressources())
    chemins = [p['path'] for p in pages]
    doublons = [c for c, n in Counter(chemins).items() if n > 1]
    if doublons:
        raise SystemExit(f'Chemins dupliques : {doublons}')

    HUBS = ('/fonctionnalites', '/solutions', '/assurances', '/france', '/suisse', '/guides', '/outils',
            '/comparatifs', '/demo', '/contact')
    ecrits = []
    for page in pages:
        html = rendre(page)
        html = html.replace('</body>', TRACK_JS + '</body>')
        # Les hubs sont servis sans slash final : on evite les redirections 308 dans les liens internes.
        for h in HUBS:
            html = html.replace(f'href="{h}/"', f'href="{h}"')
        dest = fichier_de(page['path'])
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        io.open(dest, 'w', encoding='utf-8').write(html)
        page['_octets'] = len(html.encode('utf-8'))
        page['_section'] = section_de(page['path'])
        ecrits.append((page['path'], os.path.relpath(dest, RACINE), page['_octets']))

    # ---------------------------------------------------------------- scripts externes
    # La politique de securite du site interdit le script en ligne (script-src 'self') :
    # chaque script est donc un fichier, ce qui le rend aussi cacheable.
    os.makedirs(os.path.join(PUBLIC, 'js'), exist_ok=True)
    for nom, contenu in (('mesure.js', MESURE_JS), ('formulaire-demo.js', FORMULAIRE_JS),
                         ('outil-calculateur.js', OUTIL_JS), ('outil-transformation.js', TRANSFORMATION_JS),
                         ('checklist-dossier.js', CHECKLIST_DOSSIER_JS), ('checklist-renouvellement.js', CHECKLIST_RENOUV_JS)):
        io.open(os.path.join(PUBLIC, 'js', nom), 'w', encoding='utf-8').write(contenu.strip() + '\n')
    print('scripts externes ecrits : mesure.js, formulaire-demo.js, outil-calculateur.js')

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

    # Redirections : on conserve celles deja declarees et on ajoute les alias
    existantes = {r['source'] for r in cfg.get('redirects', [])}
    for source, cible in ALIAS.items():
        if source in existantes:
            continue
        cfg.setdefault('redirects', []).append({'source': source, 'destination': cible, 'permanent': True})

    # Ancien cluster de glossaire : toutes les entrees pointent vers le glossaire unique
    for joker in [{'source': '/fr/glossaire/:chemin*', 'destination': '/glossaire', 'permanent': True}]:
        if joker['source'] not in existantes:
            cfg['redirects'].append(joker)
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
