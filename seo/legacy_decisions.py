#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Decision finale sur les 21 URL classees INVESTIGATE (phase index cleanup).

Entree  : docs/seo/preuves/2026-09-26-phase-index-cleanup/04_legacy_classification.csv
Sorties : 03_INVESTIGATE_URLS.csv (17 colonnes imposees) et mise a jour de la classification
          (recommended_action + closest_current_url), qui alimente seo/legacy_redirects.json.

Regle appliquee : RESTORE seulement si la fonctionnalite existe reellement dans le code
(verifie route par route) ; REDIRECT seulement vers une page actuelle de sens proche ;
aucune redirection en masse vers l'accueil sauf pour l'ancienne landing, qui est exactement
l'intention de l'accueil.
"""
import csv
import io
import os

PREUVES = '/srv/courtia/docs/seo/preuves'
REPO = os.path.join(PREUVES, '2026-09-26-phase-index-cleanup', '04_legacy_classification.csv')
SORTIE = os.path.join(PREUVES, '2026-09-26-master-acquisition', '03_INVESTIGATE_URLS.csv')

# source -> (decision, destination, topic, fonction produit verifiee, raison)
DECISIONS = {
    '/fr/comparateur-assurance-courtier':
        ('RESTORE', '/fonctionnalites/comparateur-devis-assurance', 'comparateur de devis',
         'oui — routes /quote-request, /submit, /manual-result, /results, /compare',
         'intention commerciale, aucune page equivalente, fonctionnalite reelle : page restauree'),
    '/fr/densite-courtage-grandes-villes-france':
        ('RESTORE', '/france/densite-courtage', 'densite du courtage',
         'non applicable (actif de donnees)',
         'actif de donnees unique (SIRENE) : page restauree, chiffres recalcules a chaque build'),
    '/fr/guide/audit-acpr':
        ('RESTORE', '/conformite/controle-acpr-courtier', 'controle et preuves',
         'oui — conformite.js : /dashboard, /dda/checklist/:client_id, /kyc/:client_id, /mandats, /audit-logs',
         'intention utile, aucune page equivalente : page restauree, sans reformuler les textes reglementaires'),
    '/fr/guide/lcb-ft':
        ('RESTORE', '/conformite/lcb-ft-courtier', 'LCB-FT et verification client',
         'oui — KYC par client, checklist DDA, journal d audit, pieces du dossier',
         'intention utile, aucune page equivalente : page restauree avec sources officielles'),
    '/fr/guide/ipid':
        ('RESTORE', '/conformite/ipid-document-information', 'documents d information produit',
         'oui — documents.client, collecte par lien, lecture assistee, transmissions',
         'intention utile pour la Suisse et la France, aucune page equivalente : page restauree'),
    '/fr/guide/devoir-de-conseil':
        ('REDIRECT', '/guides/devoir-de-conseil-suivi-dossier', 'devoir de conseil',
         'oui', 'equivalent actuel exact : redirection vers le guide existant'),
    '/fr/guide/sanctions-acpr':
        ('REDIRECT', '/conformite/controle-acpr-courtier', 'sanctions de controle',
         'oui', 'sous-sujet de la page controle, desormais restauree'),
    '/fr/guide/reforme-courtage':
        ('REDIRECT', '/conformite/controle-acpr-courtier', 'contexte reglementaire',
         'oui', 'sujet date sans destination propre : rattache a la page controle'),
    '/fr/guide/structurer-pipeline-courtier':
        ('REDIRECT', '/guides/automatiser-suivi-prospects-assurance', 'pipeline commercial',
         'oui — opportunites.js, kanban.js', 'equivalent actuel : guide du suivi des prospects'),
    '/fr/pipeline-kanban-courtier-assurance':
        ('REDIRECT', '/fonctionnalites/prospection-assurance', 'pipeline visuel',
         'oui — kanban_boards, kanban_cards', 'fonctionnalite couverte par la page prospection'),
    '/fr/prioriser-dossiers-courtier-assurance':
        ('REDIRECT', '/fonctionnalites/assistant-ark', 'priorisation',
         'oui — ark_actions, ark_recommendations, brief du matin', 'la priorisation est le role d ARK'),
    '/fr/reduire-double-saisie-cabinet-courtage':
        ('REDIRECT', '/guides/reduire-saisie-manuelle-courtier', 'double saisie',
         'oui — import, docvision, lecture assistee', 'equivalent actuel exact'),
    '/fr/rendez-vous-courtier-assurance':
        ('REDIRECT', '/fonctionnalites/gestion-clients', 'agenda et rendez-vous',
         'oui — calendar.js, appointments, calendar_events', 'les rendez-vous vivent dans la fiche client'),
    '/fr/partenaires-apporteurs-courtier-assurance':
        ('REDIRECT', '/fonctionnalites/gestion-clients', 'apporteurs et partenaires',
         'oui — partners.js (CRUD + stats), table partners', 'fonction reelle sans page dediee : RESTORE a envisager'),
    '/fr/organisation-cabinet-courtage':
        ('REDIRECT', '/guides/organiser-cabinet-courtage-25-points', 'organisation du cabinet',
         'oui', 'equivalent actuel exact (guide 25 points)'),
    '/fr/mesurer-temps-administratif-cabinet':
        ('REDIRECT', '/outils/calculateur-productivite-courtier', 'mesure du temps',
         'oui', 'la methode de mesure est portee par l outil de productivite'),
    '/fr/historique-corrections-courtia':
        ('REDIRECT', '/changelog', 'historique des corrections',
         'oui', 'equivalent actuel : page de journal des versions'),
    '/fr/methode-editoriale-courtia':
        ('REDIRECT', '/a-propos', 'methode editoriale',
         'oui', 'informations d entite : page a propos'),
    '/fr/sources-courtia':
        ('REDIRECT', '/a-propos', 'sources',
         'oui', 'informations d entite : page a propos'),
    '/fr/demo-et-essai-gratuit':
        ('REDIRECT', '/demo', 'demonstration',
         'oui — demonstration publique et essai de 7 jours', 'equivalent actuel exact'),
    '/landing':
        ('REDIRECT', '/', 'ancienne landing',
         'oui', 'l ancienne landing portait exactement l intention de l accueil actuel'),
}

COLONNES = ['legacy_url', 'legacy_slug', 'legacy_topic', 'historic_title', 'historic_intent',
            'historic_keyword', 'historic_content_found', 'current_equivalent', 'product_feature_exists',
            'commercial_value', 'current_demand_signal', 'decision', 'destination', 'implementation',
            'prod_test', 'final_status', 'notes']


def main():
    lignes = list(csv.DictReader(io.open(REPO, encoding='utf-8')))
    invest = [l for l in lignes if l['recommended_action'] == 'INVESTIGATE']
    print('INVESTIGATE dans la classification :', len(invest))

    titres = {}
    for l in invest:
        chemin = '/srv/courtia/frontend/public' + l['url'].replace('https://courtiark.fr', '').rstrip('/') + '/index.html'
        if os.path.exists(chemin):
            import re
            c = io.open(chemin, encoding='utf-8', errors='replace').read()
            m = re.search(r'<title>(.*?)</title>', c, re.S)
            titres[l['url']] = m.group(1).strip() if m else '('

    sortie = []
    manquants = []
    for l in lignes:
        if l['recommended_action'] != 'INVESTIGATE':
            continue
        chemin = l['url'].replace('https://courtiark.fr', '')
        d = DECISIONS.get(chemin)
        if not d:
            manquants.append(chemin)
            continue
        decision, destination, topic, fonction, raison = d
        l['recommended_action'] = 'REDIRECT_308' if decision == 'REDIRECT' else decision
        l['closest_current_url'] = ('https://courtiark.fr' + destination) if destination != '/' else 'https://courtiark.fr/'
        l['notes'] = raison
        sortie.append({
            'legacy_url': l['url'], 'legacy_slug': chemin, 'legacy_topic': topic,
            'historic_title': titres.get(l['url'], '('),
            'historic_intent': 'INFORMATIONAL_SOFTWARE' if 'guide' in chemin or 'conformite' in destination
                               else 'COMMERCIAL_SOFTWARE',
            'historic_keyword': topic, 'historic_content_found': 'oui',
            'current_equivalent': 'oui' if decision == 'REDIRECT' else 'non (page creee)',
            'product_feature_exists': fonction,
            'commercial_value': 'haute' if decision == 'RESTORE' else ('moyenne' if 'fonctionnalites' in destination else 'faible'),
            'current_demand_signal': 'aucune donnee Search Console sur ces URL (hors top requetes)',
            'decision': decision, 'destination': destination,
            'implementation': ('page creee dans le moteur (contenu_restaure.py) + sitemap' if decision == 'RESTORE'
                               else 'regle de redirection permanente (seo/legacy_redirects.json)'),
            'prod_test': 'a verifier apres deploiement',
            'final_status': 'IMPLEMENTE — test production a suivre',
            'notes': raison,
        })
    if manquants:
        raise SystemExit('decisions manquantes pour : %s' % manquants)

    os.makedirs(os.path.dirname(SORTIE), exist_ok=True)
    with io.open(SORTIE, 'w', encoding='utf-8', newline='') as f:
        w = csv.DictWriter(f, fieldnames=COLONNES)
        w.writeheader()
        for s in sortie:
            w.writerow(s)
    with io.open(REPO, 'w', encoding='utf-8', newline='') as f:
        w = csv.DictWriter(f, fieldnames=list(lignes[0].keys()))
        w.writeheader()
        for l in lignes:
            w.writerow(l)
    print('lignes ecrites :', len(sortie), '->', SORTIE)
    from collections import Counter
    print('decisions :', dict(Counter(s['decision'] for s in sortie)))
    reste = [l for l in lignes if l['recommended_action'] == 'INVESTIGATE']
    print('INVESTIGATE restants :', len(reste))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
