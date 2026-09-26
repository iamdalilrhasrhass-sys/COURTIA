#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Etude COURTIARK — cartographie du courtage en assurance en France (edition 2026).

Source : base SIRENE diffusee par l'annuaire des entreprises (DINUM), filtree sur le code
d'activite principale 66.22Z (agents et courtiers d'assurances). Fichier source local :
/root/ark/courtia_prospection/data/FRANCE_MASTER.csv (extraction du 18/09/2026).

Sorties (dans docs/seo/authority100/ et frontend/public/donnees/) :
  - 10_STUDY_DATASETS.csv        : agregats par region, departement, ville, categorie, anciennete
  - courtage-france-2026.json    : le meme contenu en JSON (pour la page et le telechargement)
  - rapport de controle sur stdout (doublons, communes manquantes, code NAF, granularite)

Aucune donnee personnelle : uniquement des comptages agreges.
"""
import csv
import io
import json
import os
import sys
import re
import unicodedata


def normaliser_commune(valeur):
    """Cle de commune stable : accents retires, majuscules, espaces reduits.

    Les deux serialisations du jeu de donnees (CSV et JSONL) n'ecrivent pas toujours les accents
    de la meme facon ; sans normalisation, un meme ville se retrouve comptee deux fois.
    """
    if not valeur:
        return ''
    sans = unicodedata.normalize('NFKD', valeur)
    sans = ''.join(c for c in sans if not unicodedata.combining(c))
    return re.sub(r'\s+', ' ', sans).strip().upper()
from collections import Counter

SOURCE = '/root/ark/courtia_prospection/data/FRANCE_MASTER.csv'
SORTIE_CSV = '/srv/courtia/docs/seo/authority100/10_STUDY_DATASETS.csv'
SORTIE_JSON = '/srv/courtia/frontend/public/donnees/courtage-france-2026.json'
NAF_ATTENDU = '66.22Z'
DATE_SOURCE = '18/09/2026'

# Nomenclature officielle des regions (INSEE). Le script VERIFIE cette table sur des couples
# departement -> region connus avant de s'en servir : si la correspondance ne tient pas, il
# s'arrete au lieu de publier un libelle faux.
REGIONS = {
    '01': 'Guadeloupe', '02': 'Martinique', '03': 'Guyane', '04': 'La Réunion', '06': 'Mayotte',
    '11': 'Île-de-France', '24': 'Centre-Val de Loire', '27': 'Bourgogne-Franche-Comté',
'28': 'Normandie', '32': 'Hauts-de-France', '44': 'Grand Est', '52': 'Pays de la Loire',
'53': 'Bretagne', '75': 'Nouvelle-Aquitaine', '76': 'Occitanie', '84': 'Auvergne-Rhône-Alpes',
'93': "Provence-Alpes-Côte d'Azur", '94': 'Corse',
}
# Couples departement -> region verifies avant publication (nomenclature INSEE 2016+).
CONTROLES_REGION = [('75', '11'), ('69', '84'), ('13', '93'), ('33', '75'), ('59', '32'),
('67', '44'), ('44', '52'), ('35', '53'), ('31', '76'), ('06', '93')]


def charger():
    if not os.path.exists(SOURCE):
        sys.exit('SOURCE_ABSENTE: %s' % SOURCE)
    with io.open(SOURCE, encoding='utf-8', errors='replace') as f:
        return list(csv.DictReader(f))


def main():
    lignes = charger()
    rapport = {'lignes': len(lignes)}

    # --- controles de qualite de donnees -------------------------------------------------
    sans_commune = [l for l in lignes if not (l.get('commune') or '').strip()]
    naf_ko = [l for l in lignes if (l.get('activite_principale') or '').strip().upper() != NAF_ATTENDU]
    siren = Counter((l.get('siren') or '').strip() for l in lignes)
    doublons = [s for s, n in siren.items() if n > 1 and s]
    rapport.update({'sans_commune': len(sans_commune), 'naf_hors_perimetre': len(naf_ko),
                    'siren_en_doublon': len(doublons), 'siren_distincts': len(siren) - (1 if '' in siren else 0)})
    if naf_ko:
        sys.exit('NAF_HORS_PERIMETRE: %d lignes, publication refusee' % len(naf_ko))

    # --- verification de la table des regions avant usage --------------------------------
    region_du_dep = {}
    for l in lignes:
        d = (l.get('departement') or '').strip()
        r = (l.get('region') or '').strip()
        if d and r:
            region_du_dep.setdefault(d, r)
    codes_vus = {(l.get('region') or '').strip() for l in lignes if (l.get('region') or '').strip()}
    inconnus = sorted(c for c in codes_vus if c not in REGIONS)
    if inconnus:
        sys.exit('REGION_SANS_LIBELLE: %s — publication refusee' % inconnus)
    for dep, attendu in CONTROLES_REGION:
        obtenu = region_du_dep.get(dep)
        if obtenu != attendu:
            sys.exit('CONTROLE_REGION_ECHOUE: departement %s -> %s (attendu %s)' % (dep, obtenu, attendu))

    # --- agregats ------------------------------------------------------------------------
    par_region, par_dep, par_ville, par_categorie, par_tranche, par_annee = (
        Counter(), Counter(), Counter(), Counter(), Counter(), Counter())
    # Une ville peut apparaitre sans code postal : la cle d'agregation est la commune seule,
    # le departement est celui declare sur la ligne (sinon la meme ville serait coupee en deux).
    departement_de_ville = {}
    for l in lignes:
        if (l.get('region') or '').strip():
            par_region[(l['region'].strip(), REGIONS.get(l['region'].strip(), '?'))] += 1
        if (l.get('departement') or '').strip():
            par_dep[l['departement'].strip()] += 1
        cle = normaliser_commune(l.get('commune'))
        if cle:
            par_ville[cle] += 1
            dep_ligne = (l.get('departement') or '').strip()
            if dep_ligne and cle not in departement_de_ville:
                departement_de_ville[cle] = dep_ligne
        if (l.get('categorie_entreprise') or '').strip():
            par_categorie[l['categorie_entreprise'].strip()] += 1
        if (l.get('tranche_effectif_salarie') or '').strip():
            par_tranche[l['tranche_effectif_salarie'].strip()] += 1
        annee = (l.get('date_creation') or '')[:4]
        if annee.isdigit() and 1900 <= int(annee) <= 2026:
            par_annee[annee] += 1

    total = len(lignes)
    donnees = {
        'titre': "Cartographie du courtage en assurance en France",
        'edition': '2026',
        'source': "base SIRENE (annuaire des entreprises, DINUM), code d'activité 66.22Z",
        'date_extraction': DATE_SOURCE,
        'grain': "établissement (une entreprise peut avoir plusieurs établissements)",
        'total_etablissements': total,
        'total_siren_distincts': rapport['siren_distincts'],
        'regions': [{'code': c, 'nom': n, 'etablissements': v} for (c, n), v in par_region.most_common()],
        'departements': [{'code': c, 'etablissements': v} for c, v in par_dep.most_common(20)],
        'villes': [{'nom': n.title().replace("'", "'"), 'departement': departement_de_ville.get(n, ''),
                    'etablissements': v} for n, v in par_ville.most_common(25)],
        'categories': [{'code': c, 'etablissements': v} for c, v in par_categorie.most_common()],
        'tranches_effectif': [{'code': c, 'etablissements': v} for c, v in par_tranche.most_common()],
        'creations_par_annee': [{'annee': a, 'etablissements': v} for a, v in sorted(par_annee.items())][-16:],
    }

    os.makedirs(os.path.dirname(SORTIE_JSON), exist_ok=True)
    io.open(SORTIE_JSON, 'w', encoding='utf-8').write(json.dumps(donnees, ensure_ascii=False, indent=1) + '\n')
    with io.open(SORTIE_CSV, 'w', encoding='utf-8', newline='') as f:
        w = csv.writer(f)
        w.writerow(['grain', 'cle', 'libelle', 'etablissements', 'part_pct'])
        for (c, n), v in par_region.most_common():
            w.writerow(['region', c, n, v, '%.2f' % (100.0 * v / total)])
        for c, v in par_dep.most_common():
            w.writerow(['departement', c, '', v, '%.2f' % (100.0 * v / total)])
        for n, v in par_ville.most_common(60):
            w.writerow(['ville', n.title(), 'dep ' + departement_de_ville.get(n, ''), v,
                        '%.2f' % (100.0 * v / total)])
        for c, v in par_categorie.most_common():
            w.writerow(['categorie_entreprise', c, '', v, '%.2f' % (100.0 * v / total)])
        for a, v in sorted(par_annee.items()):
            w.writerow(['annee_creation', a, '', v, '%.2f' % (100.0 * v / total)])

    print(json.dumps(rapport, ensure_ascii=False))
    print('regions :', len(par_region), '| departements :', len(par_dep), '| villes :', len(par_ville))
    print('JSON :', SORTIE_JSON)
    print('CSV  :', SORTIE_CSV)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
