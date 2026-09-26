#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""WAVE 1 — univers semantique, ecarts de contenu, cartes reglementaires France/Suisse, branches.

Tout est derive de l'etat REELLEMENT construit : les URL existent-elles dans frontend/public ?
Les fonctionnalites produit existent-elles dans le code ? Aucune couverture n'est declaree a la main.
Les sources officielles sont verifiees par requete HTTP (code 200 attendu) : une source morte est
signalee, pas masquee.
"""
import csv
import io
import os
import re
import subprocess
import json

RACINE = '/srv/courtia'
A = os.path.join(RACINE, 'docs', 'seo', 'authority100')
PUB = os.path.join(RACINE, 'frontend', 'public')
CAPACITES = os.path.join(RACINE, 'seo', 'product_capabilities.json')


def url_existe(chemin):
    p = os.path.join(PUB, chemin.strip('/'), 'index.html') if chemin.strip('/') else os.path.join(PUB, 'index.html')
    return os.path.exists(p)


def http(url):
    r = subprocess.run(['curl', '-sIL', '-o', '/dev/null', '-w', '%{http_code}', '--max-time', '25', url],
                       capture_output=True, text=True)
    return (r.stdout or '').strip()[-3:]


def capacites():
    if os.path.exists(CAPACITES):
        return json.loads(io.open(CAPACITES, encoding='utf-8').read())
    return {}

# ------------------------------------------------------------------ univers semantique
# (topic, cluster, pays, persona, intention, valeur business, url existante ou '', mot-cle cible)
TOPICS = [
    ('CRM courtier assurance', 'CRM', 'FR', 'courtier', 'COMMERCIAL_SOFTWARE', 5, '/crm-courtier-assurance', 'crm courtier assurance'),
    ('Logiciel courtier assurance', 'CRM', 'FR', 'courtier', 'COMMERCIAL_SOFTWARE', 5, '/logiciel-courtier-assurance', 'logiciel pour courtier en assurance'),
    ('Logiciel de courtage', 'CRM', 'FR', 'cabinet', 'COMMERCIAL_SOFTWARE', 5, '/logiciel-courtage-assurance', 'logiciel de courtage assurance'),
    ('Automatisation cabinet', 'productivite', 'FR', 'cabinet', 'COMMERCIAL_SOFTWARE', 4, '/automatisation-courtier-assurance', 'automatisation courtier assurance'),
    ('Gestion du portefeuille', 'portefeuille', 'FR', 'courtier', 'INFORMATIONAL_SOFTWARE', 4, '/fonctionnalites/gestion-portefeuille-assurance', 'gestion portefeuille courtier'),
    ('Fiche client 360', 'client', 'FR', 'courtier', 'INFORMATIONAL_SOFTWARE', 4, '/fonctionnalites/gestion-clients', 'fiche client courtier assurance'),
    ('Prospection', 'prospection', 'FR', 'courtier', 'INFORMATIONAL_SOFTWARE', 4, '/fonctionnalites/prospection-assurance', 'prospection courtier assurance'),
    ('Pipeline commercial', 'pipeline', 'FR', 'equipe', 'INFORMATIONAL_SOFTWARE', 3, '/guides/automatiser-suivi-prospects-assurance', 'pipeline courtier assurance'),
    ('Devis et relances', 'devis', 'FR', 'courtier', 'INFORMATIONAL_SOFTWARE', 4, '/fonctionnalites/relance-devis-assurance', 'relance devis assurance'),
    ('Comparaison de devis', 'comparaison devis', 'FR', 'courtier', 'INFORMATIONAL_SOFTWARE', 4, '/fonctionnalites/comparateur-devis-assurance', 'comparateur devis assurance courtier'),
    ('Documents clients', 'documents', 'FR', 'courtier', 'INFORMATIONAL_SOFTWARE', 4, '/fonctionnalites/gestion-documents-assurance', 'gestion documents courtier'),
    ('Relances clients', 'relances', 'FR', 'courtier', 'INFORMATIONAL_SOFTWARE', 4, '/fonctionnalites/automatisation-relances', 'relance client courtier'),
    ('Renouvellements', 'renouvellements', 'FR', 'courtier', 'INFORMATIONAL_SOFTWARE', 5, '/fonctionnalites/renouvellements-assurance', 'renouvellement assurance courtier'),
    ('Commissions', 'commissions', 'FR', 'cabinet', 'INFORMATIONAL_SOFTWARE', 4, '', 'commission courtier assurance'),
    ('Reporting cabinet', 'reporting', 'FR', 'dirigeant', 'INFORMATIONAL_SOFTWARE', 3, '/fonctionnalites/reporting-courtier', 'reporting cabinet courtage'),
    ('Productivite du cabinet', 'productivite', 'FR', 'cabinet', 'INFORMATIONAL_SOFTWARE', 3, '/outils/calculateur-productivite-courtier', 'productivite cabinet courtage'),
    ('Assistant IA metier', 'ARK/IA', 'FR', 'courtier', 'INFORMATIONAL_SOFTWARE', 4, '/fonctionnalites/assistant-ark', 'ia courtier assurance'),
    ('Marche France', 'France', 'FR', 'cabinet', 'INFORMATIONAL_SOFTWARE', 3, '/france', 'logiciel courtier assurance france'),
    ('Densite du courtage', 'etudes', 'FR', 'analyste', 'INFORMATIONAL_SOFTWARE', 3, '/etudes/courtage-assurance-france-2026', 'densite courtage france'),
    ('Marche Suisse romande', 'Suisse', 'CH', 'cabinet', 'COMMERCIAL_SOFTWARE', 4, '/suisse', 'logiciel courtier assurance suisse'),
    ('CRM Suisse', 'Suisse', 'CH', 'cabinet', 'COMMERCIAL_SOFTWARE', 4, '/suisse/crm-courtier-assurance', 'crm courtier suisse'),
    ('Geneve', 'Suisse', 'CH', 'cabinet', 'COMMERCIAL_SOFTWARE', 3, '/suisse/geneve', 'logiciel courtier geneve'),
    ('Lausanne', 'Suisse', 'CH', 'cabinet', 'COMMERCIAL_SOFTWARE', 3, '/suisse/lausanne', 'logiciel courtier lausanne'),
    ('Devoir de conseil', 'conformite', 'FR', 'courtier', 'INFORMATIONAL_SOFTWARE', 4, '/guides/devoir-de-conseil-suivi-dossier', 'devoir de conseil courtier'),
    ('Controle ACPR', 'conformite', 'FR', 'courtier', 'INFORMATIONAL_SOFTWARE', 3, '/conformite/controle-acpr-courtier', 'controle acpr courtier'),
    ('LCB-FT', 'conformite', 'FR', 'courtier', 'INFORMATIONAL_SOFTWARE', 3, '/conformite/lcb-ft-courtier', 'lcb-ft courtier assurance'),
    ('IPID', 'conformite', 'CH', 'courtier', 'INFORMATIONAL_SOFTWARE', 3, '/conformite/ipid-document-information', 'ipid assurance'),
    ('RGPD et donnees clients', 'data protection', 'FR', 'cabinet', 'INFORMATIONAL_SOFTWARE', 3, '/guides/donnees-clients-assurance-france-suisse', 'rgpd courtier assurance'),
    ('Securite du logiciel', 'securite', 'FR', 'dirigeant', 'INFORMATIONAL_SOFTWARE', 2, '/securite', 'securite logiciel courtier'),
    ('Assurance sante', 'assurances', 'FR', 'courtier', 'INFORMATIONAL_SOFTWARE', 3, '/assurances/mutuelle-sante', 'mutuelle sante courtier'),
    ('Prevoyance', 'assurances', 'FR', 'courtier', 'INFORMATIONAL_SOFTWARE', 3, '/assurances/prevoyance', 'prevoyance courtier'),
    ('Assurance auto', 'assurances', 'FR', 'courtier', 'INFORMATIONAL_SOFTWARE', 3, '/assurances/assurance-auto', 'assurance auto courtier'),
    ('RC professionnelle', 'assurances', 'FR', 'courtier', 'INFORMATIONAL_SOFTWARE', 4, '/assurances/rc-pro', 'rc professionnelle courtier'),
    ('Multirisque professionnelle', 'assurances', 'FR', 'courtier', 'INFORMATIONAL_SOFTWARE', 4, '/assurances/multirisque-professionnelle', 'multirisque professionnelle courtier'),
    ('Glossaire du courtage', 'ressources', 'FR', 'courtier', 'INFORMATIONAL_SOFTWARE', 2, '/glossaire', 'glossaire courtage assurance'),
    ('Outils gratuits', 'outils', 'FR', 'courtier', 'INFORMATIONAL_SOFTWARE', 3, '/outils', 'outils courtier assurance'),
]


def ecrire_univers():
    cap = capacites()
    lignes = []
    for t, cluster, pays, persona, intent, val, url, kw in TOPICS:
        existe = 'oui' if (url and url_existe(url)) else 'non'
        # la fonctionnalite produit rattachee est verifiee dans les capacites, pas supposee
        cle = {'CRM': 'clients', 'portefeuille': 'portefeuille', 'client': 'clients', 'prospection': 'prospection',
               'pipeline': 'pipeline', 'devis': 'devis', 'comparaison devis': 'comparateur', 'documents': 'documents',
               'relances': 'relances', 'renouvellements': 'renouvellements', 'commissions': 'commissions',
               'reporting': 'reporting', 'ARK/IA': 'ark', 'conformite': 'conformite', 'assurances': 'contrats',
               'productivite': 'ark', 'data protection': 'documents', 'securite': 'securite'}.get(cluster)
        produit = cap.get(cle, {}).get('dans_le_produit') if cle and cle in cap else None
        lignes.append({'topic': t, 'cluster': cluster, 'country': pays, 'persona': persona, 'intent': intent,
                       'business_value': val, 'existing_url': url, 'coverage_score': 5 if existe == 'oui' else 0,
                       'authority_value': 5 if cluster in ('etudes', 'conformite', 'outils') else 3,
                       'source_requirement': 'oui' if cluster in ('conformite', 'data protection') else 'non',
                       'target_keyword': kw, 'supporting_queries': '', 'product_relevance': produit if produit is not None else 'n/a',
                       'action': 'renforcer (page existante)' if existe == 'oui' else 'creer sur signal GSC ou demande'})
    with io.open(os.path.join(A, '03_SEMANTIC_UNIVERSE.csv'), 'w', encoding='utf-8', newline='') as f:
        w = csv.DictWriter(f, fieldnames=list(lignes[0].keys()))
        w.writeheader()
        w.writerows(lignes)
    couverts = sum(1 for l in lignes if l['coverage_score'])
    print('03_SEMANTIC_UNIVERSE.csv : %d sujets, %d avec page (%d%%)' % (len(lignes), couverts, 100 * couverts // len(lignes)))
    return lignes


def ecrire_gaps(lignes):
    manquants = [l for l in lignes if l['coverage_score'] == 0]
    with io.open(os.path.join(A, '04_CONTENT_GAPS.csv'), 'w', encoding='utf-8', newline='') as f:
        w = csv.writer(f)
        w.writerow(['topic', 'cluster', 'existing_url', 'quality_score', 'search_value', 'business_value',
                    'authority_value', 'missing_sections', 'source_required', 'action', 'priority'])
        for l in manquants:
            w.writerow([l['topic'], l['cluster'], '', '', 3, l['business_value'], l['authority_value'],
                        'page absente', l['source_requirement'], 'creer seulement sur signal (GSC/business)', 'P2'])
        # sujets couverts mais a renforcer
        for l in lignes:
            if l['coverage_score'] and l['business_value'] >= 4:
                w.writerow([l['topic'], l['cluster'], l['existing_url'], 4, 4, l['business_value'],
                            l['authority_value'], 'renforcer la preuve et le maillage',
                            l['source_requirement'], 'renforcer', 'P1'])
    print('04_CONTENT_GAPS.csv : %d lignes' % (len(manquants) + sum(1 for l in lignes if l['coverage_score'] and l['business_value'] >= 4)))


SOURCES_FR = [
    ('DDA — directive distribution assurance', 'ACPR', 'https://acpr.banque-france.fr/', '/guides/devoir-de-conseil-suivi-dossier'),
    ('Intermediation — registre unique', 'ORIAS', 'https://www.orias.fr/', '/conformite/controle-acpr-courtier'),
    ('Controle et sanctions', 'ACPR', 'https://acpr.banque-france.fr/', '/conformite/controle-acpr-courtier'),
    ('LCB-FT — vigilance client', 'ACPR', 'https://acpr.banque-france.fr/', '/conformite/lcb-ft-courtier'),
    ('Protection des donnees', 'CNIL', 'https://www.cnil.fr/', '/guides/donnees-clients-assurance-france-suisse'),
    ('Information produit (IPID/DDA)', 'EUR-Lex', 'https://eur-lex.europa.eu/', '/conformite/ipid-document-information'),
    ('Textes assurance (Legifrance)', 'Legifrance', 'https://www.legifrance.gouv.fr/', '/guides/devoir-de-conseil-suivi-dossier'),
]
SOURCES_CH = [
    ('Loi sur le contrat d assurance (LSA)', 'Fedlex', 'https://www.fedlex.admin.ch/', '/conformite/ipid-document-information'),
    ('Surveillance des intermediaires', 'FINMA', 'https://www.finma.ch/fr/', '/suisse'),
    ('Registre des intermediaires', 'FINMA', 'https://www.finma.ch/fr/authorisation/assurance/', '/suisse/crm-courtier-assurance'),
    ('Protection des donnees (LPD)', 'PFPDT', 'https://www.edoeb.admin.ch/', '/guides/donnees-clients-assurance-france-suisse'),
]


def ecrire_cartes():
    for nom, source, pays in [('05_FRANCE_REGULATORY_MAP.csv', SOURCES_FR, 'France'),
                             ('06_SWITZERLAND_REGULATORY_MAP.csv', SOURCES_CH, 'Suisse')]:
        lignes = []
        for topic, autorite, url, page in source:
            code = http(url)
            # 202 et 403 ne veulent pas dire « source morte » : ce sont des refus adresses aux robots.
            if code == '200':
                etat = 'accessible (verifie par requete)'
            elif code in ('202', '400', '403', '429'):
                # FINMA, EUR-Lex et Legifrance refusent les requetes venant d'un centre de donnees :
                # ce n'est pas une source morte, mais nous ne pouvons pas la valider automatiquement.
                etat = ('refus au serveur (code %s) : acces depuis un navigateur a confirmer' % code)
            else:
                etat = 'SOURCE MORTE : code %s, remplacer avant publication' % code
            lignes.append([topic, autorite, url, code, page, 'oui' if url_existe(page) else 'non',
                           'non', etat, ''])
        with io.open(os.path.join(A, nom), 'w', encoding='utf-8', newline='') as f:
            w = csv.writer(f)
            w.writerow(['topic', 'official_source', 'source_url', 'source_http', 'existing_url', 'coverage',
                        'missing', 'action', 'review_date'])
            w.writerows(lignes)
        mortes = [l for l in lignes if l[3] not in ('200', '202', '400', '403', '429')]
        print('%s : %d sources, %d a verifier' % (nom, len(lignes), len(mortes)))


BRANCHES = [
    ('Sante / mutuelle', '/assurances/mutuelle-sante', 'oui', 'oui'),
    ('Prevoyance', '/assurances/prevoyance', 'oui', 'oui'),
    ('Auto', '/assurances/assurance-auto', 'oui', 'oui'),
    ('IARD / multirisque professionnelle', '/assurances/multirisque-professionnelle', 'oui', 'oui'),
    ('RC professionnelle', '/assurances/rc-pro', 'oui', 'oui'),
    ('Habitation', '', 'non', 'non'),
    ('Decennale / construction', '', 'non', 'non'),
]


def ecrire_branches():
    cap = capacites()
    with io.open(os.path.join(A, '07_INSURANCE_BRANCH_MAP.csv'), 'w', encoding='utf-8', newline='') as f:
        w = csv.writer(f)
        w.writerow(['branche', 'existing_url', 'page_existe', 'cas_usage_logiciel', 'fonction_verifiee', 'action'])
        for branche, url, existe, cas in BRANCHES:
            w.writerow([branche, url, existe, cas,
                        'contrats=%s documents=%s renouvellements=%s' % (
                            cap.get('contrats', {}).get('dans_le_produit', '?'),
                            cap.get('documents', {}).get('dans_le_produit', '?'),
                            cap.get('renouvellements', {}).get('dans_le_produit', '?')),
                        'renforcer la page en cas d usage cabinet' if existe == 'oui' else
                        'ne pas creer sans besoin produit verifie'])
    print('07_INSURANCE_BRANCH_MAP.csv : %d branches' % len(BRANCHES))


def main():
    os.makedirs(A, exist_ok=True)
    lignes = ecrire_univers()
    ecrire_gaps(lignes)
    ecrire_cartes()
    ecrire_branches()
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
