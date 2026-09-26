#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Contrôle d'indexabilité et anti-duplication du site public COURTIARK.

Deux modes :
  python3 seo/gate.py                => contrôle des FICHIERS générés (avant déploiement)
  python3 seo/gate.py --prod         => contrôle des URL réellement servies (après déploiement)

Une page n'entre dans un sitemap que si elle est indexable ET publiée. Le contrôle
refuse : contenu trop proche d'une autre page, fuite de texte d'IA, affirmation
réglementaire ou chiffrée non sourcée, métadonnée manquante ou hors norme,
JSON-LD invalide, lien interne cassé.
"""
from __future__ import annotations

import io
import json
import os
import re
import sys
import unicodedata
import urllib.error
import urllib.request
from collections import defaultdict

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC = os.path.join(RACINE, 'frontend', 'public')
PAGES = json.load(io.open(os.path.join(RACINE, 'seo', 'pages.json'), encoding='utf-8'))
SITE = 'https://courtiark.fr'
SEUIL_SIMILARITE = 0.55   # au-dela, deux pages sont considerees comme trop proches

# Motifs de fuite de texte d'assistant. Volontairement precis : le mot « instruction »
# est un terme metier legitime (instruction d'un dossier), on ne cible donc que les
# formulations de consigne d'IA.
FUITE_IA = [r'en tant qu.IA', r'voici (le texte|la page|la r[ée]ponse|un article)', r'\bprompt\s*[:—-]',
            r'\binstruction\s*[:—-]', r'chatgpt', r'\bgemini\b', r'g[ée]n[èe]re (un article|le texte)',
            r'commentaire interne', r'\{\{[a-z_]+\}\}', r'\[\s*À COMPLÉTER\s*\]', r'lorem ipsum',
            r'comme demand[ée]', r'note pour l.[ée]diteur']
CLAIMS = [r'\b\d+\s*%\s*(de\s+)?(temps|gain|economie|économies|productivite|productivité)',
          r'numéro 1', r'leader du marché', r'certifié\s+(rgpd|iso|finma)',
          r'\b50\s*%', r'\b100\s*% conforme', r'testé et approuvé']


def texte_de(html: str) -> str:
    t = re.sub(r'(?s)<script.*?</script>', ' ', html)
    t = re.sub(r'(?s)<style.*?</style>', ' ', t)
    t = re.sub(r'(?s)<head.*?</head>', ' ', t)
    t = re.sub(r'<[^>]+>', ' ', t)
    t = t.replace('&nbsp;', ' ').replace('&amp;', '&')
    t = unicodedata.normalize('NFKD', t)
    return re.sub(r'\s+', ' ', t).strip().lower()


def shingles(txt: str, n: int = 6) -> set:
    mots = re.findall(r'[a-z0-9éèêàâîôûçù]+', txt)
    return {' '.join(mots[i:i + n]) for i in range(max(0, len(mots) - n + 1))}


def jaccard(a: set, b: set) -> float:
    if not a or not b:
        return 0.0
    return len(a & b) / len(a | b)


def fichier(page: dict) -> str:
    p = page['slug'].strip('/')
    return os.path.join(PUBLIC, 'index.html') if not p else os.path.join(PUBLIC, p, 'index.html')


def controle_fichiers():
    resultats = []
    textes = {}
    for page in PAGES:
        f = fichier(page)
        ligne = {'slug': page['slug'] or '/', 'fichier': os.path.relpath(f, RACINE), 'erreurs': [], 'alertes': []}
        if not os.path.exists(f):
            ligne['erreurs'].append('fichier_absent')
            resultats.append(ligne)
            continue
        html = io.open(f, encoding='utf-8').read()
        ligne['octets'] = len(html.encode('utf-8'))
        # --- metadonnees obligatoires
        title = re.search(r'<title>(.*?)</title>', html, re.S)
        desc = re.search(r'<meta name="description" content="(.*?)">', html, re.S)
        canon = re.search(r'<link rel="canonical" href="(.*?)">', html)
        h1 = re.findall(r'<h1[^>]*>(.*?)</h1>', html, re.S)
        robots = re.search(r'<meta name="robots" content="(.*?)">', html)
        if not title or not title.group(1).strip():
            ligne['erreurs'].append('title_absent')
        elif len(title.group(1)) > 80:
            ligne['alertes'].append(f'title_{len(title.group(1))}_caracteres')
        if not desc or not desc.group(1).strip():
            ligne['erreurs'].append('description_absente')
        elif len(desc.group(1)) > 175:
            ligne['alertes'].append(f'description_{len(desc.group(1))}_caracteres')
        if not h1:
            ligne['erreurs'].append('h1_absent')
        elif len(h1) > 1:
            ligne['erreurs'].append(f'{len(h1)}_h1')
        if not canon:
            ligne['erreurs'].append('canonical_absent')
        else:
            attendu = SITE + '/' if page['slug'] in ('', '/') else SITE + page['slug']
            if canon.group(1).rstrip('/') != attendu.rstrip('/'):
                ligne['erreurs'].append(f'canonical_incorrect:{canon.group(1)}')
        if robots and 'noindex' in robots.group(1) and page.get('indexable', True):
            ligne['erreurs'].append('noindex_sur_page_indexable')
        # --- JSON-LD
        blocs = re.findall(r'(?s)<script type="application/ld\+json">(.*?)</script>', html)
        types = []
        for b in blocs:
            try:
                j = json.loads(b)
                types.append(j.get('@type'))
            except Exception as e:
                ligne['erreurs'].append(f'jsonld_invalide:{str(e)[:40]}')
        ligne['schema'] = ','.join(str(t) for t in types)
        if not blocs:
            ligne['erreurs'].append('jsonld_absent')
        # --- liens internes
        liens = set(re.findall(r'href="(/[^"#?]*)"', html))
        connus = {p['slug'].rstrip('/') or '/' for p in PAGES}
        connus |= {'/fr', '/ch', '/register', '/login', '/demo', '/demo-public', '/tarifs', '/fonctionnalites',
                   '/securite', '/rgpd', '/changelog', '/roadmap', '/status', '/legal/mentions-legales',
                   '/legal/confidentialite', '/legal/cgv', '/legal/cookies', '/legal/dpa', '/legal/sous-traitants',
                   '/legal/conditions-utilisation', '/favicon.svg', '/manifest.json'}
        for l in liens:
            base = l.rstrip('/') or '/'
            if base in connus or base.startswith('/fr/') or base.startswith('/ch/'):
                continue
            if base.startswith(('/api/', '/img/', '/assets/')):
                continue
            ligne['alertes'].append(f'lien_interne_inconnu:{l}')
        # --- fuite IA et claims
        txt = texte_de(html)
        textes[page['slug'] or '/'] = txt
        for motif in FUITE_IA:
            if re.search(motif, txt):
                ligne['erreurs'].append(f'fuite_ia:{motif}')
        for motif in CLAIMS:
            if re.search(motif, txt):
                ligne['alertes'].append(f'affirmation_a_sourcer:{motif}')
        # --- hreflang reciproque
        alt = page.get('alternate')
        if alt:
            srch = re.findall(r'<link rel="alternate" hreflang="(fr-FR|fr-CH|x-default)" href="(.*?)">', html)
            if not srch:
                ligne['erreurs'].append('hreflang_absent')
            else:
                cibles = {h for _, h in srch}
                if (SITE + alt).rstrip('/') not in {c.rstrip('/') for c in cibles}:
                    ligne['erreurs'].append('hreflang_non_reciproque')
        resultats.append(ligne)
    # --- anti-duplication
    sh = {s: shingles(t) for s, t in textes.items()}
    paires = []
    cles = sorted(sh)
    for i, a in enumerate(cles):
        for b in cles[i + 1:]:
            sim = jaccard(sh[a], sh[b])
            if sim >= SEUIL_SIMILARITE:
                paires.append((a, b, round(sim, 3)))
    for a, b, sim in paires:
        for ligne in resultats:
            if ligne['slug'] in (a or '/', b or '/'):
                ligne['erreurs'].append(f'duplication:{sim}')
    # --- rapport
    entetes = ['slug', 'fichier', 'octets', 'schema', 'erreurs', 'alertes']
    io.open(os.path.join(RACINE, 'seo', 'verdicts.csv'), 'w', encoding='utf-8').write(
        ';'.join(entetes) + '\n' + '\n'.join(
            ';'.join(str(l.get(c, '') if not isinstance(l.get(c), list) else ' | '.join(l[c])) for c in entetes)
            for l in resultats) + '\n')
    erreurs = [l for l in resultats if l['erreurs']]
    print(f'{len(PAGES)} pages contrôlées · {len(erreurs)} en erreur · {len(paires)} paire(s) trop proche(s)')
    for l in erreurs:
        print(f"  ERREUR {l['slug']} : {', '.join(l['erreurs'])}")
    for a, b, sim in paires:
        print(f'  DUPLICATION {a} ~ {b} ({sim})')
    return 1 if erreurs else 0


def controle_prod():
    echecs = []
    for page in PAGES:
        url = SITE + '/' + page['slug'].strip('/') if page['slug'] else SITE + '/'
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'ARK-Courtiark-SEO-Check/1.0'})
            with urllib.request.urlopen(req, timeout=30) as r:
                code, corps = r.status, r.read().decode('utf-8', 'replace')
        except urllib.error.HTTPError as e:
            code, corps = e.code, ''
        except Exception as e:
            code, corps = 0, f'{type(e).__name__}'
        attendu_index = page.get('indexable', True)
        ok = code == 200 and bool(corps) and ('<h1' in corps) and (('noindex' in corps) != attendu_index)
        if attendu_index and 'application/ld+json' not in corps:
            ok = False
        if not ok:
            echecs.append((page['slug'] or '/', code, len(corps)))
    print(f'PRODUCTION : {len(PAGES)} URL testées · {len(echecs)} en échec')
    for s, c, n in echecs:
        print(f'  ECHEC {s} http={c} taille={n}')
    return 1 if echecs else 0


if __name__ == '__main__':
    raise SystemExit(controle_prod() if '--prod' in sys.argv else controle_fichiers())
