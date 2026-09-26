#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Moteur de rendu SEO COURTIARK.

Rend des pages HTML statiques reelles (servies par Vercel avant toute reecriture),
avec metadonnees serveur, JSON-LD centralise, fil d'Ariane, CTA, maillage interne,
hreflang fr-FR / fr-CH reciproques.

Aucune donnee inventee : les chiffres (prix, duree d'essai) proviennent du modele de
facturation du produit ; les fonctionnalites decrites existent dans l'application.
"""
from __future__ import annotations

import html
import json
import re
import unicodedata

SITE = 'https://courtiark.fr'
BRAND = 'COURTIARK'
BRAND_LEGAL = 'COURTIARK'
EMAIL = 'contact@courtiark.fr'
TRIAL_DAYS = 7
PRIX_FR = [('Starter', 89), ('Pro', 159)]
PRIX_CH = [('Indépendant', 199), ('Cabinet', 349)]

# --------------------------------------------------------------------------- utilitaires
def slug(txt: str) -> str:
    t = unicodedata.normalize('NFKD', str(txt)).encode('ascii', 'ignore').decode()
    return re.sub(r'[^a-z0-9]+', '-', t.lower()).strip('-')

def esc(txt) -> str:
    return html.escape(str(txt), quote=True)

def url_of(path: str) -> str:
    path = '/' + str(path).strip('/')
    return SITE + '/' if path == '/' else SITE + path

# --------------------------------------------------------------------------- CSS
CSS = """
:root{--fond:#050510;--carte:#0d0d1f;--carte2:#11112a;--bord:rgba(255,255,255,.10);--texte:#eef0ff;
--doux:#a8adcb;--accent:#5eead4;--accent2:#8b5cf6;--ok:#34d399;--warn:#fbbf24;--max:1080px}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;background:var(--fond);color:var(--texte);
font:16px/1.65 system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
-webkit-font-smoothing:antialiased}
a{color:var(--accent)}
a:focus-visible,button:focus-visible,input:focus-visible,select:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.saut{position:absolute;left:-9999px;top:0;background:var(--accent);color:#04211c;padding:10px 16px;border-radius:0 0 8px 0;z-index:99}
.saut:focus{left:0}
header.entete,main,footer.pied{max-width:var(--max);margin:0 auto;padding:22px 20px}
header.entete{display:flex;flex-wrap:wrap;gap:14px;align-items:center;justify-content:space-between;border-bottom:1px solid var(--bord)}
header.entete a.marque{color:var(--texte);text-decoration:none;font-weight:800;letter-spacing:.06em;font-size:17px}
nav.principal{display:flex;flex-wrap:wrap;gap:4px 16px;align-items:center}
nav.principal a{color:var(--doux);font-weight:500;font-size:15px;text-decoration:none}
nav.principal a:hover{color:var(--texte)}
.actions-entete{display:flex;gap:10px;align-items:center}
figure.produit{margin:22px 0;padding:0}
figure.produit img{display:block;width:100%;height:auto;border:1px solid var(--bord);border-radius:12px}
figure.produit figcaption{margin-top:8px;font-size:13px;color:var(--doux)}
a.lien-essai{font-size:14px;color:var(--doux);text-decoration:none;white-space:nowrap}
a.lien-essai:hover{color:var(--accent)}
@media (max-width:820px){a.lien-essai{display:none}}
h1{font-size:clamp(30px,4.6vw,48px);line-height:1.12;margin:26px 0 12px;letter-spacing:-.02em}
h2{font-size:clamp(22px,2.9vw,30px);margin:40px 0 10px;letter-spacing:-.01em}
h3{font-size:19px;margin:26px 0 8px}
p,li{color:var(--texte)}
.doux{color:var(--doux)}
.chapeau{font-size:clamp(17px,2.1vw,20px);color:var(--doux);max-width:62ch}
.section{border:1px solid var(--bord);background:var(--carte);border-radius:16px;padding:22px;margin:18px 0}
.grille{display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(260px,1fr))}
table{width:100%;border-collapse:collapse;margin:12px 0}
th,td{text-align:left;padding:9px 10px;border-bottom:1px solid var(--bord);font-size:15px;vertical-align:top}
th{color:var(--doux);font-weight:600}
.cta{display:flex;flex-wrap:wrap;gap:12px;margin:18px 0}
.cta a{display:inline-block;padding:12px 20px;border-radius:999px;border:1px solid var(--bord);text-decoration:none;font-weight:700}
.cta a.principal{background:var(--accent);color:#04211c;border-color:transparent}
.cta a.secondaire:hover{border-color:var(--accent)}
ul{padding-left:20px}
.fil{font-size:14px;color:var(--doux);margin:10px 0 0}
.fil a{color:var(--doux)}
.badge{display:inline-block;font-size:13px;color:var(--doux);border:1px solid var(--bord);border-radius:999px;padding:4px 12px;margin:0 6px 6px 0}
footer.pied{border-top:1px solid var(--bord);margin-top:44px;font-size:14px}
footer.pied .colonnes{display:grid;gap:18px;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));margin-bottom:18px}
footer.pied h3{font-size:14px;color:var(--doux);margin:0 0 6px;text-transform:uppercase;letter-spacing:.08em}
footer.pied a{color:var(--doux);text-decoration:none;display:block;padding:2px 0}
footer.pied a:hover{color:var(--texte)}
.quisuis{display:flex;gap:14px;flex-wrap:wrap;align-items:baseline}
.etape{display:flex;gap:12px;align-items:flex-start;margin:10px 0}
.etape b{color:var(--accent);min-width:88px}
.bascule{display:flex;gap:14px;flex-wrap:wrap}
.bascule>div{flex:1 1 280px;border:1px solid var(--bord);border-radius:14px;padding:16px;background:var(--carte2)}
.note{font-size:14px;color:var(--doux)}
input,select,button{font:inherit}
.champ{display:flex;flex-direction:column;gap:4px;margin:10px 0}
.champ label{font-size:14px;color:var(--doux)}
.champ input,.champ select,.champ textarea{background:#0a0a1a;color:var(--texte);border:1px solid var(--bord);border-radius:10px;padding:11px 12px}
button.principal{background:var(--accent);color:#04211c;border:0;border-radius:999px;padding:13px 22px;font-weight:800;cursor:pointer}
.resultat{border:1px solid var(--bord);border-radius:14px;padding:16px;background:var(--carte2);margin-top:14px}
@media (max-width:640px){header.entete{gap:10px}nav.principal{order:3;width:100%}}
"""

def tete(page: dict, fil: list, jsonld: list) -> str:
    """<head> complet : metadonnees, hreflang reciproques, JSON-LD."""
    u = url_of(page['path'])
    lang = 'fr-CH' if page.get('country') == 'CH' else 'fr-FR'
    alt = page.get('alternate')
    liens_alt = ''
    if alt:
        liens_alt = (f'\n<link rel="alternate" hreflang="{lang}" href="{u}">'
                     f'\n<link rel="alternate" hreflang="{"fr-FR" if lang=="fr-CH" else "fr-CH"}" href="{url_of(alt)}">'
                     f'\n<link rel="alternate" hreflang="x-default" href="{url_of(alt if lang=="fr-CH" else page["path"])}">')
    robots = 'index, follow, max-snippet:-1, max-image-preview:large' if page.get('indexable', True) else 'noindex, follow'
    return f"""<!DOCTYPE html>
<html lang="{lang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{esc(page['title'])}</title>
<meta name="description" content="{esc(page['description'])}">
<meta name="robots" content="{robots}">
<link rel="canonical" href="{u}">{liens_alt}
<meta name="author" content="{BRAND}">
<meta property="og:type" content="{page.get('og_type','website')}">
<meta property="og:title" content="{esc(page['title'])}">
<meta property="og:description" content="{esc(page['description'])}">
<meta property="og:url" content="{u}">
<meta property="og:image" content="{SITE}/og-courtiark.png">
<meta property="og:site_name" content="{BRAND}">
<meta property="og:locale" content="{'fr_CH' if lang == 'fr-CH' else 'fr_FR'}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{esc(page['title'])}">
<meta name="twitter:description" content="{esc(page['description'])}">
<meta name="twitter:image" content="{SITE}/og-courtiark.png">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="manifest" href="/manifest.json">
<style>{CSS}</style>
{chr(10).join(jsonld)}
</head>
<body>
<a class="saut" href="#contenu">Aller au contenu</a>
<header class="entete">
  <a class="marque" href="/">{BRAND}</a>
  <nav class="principal" aria-label="Navigation principale">
    <a href="/crm-courtier-assurance">CRM courtier</a>
    <a href="/fonctionnalites/">Fonctionnalités</a>
    <a href="/solutions/">Solutions</a>
    <a href="/france/">France</a>
    <a href="/suisse/">Suisse</a>
    <a href="/guides/">Guides</a>
    <a href="/outils/">Outils</a>
    <a href="/comparatifs/">Comparatifs</a>
  </nav>
  <div class="actions-entete">
    <a class="secondaire" href="/demo/">Demander une démonstration</a>
    <a class="principal" href="/demo/dashboard">Voir COURTIARK en action</a>
    <a class="lien-essai" href="/register">Essayer {TRIAL_DAYS} jours</a>
  </div>
</header>
<main id="contenu">
"""

def fil_ariane(fil: list) -> str:
    parts = ['<a href="/">Accueil</a>']
    acc = ''
    for nom, chemin in fil:
        acc = chemin
        parts.append(f'<a href="{chemin}">{esc(nom)}</a>' if chemin else esc(nom))
    return '<p class="fil">' + ' › '.join(parts) + '</p>'

def jsonld_breadcrumb(fil: list) -> dict:
    items = [{"@type": "ListItem", "position": 1, "name": "Accueil", "item": SITE + "/"}]
    for i, (nom, chemin) in enumerate(fil, start=2):
        e = {"@type": "ListItem", "position": i, "name": nom}
        if chemin:
            e["item"] = url_of(chemin)
        items.append(e)
    return {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": items}

def jsonld_organisation() -> dict:
    return {"@context": "https://schema.org", "@type": "Organization", "name": BRAND,
            "alternateName": "COURTIA", "url": SITE + "/", "logo": f"{SITE}/og-courtiark.png",
            "email": EMAIL, "areaServed": [{"@type": "Country", "name": "France"}, {"@type": "Country", "name": "Suisse"}],
            "description": f"{BRAND} est un CRM et cockpit IA pour cabinets de courtage en assurance, en France et en Suisse.",
            "knowsAbout": ["CRM courtier assurance", "logiciel de courtage", "gestion de portefeuille d'assurance",
                           "conformité DDA", "conformité LSA/FINMA"]}

def jsonld_logiciel(description: str) -> dict:
    return {"@context": "https://schema.org", "@type": "SoftwareApplication", "name": BRAND,
            "applicationCategory": "BusinessApplication", "operatingSystem": "Web (navigateur)",
            "url": SITE + "/", "description": description, "inLanguage": ["fr-FR", "fr-CH"],
            "featureList": ["Fiche client et portefeuille", "Contrats et échéances", "Devis et relances",
                            "Dépôt de documents par lien", "Commissions", "Conformité France et Suisse",
                            "Assistant IA ARK", "Prospection et suivi commercial"],
            "offers": [{"@type": "Offer", "name": n, "price": str(p), "priceCurrency": "EUR",
                        "description": f"{n} — par mois, hors taxes (France)"} for n, p in PRIX_FR]
                      + [{"@type": "Offer", "name": n, "price": str(p), "priceCurrency": "CHF",
                          "description": f"{n} — par mois, hors taxes (Suisse)"} for n, p in PRIX_CH]}

def jsonld_faq(faq: list) -> dict:
    return {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
        {"@type": "Question", "name": q,
         "acceptedAnswer": {"@type": "Answer", "text": r}} for q, r in faq]}

def jsonld_service(nom: str, description: str, zone: str | None = None) -> dict:
    d = {"@context": "https://schema.org", "@type": "Service", "name": nom, "description": description,
         "serviceType": "Logiciel de gestion pour courtiers en assurance",
         "provider": {"@type": "Organization", "name": BRAND, "url": SITE + "/"}}
    if zone:
        d["areaServed"] = {"@type": "Place", "name": zone}
    return d

def jsonld_article(page: dict) -> dict:
    return {"@context": "https://schema.org", "@type": "Article", "headline": page['h1'],
            "description": page['description'], "inLanguage": 'fr-CH' if page.get('country') == 'CH' else 'fr-FR',
            "mainEntityOfPage": {"@type": "WebPage", "@id": url_of(page['path'])},
            "author": {"@type": "Organization", "name": BRAND, "url": SITE + "/"},
            "publisher": {"@type": "Organization", "name": BRAND, "logo": {"@type": "ImageObject", "url": f"{SITE}/og-courtiark.png"}},
            "dateModified": page.get('updated', '2026-09-26')}

def cta(principal=('/demo/dashboard', 'Voir COURTIARK en action'), secondaire=('/demo/', 'Demander une démonstration')) -> str:
    return (f'<div class="cta"><a class="principal" href="{principal[0]}">{esc(principal[1])}</a>'
            f'<a class="secondaire" href="{secondaire[0]}">{esc(secondaire[1])}</a></div>')

def pied() -> str:
    return f"""</main>
<footer class="pied">
  <div class="colonnes">
    <div>
      <h3>Produit</h3>
      <a href="/crm-courtier-assurance">CRM courtier assurance</a>
      <a href="/fonctionnalites/assistant-ark">Assistant ARK</a>
      <a href="/fonctionnalites/gestion-portefeuille-assurance">Portefeuille</a>
      <a href="/fonctionnalites/relance-devis-assurance">Relances</a>
      <a href="/fonctionnalites/gestion-documents-assurance">Documents</a>
      <a href="/fonctionnalites/renouvellements-assurance">Renouvellements</a>
    </div>
    <div>
      <h3>Solutions</h3>
      <a href="/solutions/courtier-assurance-independant">Courtier indépendant</a>
      <a href="/solutions/cabinet-courtage-assurance">Cabinet de courtage</a>
      <a href="/solutions/equipe-commerciale-assurance">Équipe commerciale</a>
      <a href="/solutions/reseau-courtage">Réseau de courtage</a>
      <a href="/assurances/">Branches d'assurance</a>
    </div>
    <div>
      <h3>Marchés</h3>
      <a href="/france/">France</a>
      <a href="/suisse/">Suisse</a>
      <a href="/suisse/geneve">Genève</a>
      <a href="/suisse/lausanne">Lausanne</a>
    </div>
    <div>
      <h3>Ressources</h3>
      <a href="/guides/">Guides</a>
      <a href="/outils/">Outils gratuits</a>
      <a href="/comparatifs/">Comparatifs</a>
    </div>
    <div>
      <h3>Entreprise</h3>
      <a href="/a-propos">À propos</a>
      <a href="/securite">Sécurité</a>
      <a href="/confidentialite">Confidentialité</a>
      <a href="/mentions-legales">Mentions légales</a>
      <a href="/contact">Contact</a>
    </div>
  </div>
  <p class="note">{BRAND} — CRM et cockpit IA pour courtiers en assurance. France (DDA · ORIAS · RGPD) et
  Suisse (LSA · FINMA · nLPD). Essai de {TRIAL_DAYS} jours, sans engagement.
  France : {' · '.join(f"{n} {p} € HT/mois" for n, p in PRIX_FR)} · Suisse : {' · '.join(f"{n} {p} CHF HT/mois" for n, p in PRIX_CH)}.</p>
  <p class="note"><a href="/contact">contact@courtiark.fr</a></p>
</footer>
</body>
</html>
"""

def bloc_faq(faq: list) -> str:
    if not faq:
        return ''
    items = ''.join(f'<h3>{esc(q)}</h3><p>{esc(r)}</p>' for q, r in faq)
    return f'<h2>Questions fréquentes</h2><div class="section">{items}</div>'

# Maillage vers la page money « logiciel pour courtier en assurance ».
# Un lien contextuel par page, avec une ancre differente et une phrase qui dit pourquoi le lien
# est la : le but est de relier des pages qui parlent du meme metier, pas de repeter un bloc.
MONEY = '/logiciel-courtier-assurance'
# Maillage vers la page money : un lien contextuel par page, ancre differente, phrase qui dit
# pourquoi le lien est la. {L} est remplace par l'ancre HTML dans bloc_money.
LIENS_MONEY = {
    '/crm-courtier-assurance': (
        "logiciel pour courtier en assurance",
        "Si vous cherchez d'abord a comprendre ce qu'un outil metier doit couvrir avant de comparer, "
        "la page sur le {L} detaille le perimetre et les criteres de choix."),
    '/france': (
        "logiciel pour courtier",
        "Le perimetre fonctionnel attendu par un cabinet francais est decrit sur la page du {L} en assurance."),
    '/suisse': (
        "logiciel de courtage",
        "Cote outillage, le {L} retenu doit tenir les memes objets metier qu'en France, avec la facturation en francs suisses."),
    '/suisse/geneve': (
        "logiciel courtier",
        "Le detail de ce qu'un {L} doit couvrir dans un cabinet est traite sur la page produit."),
    '/suisse/lausanne': (
        "logiciel courtier",
        "Pour comparer les fonctions attendues, la page {L} liste le perimetre module par module."),
    '/fonctionnalites/relance-devis-assurance': (
        "CRM assurance",
        "Les devis ne vivent pas seuls : ils appartiennent a un dossier client, comme l'explique la page {L}."),
    '/fonctionnalites/assistant-ark': (
        "COURTIARK",
        "ARK fait partie d'un ensemble : le {L} qui porte les dossiers, les contrats et les echeances."),
    '/fonctionnalites/gestion-portefeuille-assurance': (
        "piloter un cabinet de courtage",
        "Piloter un portefeuille n'est utile que si le reste du cabinet suit : voir {L}."),
    '/comparatifs/crm-assurance-vs-crm-generaliste': (
        "logiciel de courtage",
        "Si la question est de choisir un outil plutot qu'un autre, la page {L} donne les criteres concrets."),
    '/glossaire': (
        "logiciel courtier",
        "Voir aussi la page sur le {L}, qui decrit le perimetre attendu d'un outil de gestion de cabinet."),
    '/outils': (
        "CRM pour courtier",
        "Ces outils se manipulent a la main ; un {L} les rend permanents dans le dossier."),
    '/guides/comment-ne-plus-oublier-relances-courtier': (
        "logiciel de courtage",
        "La methode decrite ici s'appuie sur un {L} qui rend les relances visibles au quotidien."),
    '/guides/organiser-portefeuille-assurance': (
        "CRM pour courtier",
        "Un {L} applique cette organisation en continu, sans repasser par un tableur."),
    '/outils/checklist-renouvellement-assurance': (
        "logiciel pour courtier en assurance",
        "Pour que cette checklist ne depende plus de votre memoire : {L}."),
}


def bloc_money(page: dict) -> str:
    chemin = page.get('path') or ''
    entree = LIENS_MONEY.get(chemin) or LIENS_MONEY.get(chemin.rstrip('/')) or LIENS_MONEY.get(chemin + '/')
    if not entree:
        return ''
    ancre, phrase = entree
    lien = '<a href="%s">%s</a>' % (MONEY, ancre)
    return '<div class="section"><p>%s</p></div>' % phrase.format(L=lien)


def bloc_lire(liens: list) -> str:
    if not liens:
        return ''
    items = ''.join(f'<li><a href="{c}">{esc(t)}</a></li>' for t, c in liens)
    return f'<h2>À lire ensuite</h2><div class="section"><ul>{items}</ul></div>'

def rendre(page: dict) -> str:
    """Assemble la page complete."""
    fil = page.get('fil', [])
    jl = [f'<script type="application/ld+json">{json.dumps(jsonld_organisation(), ensure_ascii=False)}</script>']
    if page.get('type') == 'home':
        jl.append(f'<script type="application/ld+json">{json.dumps({"@context":"https://schema.org","@type":"WebSite","name":BRAND,"url":SITE+"/","inLanguage":["fr-FR","fr-CH"]}, ensure_ascii=False)}</script>')
    if page.get('type') in ('home', 'money', 'feature', 'solution', 'geo', 'vertical', 'hub', 'tool', 'comparatif'):
        jl.append(f'<script type="application/ld+json">{json.dumps(jsonld_logiciel(page["description"]), ensure_ascii=False)}</script>')
    if page.get('type') == 'guide':
        jl.append(f'<script type="application/ld+json">{json.dumps(jsonld_article(page), ensure_ascii=False)}</script>')
    if page.get('type') in ('geo', 'solution'):
        jl.append('<script type="application/ld+json">' + json.dumps(
            jsonld_service(page['h1'], page['description'], page.get('zone')), ensure_ascii=False) + '</script>')
    if fil:
        jl.append(f'<script type="application/ld+json">{json.dumps(jsonld_breadcrumb(fil), ensure_ascii=False)}</script>')
    if page.get('faq'):
        jl.append('<script type="application/ld+json">' + json.dumps(
            jsonld_faq(page['faq']), ensure_ascii=False) + '</script>')
    corps = [tete(page, fil, jl)]
    if fil:
        corps.append(fil_ariane(fil))
    corps.append(f"<h1>{esc(page['h1'])}</h1>")
    if page.get('chapeau'):
        corps.append(f'<p class="chapeau">{esc(page["chapeau"])}</p>')
    corps.append(cta(secondaire=page.get('cta2', ('/demo/', 'Demander une démonstration'))))
    corps.append(page.get('corps', ''))
    corps.append(bloc_money(page))
    corps.append(cta(principal=page.get('cta_final', ('/demo/dashboard', 'Voir COURTIARK en action'))))
    corps.append(bloc_faq(page.get('faq', [])))
    corps.append(bloc_lire(page.get('lire', [])))
    corps.append(pied())
    return '\n'.join(p for p in corps if p)
