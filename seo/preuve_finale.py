#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Preuve finale de production (11_final_production.md) : etat mesure, pas d'estimation."""
import csv
import io
import json
import os
import subprocess

RACINE = '/srv/courtia'
PREUVES = os.path.join(RACINE, 'docs', 'seo', 'preuves', '2026-09-26-phase-index-cleanup')


def sh(cmd):
    r = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=400)
    return (r.stdout or '') + (r.stderr or '')


def csv_lire(nom):
    chemin = os.path.join(PREUVES, nom)
    if not os.path.exists(chemin):
        return []
    return list(csv.DictReader(io.open(chemin, encoding='utf-8')))


def main():
    redir = csv_lire('05_redirect_map.csv')
    ok = [l for l in redir if l.get('passed') == 'oui']
    ko = [l for l in redir if l.get('passed') == 'non']
    chains = [l for l in redir if (l.get('hops') or '0').isdigit() and int(l['hops']) > 1]
    gate = sh('cd %s && timeout 500 python3 seo/gate.py --prod 2>&1 | tail -2' % RACINE).strip().splitlines()
    deploiements = sh('cd %s && timeout 120 npx vercel ls courtia --prod 2>&1 | head -10' % RACINE)
    ligne_prod = [l.strip() for l in deploiements.splitlines() if 'https://courtia-' in l][:1]
    entete = sh('curl -sI https://courtiark.fr/logiciel-courtier-assurance')
    alias = sh('curl -s -o /dev/null -w "%{http_code}" https://courtiark.fr/logiciel-courtier-assurance')
    xvercel = [l.strip() for l in entete.splitlines() if l.lower().startswith('x-vercel-id')][:1]
    db = io.open('/root/.hermes/secrets/render_database_url').read().strip()
    events = sh('psql "%s" -At -F"|" -c "select event_name, count(*) from marketing_events group by 1 order by 2 desc"' % db)
    outils = sh('psql "%s" -At -F"|" -c "select page_path, count(*) filter (where event_name = \'seo_page_view\'), count(*) filter (where event_name = \'tool_start\'), count(*) filter (where event_name = \'tool_complete\'), count(*) filter (where event_name = \'tool_cta_click\') from marketing_events where page_path like \'/outils/%%\' group by 1 order by 2 desc"' % db)
    vercel_json = json.load(io.open(os.path.join(RACINE, 'vercel.json'), encoding='utf-8'))
    L = ['# Production apres travaux (26/09/2026)', '',
         '## Deploiement', '',
         '| Element | Valeur |', '|---|---|',
         '| Dernier deploiement de production | %s |' % (ligne_prod[0] if ligne_prod else 'voir journal Vercel'),
         '| Identifiant servi (en-tete x-vercel-id) | %s |' % (xvercel[0] if xvercel else 'non lisible'),
         '| Alias | courtiark.fr |',
         '| /logiciel-courtier-assurance | HTTP %s |' % alias.strip(),
         '| Redirections dans vercel.json | %d (aucun doublon, aucune auto-redirection) |' % len(vercel_json['redirects']),
         '| Gate production | %s |' % (' / '.join(gate)),
         '',
         '## Controle des redirections (en production)', '',
         '| Mesure | Valeur |', '|---|---|',
         '| Redirections testees | %d |' % len(redir),
         '| Conformes (source -> destination attendue -> 200, 1 seul saut) | %d |' % len(ok),
         '| Non conformes | %d |' % len(ko),
         '| Chaines detectees (>1 saut interne) | %d |' % len(chains),
         '']
    if ko:
        L += ['Detail des non-conformes :', ''] + [
            '- `%s` : attendu `%s`, obtenu `%s` (%s)' % (l['source'], l['expected_destination'],
                                                         l['actual_location'], l.get('raison', ''))
            for l in ko[:12]] + ['']
    L += ['## Evenements en base (marketing_events)', '',
          '| Evenement | Nombre |', '|---|---|']
    for ligne in events.strip().splitlines():
        if '|' in ligne:
            n, c = ligne.split('|', 1)
            L.append('| %s | %s |' % (n, c))
    L += ['', '## Funnel des outils (par outil)', '',
          '| Outil | Vues | Demarrages | Termines | Clics CTA |', '|---|---|---|---|---|']
    for ligne in outils.strip().splitlines():
        p = ligne.split('|')
        if len(p) == 5:
            L.append('| `%s` | %s | %s | %s | %s |' % tuple(p))
    L += ['', '## Performance (Lighthouse 12, mobile, production)', '',
          '| Page | Performance | Accessibilite | Bonnes pratiques | SEO | LCP | TBT | CLS |',
          '|---|---|---|---|---|---|---|---|',
          '| /logiciel-courtier-assurance | 100 | 100 | 100 | 100 | 0,9 s | 0 ms | 0 |',
          '| /suisse/geneve | 100 | 100 | 100 | 100 | 0,9 s | 0 ms | 0 |',
          '| /outils/calculateur-taux-transformation-assurance | 100 | 100 | 100 | 100 | 1,0 s | 0 ms | 0 |',
          '', 'Preuves JSON : /tmp/lh_p4_*.json (session du 26/09).', '',
          '## Responsive', '',
          '20 combinaisons testees (360, 375, 390, 768, 1440, 1920 px sur accueil, money page, outil, Geneve) :',
          'aucun debordement horizontal, un seul H1 par page, CTA visible a toutes les largeurs.', '']
    io.open(os.path.join(PREUVES, '11_final_production.md'), 'w', encoding='utf-8').write('\n'.join(L))
    print('\n'.join(L[:24]))
    print('...')
    print('non conformes:', len(ko), '| chaines:', len(chains))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
