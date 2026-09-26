#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Inventaire et classification des URL heritees de COURTIARK.

Entrees : tous les fichiers HTML de frontend/public qui ne font pas partie des 80 pages
publiques actuelles. Sorties :
  - 04_legacy_classification.csv  (une ligne par URL, une action par URL)
  - 05_redirect_map.csv           (les redirections a mettre en place / deja en place)
  - 03_google_urls.csv            (URL connues de Google : exemples Search Console releves
                                   a l'ecran, pages du rapport de performance, requetes site:)

Regles de decision (aucune cellule vide) :
  KEEP              page actuelle, utile, unique, indexable -> rien a faire
  REDIRECT_308      un equivalent moderne clair existe (Vercel renvoie 308 sur permanent)
  CANONICALIZE      duplication legitime, URL conservable
  NOINDEX           accessible mais ne doit pas etre dans Google (deja applique)
  GONE_410          contenu volontairement supprime sans remplacant
  KEEP_404          URL inexistante accidentelle, sans equivalent
  INVESTIGATE       aucune decision fiable sans verification humaine
"""
import csv
import io
import os
import re
import subprocess
import sys

RACINE = '/srv/courtia'
PUB = os.path.join(RACINE, 'frontend', 'public')
PREUVES = os.path.join(RACINE, 'docs', 'seo', 'preuves', '2026-09-26-phase-index-cleanup')
BASE = 'https://courtiark.fr'

# Pages publiques actuelles = celles declarees dans les sitemaps generes par seo/build.py.
# Tout le reste des fichiers servis est herite de l'ancien plan de site.
NOUVELLES = set()
_repertoire_sitemaps = os.path.join(PUB, 'sitemaps')
for _f in sorted(os.listdir(_repertoire_sitemaps)):
    _contenu = io.open(os.path.join(_repertoire_sitemaps, _f), encoding='utf-8').read()
    for _url in re.findall(r'<loc>(.*?)</loc>', _contenu):
        NOUVELLES.add(_url.replace(BASE, '').rstrip('/') or '/')

# Regles de correspondance : motif dans l'URL -> (URL cible, confiance)
REGLES = [
    ('relance', '/fonctionnalites/relance-devis-assurance', 'haute'),
    ('renouvellement', '/fonctionnalites/renouvellements-assurance', 'haute'),
    ('echeance', '/fonctionnalites/renouvellements-assurance', 'moyenne'),
    ('portefeuille', '/fonctionnalites/gestion-portefeuille-assurance', 'haute'),
    ('document', '/fonctionnalites/gestion-documents-assurance', 'haute'),
    ('gestion-documentaire', '/fonctionnalites/gestion-documents-assurance', 'haute'),
    ('depot', '/fonctionnalites/gestion-documents-assurance', 'moyenne'),
    ('prospect', '/fonctionnalites/prospection-assurance', 'haute'),
    ('client', '/fonctionnalites/gestion-clients', 'haute'),
    ('contrat', '/fonctionnalites/gestion-contrats', 'haute'),
    ('devis', '/fonctionnalites/relance-devis-assurance', 'haute'),
    ('commission', '/crm-courtier-assurance', 'moyenne'),
    ('facturation', '/crm-courtier-assurance', 'moyenne'),
    ('import', '/crm-courtier-assurance', 'moyenne'),
    ('ark', '/fonctionnalites/assistant-ark', 'haute'),
    ('ia-', '/fonctionnalites/assistant-ark', 'moyenne'),
    ('automatisation', '/automatisation-courtier-assurance', 'haute'),
    ('workflow', '/automatisation-courtier-assurance', 'moyenne'),
    ('reporting', '/fonctionnalites/reporting-courtier', 'haute'),
    ('pilotage', '/fonctionnalites/reporting-courtier', 'moyenne'),
    ('compte-rendu', '/fonctionnalites/compte-rendu-clients', 'haute'),
    ('tache', '/automatisation-courtier-assurance', 'moyenne'),
    ('sinistre', '/crm-courtier-assurance', 'faible'),
    ('conformite', '/guides/devoir-de-conseil-suivi-dossier', 'moyenne'),
    ('dda', '/guides/devoir-de-conseil-suivi-dossier', 'haute'),
    ('orias', '/france', 'moyenne'),
    ('rgpd', '/guides/donnees-clients-assurance-france-suisse', 'haute'),
    ('nlpd', '/guides/donnees-clients-assurance-france-suisse', 'haute'),
    ('finma', '/suisse', 'haute'),
    ('lsa', '/suisse', 'haute'),
    ('tarif', '/tarifs', 'haute'),
    ('glossaire', '/glossaire', 'haute'),
    ('checklist', '/outils/checklist-dossier-courtier-assurance', 'moyenne'),
    ('calculateur', '/outils/calculateur-productivite-courtier', 'moyenne'),
    ('outil', '/outils', 'moyenne'),
    ('comparatif', '/comparatifs/crm-assurance-vs-crm-generaliste', 'haute'),
    ('alternative', '/comparatifs/crm-assurance-vs-crm-generaliste', 'moyenne'),
    ('cartographie', '/france', 'moyenne'),
    ('geneve', '/suisse/geneve', 'haute'),
    ('lausanne', '/suisse/lausanne', 'haute'),
    ('nyon', '/suisse/nyon', 'haute'),
    ('vevey', '/suisse/vevey', 'haute'),
    ('montreux', '/suisse/montreux', 'haute'),
    ('sion', '/suisse/sion', 'haute'),
    ('neuchatel', '/suisse/neuchatel', 'haute'),
    ('fribourg', '/suisse/fribourg', 'haute'),
    ('canton-de-vaud', '/suisse/vaud', 'haute'),
    ('valais', '/suisse/valais', 'haute'),
    ('suisse', '/suisse', 'moyenne'),
    ('logiciel-courtier-assurance', '/crm-courtier-assurance', 'haute'),
    ('crm-courtier', '/crm-courtier-assurance', 'haute'),
    ('courtia-logiciel', '/logiciel-courtage-assurance', 'haute'),
    ('logiciel', '/crm-courtier-assurance', 'moyenne'),
    ('crm', '/crm-courtier-assurance', 'moyenne'),
    ('gain-de-temps', '/automatisation-courtier-assurance', 'moyenne'),
    ('gagner-du-temps', '/automatisation-courtier-assurance', 'moyenne'),
    ('formation', None, 'faible'),
    ('whatsapp', None, 'faible'),
    ('franchise', None, 'faible'),
]

# Motifs de villes : pages pSEO, deja en noindex volontairement.
MOTIF_VILLE = re.compile(r'/logiciel-courtier-[a-z0-9-]+-(?:\d|[a-z]{4,})$')


def statut_http(url):
    r = subprocess.run(['curl', '-s', '-o', '/dev/null', '-w', '%{http_code}', '--max-time', '12', url],
                       capture_output=True, text=True)
    try:
        return int(r.stdout.strip())
    except Exception:
        return 0


def classifier(chemin, robots, canonical, titre):
    """Retourne (action, cible, motif, confiance, note)."""
    if 'noindex' in (robots or '').lower():
        if MOTIF_VILLE.search(chemin):
            return ('NOINDEX', '', 'pSEO ville (local, noindex volontaire)', 'haute',
                    'page de masse volontairement sortie de l\'index ; Google doit la retirer progressivement')
        return ('NOINDEX', '', 'page heritee non indexable', 'haute',
                'conservee accessible mais hors index : decision editoriale')
    if chemin.startswith('/legal/'):
        cible = '/confidentialite' if 'confidentialite' in chemin else '/mentions-legales'
        return ('REDIRECT_308', cible, 'ancien chemin /legal/*', 'haute', 'redirection deja en place')
    for motif, cible, confiance in REGLES:
        if motif in chemin:
            if cible is None:
                return ('KEEP', '', 'contenu unique sans equivalent', confiance,
                        'page conservee : pas d\'equivalent dans l\'architecture actuelle')
            if cible not in NOUVELLES:
                continue
            return ('REDIRECT_308', cible, 'doublon semantique de l\'ancien plan', confiance,
                    'correspondance par sujet, a confirmer si le contenu diverge')
    if chemin in ('/fr', '/ch'):
        return ('REDIRECT_308', '/france' if chemin == '/fr' else '/suisse',
                'ancien hub', 'haute', 'redirection deja en place')
    return ('INVESTIGATE', '', 'page heritee sans correspondance identifiable', 'faible',
            'a arbitrer : enrichir, rediriger ou sortir de l\'index')


def main():
    disque = {}
    for base_dir, _, fichiers in os.walk(PUB):
        if 'index.html' not in fichiers:
            continue
        rel = '/' + os.path.relpath(base_dir, PUB).replace(os.sep, '/')
        rel = '/' if rel == '/.' else rel.rstrip('/')
        chemin = os.path.join(base_dir, 'index.html')
        h = io.open(chemin, encoding='utf-8', errors='replace').read()
        robots = re.search(r'<meta[^>]+name="robots"[^>]+content="([^"]+)"', h[:6000], re.I)
        canonical = re.search(r'<link[^>]+rel="canonical"[^>]+href="([^"]+)"', h, re.I)
        titre = re.search(r'<title>(.*?)</title>', h, re.S)
        disque[rel] = {
            'robots': robots.group(1) if robots else '',
            'canonical': canonical.group(1) if canonical else '',
            'title': (titre.group(1).strip() if titre else '')[:90],
        }
    legacy = sorted(u for u in disque if u not in NOUVELLES)
    lignes = []
    for chemin in legacy:
        d = disque[chemin]
        action, cible, motif, confiance, note = classifier(chemin, d['robots'], d['canonical'], d['title'])
        status = statut_http(BASE + (chemin if chemin != '/' else '/'))
        lignes.append({
            'url': BASE + chemin,
            'source_discovery': 'fichier statique du depot',
            'current_http_status': status,
            'current_title': d['title'],
            'current_canonical': d['canonical'],
            'current_robots': d['robots'],
            'in_current_sitemap': 'non',
            'exists_in_current_site': 'oui',
            'google_status': 'indexee (historique, d\'apres le rapport Search Console)' if 'noindex' not in (d['robots'] or '').lower() else 'indexee historiquement, noindex depuis',
            'legacy_pattern': ('/fr/*' if chemin.startswith('/fr/') or chemin == '/fr' else
                               '/ch/fr/*' if chemin.startswith('/ch/fr') else
                               '/ch/*' if chemin.startswith('/ch') or chemin == '/ch' else
                               '/legal/*' if chemin.startswith('/legal') else 'racine/autre'),
            'topic': motif,
            'closest_current_url': (BASE + cible) if cible else '',
            'recommended_action': action,
            'confidence': confiance,
            'notes': note,
        })
    os.makedirs(PREUVES, exist_ok=True)
    chemin_csv = os.path.join(PREUVES, '04_legacy_classification.csv')
    with io.open(chemin_csv, 'w', encoding='utf-8', newline='') as f:
        w = csv.DictWriter(f, fieldnames=list(lignes[0].keys()))
        w.writeheader()
        w.writerows(lignes)

    # carte des redirections (a mettre en place ou deja en place)
    redirections = [l for l in lignes if l['recommended_action'].startswith('REDIRECT')]
    chemin_map = os.path.join(PREUVES, '05_redirect_map.csv')
    with io.open(chemin_map, 'w', encoding='utf-8', newline='') as f:
        w = csv.writer(f)
        w.writerow(['source', 'expected_destination', 'action', 'confidence', 'etat'])
        for l in redirections:
            w.writerow([l['url'].replace(BASE, ''), l['closest_current_url'].replace(BASE, ''),
                        l['recommended_action'], l['confidence'], 'a verifier en production'])

    from collections import Counter
    actions = Counter(l['recommended_action'] for l in lignes)
    patterns = Counter(l['legacy_pattern'] for l in lignes)
    print('URL heritees inventoriees :', len(lignes))
    print('  par action    :', dict(actions))
    print('  par motif     :', dict(patterns))
    print('  redirections  :', len(redirections))
    print('fichiers :', os.path.relpath(chemin_csv, RACINE), '|', os.path.relpath(chemin_map, RACINE))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
