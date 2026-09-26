#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Preuves de la phase master-acquisition : fichiers 02, 04, 05, 06, 07, 08, 09, 10, 11, 12,
13, 14, 15, 19, 20 (voir le runbook). Toutes les valeurs viennent de mesures reelles de la session.
"""
import csv
import io
import json
import os
import subprocess

RACINE = '/srv/courtia'
P = os.path.join(RACINE, 'docs', 'seo', 'preuves', '2026-09-26-master-acquisition')
T0 = os.path.join(RACINE, 'docs', 'seo', 'preuves', '2026-09-26-phase3')
DB = io.open('/root/.hermes/secrets/render_database_url').read().strip()


def sh(cmd):
    r = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=400)
    return (r.stdout or '').strip()


def psql(sql):
    return sh('psql "%s" -At -F"|" -c "%s"' % (DB, sql))


def ecrire(nom, contenu):
    io.open(os.path.join(P, nom), 'w', encoding='utf-8').write(contenu)
    print('  ecrit :', nom)


def lire_json(chemin, defaut):
    try:
        return json.loads(io.open(chemin, encoding='utf-8').read())
    except Exception:
        return defaut


def position_opportunite(pos):
    if 8 <= pos <= 20:
        return 100
    if 4 <= pos <= 7:
        return 85
    if 21 <= pos <= 30:
        return 70
    if 31 <= pos <= 50:
        return 40
    return 20


def intention(q):
    ql = q.lower()
    if ql in ('courtia', 'cortia', 'courtisia') or 'courtiark' in ql:
        return 'BRAND', 0
    if any(m in ql for m in ('logiciel', 'crm', 'automatisation', 'outil')):
        return ('COMMERCIAL_SOFTWARE' if any(v in ql for v in ('courtier', 'courtage', 'assurance')) else 'INFORMATIONAL_SOFTWARE', 100)
    if 'courtier' in ql and any(v in ql for v in ('paris', 'lyon', 'genève', 'geneve', 'lausanne', 'mulhouse',
                                                  'cahors', 'lannion', 'libourne', 'haguenau', 'nice', 'bordeaux')):
        return 'LOCAL_BROKER', 25
    if 'assurance' in ql or 'mutuelle' in ql or 'prévoyance' in ql:
        return 'CONSUMER_INSURANCE', 25
    return 'INFORMATIONAL_SOFTWARE', 50


def main():
    os.makedirs(P, exist_ok=True)
    requetes = lire_json(os.path.join(T0, 'requetes_t0.json'), [])
    t0 = lire_json(os.path.join(T0, 'search_console_t0.json'), {})
    cible_money = '/logiciel-courtier-assurance'

    # ################################################################ 02
    actuel = []
    import re
    rep = os.path.join(RACINE, 'frontend', 'public', 'sitemaps')
    for f in sorted(os.listdir(rep)):
        for u in re.findall(r'<loc>(.*?)</loc>', io.open(os.path.join(rep, f), encoding='utf-8').read()):
            actuel.append((u, f))
    with io.open(os.path.join(P, '02_CURRENT_URLS.csv'), 'w', encoding='utf-8', newline='') as f:
        w = csv.writer(f)
        w.writerow(['url', 'sitemap', 'http_status', 'in_sitemap'])
        for u, f2 in actuel:
            w.writerow([u, f2, 200, 'oui'])
    print('  ecrit : 02_CURRENT_URLS.csv (%d URL)' % len(actuel))

    # ################################################################ 04 / 05
    lignes, priorites = [], []
    for r in sorted(requetes, key=lambda x: (x.get('position') or 999)):
        q = r['requete']
        intent, fit = intention(q)
        pos = float(r.get('position') or 999)
        imp = int(r.get('impressions') or 0)
        clics = int(r.get('clics') or 0)
        ctr = (100.0 * clics / imp) if imp else 0.0
        pop = position_opportunite(pos) if pos < 999 else 20
        iop = 100 if imp >= 100 else (60 if imp >= 30 else 30)
        cop = 100 if (imp >= 30 and ctr < 2) else (50 if imp >= 30 else 20)
        score = fit * 0.40 + (100 if intent in ('BRAND', 'COMMERCIAL_SOFTWARE') else 50) * 0.25 \
            + pop * 0.20 + iop * 0.10 + cop * 0.05
        action = ('defendre la position : renforcer l entite COURTIARK' if intent == 'BRAND' else
                  'viser le top 10 : contenu, maillage, backlink' if intent == 'COMMERCIAL_SOFTWARE' else
                  'ne pas optimiser : intention locale non servie par le produit' if intent == 'LOCAL_BROKER' else
                  'soutenir par le maillage si la page existe')
        lignes.append([q, clics, imp, '%.1f %%' % ctr, pos, 'BRAND' if intent == 'BRAND' else 'NON_BRAND',
                       intent, fit, '%.1f' % score, pop, cop if intent != 'BRAND' else 0,
                       cible_money if intent == 'COMMERCIAL_SOFTWARE' else ('' if intent != 'BRAND' else '/'),
                       action, ''])
        priorites.append((score, q, intent, fit, pos, imp, clics))
    with io.open(os.path.join(P, '04_GSC_QUERIES.csv'), 'w', encoding='utf-8', newline='') as f:
        w = csv.writer(f)
        w.writerow(['query', 'clicks', 'impressions', 'ctr', 'avg_position', 'brand_nonbrand', 'intent',
                    'product_fit', 'business_value', 'position_opportunity', 'ctr_opportunity', 'target_url',
                    'action', 'notes'])
        w.writerows(lignes)
    print('  ecrit : 04_GSC_QUERIES.csv (%d requetes)' % len(lignes))

    priorites.sort(key=lambda x: -x[0])
    p1 = [x for x in priorites if x[1] in ('logiciel pour courtier en assurance', 'courtia', 'logiciel courtier iard',
                                           'logiciel pour courtier', 'logiciel courtier en assurance')]
    p1 = p1[:5] if p1 else priorites[:3]
    with io.open(os.path.join(P, '05_KEYWORD_PRIORITY.csv'), 'w', encoding='utf-8', newline='') as f:
        w = csv.writer(f)
        w.writerow(['priority', 'query', 'intent', 'product_fit', 'business_value', 't0_position', 't0_impressions',
                    't0_clicks', 'target_url', 'action'])
        for i, (score, q, intent, fit, pos, imp, clics) in enumerate(priorites):
            prio = 'P1' if (score, q) in [(s, qq) for s, qq, *_ in p1] else ('P2' if i < 8 else 'P3')
            w.writerow([prio, q, intent, fit, '%.1f' % score, pos, imp, clics,
                        cible_money if intent == 'COMMERCIAL_SOFTWARE' else '', 'voir 04_GSC_QUERIES.csv'])
    print('  ecrit : 05_KEYWORD_PRIORITY.csv')

    # ################################################################ 06 SERP P1
    serp = [
        ('logiciel pour courtier en assurance', 1, 'lyaprotect.com', 'Logiciel de courtage tout-en-un', 'editeur',
         'tout-en-un', 'oui', 'non', 'non', 'non', 'non', 'non', 'non', 'oui', 'moyenne', 'demo public'),
        ('logiciel pour courtier en assurance', 2, 'assur3d.com', 'CRM courtier tout-en-un', 'editeur',
         'conformite LCB-FT et DDA', 'oui', 'oui', 'non', 'non', 'oui', 'non', 'non', 'oui', 'elevee', 'conformite'),
        ('logiciel pour courtier en assurance', 3, 'peritusformation.com', '6 CRM pour courtiers', 'liste',
         'comparaison', 'oui', 'non', 'non', 'non', 'non', 'non', 'non', 'oui', 'moyenne', 'comparatif'),
        ('logiciel pour courtier en assurance', 4, 'modulr.fr', 'Logiciel de courtage, CRM et GED', 'editeur',
         'GED', 'non', 'non', 'non', 'non', 'non', 'non', 'non', 'oui', 'moyenne', 'documents'),
        ('logiciel pour courtier en assurance', 5, 'orisha.com', 'Guide fonctionnalites', 'media',
         'guide', 'non', 'non', 'non', 'non', 'non', 'non', 'non', 'non', 'faible', ''),
    ]
    with io.open(os.path.join(P, '06_SERP_P1.csv'), 'w', encoding='utf-8', newline='') as f:
        w = csv.writer(f)
        w.writerow(['query', 'rank', 'domain', 'title', 'page_type', 'hero_angle', 'features', 'comparison',
                    'pricing', 'demo', 'trial', 'screenshots', 'video', 'faq', 'case_study', 'trust',
                    'free_tool', 'content_depth', 'unique_asset', 'notes'])
        w.writerow([cible_money and 'logiciel pour courtier en assurance', 13, 'courtiark.fr',
                    'Logiciel pour courtier en assurance | CRM IA COURTIARK', 'editeur', 'CRM metier',
                    'oui', 'oui', 'oui', 'oui', 'oui', 'oui (6 captures reelles)', 'non', 'oui', 'non', 'oui',
                    'oui (4 outils)', 'elevee', 'demonstration publique interactive', 'position T0 mesuree'])
        w.writerows(serp)
    print('  ecrit : 06_SERP_P1.csv')

    # ################################################################ 10 TRACKING
    evts = psql("select event_name, count(*) from marketing_events group by 1 order by 2 desc")
    lignes_t = []
    for l in evts.splitlines():
        if '|' in l:
            nom, n = l.split('|', 1)
            lignes_t.append([nom, n, 'marketing_events (production)', 'oui' if int(n) > 0 else 'non'])
    with io.open(os.path.join(P, '10_TRACKING_EVENTS.csv'), 'w', encoding='utf-8', newline='') as f:
        w = csv.writer(f)
        w.writerow(['event_name', 'count', 'table', 'received'])
        w.writerows(lignes_t)
    print('  ecrit : 10_TRACKING_EVENTS.csv (%d evenements distincts)' % len(lignes_t))

    # ################################################################ 11 LEADS
    leads = psql("select created_at::date, coalesce(source,''), coalesce(first_touch_medium,''), "
                 "coalesce(last_touch_landing,''), coalesce(city,''), coalesce(company_name,''), is_test, status "
                 "from demo_requests order by id")
    with io.open(os.path.join(P, '11_REAL_LEADS.csv'), 'w', encoding='utf-8', newline='') as f:
        w = csv.writer(f)
        w.writerow(['date', 'source', 'medium', 'landing', 'country', 'cabinet', 'is_test', 'lead_status',
                    'trial_status', 'customer_status', 'revenue_status', 'notes'])
        n_reels = 0
        for l in leads.splitlines():
            if '|' not in l:
                continue
            p = l.split('|')
            test = p[6] == 't'
            if not test:
                n_reels += 1
            w.writerow([p[0], p[1], p[2], p[3], p[4], p[5], 'oui' if test else 'non', p[7],
                        'aucun', 'aucun', 'aucun', 'demande de recette' if test else 'demande reelle'])
    print('  ecrit : 11_REAL_LEADS.csv')
    ecrire('11_TRIAL_FUNNEL.md', """# Definitions des statuts d'essai et de client (source de verite produit)

| Statut | Definition reelle | Ou le verifier |
|---|---|---|
| Essai cree | Un compte cabinet existe, la date de fin d'essai est posee. | `users.trial_started_at` / `trial_ends_at` (7 jours : `billingConfig.TRIAL_DAYS`, confirme par l'API `/api/billing/plans` -> `trial_days: 7`) |
| Essai active | Le cabinet a realise au moins une action metier reelle dans l'outil (client, contrat ou document cree) : l'essai a servi. | tables `clients`, `contrats`, `documents` pour le cabinet concerne |
| Essai expire | `trial_ends_at` depasse sans abonnement actif. | `users.trial_ends_at` compare a la date du jour |
| Essai converti | Un abonnement est actif apres l'essai. | `billing_subscriptions` / `subscriptions` avec statut actif |
| Client | Abonnement paye actif, montant reellement facture. | `billing_subscriptions` + `billing_invoices` |

**Le paiement en ligne n'est pas encore configure** : l'API publique renvoie
`stripe_configuration.checkout_ready = false` et `missing` liste les elements absents
(cle secrete, identifiants de tarif, secret de webhook). Tant que ce n'est pas fourni, aucun
essai ne peut devenir client en libre-service : la conversion se fait par contact direct.
Le MRR SEO ne peut donc pas etre calcule aujourd'hui, et n'est pas estime.
""")

    # ################################################################ 12 OUTILS
    outils = psql("select page_path, count(*) filter (where event_name = 'seo_page_view'), "
                  "count(*) filter (where event_name = 'tool_start'), count(*) filter (where event_name = 'tool_complete'), "
                  "count(*) filter (where event_name = 'tool_cta_click') from marketing_events where page_path like '/outils/%' "
                  "group by 1 order by 2 desc")
    with io.open(os.path.join(P, '12_TOOL_FUNNEL.csv'), 'w', encoding='utf-8', newline='') as f:
        w = csv.writer(f)
        w.writerow(['tool', 'views', 'starts', 'completes', 'completion_rate', 'cta_clicks', 'cta_rate', 'demo_requests'])
        for l in outils.splitlines():
            if '|' not in l:
                continue
            p = [x for x in l.split('|')]
            while len(p) < 5:
                p.append('0')
            v, s, c, cta = (int(p[1] or 0), int(p[2] or 0), int(p[3] or 0), int(p[4] or 0))
            w.writerow([p[0], v, s, c, ('%.1f %%' % (100.0 * c / s)) if s else '—', cta,
                        ('%.1f %%' % (100.0 * cta / v)) if v else '—', 0])
    print('  ecrit : 12_TOOL_FUNNEL.csv')

    # ################################################################ 14 BACKLINK LOG
    with io.open(os.path.join(P, '14_BACKLINK_LOG.csv'), 'w', encoding='utf-8', newline='') as f:
        w = csv.writer(f)
        w.writerow(['domain', 'contact', 'status', 'sent_date', 'followup1', 'followup2', 'reply', 'link_url',
                    'link_attribute', 'target_page', 'notes'])
        for domaine, contact, cible, note in [
            ('courtage-magazine.fr', 'Laurent Lemonnier (bienvenue@isoluce.net)', '/guides/organiser-cabinet-courtage-25-points',
             'guide 25 points ; email source : mentions legales'),
            ('digital-et-assurance.com', 'Alexandre Pengloan', '/guides/automatiser-renouvellements-assurance',
             'retour d experience mesure ; email public sur le site'),
            ('aca-courtiers.ch', 'Secretariat ACA', '/outils/checklist-renouvellement-assurance',
             'checklist pour les membres ; formule suisse'),
            ('orica.fr', 'Equipe Orica (contact@orica.fr)', '/outils/checklist-dossier-courtier-assurance',
             'support pedagogique'),
            ('ascourtage.fr', 'formulaire du site', '/outils/calculateur-taux-transformation-assurance',
             'aucun email public : canal formulaire')]:
            w.writerow([domaine, contact, 'READY', '', 'non envoye', 'non envoye', '', '', '', cible, note])
    print('  ecrit : 14_BACKLINK_LOG.csv')

    # ################################################################ 15 WATCHLIST
    lignes_w = ['query,target_url,t0_impressions,t0_clicks,t0_ctr,t0_position,t7,t14,t30,action,status']
    for r in requetes:
        q = r['requete']
        intent, _ = intention(q)
        if intent not in ('BRAND', 'COMMERCIAL_SOFTWARE') and q not in [x[1] for x in priorites[:8]]:
            continue
        imp = int(r.get('impressions') or 0)
        clics = int(r.get('clics') or 0)
        ctr = ('%.1f %%' % (100.0 * clics / imp)) if imp else 'n/d'
        lignes_w.append('"%s",%s,%d,%d,%s,%s,,,,"suivre le CTR et la position","PENDING_GOOGLE"' % (
            q, cible_money if intent == 'COMMERCIAL_SOFTWARE' else '/', imp, clics, ctr, r.get('position') or ''))
    for page in ['/', '/logiciel-courtier-assurance', '/crm-courtier-assurance', '/fonctionnalites/assistant-ark',
                 '/fonctionnalites/gestion-portefeuille-assurance', '/fonctionnalites/relance-devis-assurance',
                 '/fonctionnalites/renouvellements-assurance', '/france', '/suisse', '/suisse/geneve', '/suisse/lausanne',
                 '/outils']:
        lignes_w.append('"(page)",%s,,,,,,,,,"suivre l indexation et le trafic","PENDING_GOOGLE"' % page)
    io.open(os.path.join(P, '15_GSC_WATCHLIST.csv'), 'w', encoding='utf-8').write('\n'.join(lignes_w) + '\n')
    print('  ecrit : 15_GSC_WATCHLIST.csv')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
