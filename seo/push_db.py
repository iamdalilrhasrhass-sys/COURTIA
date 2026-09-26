#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Pousse le contenu SEO et les prospects d'autorite dans la base de production.

- applique la migration 127 (idempotente) ;
- remplace le contenu de seo_pages par l'etat courant de seo/pages.json ;
- alimente backlink_prospects depuis docs/seo/AUTHORITY_TARGETS.csv (statut a_contacter,
  aucune demarche engagee, aucun contact).

Aucune donnee utilisateur n'est touchee. Aucun secret n'est affiche.
"""
from __future__ import annotations

import csv
import hashlib
import io
import json
import os
import re
import subprocess
import unicodedata

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB = io.open('/root/.hermes/secrets/render_database_url').read().strip()
PAGES = json.load(io.open(os.path.join(RACINE, 'seo', 'pages.json'), encoding='utf-8'))
MIGRATION = os.path.join(RACINE, 'backend', 'src', 'db', 'migrations',
                         '127_seo_contenu_et_backlink_prospects.sql')
CSV_AUTORITE = os.path.join(RACINE, 'docs', 'seo', 'AUTHORITY_TARGETS.csv')

SCHEMA = {'home': 'WebSite', 'guide': 'Article', 'geo': 'Service', 'solution': 'Service',
          'comparatif': 'Article', 'tool': 'SoftwareApplication'}


def q(v):
    """Litteral SQL sur : NULL ou chaine echappee."""
    if v is None:
        return 'NULL'
    if isinstance(v, bool):
        return 'TRUE' if v else 'FALSE'
    return "'" + str(v).replace("'", "''") + "'"


def texte_normalise(html: str) -> str:
    t = re.sub(r'(?s)<script.*?</script>', ' ', html)
    t = re.sub(r'<[^>]+>', ' ', t)
    t = unicodedata.normalize('NFKD', t)
    return re.sub(r'\s+', ' ', t).strip().lower()


def executer_sql(sql: str, etiquette: str):
    p = subprocess.run(['psql', DB, '-v', 'ON_ERROR_STOP=1', '-q', '-f', '/dev/stdin'],
                       input=sql, capture_output=True, text=True)
    if p.returncode != 0:
        raise SystemExit(f'{etiquette} : {p.stderr.strip()[:400]}')
    return p.stdout


def main():
    executer_sql(io.open(MIGRATION, encoding='utf-8').read(), 'migration 127')
    print('migration 127 appliquee (seo_pages, backlink_prospects)')

    valeurs, n = [], 0
    for page in PAGES:
        rel = page['slug'].strip('/')
        f = (os.path.join(RACINE, 'frontend', 'public', 'index.html') if not rel
             else os.path.join(RACINE, 'frontend', 'public', rel, 'index.html'))
        html = io.open(f, encoding='utf-8').read() if os.path.exists(f) else ''
        h = hashlib.sha256(texte_normalise(html).encode('utf-8')).hexdigest()[:32]
        mots = re.findall(r'[a-z0-9éèêàâîôûçù]{4,}', texte_normalise(html))
        kw = page.get('keywords') or []
        kw = list(kw) + [' '.join(mots[:3])]
        valeurs.append('(' + ', '.join([
            q(page['slug']), q(page['type']), q(page.get('country', 'FR')),
            q('fr-CH' if page.get('country') == 'CH' else 'fr-FR'),
            q(kw[0] if kw else ''), q('transactionnel' if page['type'] in
                                      ('money', 'feature', 'solution', 'geo', 'vertical', 'tool') else 'informationnel'),
            q(page.get('persona', 'cabinet de courtage')), q(page['title']), q(page['description']),
            q(page['h1']), q((page.get('chapeau') or '')[:400]),
            q('https://courtiark.fr/' + rel), q((page.get('alternate') or rel or 'home').strip('/')),
            q(h), q(SCHEMA.get(page['type'], 'SoftwareApplication')),
            q(bool(page.get('indexable', True))), 'TRUE', str(page.get('_octets') or len(html.encode('utf-8'))),
        ]) + ')')
        n += 1
    executer_sql(
        'BEGIN;\n'
        'INSERT INTO seo_pages (slug, page_type, country, locale, primary_keyword, search_intent, persona, '
        'meta_title, meta_description, h1, hero_subtitle, canonical_url, hreflang_group, content_hash, schema_type, '
        'indexable, published, bytes) VALUES\n' + ',\n'.join(valeurs) + '\n'
        'ON CONFLICT (slug) DO UPDATE SET page_type = EXCLUDED.page_type, country = EXCLUDED.country, '
        'locale = EXCLUDED.locale, primary_keyword = EXCLUDED.primary_keyword, search_intent = EXCLUDED.search_intent, '
        'persona = EXCLUDED.persona, meta_title = EXCLUDED.meta_title, meta_description = EXCLUDED.meta_description, '
        'h1 = EXCLUDED.h1, hero_subtitle = EXCLUDED.hero_subtitle, canonical_url = EXCLUDED.canonical_url, '
        'hreflang_group = EXCLUDED.hreflang_group, content_hash = EXCLUDED.content_hash, '
        'schema_type = EXCLUDED.schema_type, indexable = EXCLUDED.indexable, published = EXCLUDED.published, '
        'bytes = EXCLUDED.bytes, updated_at = NOW(), last_reviewed_at = NOW();\n' + 'COMMIT;',
        'insertion seo_pages')
    print(f'{n} pages ecrites dans seo_pages')

    if os.path.exists(CSV_AUTORITE):
        lignes = list(csv.DictReader(io.open(CSV_AUTORITE, encoding='utf-8-sig')))
        v, m = [], 0
        for l in lignes:
            dom = (l.get('domaine') or '').strip()
            if not dom:
                continue
            prio = (l.get('priorite') or '3').strip()
            v.append('(' + ', '.join([
                q(dom), q((l.get('acces_public') or '').strip() or None), q((l.get('type') or '').strip() or None),
                q('CH' if '.ch' in dom else 'FR'), q('docs/seo/AUTHORITY_TARGETS.csv'),
                q(f'priorite_{prio}'), q('a_contacter'), q((l.get('contact_engage') or '').strip() or None),
                q((l.get('asset_courtia') or '').strip() or None),
            ]) + ')')
            m += 1
        executer_sql(
            'BEGIN;\nINSERT INTO backlink_prospects (domaine, url, type, pays, source, pertinence, statut, notes, prochaine_action) VALUES\n'
            + ',\n'.join(v) +
            "\nON CONFLICT (domaine) DO UPDATE SET url = EXCLUDED.url, type = EXCLUDED.type, pays = EXCLUDED.pays, "
            "source = EXCLUDED.source, pertinence = EXCLUDED.pertinence, prochaine_action = EXCLUDED.prochaine_action, "
            "updated_at = NOW();\nCOMMIT;", 'insertion backlink_prospects')
        print(f"{m} prospects d'autorite enregistres (statut a_contacter, aucune demarche engagee)")

    for table, attendu in (('seo_pages', n),):
        r = subprocess.run(['psql', DB, '-Atc', f'SELECT count(*) FROM {table}'], capture_output=True, text=True)
        print(f'verification {table} : {r.stdout.strip()} ligne(s) (attendu {attendu})')
    r = subprocess.run(['psql', DB, '-Atc', "SELECT count(*) FROM backlink_prospects"], capture_output=True, text=True)
    print(f'verification backlink_prospects : {r.stdout.strip()} ligne(s)')
    print('OK')


if __name__ == '__main__':
    raise SystemExit(main())
