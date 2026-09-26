#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Controle de cannibalisation.

Deux pages ne doivent pas viser la meme intention principale. On mesure le recouvrement des
termes significatifs du title et du H1 pour chaque paire de pages indexables, et on signale
les paires au-dessus du seuil. Les alias (meme intention, une seule page canonique) ne
produisent pas de page : ils sont listes separement.
"""
import io, os, re, sys, json, itertools, unicodedata

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUB = os.path.join(RACINE, 'frontend', 'public')
SEUIL = 0.72

MOTS_VIDES = ("a au aux avec ce ces dans de des du elle en et eux il je la le les leur lui ma mais me meme mes moi mon "
              "ne nos notre nous on ou par pas pour qu que qui sa se ses son sur ta te tes toi ton tu un une vos votre "
              "vous c d j l a m n s t y ete etee etees etes etant suis es est sommes sont serai seras sera serons serez "
              "seront cette cet leurs comment quoi quel quelle quels quelles plus moins tres sans sous entre chez vers "
              "ainsi deja tout tous toute toutes bien faire etre avoir aussi comme si alors donc car ni or cour tiark "
              "courtiark assurance assurance france suisse").split()
STOP = set(MOTS_VIDES)


def norm(t):
    t = unicodedata.normalize('NFKD', t).encode('ascii', 'ignore').decode()
    return re.sub(r'[^a-z0-9 ]', ' ', t.lower())


def termes(chemin):
    h = io.open(chemin, encoding='utf-8', errors='replace').read()
    titre = re.search(r'<title>(.*?)</title>', h, re.S)
    h1 = re.search(r'<h1[^>]*>(.*?)</h1>', h, re.S)
    texte = ' '.join(x for x in [titre.group(1) if titre else '', h1.group(1) if h1 else ''])
    mots = [m for m in norm(texte).split() if m and m not in STOP and len(m) > 3]
    return set(mots)


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


def pages_publiees():
    """Pages indexables uniquement : une page en noindex ne peut pas cannibaliser."""
    pages = {}
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
        pages[rel or '/'] = chemin
    return pages


def main():
    exact, jokers = pages_redirigees()
    pages = {u: c for u, c in pages_publiees().items() if not est_redirigee(u, exact, jokers)}
    t = {u: termes(c) for u, c in pages.items()}
    paires = []
    for a, b in itertools.combinations(sorted(t), 2):
        # deux pages ne peuvent se cannibaliser que si elles visent des termes precis et communs
        if min(len(t[a]), len(t[b])) < 3:
            continue
        inter = t[a] & t[b]
        if len(inter) < 2:
            continue
        recouvrement = len(inter) / len(t[a] | t[b])  # Jaccard : une page qui se distingue n'est pas un doublon
        if recouvrement >= SEUIL:
            paires.append((round(recouvrement, 3), a, b, sorted(inter)))
    paires.sort(reverse=True)
    print(json.dumps({'pages_analysees': len(t), 'seuil': SEUIL, 'paires_suspectes': len(paires),
                      'detail': paires[:10]}, ensure_ascii=False, indent=1))
    dossier = os.path.join(RACINE, 'docs', 'seo')
    os.makedirs(dossier, exist_ok=True)
    with io.open(os.path.join(dossier, 'CANNIBALISATION.md'), 'w', encoding='utf-8') as f:
        f.write('# Controle de cannibalisation\n\n')
        f.write('Seuil de recouvrement des termes du title + H1 : %s\n\n' % SEUIL)
        f.write('- pages analysees : %d\n- paires suspectes : %d\n\n' % (len(t), len(paires)))
        if paires:
            f.write('## Paires a traiter\n\n')
            for r, a, b, inter in paires[:30]:
                f.write('- %s : `%s` <-> `%s` (termes communs : %s)\n' % (r, a, b, ', '.join(inter)))
        else:
            f.write('Aucune paire de pages ne vise la meme intention principale.\n')
        f.write('\n## Intentions consolidees par redirection permanente\n\n')
        try:
            src = io.open(os.path.join(RACINE, 'seo', 'build.py'), encoding='utf-8').read()
            bloc = src.split('ALIAS = {')[1].split('}')[0]
            for ligne in bloc.strip().splitlines():
                if "':" in ligne and ligne.strip().startswith("'"):
                    part = ligne.strip().rstrip(',')
                    a, b = part.split(':', 1)
                    f.write('- %s -> %s\n' % (a.strip().strip("'"), b.strip().strip("'").rstrip(',')))
        except Exception as e:  # pragma: no cover
            f.write('(table des alias non lue : %s)\n' % e)
    return 1 if paires else 0


if __name__ == '__main__':
    sys.exit(main())
