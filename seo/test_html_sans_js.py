#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Test HTML sans JavaScript (exigence §13-14) : ce que voit un crawler sans executer de script."""
import io
import os
import re
import subprocess
import sys

PAGES = ['/', '/logiciel-courtier-assurance', '/suisse', '/suisse/geneve', '/assurances',
         '/etudes/courtage-assurance-france-2026', '/conformite/controle-acpr-courtier',
         '/fonctionnalites/assistant-ark', '/france/densite-courtage', '/demo']
SORTIE = '/srv/courtia/docs/seo/authority100/25_HTML_SANS_JS.md'


def main():
    lignes = ['# HTML servi sans JavaScript (mesure du 26/09/2026)', '',
              'Controle : `curl` sans moteur, aucune execution de script. Un crawler doit trouver le titre, '
              'la description, le H1, le texte, les liens internes, le CTA et les donnees structurees.', '',
              '| Page | Poids | title | H1 | JSON-LD | CTA | Liens internes | Texte | Verdict |',
              '|---|---|---|---|---|---|---|---|---|']
    echecs = 0
    for url in PAGES:
        r = subprocess.run(['curl', '-sL', 'https://courtiark.fr' + url], capture_output=True, text=True, timeout=60)
        html = r.stdout
        titre = re.search(r'<title>(.*?)</title>', html, re.S)
        h1 = re.findall(r'<h1[^>]*>(.*?)</h1>', html, re.S)
        ld = len(re.findall(r'application/ld\+json', html))
        cta = len(re.findall(r'class="(principal|secondaire)"', html))
        liens = len(set(re.findall(r'href="(/[a-z0-9\-/]*)"', html)))
        texte = len(re.sub(r'<[^>]+>', ' ', html))
        ok = bool(titre) and len(h1) == 1 and ld >= 1 and cta >= 1 and liens >= 5 and texte > 1500
        if not ok:
            echecs += 1
        lignes.append('| `%s` | %d o | %s | %d | %d | %d | %d | %d car. | %s |' % (
            url, len(html), 'oui' if titre else 'NON', len(h1), ld, cta, liens, texte, 'PASS' if ok else 'ECHEC'))
    lignes += ['', 'Resultat : %d/%d pages conformes.' % (len(PAGES) - echecs, len(PAGES)), '']
    io.open(SORTIE, 'w', encoding='utf-8').write('\n'.join(lignes))
    print('\n'.join(lignes[4:]))
    if echecs:
        sys.exit('HTML_SANS_JS_ECHEC: %d page(s)' % echecs)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
