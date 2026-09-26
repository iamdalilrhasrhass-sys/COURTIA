#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Inventaire des URL publiques actuelles de COURTIARK.

Sources : sitemaps servis, fichiers statiques de frontend/public, table seo_pages.
Produit docs/seo/preuves/2026-09-26-phase-index-cleanup/02_current_urls.csv

Colonnes : url, source, http_status, canonical, indexable, in_sitemap, page_type, country,
primary_keyword, content_hash
"""
import csv
import hashlib
import io
import os
import re
import subprocess
import sys
import urllib.request

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUB = os.path.join(RACINE, 'frontend', 'public')
PREUVES = os.path.join(RACINE, 'docs', 'seo', 'preuves', '2026-09-26-phase-index-cleanup')
BASE = 'https://courtiark.fr'
SECRET = '/root/.hermes/secrets/render_database_url'


def psql(sql):
    db = io.open(SECRET, encoding='utf-8').read().strip()
    r = subprocess.run(['psql', db, '-A', '-t', '-F', '|', '-c', sql], capture_output=True, text=True, timeout=90)
    if r.returncode != 0:
        return []
    return [l.split('|') for l in r.stdout.strip().splitlines() if l]


def urls_sitemaps():
    """Toutes les URL declarees dans l'index et ses enfants."""
    out = []
    for fichier in ['sitemap.xml'] + ['sitemaps/' + f for f in sorted(os.listdir(os.path.join(PUB, 'sitemaps')))]:
        chemin = os.path.join(PUB, fichier)
        if not os.path.exists(chemin):
            continue
        contenu = io.open(chemin, encoding='utf-8').read()
        for u in re.findall(r'<loc>(.*?)</loc>', contenu):
            out.append((u, 'sitemap:' + os.path.basename(fichier)))
    return out


def indexables_du_disque():
    """Pages HTML reelles servies, avec leur etat d'indexation."""
    out = {}
    for base, _, fichiers in os.walk(PUB):
        if 'index.html' not in fichiers:
            continue
        rel = '/' + os.path.relpath(base, PUB).replace(os.sep, '/')
        rel = '/' if rel == '/.' else rel.rstrip('/')
        chemin = os.path.join(base, 'index.html')
        h = io.open(chemin, encoding='utf-8', errors='replace').read()
        robots = re.search(r'<meta[^>]+name="robots"[^>]+content="([^"]+)"', h[:6000], re.I)
        canonical = re.search(r'<link[^>]+rel="canonical"[^>]+href="([^"]+)"', h, re.I)
        titre = re.search(r'<title>(.*?)</title>', h, re.S)
        out[rel] = {
            'fichier': chemin,
            'robots': (robots.group(1) if robots else ''),
            'canonical': (canonical.group(1) if canonical else ''),
            'title': (titre.group(1).strip() if titre else ''),
            'hash': hashlib.sha256(h.encode('utf-8')).hexdigest()[:16],
        }
    return out


def statut_http(url):
    try:
        req = urllib.request.Request(url, method='GET', headers={'User-Agent': 'ARK-inventaire/1.0'})
        with urllib.request.urlopen(req, timeout=20) as r:
            return r.status
    except urllib.error.HTTPError as e:
        return e.code
    except Exception:
        return 0


def main():
    os.makedirs(PREUVES, exist_ok=True)
    disque = indexables_du_disque()
    sm = {}
    for u, src in urls_sitemaps():
        chemin = u.replace(BASE, '')
        sm.setdefault(chemin.rstrip('/') or '/', set()).add(src)
    bd = {}
    for ligne in psql("select slug, page_type, country, primary_keyword, content_hash, indexable from seo_pages"):
        if len(ligne) >= 6:
            bd['/' + ligne[0].strip('/')] = ligne
    lignes = []
    toutes = sorted(set(list(disque.keys()) + list(sm.keys())))
    for chemin in toutes:
        d = disque.get(chemin)
        in_sitemap = chemin in sm
        check = statut_http(BASE + (chemin if chemin != '/' else '/')) if (d or in_sitemap) else None
        b = bd.get(chemin)
        indexable = 'oui'
        if d and 'noindex' in (d['robots'] or '').lower():
            indexable = 'non'
        if not d and not in_sitemap:
            indexable = 'inconnu'
        canonical = (d or {}).get('canonical', '')
        lignes.append({
            'url': BASE + chemin,
            'source': ('disque+sitemap' if (d and in_sitemap) else 'sitemap' if in_sitemap else
                       'disque' if d else 'table'),
            'http_status': check if check is not None else 'non testee',
            'canonical': canonical,
            'indexable': indexable,
            'in_sitemap': 'oui' if in_sitemap else 'non',
            'page_type': (b[2] if b and len(b) > 1 else '') or (d or {}).get('page_type', ''),
            'country': (b[3] if b and len(b) > 2 else ''),
            'primary_keyword': (b[4] if b and len(b) > 3 else '') or (d or {}).get('title', '')[:60],
            'content_hash': (d or {}).get('hash', '') or (b[5] if b and len(b) > 5 else ''),
        })
    chemin_csv = os.path.join(PREUVES, '02_current_urls.csv')
    with io.open(chemin_csv, 'w', encoding='utf-8', newline='') as f:
        w = csv.DictWriter(f, fieldnames=list(lignes[0].keys()) if lignes else [])
        w.writeheader()
        w.writerows(lignes)
    indexables = [l for l in lignes if l['indexable'] == 'oui']
    dans_sitemap = [l for l in lignes if l['in_sitemap'] == 'oui']
    anomalies = [l for l in indexables if str(l['http_status']) != '200']
    print('URL inventoriees        :', len(lignes))
    print('  dont indexables       :', len(indexables))
    print('  dont dans un sitemap  :', len(dans_sitemap))
    print('  non indexables        :', len([l for l in lignes if l['indexable'] == 'non']))
    print('  indexables en anomalie:', len(anomalies), anomalies[:5])
    print('fichier :', os.path.relpath(chemin_csv, RACINE))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
