#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Tableau de bord acquisition / conversion / SEO.

Lecture seule sur la base de production. Produit :
  - docs/seo/DASHBOARD.md   (rapport lisible, a reporter dans Obsidian)
  - docs/seo/DASHBOARD.html (version consultable)

Regle : une donnee non collectee est ecrite « non disponible » avec la cause,
jamais estimee. Aucune adresse e-mail de prospect n'est recopiee : le rapport
ne contient que des compteurs.
"""
import io, os, json, subprocess, datetime, collections

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SECRET = '/root/.hermes/secrets/render_database_url'
ADRESSES_TEST = ('@example.invalid', 'audit-ark@', 'test-seo-ark@')


def psql(sql):
    db = io.open(SECRET, encoding='utf-8').read().strip()
    r = subprocess.run(['psql', db, '-Atc', sql], capture_output=True, text=True, timeout=90)
    if r.returncode != 0:
        return None, (r.stderr or '').strip()[:300]
    return [l.split('|') for l in r.stdout.strip().splitlines() if l], None


def entier(sql, defaut=0):
    lignes, err = psql(sql)
    if err or not lignes:
        return defaut
    try:
        return int(lignes[0][0])
    except Exception:
        return defaut


def main():
    maintenant = datetime.datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')

    # ---------------------------------------------------------------- evenements
    events, err_ev = psql("select event_name, count(*) from marketing_events group by 1 order by 2 desc")
    if err_ev:
        print('ERREUR base :', err_ev)
        return 1
    ev = {nom: int(n) for nom, n in events}

    # ---------------------------------------------------------------- leads
    leads_tot = entier('select count(*) from demo_requests')
    leads_test = entier("select count(*) from demo_requests where email like '%@example.invalid'")
    leads_reels = leads_tot - leads_test
    leads_30j = entier("select count(*) from demo_requests where created_at > now() - interval '30 days' and email not like '%@example.invalid'")

    # ---------------------------------------------------------------- essais / abonnements
    essais = entier("select count(*) from subscriptions where status in ('trialing','trial')")
    actifs = entier("select count(*) from subscriptions where status in ('active','trialing','trial')")
    cabinets = entier('select count(*) from cabinets')
    payants = entier("select count(*) from subscriptions where status = 'active'")

    # ---------------------------------------------------------------- sessions par landing
    landings, err_l = psql("""
        select coalesce(nullif(payload->>'landing',''), page_path) as landing,
               count(*) filter (where event_name in ('site_visit','seo_page_view')) as vues,
               count(*) filter (where event_name in ('cta_trial_click','cta_demo_click')) as clics_cta,
               count(*) filter (where event_name in ('demo_form_view','demo_form_submit')) as formulaire,
               count(*) filter (where event_name = 'demo_request_success') as demandes
        from marketing_events
        group by 1 order by 2 desc limit 25""")
    if err_l:
        landings = []

    # ---------------------------------------------------------------- attribution
    attribution, _ = psql("""
        select coalesce(nullif(payload->>'medium',''), 'direct') as medium,
               coalesce(nullif(payload->>'campagne',''), 'aucune') as campagne,
               count(*) from marketing_events
        where event_name in ('site_visit','seo_page_view') group by 1,2 order by 3 desc limit 12""")
    attribution = attribution or []

    # ---------------------------------------------------------------- rapport
    L = []
    A = L.append
    A('# COURTIARK — Tableau de bord acquisition / conversion / SEO')
    A('')
    A('Généré le %s par `seo/dashboard.py` (lecture seule, base de production).' % maintenant)
    A('')
    A('## Acquisition')
    A('')
    A('| Indicateur | Valeur | Source |')
    A('|---|---|---|')
    A('| Événements de visite (site_visit) | %d | marketing_events |' % ev.get('site_visit', 0))
    A('| Pages publiques vues (seo_page_view) | %d | marketing_events |' % ev.get('seo_page_view', 0))
    A('| Demandes de démo (toutes) | %d | demo_requests |' % leads_tot)
    A('| Demandes de démo réelles (hors adresses de test) | %d | demo_requests |' % leads_reels)
    A('| Demandes de démo sur 30 jours | %d | demo_requests |' % leads_30j)
    A('| Cabinets enregistrés | %d | cabinets |' % cabinets)
    A('| Abonnements en essai | %d | subscriptions |' % essais)
    A('| Abonnements payants actifs | %d | subscriptions |' % payants)
    A('')
    A('## Conversion (entonnoir)')
    A('')
    A('| Étape | Volume | Taux |')
    A('|---|---|---|')
    vues = ev.get('site_visit', 0) + ev.get('seo_page_view', 0)
    cta = ev.get('cta_trial_click', 0) + ev.get('cta_demo_click', 0)
    form_v = ev.get('demo_form_view', 0)
    form_s = ev.get('demo_form_submit', 0)
    dem = ev.get('demo_request_success', 0)
    A('| Visite → clic CTA | %d clics pour %d visites | %s |' % (cta, vues, _taux(cta, vues)))
    A('| Affichage du formulaire → envoi | %d envois pour %d affichages | %s |' % (form_s, form_v, _taux(form_s, form_v)))
    A('| Envoi → demande enregistrée | %d pour %d envois | %s |' % (dem, form_s, _taux(dem, form_s)))
    A('| Demande → essai créé | %d essais pour %d demandes réelles | %s |' % (essais, leads_reels, _taux(essais, leads_reels)))
    A('| Essai → abonnement payant | %d payants pour %d essais | %s |' % (payants, essais, _taux(payants, essais)))
    A('')
    A('Détail des événements mesurés : %s.' % (', '.join('%s %d' % (k, v) for k, v in sorted(ev.items(), key=lambda x: -x[1])) or 'aucun'))
    A('')
    A('## Conversion par page d’atterrissage')
    A('')
    if landings:
        A('| Page d’atterrissage | Vues | Clics CTA | Formulaire | Demandes |')
        A('|---|---|---|---|---|')
        for ligne in landings:
            if len(ligne) == 5:
                A('| `%s` | %s | %s | %s | %s |' % tuple(ligne))
    else:
        A('Aucune donnée d’atterrissage enregistrée.')
    A('')
    A('## Attribution')
    A('')
    if attribution:
        A('| Medium | Campagne | Visites |')
        A('|---|---|---|')
        for m, c, n in attribution:
            A('| %s | %s | %s |' % (m, c, n))
    else:
        A('Aucune attribution enregistrée.')
    A('')
    A('## SEO — impressions, clics, position')
    A('')
    A('Non disponible : aucune propriété Search Console n’est accessible depuis ce serveur '
      '(ni jeton Google, ni session navigateur pilotable). Les impressions, clics, CTR et positions '
      'moyennes ne peuvent donc pas être mesurés ni affirmés. La mesure first-party ci-dessus '
      '(visites, clics CTA, formulaires, demandes) est la seule source exploitable aujourd’hui.')
    A('')
    A('## Limites de lecture')
    A('')
    A('- `site_visit` compte les visites mesurées par le script first-party, pas les sessions côté Google.')
    A('- Un même visiteur peut produire plusieurs événements : ce sont des volumes, pas des personnes.')
    A('- Les adresses de test (`@example.invalid`) sont exclues du décompte des demandes réelles.')
    A('- Aucune donnée personnelle (nom, e-mail, téléphone) ne figure dans ce rapport.')
    A('')

    texte = '\n'.join(L)
    dossier = os.path.join(RACINE, 'docs', 'seo')
    os.makedirs(dossier, exist_ok=True)
    io.open(os.path.join(dossier, 'DASHBOARD.md'), 'w', encoding='utf-8').write(texte)
    html = ('<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8">'
            '<meta name="robots" content="noindex">'
            '<title>COURTIARK — tableau de bord acquisition</title>'
            '<style>body{font:14px/1.6 ui-sans-serif,system-ui,sans-serif;max-width:960px;margin:40px auto;padding:0 16px;color:#0b1c2c}'
            'table{border-collapse:collapse;width:100%;margin:10px 0}th,td{border:1px solid #d5dde5;padding:6px 8px;text-align:left}'
            'th{background:#f2f6fa}code{background:#f4f6f8;padding:1px 4px;border-radius:3px}h1{font-size:24px}h2{margin-top:28px}</style>'
            '</head><body>' + _md_vers_html(texte) + '</body></html>')
    io.open(os.path.join(dossier, 'DASHBOARD.html'), 'w', encoding='utf-8').write(html)
    print(texte)
    return 0


def _taux(numerateur, denominateur):
    if not denominateur:
        return 'non calculable'
    return ('%.1f %%' % (100.0 * numerateur / denominateur)).replace('.', ',')


def _md_vers_html(md):
    out = []
    dans_tableau = False
    for ligne in md.splitlines():
        if ligne.startswith('| '):
            cellules = [c.strip() for c in ligne.strip('|').split('|')]
            if set(''.join(cellules)) <= set('-: '):
                continue
            balise = 'th' if not dans_tableau else 'td'
            if not dans_tableau:
                out.append('<table>')
                dans_tableau = True
            out.append('<tr>' + ''.join('<%s>%s</%s>' % (balise, c, balise) for c in cellules) + '</tr>')
            continue
        if dans_tableau:
            out.append('</table>')
            dans_tableau = False
        if ligne.startswith('## '):
            out.append('<h2>%s</h2>' % ligne[3:])
        elif ligne.startswith('# '):
            out.append('<h1>%s</h1>' % ligne[2:])
        elif ligne.startswith('- '):
            out.append('<p>• %s</p>' % ligne[2:])
        elif ligne.strip():
            out.append('<p>%s</p>' % ligne)
    if dans_tableau:
        out.append('</table>')
    return '\n'.join(out)


if __name__ == '__main__':
    raise SystemExit(main())
