#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Maillage interne : graphe des liens, detection des pages orphelines.

Regle : aucune page indexable publiee ne doit etre orpheline, et chaque page commerciale
doit recevoir au moins 2 liens internes depuis d'autres pages.
"""
import io, os, re, sys, json, collections

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUB = os.path.join(RACINE, 'frontend', 'public')
MONEY_MIN = 2


def pages_redirigees():
    """Chemins servis en redirection permanente : ils ne sont plus des pages concurrentes."""
    import json as _json
    try:
        cfg = _json.load(io.open(os.path.join(RACINE, 'vercel.json'), encoding='utf-8'))
    except Exception:
        return set(), []
    exact, jokers = set(), []
    for r in cfg.get('redirects', []):
        src = r.get('source', '')
        dest = r.get('destination', '')
        # une simple normalisation de barre oblique finale n'est pas une consolidation
        if dest == src.rstrip('/') or dest == src:
            continue
        if '/:' in src or src.endswith('*'):
            pref = src.split('/:')[0].rstrip('/')
            if pref:
                jokers.append(pref)
        else:
            exact.add(src.rstrip('/') or '/')
    return exact, jokers


def est_redirigee(url, exact, jokers):
    u = url.rstrip('/') or '/'
    return u in exact or any(u.startswith(j) for j in jokers)


def est_indexable(chemin):
    h = io.open(chemin, encoding='utf-8', errors='replace').read(6000)
    m = re.search(r'<meta[^>]+name="robots"[^>]+content="([^"]+)"', h, re.I)
    return not (m and 'noindex' in m.group(1).lower())


def pages_html():
    """Pages reellement indexables uniquement (les pages en noindex ne comptent pas)."""
    out = {}
    for base, _, fichiers in os.walk(PUB):
        if 'index.html' not in fichiers:
            continue
        rel = '/' + os.path.relpath(base, PUB).replace(os.sep, '/')
        rel = '/' if rel == '/.' else rel.rstrip('/')
        if rel.startswith(('/dist', '/node_modules', '/ressources')):
            continue
        chemin = os.path.join(base, 'index.html')
        if not est_indexable(chemin):
            continue
        out[rel or '/'] = chemin
    return out


def liens_du_fichier(chemin):
    h = io.open(chemin, encoding='utf-8', errors='replace').read()
    res = set()
    for m in re.finditer(r'<a\s[^>]*href="([^"#?]+)"', h, re.I):
        u = m.group(1).strip()
        if u.startswith(('http://', 'https://', 'mailto:', 'tel:', '//')):
            continue
        if u.endswith(('.pdf', '.png', '.xml', '.txt', '.svg', '.json', '.webp', '.jpg')):
            continue
        if not u.startswith('/'):
            continue
        res.add(u.rstrip('/') or '/')
    return res


def main():
    exact, jokers = pages_redirigees()
    pages = {u: c for u, c in pages_html().items() if not est_redirigee(u, exact, jokers)}
    entrees = collections.defaultdict(set)
    for url, chemin in pages.items():
        for cible in liens_du_fichier(chemin):
            if cible in pages and cible != url:
                entrees[cible].add(url)
    orphelines = sorted(u for u in pages if not entrees[u])
    money = sorted(u for u in pages if u.startswith(('/crm-', '/logiciel-', '/automatisation-', '/gestion-'))
                   or u.startswith('/fonctionnalites/') or u.startswith('/outils/'))
    faibles = [(u, len(entrees[u])) for u in money if len(entrees[u]) < MONEY_MIN]
    rapport = {
        'pages_indexables': len(pages),
        'liens_internes_uniques': sum(len(v) for v in entrees.values()),
        'orphelines': orphelines,
        'money_sous_le_seuil': faibles,
        'top_pages_recues': sorted(((u, len(v)) for u, v in entrees.items()), key=lambda x: -x[1])[:12],
    }
    print(json.dumps(rapport, ensure_ascii=False, indent=1))
    dossier = os.path.join(RACINE, 'docs', 'seo')
    os.makedirs(dossier, exist_ok=True)
    with io.open(os.path.join(dossier, 'MAILLAGE.md'), 'w', encoding='utf-8') as f:
        f.write('# Maillage interne\n\n')
        f.write('- pages indexables : %d\n- liens internes uniques : %d\n\n' % (len(pages), rapport['liens_internes_uniques']))
        f.write('## Pages orphelines\n\n')
        f.write('\n'.join('- ' + u for u in orphelines) if orphelines else 'Aucune.\n')
        f.write('\n\n## Pages commerciales sous %d liens entrants\n\n' % MONEY_MIN)
        f.write('\n'.join('- %s : %d' % (u, n) for u, n in faibles) if faibles else 'Aucune.\n')
        f.write('\n\n## Pages les plus liees\n\n')
        f.write('\n'.join('- %s : %d liens entrants' % (u, n) for u, n in rapport['top_pages_recues']))
        f.write('\n')
    return 0 if (not orphelines and not faibles) else 1


if __name__ == '__main__':
    sys.exit(main())
