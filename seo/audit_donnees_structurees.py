#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Audit des donnees structurees (exigence §20-26) sur les pages publiques construites."""
import io
import json
import os
import re

PUB = '/srv/courtia/frontend/public'
PAGES = [('', 'accueil'), ('logiciel-courtier-assurance', 'money page'), ('crm-courtier-assurance', 'CRM'),
         ('etudes/courtage-assurance-france-2026', 'etude'), ('etudes/methodologie-cartographie-courtage-france', 'methodo'),
         ('suisse/geneve', 'geo CH'), ('conformite/controle-acpr-courtier', 'conformite'), ('presse', 'presse'),
         ('guides/devoir-de-conseil-suivi-dossier', 'guide')]


def main():
    inventaire = {}
    souci = []
    for chemin, nom in PAGES:
        f = os.path.join(PUB, chemin, 'index.html') if chemin else os.path.join(PUB, 'index.html')
        h = io.open(f, encoding='utf-8').read()
        blocs = re.findall(r'<script type="application/ld\+json">(.*?)</script>', h, re.S)
        types = []
        for b in blocs:
            try:
                d = json.loads(b)
            except Exception as e:
                souci.append('%s : JSON-LD invalide (%s)' % (nom, str(e)[:40]))
                continue
            t = d.get('@type')
            types.append(t)
            if t == 'SoftwareApplication':
                for champ in ('name', 'description', 'url', 'applicationCategory', 'operatingSystem',
                              'screenshot', 'featureList'):
                    if champ not in d:
                        souci.append('%s : SoftwareApplication sans %s' % (nom, champ))
                for off in d.get('offers', []):
                    if not off.get('price') or not off.get('priceCurrency'):
                        souci.append('%s : offre sans prix ou devise' % nom)
            if t == 'Organization':
                for champ in ('name', 'url', 'logo'):
                    if champ not in d:
                        souci.append('%s : Organization sans %s' % (nom, champ))
        inventaire[nom] = types
        if 'BreadcrumbList' not in types and chemin.count('/') >= 1:
            souci.append('%s : pas de BreadcrumbList' % nom)
    print('| Page | Types de donnees structurees |')
    print('|---|---|')
    for nom, types in inventaire.items():
        print('| %s | %s |' % (nom, ', '.join(t or '?' for t in types)))
    print()
    print('anomalies :', len(souci))
    for s in souci:
        print('  -', s)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
