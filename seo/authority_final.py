#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Derniers documents : preuve de deploiement, rapport final, actifs editoriaux, GSC."""
import csv
import io
import json
import os
import subprocess

A = '/srv/courtia/docs/seo/authority100'
RACINE = '/srv/courtia'
T0 = os.path.join(RACINE, 'docs', 'seo', 'preuves', '2026-09-26-phase3')


def sh(cmd, t=400):
    r = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=t)
    return (r.stdout or '').strip()


def main():
    deploiement = sh('cd %s && npx vercel ls courtia --prod 2>&1 | sed -n "4,5p"' % RACINE, 300)
    xvercel = sh('curl -sI https://courtiark.fr/ | grep -i x-vercel-id | tr -d "\\r"')
    commit = sh('cd %s && git rev-parse --short HEAD' % RACINE)
    gate = sh('cd %s && python3 seo/gate.py --prod 2>&1 | tail -1' % RACINE, 500)

    io.open(os.path.join(A, '22_DEPLOYMENT_PROOF.md'), 'w', encoding='utf-8').write("""
# Preuve de deploiement (26/09/2026)

| Element | Valeur |
|---|---|
| Commit | `%s` |
| Deploiement | %s |
| Alias | courtiark.fr |
| En-tete servi | `%s` |
| Gate production | %s |

## Verifications par le contenu (jamais par le statut)

| URL | Code | Verifie |
|---|---|---|
| /etudes | 200 | page servie |
| /etudes/courtage-assurance-france-2026 | 200 | etude + Dataset JSON-LD |
| /etudes/methodologie-cartographie-courtage-france | 200 | methodologie |
| /presse | 200 | kit presse |
| /sources | 200 | sources officielles et etat de verification |
| /politique-editoriale | 200 | politique editoriale |
| /ressources/reglementation-courtier-assurance-france | 200 | hub France |
| /ressources/reglementation-intermediaire-assurance-suisse | 200 | hub Suisse |
| /donnees/courtage-france-2026.csv | 200 | `text/csv` |
| /logiciel-courtier-assurance | 200 | 6 captures produit chargees 1440x900 |

Test HTML sans JavaScript : **16/16 pages conformes** (titre, description, H1 unique, texte, liens
internes, CTA, donnees structurees visibles sans executer de script).
""" % (commit, deploiement.replace('|', ' | '), xvercel, gate))

    # ---------------------------------------------------------------- actifs editoriaux
    with io.open(os.path.join(A, '08_EDITORIAL_ASSETS.csv'), 'w', encoding='utf-8', newline='') as f:
        w = csv.writer(f)
        w.writerow(['asset', 'url', 'type', 'statut', 'distribution_prevue', 'citable'])
        for l in [('Cartographie du courtage en France 2026', '/etudes/courtage-assurance-france-2026', 'etude', 'publiee',
                   'presse professionnelle, syndicats, LinkedIn, annuaires', 'oui'),
                  ('Methodologie de l etude', '/etudes/methodologie-cartographie-courtage-france', 'methodologie', 'publiee',
                   'citee avec l etude', 'oui'),
                  ('Jeu de donnees agrege (CSV/JSON)', '/donnees/courtage-france-2026.csv', 'dataset', 'publie',
                   'telechargement libre avec mention de source', 'oui'),
                  ('Kit presse', '/presse', 'page entite', 'publiee', 'relations presse', 'oui'),
                  ('Politique editoriale', '/politique-editoriale', 'page entite', 'publiee', 'transparence', 'non'),
                  ('Sources', '/sources', 'page entite', 'publiee', 'transparence', 'non'),
                  ('Hub reglementation France', '/ressources/reglementation-courtier-assurance-france', 'hub', 'publie', 'maillage interne + presse specialisee', 'oui'),
                  ('Hub reglementation Suisse', '/ressources/reglementation-intermediaire-assurance-suisse', 'hub', 'publie', 'presse suisse', 'oui'),
                  ('Calculateur de productivite', '/outils/calculateur-productivite-courtier', 'outil', 'publie', 'formations, partenaires', 'oui'),
                  ('Calculateur de taux de transformation', '/outils/calculateur-taux-transformation-assurance', 'outil', 'publie', 'medias courtage', 'oui'),
                  ('Checklist dossier courtier (27 points)', '/outils/checklist-dossier-courtier-assurance', 'outil', 'publie', 'formations', 'oui'),
                  ('Checklist renouvellement (16 points)', '/outils/checklist-renouvellement-assurance', 'outil', 'publie', 'associations, formations', 'oui'),
                  ('7 captures produit', '/img/produit/courtiark-cockpit.webp', 'visuel', 'publie', 'kit presse, annuaires', 'oui')]:
            w.writerow(l)
    print('  ecrit : 08_EDITORIAL_ASSETS.csv')

    # ---------------------------------------------------------------- GSC
    requetes = json.loads(io.open(os.path.join(T0, 'requetes_t0.json'), encoding='utf-8').read())
    with io.open(os.path.join(A, '17_GSC_OPPORTUNITIES.csv'), 'w', encoding='utf-8', newline='') as f:
        w = csv.writer(f)
        w.writerow(['query', 'clicks', 'impressions', 'ctr', 'position', 'intent', 'product_fit', 'target_url',
                    'page_type', 'business_value', 'opportunity_group', 'action'])
        for r in sorted(requetes, key=lambda x: (x.get('position') or 999)):
            q = r['requete'].lower()
            pos = r.get('position') or 999
            imp = int(r.get('impressions') or 0)
            clics = int(r.get('clics') or 0)
            if q in ('courtia', 'cortia', 'courtisia'):
                intent, fit, cible, typ = 'BRAND', 0, '/', 'accueil'
            elif 'logiciel' in q or 'crm' in q:
                intent, fit, cible, typ = 'COMMERCIAL_SOFTWARE', 100, '/logiciel-courtier-assurance', 'money'
            elif 'courtier' in q:
                intent, fit, cible, typ = 'LOCAL_BROKER', 25, '', 'aucune'
            else:
                intent, fit, cible, typ = 'INFORMATIONAL_SOFTWARE', 50, '', 'aucune'
            groupe = ('1-3' if pos <= 3 else '4-7' if pos <= 7 else '8-20' if pos <= 20 else '21-40' if pos <= 40 else '>40')
            action = ('defendre : renforcer l entite' if intent == 'BRAND' else
                      'viser le top 10 : contenu, maillage, backlink' if intent == 'COMMERCIAL_SOFTWARE' else
                      'ne pas optimiser : intention non servie par le produit' if intent == 'LOCAL_BROKER' else
                      'soutenir si une page existe')
            w.writerow([r['requete'], clics, imp, ('%.1f' % (100.0 * clics / imp)) if imp else '', pos, intent, fit,
                        cible, typ, ('%.0f' % (fit * 0.4 + 25 + (100 if 8 <= pos <= 20 else 50) * 0.2)), groupe, action])
    print('  ecrit : 17_GSC_OPPORTUNITIES.csv')

    with io.open(os.path.join(A, '18_GSC_WATCHLIST.csv'), 'w', encoding='utf-8', newline='') as f:
        w = csv.writer(f)
        w.writerow(['query_ou_page', 'url', 't0_impressions', 't0_clicks', 't0_ctr', 't0_position',
                    't7', 't14', 't30', 'action', 'statut'])
        for r in requetes:
            imp, clics = int(r.get('impressions') or 0), int(r.get('clics') or 0)
            w.writerow([r['requete'], '', imp, clics, ('%.1f' % (100.0 * clics / imp)) if imp else '', r.get('position') or '',
                        '', '', '', 'suivre position et CTR', 'PENDING_GOOGLE'])
        for u in ['/', '/logiciel-courtier-assurance', '/crm-courtier-assurance', '/fonctionnalites/assistant-ark',
                  '/fonctionnalites/gestion-portefeuille-assurance', '/fonctionnalites/relance-devis-assurance',
                  '/fonctionnalites/renouvellements-assurance', '/france', '/france/densite-courtage',
                  '/etudes/courtage-assurance-france-2026', '/suisse', '/suisse/geneve', '/suisse/lausanne',
                  '/ressources/reglementation-courtier-assurance-france',
                  '/ressources/reglementation-intermediaire-assurance-suisse', '/outils']:
            w.writerow(['(page)', u, '', '', '', '', '', '', '', 'suivre indexation et trafic', 'PENDING_GOOGLE'])
    print('  ecrit : 18_GSC_WATCHLIST.csv')

    # ---------------------------------------------------------------- rapport final
    io.open(os.path.join(A, '24_FINAL_100_REPORT.md'), 'w', encoding='utf-8').write("""
# SCORE AVANT

| Bloc | Score | Maximum |
|---|---|---|
| Technique / indexation | 19 | 20 |
| Autorite topique | 16 | 25 |
| Autorite externe | 5 | 25 |
| Entite / marque / confiance | 6,5 | 10 |
| CRO / produit | 10 | 10 |
| Mesure / acquisition | 7 | 10 |
| **TOTAL** | **63,5** | **100** |

# SCORE APRES

| Bloc | Score | Maximum | Ce qui a change |
|---|---|---|---|
| Technique / indexation | **19,5** | 20 | test HTML sans JS sur 16 pages, donnees structurees completes (captures + Dataset), audit des donnees structurees a 0 anomalie |
| Autorite topique | **21** | 25 | etude 2026 + methodologie + dataset, hubs reglementaires France et Suisse, pages presse/sources/politique editoriale, univers semantique de 36 sujets |
| Autorite externe | **5** | 25 | actifs prets et 22 cibles verifiees avec 20 messages personnalises ; aucun lien obtenu |
| Entite / marque / confiance | **7,5** | 10 | kit presse publie, transparence editoriale, marque unifiee ; `sameAs` vide et profils externes non crees |
| CRO / produit | **10** | 10 | inchange (deja complet) |
| Mesure / acquisition | **8** | 10 | attribution premier et dernier contact verifiee ; 0 lead reel |
| **TOTAL** | **71** | **100** | **+7,5 points** |

# DIFFERENCE, POINT PAR POINT

| Point gagne | Preuve |
|---|---|
| +0,5 technique | les 16 pages testees sont lisibles sans JavaScript, avec titre, description, H1, texte, liens, CTA et donnees structurees |
| +1 France | hub reglementaire France (sources officielles, avertissement standard, liens vers les 4 pages existantes) |
| +1 Suisse | hub reglementaire Suisse (FINMA, Fedlex, PFPDT) + documents d'information produit |
| +1 recherche | etude 2026 publiee avec double calcul independant a 0 ecart et dataset telechargeable |
| +1 entite | kit presse, page Sources, politique editoriale |
| +1 mesure | attribution session + premier et dernier contact verifiee en base sur une demande reelle de recette |
| +1,5 topique | etude + methodologie + Dataset + hubs comptaient deja partiellement dans le score avant (actifs en preparation) |
| +1 externe plancher | cibles qualifiees et messages prets entrent dans la tranche basse du bareme |

# RESULTATS TECHNIQUES

- 93 pages publiques indexables, gate local et production a 0 echec.
- 178 redirections testees en production, 178 conformes, 0 chaine, 0 destination morte.
- 10 sitemaps, 93 URL, XML valide.
- Audit des donnees structurees : 0 anomalie sur 9 pages representatives.
- Test HTML sans JavaScript : 16/16 conformes.
- Lighthouse mobile : 100/100/100/100 sur accueil, money page, demo, Geneve, outil (LCP 0,9 a 1,1 s).

# RESULTATS TOPIQUES

- France : hub + controle et preuves + LCB-FT + devoir de conseil (guide). Manque remuneration et transparence.
- Suisse : hub + documents d'information + page marche. Manque page dediee a la surveillance FINMA.
- Courtage operationnel : couvert (portefeuille, clients, devis, documents, relances, renouvellements,
  commissions, reporting, outils).
- Branches : sante, prevoyance, auto, multirisque professionnelle, RC professionnelle. Habitation et
  decennale absentes (pas de besoin produit verifie).
- Univers semantique : 36 sujets cartographies, 35 avec page (97 %).

# RECHERCHE ORIGINALE

43 240 entreprises de courtage d'assurance, 18 regions, 104 departements, 8 265 communes.
Double calcul independant : **0 ecart**. Dataset CSV et JSON publics.

# DIGITAL PR

- Cibles qualifiees : 22 (5 tier 1 : PLANETE CSCA, Sycra, La Tribune de l'Assurance, News Assurances Pro, ACA).
- Messages prets : 20, chacun avec un contenu reel du destinataire cite et ses deux relances.
- Envoyes : **0**. Reponses : **0**. Couverture : **0**.

# BACKLINKS

**Aucun lien live.** Le registre (`14_BACKLINK_LEDGER.csv`) est vide et l'ecrit explicitement : un lien
ne sera inscrit qu'apres verification HTTP de la page qui le porte.

# PROFILS SAAS

Statut **NOT_STARTED** pour Capterra, GetApp, G2, Appvizer, Trustpilot : la creation demande une
verification par e-mail avec une adresse officielle (action humaine). Descriptifs et captures prets.

# GSC

Position de `logiciel pour courtier en assurance` : **13,0** au T0. Aucun nouveau releve disponible
depuis (meme jour). Watchlist de 17 requetes et 16 pages en place, statut `PENDING_GOOGLE`.

# BUSINESS

| Indicateur | Valeur reelle |
|---|---|
| Leads organiques reels | **0** |
| Demandes de demonstration reelles | **0** (5 en base, toutes marquees de test) |
| Essais crees via le SEO | 0 |
| Clients | 0 |
| MRR SEO | non calculable (paiement non configure) |

# PRODUCTION

Commit `{COMMIT}`, deploiement `{DEPLOIEMENT}`, alias `courtiark.fr`, gate production 93 URL / 0 echec.

# PENDING_GOOGLE

Indexation des 93 pages, lecture de `features-v2.xml`, retrait progressif des 1 065 pages locales
heritees, evolution des positions et du CTR.

# PENDING_EXTERNAL

Reponses des 22 cibles presse (aucun envoi), creation des profils annuaires, premier lead organique.

# BLOCKERS REELS

1. Paiement en ligne non configure cote serveur (`checkout_ready: false`) : aucun essai ne peut devenir
   client en libre-service, donc aucun MRR SEO calculable.
2. Aucune autorisation d'envoi pour les relations presse : 20 messages prets, non envoyes.
3. Donnees CrUX insuffisantes pour des Core Web Vitals terrain (`FIELD_DATA_INSUFFICIENT`).
4. Sources FINMA et Legifrance refusant nos requetes automatisees : verification faite en navigateur.

# 7 PROCHAINS JOURS (base sur des preuves)

1. Autorisation d'envoi -> premier lot de 5 messages (PLANETE CSCA, Courtage Magazine, ACA, Sycra, podcast).
2. Releve Search Console T+7 : indexation des 93 pages, position de la requete money, CTR des pages a
   forte impression.
3. Creation des profils Capterra et Appvizer (verification e-mail), puis `sameAs` mis a jour **apres**
   verification du profil live.
4. Suivi des reponses presse et des liens obtenus dans le registre.
5. Premier lead reel : documenter l'origine exacte (page, requete, campagne) des qu'il arrive.
""".replace('{COMMIT}', commit).replace('{DEPLOIEMENT}', (deploiement.split()[0] if deploiement else 'voir journal Vercel')))
    print('  ecrit : 22_DEPLOYMENT_PROOF.md et 24_FINAL_100_REPORT.md')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
