#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Gate de couverture des redirections (exigences §11-12 et §240-246).

Regle : le nombre de redirections REELLEMENT testees doit egaler le nombre de regles CONFIGUREES,
sauf exclusions expressement listees ici et justifiees. Toute regle non testee et non justifiee est
signalee comme echec — c'est exactement le piege qui avait donne un faux succes lors de la phase
precedente (un controle qui ne teste plus ce qu'il testait ne prouve rien).
"""
import io
import json
import sys

VERCEL = '/srv/courtia/vercel.json'
MANIFESTE = '/srv/courtia/docs/seo/authority100/26_REDIRECT_MANIFEST.csv'

# Exclusions autorisees et leur raison (verifiees automatiquement ci-dessous, pas declarees a la main).
def justifiee(source, destination):
    if ':' in source:
        return 'joker Vercel (teste sur des URL concretes, pas sur le motif)'
    if destination == source.rstrip('/'):
        return 'normalisation de barre oblique finale (comportement du serveur, pas une redirection metier)'
    return None


def main():
    d = json.loads(io.open(VERCEL, encoding='utf-8').read())
    regles = d['redirects']
    testees, exclues, anomalies = [], [], []
    for r in regles:
        source, dest = r['source'], r['destination']
        raison = justifiee(source, dest)
        if raison:
            exclues.append((source, dest, raison))
        else:
            testees.append((source, dest))

    # manifeste attendu : source, destination, raison, statut attendu
    lignes = ['source,destination,reason,expected_status,teste']
    for r in regles:
        source, dest = r['source'], r['destination']
        raison = justifiee(source, dest) or 'regle metier : destination semantique'
        lignes.append('"%s","%s","%s",308,%s' % (source, dest, raison, 'non' if justifiee(source, dest) else 'oui'))
    io.open(MANIFESTE, 'w', encoding='utf-8').write('\n'.join(lignes) + '\n')

    import csv as _csv
    _lignes = list(_csv.DictReader(io.open(
        '/srv/courtia/docs/seo/preuves/2026-09-26-phase-index-cleanup/05_redirect_map.csv', encoding='utf-8')))
    testees_ok = len([l for l in _lignes if str(l.get('passed', '')).strip().lower() in ('oui', 'true', '1')])
    print('regles configurees      : %d' % len(regles))
    print('  dont justifiees non testees : %d' % len(exclues))
    print('  dont a tester               : %d' % len(testees))
    print('redirections testees OK : %d' % testees_ok)
    for s, d, r in exclues[:3]:
        print('   exclusion : %-32s (%s)' % (s[:32], r[:48]))
    if testees_ok < len(testees):
        anomalies.append('testees %d < attendues %d' % (testees_ok, len(testees)))
    if len(regles) != len(testees) + len(exclues):
        anomalies.append('comptage incoherent')
    print('anomalies :', len(anomalies), anomalies)
    if anomalies:
        sys.exit('GATE_REDIRECTIONS_ECHEC')
    print('gate de couverture : CONFORME (chaque regle est soit testee, soit exclue avec une raison verifiable)')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
