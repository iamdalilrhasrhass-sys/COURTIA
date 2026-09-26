#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Verification independante de l'etude 2026 (double calcul, exigence §308-310).

Le calcul principal (courtage_france_2026.py) lit le CSV FRANCE_MASTER.csv avec csv.DictReader.
Ici on recalcule sur la serialisation **JSONL** du meme jeu de donnees (FRANCE_MASTER.jsonl) :
autre format, autre analyseur, meme source. Les deux resultats doivent etre identiques, sinon
la publication de l'etude est refusee.

Raison de ce choix : un decoupage positionnel de CSV se decale des qu'un champ contient une virgule
(adresses), ce qui rend le controle faux — la premiere version de ce script est tombee dans ce piege.
"""
import io
import json
import re
import sys
import unicodedata


def normaliser_commune(valeur):
    if not valeur:
        return ''
    sans = unicodedata.normalize('NFKD', valeur)
    sans = ''.join(c for c in sans if not unicodedata.combining(c))
    return re.sub(r'\s+', ' ', sans).strip().upper()

SOURCE = '/root/ark/courtia_prospection/data/FRANCE_MASTER.jsonl'
JSON = '/srv/courtia/frontend/public/donnees/courtage-france-2026.json'
REGIONS = {'01': 'Guadeloupe', '02': 'Martinique', '03': 'Guyane', '04': 'La Réunion', '06': 'Mayotte',
           '11': 'Île-de-France', '24': 'Centre-Val de Loire', '27': 'Bourgogne-Franche-Comté',
           '28': 'Normandie', '32': 'Hauts-de-France', '44': 'Grand Est', '52': 'Pays de la Loire',
           '53': 'Bretagne', '75': 'Nouvelle-Aquitaine', '76': 'Occitanie', '84': 'Auvergne-Rhône-Alpes',
           '93': "Provence-Alpes-Côte d'Azur", '94': 'Corse'}


def main():
    lignes = 0
    sirens = set()
    par_region, par_dep, par_ville, par_categorie = {}, {}, {}, {}
    for brut in io.open(SOURCE, encoding='utf-8'):
        if not brut.strip():
            continue
        d = json.loads(brut)
        lignes += 1
        sirens.add(d.get('siren'))
        r = (d.get('region') or '').strip()
        if r:
            par_region[r] = par_region.get(r, 0) + 1
        dep = (d.get('departement') or '').strip()
        if dep:
            par_dep[dep] = par_dep.get(dep, 0) + 1
        v = normaliser_commune(d.get('commune'))
        if v:
            par_ville[v] = par_ville.get(v, 0) + 1
        c = (d.get('categorie_entreprise') or '').strip()
        if c:
            par_categorie[c] = par_categorie.get(c, 0) + 1

    attendu = json.loads(io.open(JSON, encoding='utf-8').read())
    ecarts = []
    if attendu['total_etablissements'] != lignes:
        ecarts.append('total: %s vs %s' % (attendu['total_etablissements'], lignes))
    if attendu['total_siren_distincts'] != len(sirens):
        ecarts.append('siren: %s vs %s' % (attendu['total_siren_distincts'], len(sirens)))
    for reg in attendu['regions']:
        code = next((c for c, n in REGIONS.items() if n == reg['nom']), None)
        if code is None or par_region.get(code) != reg['etablissements']:
            ecarts.append('region %s: %s vs %s' % (reg['nom'], reg['etablissements'], par_region.get(code)))
    for dep in attendu['departements']:
        if par_dep.get(dep['code']) != dep['etablissements']:
            ecarts.append('departement %s: %s vs %s' % (dep['code'], dep['etablissements'], par_dep.get(dep['code'])))
    for v in attendu['villes']:
        if par_ville.get(normaliser_commune(v['nom'])) != v['etablissements']:
            ecarts.append('ville %s: %s vs %s' % (v['nom'], v['etablissements'],
                                                  par_ville.get(normaliser_commune(v['nom']))))
    for c in attendu['categories']:
        if par_categorie.get(c['code']) != c['etablissements']:
            ecarts.append('categorie %s: %s vs %s' % (c['code'], c['etablissements'], par_categorie.get(c['code'])))

    print('lignes recalculees (JSONL) :', lignes, '| SIREN distincts :', len(sirens))
    print('ecarts avec le calcul principal :', len(ecarts))
    for e in ecarts[:10]:
        print('  ', e)
    if ecarts:
        sys.exit('VERIFICATION_ECHOUEE')
    print('verification independante : CONFORME (0 ecart)')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
