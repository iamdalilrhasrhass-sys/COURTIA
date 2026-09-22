#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
generate_seo_pillars.py — PAGES PILIERS SEO (France et Suisse), STATIQUES et LISIBLES PAR UN CRAWLER.

POURQUOI CE SCRIPT EXISTE
-------------------------
Les routes de l'application (/tarifs, /fonctionnalites…) sont servies par la coquille du SPA :
un crawler y reçoit ~4,8 Ko de HTML SANS titre propre, SANS canonical propre et SANS contenu.
Les pages SEO réellement indexables de COURTIA sont donc les pages STATIQUES servies depuis
`frontend/public/` (Vercel sert un fichier existant avant toute réécriture SPA).

Ce script produit les pages PILIERS manquantes du cœur commercial (France) et de l'univers suisse,
en respectant les règles de la maison :
  - UNE page par INTENTION (jamais une page par variante lexicale) ;
  - aucun chiffre inventé (aucun « gagnez X heures » sans mesure) ;
  - aucune affirmation réglementaire non démontrée (« conforme FINMA » n'est jamais écrit) ;
  - aucune note, aucun avis, aucun classement auto-proclamé ;
  - contenu factuel adossé aux FONCTIONNALITÉS RÉELLEMENT PRÉSENTES dans le code ;
  - maillage interne réel (piliers ↔ clusters suisses ↔ pages métier ↔ offre ↔ contact).

Usage : python3 scripts/generate_seo_pillars.py [--dry-run]
Les fichiers sont écrits dans frontend/public/<chemin>/index.html (donc servis tels quels).
"""

import argparse
import html
import os
import re
import sys

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC = os.path.join(BASE, "frontend", "public")
SITE = "https://courtiark.fr"
MAJ = "2026-09-22"


# ─────────────────────────────────────────────────────────────────────────────
# SOCLE TECHNIQUE DE PAGE (head complet + style sobre + pied de page)
# ─────────────────────────────────────────────────────────────────────────────

STYLE = """
:root{--fond:#050510;--carte:#0d0d1f;--bord:rgba(255,255,255,.10);--texte:#eef0ff;--doux:#a8adcb;--accent:#5eead4}
*{box-sizing:border-box}
body{margin:0;background:var(--fond);color:var(--texte);font:16px/1.65 system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
a{color:var(--accent)}
header,main,footer{max-width:980px;margin:0 auto;padding:22px 20px}
header{display:flex;flex-wrap:wrap;gap:14px;align-items:center;justify-content:space-between;border-bottom:1px solid var(--bord)}
header a{color:var(--texte);text-decoration:none;font-weight:600}
nav a{color:var(--doux);font-weight:500;margin-right:14px;font-size:15px}
h1{font-size:clamp(28px,4.4vw,44px);line-height:1.15;margin:26px 0 10px;letter-spacing:-.02em}
h2{font-size:clamp(21px,2.8vw,28px);margin:38px 0 10px;letter-spacing:-.01em}
h3{font-size:19px;margin:26px 0 8px}
p,li{color:var(--texte)}
.doux{color:var(--doux)}
.section{border:1px solid var(--bord);background:var(--carte);border-radius:16px;padding:20px;margin:18px 0}
table{width:100%;border-collapse:collapse;margin:12px 0}
th,td{text-align:left;padding:9px 10px;border-bottom:1px solid var(--bord);font-size:15px;vertical-align:top}
th{color:var(--doux);font-weight:600}
.cta{display:flex;flex-wrap:wrap;gap:12px;margin:16px 0}
.cta a{display:inline-block;padding:12px 18px;border-radius:999px;border:1px solid var(--bord);text-decoration:none;font-weight:700}
.cta a.principal{background:var(--accent);color:#04211c;border-color:transparent}
ul{padding-left:20px}
footer{border-top:1px solid var(--bord);margin-top:40px;font-size:14px}
footer a{color:var(--doux);margin-right:12px}
.fil{font-size:14px;color:var(--doux);margin-top:8px}
.fil a{color:var(--doux)}
"""


def page(chemin, titre, description, h1, corps, marche="FR", faq=None, schema_offres=None, fil=None, date=MAJ, maillage=None):
    """Construit une page complète. `corps` est du HTML déjà rédigé."""
    chemin = chemin.strip("/")
    url = f"{SITE}/{chemin}"
    langue = "fr-CH" if marche == "CH" else "fr-FR"
    og_locale = "fr_CH" if marche == "CH" else "fr_FR"
    autres = f"{SITE}/ch" if marche == "FR" else f"{SITE}/fr"
    org = {
        "@context": "https://schema.org", "@type": "Organization", "name": "COURTIA",
        "url": SITE, "logo": f"{SITE}/og-courtia.png", "email": "contact@courtiark.fr",
        "areaServed": [{"@type": "Country", "name": "France"}, {"@type": "Country", "name": "Suisse"}],
        "description": "COURTIA est un logiciel de gestion et cockpit d'assistance IA pour courtiers et cabinets de courtage en assurance.",
    }
    app = {
        "@context": "https://schema.org", "@type": "SoftwareApplication", "name": "COURTIA",
        "applicationCategory": "BusinessApplication", "operatingSystem": "Web (navigateur)",
        "url": SITE, "description": description, "inLanguage": ["fr-FR", "fr-CH"],
        "featureList": [
            "Dossier client centralisé", "Gestion des contrats et échéances", "Devis et registre",
            "Relances et suivi des tâches", "Commissions et rétrocessions", "Documents et dépôt de pièces par lien",
            "Conformité par marché (France et Suisse)", "Assistant IA ARK (synthèse, priorisation, appels)",
        ],
    }
    if schema_offres:
        app["offers"] = schema_offres
    graphs = [org, app]
    if fil:
        graphs.append({
            "@context": "https://schema.org", "@type": "BreadcrumbList",
            "itemListElement": [
                {"@type": "ListItem", "position": i + 1, "name": nom, "item": f"{SITE}{chemin_i}"}
                for i, (nom, chemin_i) in enumerate(fil)
            ],
        })
    if faq:
        graphs.append({
            "@context": "https://schema.org", "@type": "FAQPage",
            "mainEntity": [
                {"@type": "Question", "name": q,
                 "acceptedAnswer": {"@type": "Answer", "text": r}}
                for q, r in faq
            ],
        })
    ld = "\n".join(
        '<script type="application/ld+json">%s</script>' % __import__("json").dumps(g, ensure_ascii=False)
        for g in graphs
    )
    fil_html = ""
    if fil:
        fil_html = '<p class="fil">' + " › ".join(
            f'<a href="{c}">{html.escape(n)}</a>' for n, c in fil
        ) + "</p>"

    faq_html = ""
    if faq:
        faq_html = "<h2>Questions fréquentes</h2>\n" + "\n".join(
            f"<h3>{html.escape(q)}</h3>\n<p>{r}</p>" for q, r in faq
        )

    maillage_html = ""
    if maillage:
        maillage_html = (
            '<h2>Pour aller plus loin</h2>\n<ul>\n'
            + "\n".join(f'<li><a href="{u}">{t}</a> — {d}</li>' for t, u, d in maillage)
            + "\n</ul>"
        )

    return f"""<!DOCTYPE html>
<html lang="{langue}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{html.escape(titre)}</title>
<meta name="description" content="{html.escape(description)}">
<meta name="robots" content="index, follow">
<link rel="canonical" href="{url}">
<meta name="author" content="COURTIA">
<link rel="alternate" hreflang="fr" href="{url}">
<meta property="og:type" content="website">
<meta property="og:title" content="{html.escape(titre)}">
<meta property="og:description" content="{html.escape(description)}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{SITE}/og-courtia.png">
<meta property="og:locale" content="{og_locale}">
<meta property="og:site_name" content="COURTIA">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{html.escape(titre)}">
<meta name="twitter:description" content="{html.escape(description)}">
<meta name="twitter:image" content="{SITE}/og-courtia.png">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
{ld}
<style>{STYLE}</style>
</head>
<body>
<header>
  <a href="{SITE}/">COURTIA</a>
  <nav>
    <a href="{SITE}/fonctionnalites">Fonctionnalités</a>
    <a href="{SITE}/tarifs">Tarifs</a>
    <a href="{autres}">{'Univers suisse' if marche == 'FR' else 'France'}</a>
    <a href="{SITE}/demo-public">Démo</a>
    <a href="{SITE}/contact">Contact</a>
  </nav>
</header>
<main>
{fil_html}
<h1>{html.escape(h1)}</h1>
{corps}
{faq_html}
{maillage_html}
<div class="section">
  <h2>Voir le produit et l'essayer</h2>
  <p>L'essai COURTIA dure 7 jours. À l'expiration, <strong>aucune donnée n'est supprimée</strong> :
  le cabinet garde la consultation de ses dossiers et cesse seulement de pouvoir les modifier
  jusqu'à la souscription.</p>
  <div class="cta">
    <a class="principal" href="{SITE}/onboarding">Créer un accès</a>
    <a href="{SITE}/demo">Demander une démonstration</a>
    <a href="{SITE}/demo-public">Visiter la démo publique</a>
    <a href="{SITE}/tarifs">Voir les tarifs</a>
  </div>
  <p class="doux">Page mise à jour le {date}. Les fonctionnalités décrites ici sont celles qui sont
  réellement présentes dans le produit ; aucune durée ni aucun gain chiffré n'est promis sans mesure.</p>
</div>
</main>
<footer>
  <p>
    <a href="{SITE}/legal/mentions-legales">Mentions légales</a>
    <a href="{SITE}/legal/confidentialite">Confidentialité</a>
    <a href="{SITE}/legal/conditions-utilisation">Conditions</a>
    <a href="{SITE}/rgpd">Données et RGPD</a>
    <a href="{SITE}/securite">Sécurité</a>
    <a href="{SITE}/status">État du service</a>
  </p>
  <p class="doux">COURTIA — logiciel de gestion et cockpit d'assistance pour les courtiers et cabinets
  de courtage en assurance. France et Suisse. Contact : contact@courtiark.fr</p>
</footer>
</body>
</html>
"""


# ─────────────────────────────────────────────────────────────────────────────
# CONTENU DES PAGES (une page par intention)
# ─────────────────────────────────────────────────────────────────────────────

PAGES = {}

# ── 1. FR — PILIER COMMERCIAL : CRM courtier assurance ───────────────────────
PAGES["fr/crm-courtier-assurance"] = dict(
    marche="FR",
    titre="CRM courtier assurance : centraliser clients, contrats et relances — COURTIA",
    description=(
        "COURTIA est un CRM conçu pour le courtage d'assurance : dossier client centralisé, contrats "
        "et échéances, relances, devis, commissions, documents et conformité. Essai 7 jours."
    ),
    h1="CRM courtier assurance : le dossier client en un écran",
    fil=[("Accueil", "/"), ("France", "/fr"), ("CRM courtier assurance", "/fr/crm-courtier-assurance")],
    maillage=[
        ("Logiciel courtier assurance (France)", "/fr/logiciel-courtier-assurance",
         "le socle : clients, contrats, échéances, devis, commissions"),
        ("Automatisation pour un cabinet de courtage", "/fr/automatisation-courtier-assurance",
         "ce qui peut réellement être retiré du travail manuel"),
        ("Gagner du temps au cabinet", "/fr/gagner-du-temps-courtier-assurance",
         "les cinq postes où le temps se perd, et ce qui peut changer"),
        ("CRM courtier d'assurance en Suisse", "/ch/crm-courtier-assurance-suisse",
         "la même logique de dossier client dans le cadre suisse"),
        ("Comparatifs", "/fr/alternative-oggo-data",
         "comparaisons factuelles avec les outils déjà présents sur le marché"),
    ],
    corps="""
<div class="section">
<h2>Le problème réel : l'information existe, mais elle est dispersée</h2>
<p>Dans un cabinet de courtage, l'information utile est presque toujours là — quelque part. Un contrat
dans un dossier, une échéance dans un agenda, un échange dans la boîte e-mail, une pièce justificative
dans un dossier partagé, une commission dans un tableur. Le travail ne consiste pas à <em>trouver</em>
l'information : il consiste à la <strong>rassembler</strong>, à chaque appel, à chaque renouvellement,
à chaque contrôle.</p>
<p>C'est cette dispersion qui coûte du temps. Un CRM spécialisé ne se juge donc pas sur le nombre de
champs qu'il sait stocker, mais sur sa capacité à réunir ce qui est déjà connu et à faire remonter ce
qui doit être traité.</p>
</div>

<h2>Ce que COURTIA fait réellement</h2>
<p>COURTIA est un logiciel de gestion et un cockpit d'assistance dédié aux courtiers et cabinets de
courtage en assurance. Ce qui existe dans le produit aujourd'hui :</p>
<ul>
<li><strong>Dossier client 360°</strong> — coordonnées, historique, contrats, documents, tâches et
échanges réunis sur une seule fiche ; détection des doublons et étiquetage pour retrouver un dossier
par segment.</li>
<li><strong>Contrats et échéances</strong> — suivi des contrats et de leurs dates, avec les montants
dans la devise du cabinet.</li>
<li><strong>Devis</strong> — parcours de création guidé, produits, registre des devis, relance et
signature.</li>
<li><strong>Relances et tâches</strong> — listes de travail, tableau kanban, affectation au sein de
l'équipe, relances programmées.</li>
<li><strong>Commissions</strong> — barèmes, import des relevés, états de commissions par période,
calculateur.</li>
<li><strong>Documents</strong> — génération de documents, dépôt de pièces par lien public (sans que
le client ait besoin d'un compte) et lecture assistée des pièces reçues.</li>
<li><strong>Conformité par marché</strong> — référentiels et listes de contrôle adaptés au marché du
cabinet (France ou Suisse) plutôt qu'une liste générique.</li>
<li><strong>Assistant IA ARK</strong> — synthèse du portefeuille, priorisation des actions du jour,
points d'attention détectés, brouillons de messages, préparation d'appels.</li>
<li><strong>Pilotage</strong> — tableau de bord, reporting, objectifs, opportunités du portefeuille.</li>
<li><strong>Équipe</strong> — plusieurs utilisateurs par cabinet, rôles, données strictement
cloisonnées par cabinet.</li>
</ul>

<h2>Avant / avec COURTIA : le même moment de la journée</h2>
<table>
<tr><th>Situation</th><th>Sans outil dédié</th><th>Avec COURTIA</th></tr>
<tr><td>Un client appelle au sujet d'un contrat</td><td>Rechercher dans les e-mails, ouvrir un dossier, vérifier l'agenda</td><td>Ouvrir la fiche client : contrats, échéances, documents et historique au même endroit</td></tr>
<tr><td>Un renouvellement approche</td><td>S'y reprendre depuis un agenda ou un tableur</td><td>L'échéance remonte dans les listes de travail et peut être relancée</td></tr>
<tr><td>Un devis doit être suivi</td><td>Retrouver le fichier, vérifier si une réponse est arrivée</td><td>Le devis vit dans son registre, avec son état et sa relance</td></tr>
<tr><td>Une pièce manque</td><td>Demander par e-mail, relancer, classer à la main</td><td>Un lien de dépôt transmet la pièce directement dans le dossier</td></tr>
<tr><td>Le cabinet veut voir son activité</td><td>Consolider des tableaux à la main</td><td>Tableau de bord et états, calculés sur les données saisies</td></tr>
</table>
<p class="doux">Ce tableau décrit des enchaînements de travail, pas un gain chiffré : COURTIA ne
publie pas de durée économisée qui n'aurait pas été mesurée.</p>

<h2>Pour qui</h2>
<p>Courtier indépendant, cabinet de plusieurs collaborateurs, courtier généraliste ou spécialisé
(IARD, prévoyance, emprunteur, santé). L'offre d'entrée convient à un courtier seul ; l'offre
principale ajoute les intégrations, les documents métier et l'assistant complet ; l'offre Cabinet
ajoute le multi-utilisateurs, les commissions et le reporting avancé.</p>

<h2>Périmètre de cette page (pour éviter les confusions)</h2>
<p>Deux pages de COURTIA se ressemblent et ne répondent pas à la même question :</p>
<ul>
<li><a href="/fr/crm-courtier-assurance">cette page</a> répond à « CRM courtier assurance » : la
relation client et le travail quotidien (dossier, contrats, échéances, relances, tâches,
documents) ;</li>
<li><a href="/fr/logiciel-courtier-assurance">la page du logiciel de courtage</a> répond à « logiciel
courtier assurance » : la vue d'ensemble de l'outil (devis, commissions, conformité,
intégrations, équipe) et le choix de l'offre.</li>
</ul>
<p>Si vous cherchez un outil pour reprendre la main sur le suivi client, commencez ici. Si vous
comparez des logiciels de courtage pour un cabinet complet, commencez par la page du logiciel.</p>

<h2>Ce que cette page ne prétend pas</h2>
<p>COURTIA n'est ni un expert-comptable, ni un service juridique. Le produit structure, trace et
prépare le travail administratif ; il ne remplace pas l'avis d'un professionnel, et aucun classement
de place de marché n'est revendiqué ici.</p>
""",
    faq=[
        ("Qu'appelle-t-on exactement un CRM pour courtier d'assurance ?",
         "Un outil qui réunit les clients, leurs contrats et les actions à mener, au lieu de les répartir entre un tableur, une boîte e-mail et un agenda. La différence avec un CRM généraliste tient au vocabulaire et aux objets métier : contrats, échéances, devis, commissions, obligations d'information."),
        ("COURTIA remplace-t-il un tableur ?",
         "Le produit couvre l'import de portefeuille et le suivi des contrats et commissions. Un cabinet peut conserver des tableurs pour d'autres usages, mais le suivi quotidien n'a plus à dépendre d'eux."),
        ("Plusieurs collaborateurs peuvent-ils travailler dans le cabinet ?",
         "Oui. Plusieurs utilisateurs peuvent être rattachés au même cabinet, avec des rôles, et les données sont cloisonnées par cabinet."),
        ("Que se passe-t-il à la fin de l'essai de 7 jours ?",
         "Aucune donnée n'est supprimée. Le cabinet garde la consultation de ses dossiers ; les écritures métier redeviennent possibles dès la souscription."),
    ],
    schema_offres=[
        {"@type": "Offer", "name": "Starter", "price": "89", "priceCurrency": "EUR",
         "description": "Offre d'entrée, par mois, hors taxes (France)."},
        {"@type": "Offer", "name": "Pro", "price": "159", "priceCurrency": "EUR",
         "description": "Offre principale, par mois, hors taxes (France)."},
    ],
)

# ── 2. FR — IA appliquée au courtage ─────────────────────────────────────────
PAGES["fr/ia-courtier-assurance"] = dict(
    marche="FR",
    titre="IA pour courtier d'assurance : à quoi ça sert vraiment — COURTIA",
    description=(
        "Usages concrets de l'IA dans un cabinet de courtage : synthèse de portefeuille, priorisation "
        "des actions, préparation d'appels, lecture de pièces. COURTIA (ARK). Essai 7 jours."
    ),
    h1="IA pour courtier d'assurance : des usages concrets, pas un argument",
    fil=[("Accueil", "/"), ("France", "/fr"), ("IA courtier assurance", "/fr/ia-courtier-assurance")],
    maillage=[
        ("CRM courtier assurance", "/fr/crm-courtier-assurance",
         "le dossier client 360° sur lequel l'assistant s'appuie"),
        ("Automatisation courtier assurance", "/fr/automatisation-courtier-assurance",
         "les tâches qui se déclenchent seules, par opposition à celles qui demandent une décision"),
        ("IA courtier assurance en Suisse", "/ch/ia-courtier-assurance-suisse",
         "les usages de l'assistant dans un cabinet suisse"),
        ("Gagner du temps en cabinet de courtage", "/fr/gagner-du-temps-courtier-assurance",
         "où le temps se perd et comment le récupérer"),
    ],
    corps="""
<div class="section">
<h2>Le malentendu à lever</h2>
<p>« IA » ne veut rien dire en soi pour un cabinet. Ce qui compte, c'est la tâche précise que
l'assistant prend en charge, et ce que le courtier peut vérifier ensuite. Un assistant qui écrit du
texte plausible mais faux fait perdre plus de temps qu'il n'en fait gagner.</p>
<p>La règle que COURTIA s'impose : <strong>l'assistant travaille sur les données du cabinet</strong>
(clients, contrats, échéances, documents, historique) et rend un résultat qu'un humain contrôle avant
d'agir. Aucune donnée de portefeuille n'est inventée, et un écran qui n'a rien à calculer affiche
« — » plutôt qu'une valeur de remplissage.</p>
</div>

<h2>Ce que l'assistant ARK fait dans le produit</h2>
<ul>
<li><strong>Briefing de début de journée</strong> — ce qui doit être traité aujourd'hui : échéances
proches, dossiers sans suite, relances dues.</li>
<li><strong>Synthèse de portefeuille</strong> — lecture d'ensemble d'un portefeuille et des points
d'attention, à partir des données réellement présentes.</li>
<li><strong>Priorisation</strong> — classement des actions par urgence et par enjeu, pour ne pas
traiter au hasard.</li>
<li><strong>Préparation d'appel</strong> — l'essentiel du dossier avant de décrocher, pour ne pas
chercher en direct.</li>
<li><strong>Brouillons de messages</strong> — relances et réponses préparées dans le ton du cabinet,
relues par le courtier avant envoi.</li>
<li><strong>Lecture assistée de pièces</strong> — extraction des informations utiles d'un document
reçu (pièce d'identité, justificatif) pour limiter la ressaisie.</li>
<li><strong>Veille ciblée</strong> — suivi d'informations utiles au cabinet, présenté sous forme de
signaux et non de flux.</li>
<li><strong>Assistance vocale</strong> — préparation et compte rendu d'échanges, pour que l'écrit du
dossier se fasse pendant l'appel plutôt qu'après.</li>
</ul>

<h2>Les garde-fous, parce qu'ils comptent plus que la démonstration</h2>
<ul>
<li><strong>Les données du cabinet restent cloisonnées</strong> : un cabinet ne voit que ses
données.</li>
<li><strong>Rien n'est envoyé au client sans validation humaine.</strong></li>
<li><strong>Les documents produits sont tracés</strong> : qui, quand, sur quelle base.</li>
<li><strong>L'assistant dit ce qu'il ne sait pas</strong> : quand la donnée manque, l'écran
l'indique au lieu de la fabriquer.</li>
</ul>

<h2>Avant / avec : une matinée de courtier</h2>
<table>
<tr><th>Moment</th><th>Sans assistance</th><th>Avec ARK</th></tr>
<tr><td>Ouvrir la journée</td><td>Parcourir agenda, boîte e-mail et notes pour décider par où commencer</td><td>Le briefing liste ce qui doit être traité, avec les dossiers concernés</td></tr>
<tr><td>Appeler un client</td><td>Rouvrir plusieurs écrans pendant l'appel</td><td>La fiche et les points saillants sont prêts avant l'appel</td></tr>
<tr><td>Relancer un dossier</td><td>Rédiger, vérifier, envoyer</td><td>Le brouillon est préparé, le courtier le valide</td></tr>
<tr><td>Traiter une pièce reçue</td><td>Ouvrir, lire, recopier</td><td>Les informations utiles sont extraites, le courtier confirme</td></tr>
</table>

<h2>Pourquoi c'est différent d'un assistant généraliste</h2>
<p>Un assistant généraliste ne connaît ni les échéances de vos contrats, ni l'état de vos devis, ni
ce qu'un devis de courtage doit contenir. ARK est branché sur le modèle de données du cabinet : c'est
cette liaison qui rend la réponse utilisable, et c'est aussi elle qui impose les garde-fous ci-dessus.</p>
""",
    faq=[
        ("L'IA prend-elle des décisions à la place du courtier ?",
         "Non. Elle prépare, résume et propose. Les actions (envoi, décision, engagement) restent déclenchées par un humain."),
        ("Les données du cabinet servent-elles à entraîner un modèle public ?",
         "Non. Les données du cabinet servent à produire la réponse demandée, dans le périmètre du cabinet, et restent cloisonnées par cabinet."),
        ("Faut-il saisir beaucoup de choses pour que l'IA soit utile ?",
         "Non. L'assistant travaille sur ce que le cabinet a déjà : clients, contrats, échéances, documents et historique. Quand une donnée manque, il l'indique."),
    ],
    schema_offres=[{"@type": "Offer", "name": "Pro", "price": "159", "priceCurrency": "EUR",
                    "description": "Offre incluant l'assistant complet, par mois, hors taxes (France)."}],
)

# ── 3. FR — Automatisation ───────────────────────────────────────────────────
PAGES["fr/automatisation-courtier-assurance"] = dict(
    marche="FR",
    titre="Automatisation courtier assurance : relances, tâches et documents — COURTIA",
    description=(
        "Ce qu'un cabinet peut réellement automatiser : relances, suivi des tâches, collecte de pièces, "
        "échéances, documents et suivi commercial. COURTIA, essai 7 jours."
    ),
    h1="Automatisation d'un cabinet de courtage : ce qui peut réellement être automatisé",
    fil=[("Accueil", "/"), ("France", "/fr"), ("Automatisation courtier assurance", "/fr/automatisation-courtier-assurance")],
    maillage=[
        ("CRM courtier assurance", "/fr/crm-courtier-assurance",
         "centraliser d'abord : c'est la condition de toute automatisation"),
        ("IA courtier assurance", "/fr/ia-courtier-assurance",
         "ce que l'assistant prend en charge, et ce qu'il laisse au courtier"),
        ("Le devoir de conseil", "/fr/guide/devoir-de-conseil",
         "ce qui ne doit pas être automatisé parce que cela engage le cabinet"),
        ("Automatisation pour un cabinet suisse", "/ch/automatisation-courtier-assurance-suisse",
         "le même sujet dans le cadre suisse"),
    ],
    corps="""
<div class="section">
<h2>Automatiser quoi, au juste ?</h2>
<p>« Automatiser » ne veut pas dire supprimer le courtier. Cela veut dire retirer les gestes qui ne
demandent aucune décision : recopier, retrouver, relancer, classer, vérifier une date. Trois familles
de tâches s'automatisent proprement dans un cabinet :</p>
<ul>
<li>ce qui doit <strong>se déclencher à une date</strong> (échéance de contrat, relance prévue) ;</li>
<li>ce qui doit <strong>circuler sans ressaisie</strong> (pièce reçue, document à produire) ;</li>
<li>ce qui doit <strong>remonter sans qu'on le cherche</strong> (dossier sans suite, action du jour).</li>
</ul>
</div>

<h2>Ce qui est automatisable dans COURTIA aujourd'hui</h2>
<table>
<tr><th>Tâche répétitive</th><th>Ce que fait le produit</th></tr>
<tr><td>Relancer un client pour une pièce ou une réponse</td><td>Relances programmées sur le dossier, avec brouillon de message à valider</td></tr>
<tr><td>Se souvenir d'une échéance de contrat</td><td>Échéances suivies, remontées dans les listes de travail et le briefing du matin</td></tr>
<tr><td>Collecter des pièces justificatives</td><td>Lien de dépôt public : le client dépose, la pièce arrive dans le dossier</td></tr>
<tr><td>Produire un document type</td><td>Génération de documents depuis les données du dossier</td></tr>
<tr><td>Suivre un devis</td><td>Registre des devis avec état, relance et signature</td></tr>
<tr><td>Calculer les commissions</td><td>Barèmes et import de relevés, états par période</td></tr>
<tr><td>Vérifier ce qui doit être fait</td><td>Briefing du matin et priorisation des actions</td></tr>
<tr><td>Suivre une campagne de prospection</td><td>Campagnes, boîte de réception des réponses et suivi des prospects</td></tr>
</table>

<h2>Ce qui ne doit PAS être automatisé</h2>
<p>Un conseil, une décision de couverture, une validation de conformité : ces actes engagent le
courtier et sa responsabilité. COURTIA les <strong>prépare et les trace</strong>, il ne les décide
pas. Un outil qui automatiserait un conseil produirait un dossier défendable en apparence et fragile
en réalité.</p>

<h2>Par où commencer</h2>
<ol>
<li>Centraliser les clients et les contrats (sans quoi rien d'autre ne peut être suivi).</li>
<li>Brancher les échéances, pour que les renouvellements remontent d'eux-mêmes.</li>
<li>Automatiser la collecte de pièces, qui produit un effet immédiat sur les allers-retours.</li>
<li>Puis les relances et les documents.</li>
</ol>
<h2>Une semaine type, avant et après</h2>
<table>
<tr><th>Moment de la semaine</th><th>Sans automatisation</th><th>Avec COURTIA</th></tr>
<tr><td>Lundi matin</td><td>Reconstituer sa liste de priorités à partir de notes et d'e-mails</td><td>Le briefing du matin liste les dossiers à traiter et ce qui est en retard</td></tr>
<tr><td>Pendant la semaine</td><td>Chercher un contrat, une pièce ou un échange avant chaque appel</td><td>Le dossier client est unique et consultable en appel</td></tr>
<tr><td>Pièce attendue</td><td>Relancer par e-mail, relancer à nouveau, puis classer</td><td>Le client dépose via un lien ; la pièce arrive dans le dossier</td></tr>
<tr><td>Devis envoyé</td><td>Suivre l'avancement de mémoire</td><td>Le devis garde son état, sa relance et sa signature dans le registre</td></tr>
<tr><td>Fin de mois</td><td>Consolider les commissions dans un tableur</td><td>Relevés importés, états de commissions par période</td></tr>
</table>

<h2>Périmètre de cette page</h2>
<p>Cette page décrit ce qu'un cabinet peut automatiser avec COURTIA et dans quel ordre le mettre en
place. Elle ne traite pas du paramétrage détaillé des intégrations (boîte e-mail, agenda, WhatsApp) :
ce point est documenté dans le produit et repris lors de la prise en main.</p>

<p class="doux">Aucune durée économisée n'est annoncée ici : nous n'avons pas de mesure publiée à
citer. L'essai de 7 jours sert précisément à le constater sur son propre portefeuille.</p>
""",
    faq=[
        ("Faut-il tout automatiser d'un coup ?",
         "Non. La centralisation des clients et des contrats vient d'abord : sans elle, une automatisation n'a rien sur quoi s'appuyer."),
        ("Les relances partent-elles toutes seules ?",
         "Les brouillons sont préparés par le produit ; l'envoi reste une action du cabinet. Cela évite qu'un message parte à contretemps."),
        ("COURTIA remplace-t-il la signature électronique ?",
         "Le produit gère le parcours de devis jusqu'à la signature via un prestataire de signature électronique, sans que le cabinet ait à sortir du dossier."),
    ],
)

# ── 4. FR — Gain de temps (territoire stratégique) ───────────────────────────
PAGES["fr/gagner-du-temps-courtier-assurance"] = dict(
    marche="FR",
    titre="Gagner du temps en cabinet de courtage : où le temps se perd vraiment — COURTIA",
    description=(
        "Où part le temps dans un cabinet de courtage, et ce qui peut être réduit : recherche "
        "d'information, ressaisie, relances, collecte de pièces, suivi des échéances. COURTIA."
    ),
    h1="Gagner du temps en cabinet de courtage : où le temps se perd réellement",
    fil=[("Accueil", "/"), ("France", "/fr"), ("Gagner du temps", "/fr/gagner-du-temps-courtier-assurance")],
    maillage=[
        ("CRM courtier assurance", "/fr/crm-courtier-assurance",
         "commencer par un dossier client unique"),
        ("Automatisation courtier assurance", "/fr/automatisation-courtier-assurance",
         "les tâches concrètes qui peuvent se déclencher sans intervention"),
        ("IA courtier assurance", "/fr/ia-courtier-assurance",
         "l'assistant qui prépare les actions du jour"),
        ("La formation DDA de 15 heures", "/fr/guide/dda-15h",
         "un des postes administratifs qui pèsent sur le temps du cabinet"),
    ],
    corps="""
<div class="section">
<h2>Le temps ne se perd pas dans le travail, mais entre les travaux</h2>
<p>Dans un cabinet de courtage, la journée est faite de rendez-vous, d'appels, de propositions. Ce qui
grignote le temps n'est pas ce travail-là : ce sont les allers-retours autour. Chercher une
information dans trois endroits avant de décrocher. Ressaisir des coordonnées déjà connues. Se rendre
compte qu'une pièce attendue n'est jamais arrivée. Découvrir qu'un renouvellement est passé.</p>
<p>Ce sont autant de <strong>interruptions</strong>, et une interruption coûte plus que sa durée :
elle oblige à reprendre le fil.</p>
</div>

<h2>Les cinq postes où un cabinet perd du temps</h2>
<table>
<tr><th>Poste</th><th>Ce qui se passe</th><th>Ce qui peut changer</th></tr>
<tr><td>Recherche d'information</td><td>Contacts, contrats et échanges répartis entre e-mails, agenda, dossiers et tableurs</td><td>Un dossier client unique, consultable avant et pendant l'appel</td></tr>
<tr><td>Ressaisie</td><td>La même donnée recopiée d'un outil à l'autre</td><td>Collecte de pièces par lien et lecture assistée des documents reçus</td></tr>
<tr><td>Relances</td><td>Personne ne sait quel dossier attend quoi, ni depuis quand</td><td>Relances suivies sur le dossier, avec brouillon à valider</td></tr>
<tr><td>Échéances</td><td>Le renouvellement se découvre trop tard</td><td>Échéances remontées dans les listes de travail et le briefing du matin</td></tr>
<tr><td>Suivi commercial</td><td>Les prospects se perdent entre deux échanges</td><td>Pipeline, campagne et boîte de réception des réponses</td></tr>
</table>

<h2>Un enchaînement concret</h2>
<p><strong>Avant.</strong> Un client appelle. Le courtier cherche le contrat dans sa boîte e-mail,
ouvre le dossier du client, vérifie la date d'échéance dans son agenda, constate qu'une pièce manque
et promet de renvoyer un message.</p>
<p><strong>Avec COURTIA.</strong> La fiche client affiche les contrats, les échéances, les documents
et l'historique. La pièce manquante se demande par un lien de dépôt. Le message de relance est
préparé, le courtier le valide. L'action est tracée dans le dossier.</p>
<p>Ce qui a changé n'est pas la durée de l'appel : c'est le nombre d'écrans visités et le nombre de
choses à ne pas oublier après.</p>

<h2>Comment le vérifier sur son propre cabinet</h2>
<ol>
<li>Prendre trois dossiers réels et compter les outils qu'il faut ouvrir pour répondre à une question simple.</li>
<li>Mesurer combien de pièces ont dû être redemandées le mois dernier.</li>
<li>Vérifier combien de renouvellements ont été traités hors délai, et comment on l'a découvert.</li>
<li>Puis essayer COURTIA sur ces trois dossiers pendant les 7 jours d'essai.</li>
</ol>
<h2>Trois signaux qu'un cabinet perd du temps</h2>
<ol>
<li><strong>Le même renseignement est demandé deux fois au client.</strong> Cela signale une
information qui circule mal entre les dossiers et les échanges.</li>
<li><strong>On découvre une échéance après coup.</strong> Cela signale un suivi qui repose sur la
mémoire ou sur un calendrier séparé du dossier.</li>
<li><strong>Personne ne sait dire, sans chercher, combien de devis attendent une réponse.</strong>
Cela signale un suivi commercial qui n'a pas d'état consolidé.</li>
</ol>
<p>Ces trois signaux ont une caractéristique commune : ils ne se règlent pas en travaillant plus
vite, mais en réunissant l'information au même endroit.</p>

<p class="doux">Aucun pourcentage ni aucune durée n'est avancé ici : COURTIA ne publie pas de gain
chiffré sans mesure reproductible, et cette page n'en fabrique pas.</p>
""",
    faq=[
        ("Combien de temps un CRM peut-il faire gagner ?",
         "Nous ne publions pas de durée : elle dépend du portefeuille, du nombre de collaborateurs et des outils déjà en place. Ce qui est vérifiable, c'est le nombre d'outils consultés et de ressaisies supprimées — et cela se mesure sur ses propres dossiers pendant l'essai."),
        ("Faut-il changer toute son organisation pour y arriver ?",
         "Non. L'entrée se fait par la centralisation des clients et des contrats, puis par l'ajout des échéances et de la collecte de pièces."),
    ],
)

# ── 5. CH — PILIER : logiciel courtier assurance Suisse ──────────────────────
PAGES["ch/logiciel-courtier-assurance-suisse"] = dict(
    marche="CH",
    titre="Logiciel courtier assurance Suisse : dossier client, LSA, CHF — COURTIA",
    description=(
        "COURTIA pour les courtiers et intermédiaires d'assurance suisses : dossier client, contrats, "
        "échéances, commissions, journal de conseil, facturation en CHF. Essai 7 jours."
    ),
    h1="Logiciel de courtage pour la Suisse : la même rigueur, dans le cadre suisse",
    fil=[("Accueil", "/"), ("Suisse", "/ch"), ("Logiciel courtier assurance Suisse", "/ch/logiciel-courtier-assurance-suisse")],
    maillage=[
        ("CRM courtier d'assurance en Suisse", "/ch/crm-courtier-assurance-suisse",
         "le dossier client 360° et le journal de conseil"),
        ("Tarifs en francs suisses", "/ch/tarifs-logiciel-courtier-chf",
         "les offres et les montants appliqués en CHF"),
        ("Conformité de l'intermédiaire d'assurance", "/ch/conformite-intermediaire-assurance-lsa-finma",
         "le cadre applicable et ce que le produit documente"),
        ("Automatisation pour un cabinet suisse", "/ch/automatisation-courtier-assurance-suisse",
         "par où commencer dans un cabinet suisse"),
        ("Gestion des commissions et rétrocessions", "/ch/gestion-commissions-courtier-assurance-suisse",
         "barèmes, import de relevés, états par période"),
    ],
    corps="""
<div class="section">
<h2>Un logiciel français ne suffit pas pour un cabinet suisse</h2>
<p>Un cabinet suisse ne travaille pas dans le même cadre qu'un cabinet français : le vocabulaire
(l'intermédiaire d'assurance, le preneur d'assurance), les textes applicables (la loi sur le contrat
d'assurance, la surveillance des intermédiaires, la protection des données révisée), la monnaie, et
la manière de présenter un conseil au client ne sont pas transposables tels quels.</p>
<p>Une interface qui affiche une taxe française, une devise en euros ou une obligation qui ne
s'applique pas place le cabinet en porte-à-faux devant son propre client.</p>
</div>

<h2>Ce que COURTIA apporte à un cabinet suisse</h2>
<ul>
<li><strong>Grille et facturation en francs suisses</strong> — montants, écrans et documents dans la
devise du cabinet, sans conversion implicite.</li>
<li><strong>Dossier client 360°</strong> — coordonnées, contrats, échéances, documents, historique et
tâches sur une seule fiche ; identité du cabinet (raison sociale, UID, canton) conservée dans le
profil du cabinet.</li>
<li><strong>Journal de conseil</strong> — l'entretien de conseil et les éléments échangés sont
structurés dans le dossier, pour pouvoir être restitués plus tard.</li>
<li><strong>Documentation précontractuelle</strong> — préparation des informations à remettre au
client depuis les données du dossier.</li>
<li><strong>Contrats et échéances</strong> — suivi des échéances avec devise et marché du cabinet.</li>
<li><strong>Devis et registre</strong> — parcours de devis et registre suisse des devis.</li>
<li><strong>Commissions et rétrocessions</strong> — barèmes, import de relevés, états par période.</li>
<li><strong>Documents et pièces</strong> — génération de documents, dépôt de pièces par lien public.</li>
<li><strong>Assistant IA ARK</strong> — synthèse du portefeuille, priorités du jour, préparation
d'appels, brouillons de messages.</li>
<li><strong>Multilingue côté cablage produit</strong> — l'interface et les documents sont préparés
pour le français ; le produit n'affiche pas de traduction automatique approximative.</li>
</ul>
<p class="doux">Ce que COURTIA n'affirme pas : le produit n'est pas vendu comme « certifié » par une
autorité de surveillance, et cette page ne revendique aucune conformité réglementaire automatique. Le
cabinet reste responsable de ses obligations ; COURTIA l'aide à les documenter.</p>

<h2>Avant / avec, dans un cabinet suisse</h2>
<table>
<tr><th>Situation</th><th>Sans outil dédié</th><th>Avec COURTIA</th></tr>
<tr><td>Entretien de conseil</td><td>Notes personnelles, à retranscrire ensuite</td><td>L'entretien est rattaché au dossier et consultable plus tard</td></tr>
<tr><td>Contrat qui arrive à échéance</td><td>S'y reprendre depuis un agenda</td><td>L'échéance remonte dans les actions du jour</td></tr>
<tr><td>Commission d'un partenaire</td><td>Relevé reçu, recopié dans un tableur</td><td>Relevé importé, commission rattachée au dossier</td></tr>
<tr><td>Pièce demandée au client</td><td>E-mails et relances manuelles</td><td>Lien de dépôt, pièce classée dans le dossier</td></tr>
</table>

<h2>Pour qui, en Suisse</h2>
<p>Courtier indépendant, cabinet de plusieurs collaborateurs, intermédiaire spécialisé
(choses, prévoyance, santé, véhicules), en Suisse romande d'abord. Le produit sert une grille en
francs suisses avec une offre d'entrée et une offre cabinet ; la facturation et les montants
appliqués sont décrits sur la page des tarifs suisses.</p>
""",
    faq=[
        ("COURTIA est-il fait pour la Suisse ou seulement adapté ?",
         "La grille suisse, la devise, l'identité du cabinet (UID, canton) et le vocabulaire du dossier sont traités dans le produit, pas ajoutés après coup. Les écrans suisses ne reçoivent pas la fiscalité française."),
        ("Le produit est-il facturé en francs suisses ?",
         "Oui. Un cabinet suisse reçoit une grille en CHF et une facturation dans la même devise."),
        ("COURTIA me rend-il conforme à lui seul ?",
         "Non, et aucun logiciel ne peut le promettre. COURTIA structure et trace les informations et les étapes de conseil ; la conformité reste sous la responsabilité du cabinet."),
        ("Faut-il un compte en euros ?",
         "Non. Le cabinet suisse travaille en francs suisses dans le produit."),
    ],
    schema_offres=[
        {"@type": "Offer", "name": "Indépendant", "price": "199", "priceCurrency": "CHF",
         "description": "Offre pour courtier indépendant, par mois, hors taxes (Suisse)."},
        {"@type": "Offer", "name": "Cabinet", "price": "349", "priceCurrency": "CHF",
         "description": "Offre cabinet, par mois, hors taxes (Suisse)."},
    ],
)

# ── 6. CH — Automatisation pour la Suisse ────────────────────────────────────
PAGES["ch/automatisation-courtier-assurance-suisse"] = dict(
    marche="CH",
    titre="Automatisation pour courtiers suisses : échéances, pièces, commissions — COURTIA",
    description=(
        "Automatiser un cabinet de courtage en Suisse : échéances, collecte de pièces, relances, "
        "commissions et documentation de conseil. COURTIA, en francs suisses, essai 7 jours."
    ),
    h1="Automatisation d'un cabinet de courtage en Suisse : par où commencer",
    fil=[("Accueil", "/"), ("Suisse", "/ch"), ("Automatisation Suisse", "/ch/automatisation-courtier-assurance-suisse")],
    maillage=[
        ("Logiciel courtier assurance en Suisse", "/ch/logiciel-courtier-assurance-suisse",
         "le socle : dossier client, contrats, devis, documents"),
        ("Gestion de portefeuille d'assurance en Suisse", "/ch/gestion-portefeuille-assurance-suisse",
         "contrats, échéances et renouvellements"),
        ("Relances pour courtier d'assurance en Suisse", "/ch/relances-courtier-assurance-suisse",
         "ce qui se relance et ce qui se valide"),
        ("Gestion des commissions en Suisse", "/ch/gestion-commissions-courtier-assurance-suisse",
         "barèmes et import de relevés"),
        ("Automatisation en France", "/fr/automatisation-courtier-assurance",
         "la même approche dans le cadre français"),
    ],
    corps="""
<div class="section">
<h2>Le cadre suisse change la priorité des automatisations</h2>
<p>Dans un cabinet suisse, deux éléments pèsent plus qu'ailleurs : la <strong>traçabilité du
conseil</strong> (ce qui a été présenté, quand, à qui) et la <strong>relation avec les
partenaires</strong> (compagnies, courtiers grossistes, rétrocessions). Une automatisation utile
commence donc par ce qui alimente ces deux points, pas par le marketing.</p>
</div>

<h2>Les automatisations qui ont du sens ici</h2>
<table>
<tr><th>Point de départ</th><th>Ce que fait COURTIA</th></tr>
<tr><td>Échéances de contrats</td><td>Suivi des échéances, remontée dans les actions du jour et le briefing du matin</td></tr>
<tr><td>Pièces du client</td><td>Lien de dépôt public, pièce rattachée au dossier, sans compte à créer pour le client</td></tr>
<tr><td>Entretien de conseil</td><td>Journal de conseil structuré dans le dossier, restituable plus tard</td></tr>
<tr><td>Documentation précontractuelle</td><td>Préparation depuis les données du dossier, trace de ce qui a été remis</td></tr>
<tr><td>Commissions et rétrocessions</td><td>Barèmes, import de relevés, états par période</td></tr>
<tr><td>Relances</td><td>Relances suivies, avec brouillon de message à valider par le cabinet</td></tr>
<tr><td>Vue d'ensemble</td><td>Tableau de bord, reporting et objectifs calculés sur les données du cabinet</td></tr>
</table>

<h2>Ce que l'automatisation ne doit pas faire</h2>
<p>Présenter un conseil, valider une couverture, décider d'un placement : ces actes engagent le
cabinet. COURTIA les prépare et les documente ; il ne les décide pas et n'envoie rien au client sans
validation. C'est la raison pour laquelle les relances restent des brouillons à confirmer.</p>

<h2>Ordre de mise en place conseillé</h2>
<ol>
<li>Renseigner l'identité du cabinet (raison sociale, UID, canton) et les contrats.</li>
<li>Activer le suivi des échéances.</li>
<li>Ouvrir la collecte de pièces par lien.</li>
<li>Puis le journal de conseil et les documents.</li>
<li>Enfin les commissions, une fois les partenaires et barèmes saisis.</li>
</ol>
<h2>Ce qui change par rapport à un logiciel non suisse</h2>
<ul>
<li><strong>La devise.</strong> Les montants, écrans et documents sont en francs suisses : aucune
conversion implicite en euros dans le dossier du client.</li>
<li><strong>L'identité du cabinet.</strong> Raison sociale, numéro d'identification des entreprises
et canton sont conservés dans le profil du cabinet, là où un cabinet français porte un numéro
d'immatriculation différent.</li>
<li><strong>Le vocabulaire du dossier.</strong> Preneur d'assurance, intermédiaire, journal de conseil :
le produit parle le langage du marché suisse plutôt que de traduire un vocabulaire français.</li>
<li><strong>La documentation remise au client.</strong> La documentation précontractuelle se prépare
depuis les données du dossier et reste tracée, ce qui permet de restituer ce qui a été remis et quand.</li>
<li><strong>Les partenaires.</strong> Les barèmes et rétrocessions se saisissent par partenaire, puis
les relevés s'importent : le suivi des commissions ne dépend plus d'un tableur tenu à part.</li>
</ul>

<h2>Périmètre de cette page</h2>
<p>Cette page décrit ce qui s'automatise dans un cabinet suisse et dans quel ordre. Elle ne prétend
pas que COURTIA rende un cabinet conforme à lui seul : les obligations restent celles du cabinet, et
le produit sert à les documenter et à les tracer.</p>

<p class="doux">Aucun gain chiffré n'est annoncé : nous ne disposons pas d'une mesure suisse
reproductible à citer, et nous n'en inventons pas.</p>
""",
    faq=[
        ("Les montants sont-ils en francs suisses ?",
         "Oui. Un cabinet suisse travaille dans sa devise, dans les écrans comme dans les documents."),
        ("Le journal de conseil remplace-t-il mes notes ?",
         "Il structure l'information et la rattache au dossier pour qu'elle soit retrouvable. La manière de conduire l'entretien reste celle du courtier."),
        ("Les relances sont-elles envoyées automatiquement au client ?",
         "Non. Les messages sont préparés et restent à valider par le cabinet avant envoi."),
    ],
)


# ── 7-10. FR — PAGES MONEY COMPLÉMENTAIRES prévues par la « SEO & GEO Bible » du coffre ─────────
# (ces URL répondaient jusqu'ici la coquille vide du SPA : un crawler n'y voyait aucun contenu)

PAGES["fr/relance-client-assurance"] = dict(
    marche="FR",
    titre="Relances clients pour courtiers : suivre, préparer, envoyer — COURTIA",
    description=(
        "Relances clients en cabinet de courtage : pièces manquantes, devis sans réponse, échéances "
        "de contrat. Ce qui se suit dans COURTIA, ce qui se prépare, ce qui reste à valider."
    ),
    h1="Relances clients : arrêter de relancer de mémoire",
    fil=[("Accueil", "/"), ("France", "/fr"), ("Relances clients", "/fr/relance-client-assurance")],
    maillage=[
        ("CRM courtier assurance", "/fr/crm-courtier-assurance", "le dossier sur lequel les relances s'appuient"),
        ("Automatisation du cabinet", "/fr/automatisation-courtier-assurance", "ce qui se déclenche seul, et ce qui se valide"),
        ("Gestion des renouvellements", "/fr/gestion-portefeuille-courtier", "échéances et campagnes de renouvellement"),
        ("Relances en Suisse", "/ch/relances-courtier-assurance-suisse", "le même sujet dans un cabinet suisse"),
    ],
    corps="""
<div class="section">
<h2>Pourquoi les relances se perdent</h2>
<p>Une relance ne se perd pas parce qu'on l'oublie franchement : elle se perd parce que personne ne
sait, sans chercher, <strong>quel dossier attend quoi, et depuis quand</strong>. Trois situations
reviennent dans tous les cabinets :</p>
<ul>
<li>une pièce justificative demandée au client, jamais arrivée ;</li>
<li>un devis envoyé, resté sans réponse ;</li>
<li>un contrat qui arrive à échéance, découvert trop tard.</li>
</ul>
<p>Dans les trois cas, l'information existe : elle est simplement rangée là où elle ne se signale pas.</p>
</div>

<h2>Ce que COURTIA fait sur les relances</h2>
<ul>
<li><strong>Relances rattachées au dossier</strong> — une relance n'est pas une note personnelle : elle
vit sur le dossier concerné, avec ce qui est attendu et la date.</li>
<li><strong>Brouillons préparés</strong> — le message est rédigé à partir du dossier (client, contrat,
pièce manquante) et reste <strong>à valider par le cabinet</strong> avant envoi.</li>
<li><strong>Suivi des devis</strong> — le registre des devis porte l'état de chaque proposition,
y compris celles qui restent sans réponse.</li>
<li><strong>Échéances de contrat</strong> — les échéances remontent dans les listes de travail et dans
le briefing du matin plutôt que de dépendre d'un agenda séparé.</li>
<li><strong>Collecte de pièces</strong> — un lien de dépôt permet au client de déposer la pièce
directement dans le dossier, sans compte à créer.</li>
<li><strong>Canaux</strong> — e-mail, messagerie et modèles de messages ; le contenu des modèles se
prépare, l'envoi se décide.</li>
</ul>

<h2>Avant / avec</h2>
<table>
<tr><th>Situation</th><th>Sans suivi dédié</th><th>Avec COURTIA</th></tr>
<tr><td>Pièce manquante depuis 3 semaines</td><td>Retrouver l'échange, relancer, espérer</td><td>Le dossier signale ce qui est attendu ; la relance est préparée</td></tr>
<tr><td>Devis sans réponse</td><td>S'en souvenir au hasard d'un appel</td><td>Le devis garde son état et peut être relancé</td></tr>
<tr><td>Renouvellement à préparer</td><td>S'y reprendre tard, en urgence</td><td>L'échéance remonte dans les actions du jour</td></tr>
</table>

<h2>Le choix assumé : rien ne part tout seul</h2>
<p>COURTIA ne met pas de relance automatique « en aveugle » vers vos clients. Un message envoyé au
mauvais moment, ou à un client qui vient précisément de répondre, coûte plus cher que le temps gagné.
Le produit prépare, suit et trace ; l'envoi reste une décision du cabinet.</p>
""",
    faq=[
        ("Les relances partent-elles automatiquement ?",
         "Non. COURTIA prépare le message et suit la relance ; l'envoi est validé par le cabinet. C'est un choix : une relance envoyée à contretemps abîme la relation client."),
        ("Peut-on relancer sur une pièce manquante en particulier ?",
         "Oui. Le lien de dépôt de pièces permet au client de transmettre le document attendu, qui arrive directement dans le dossier."),
        ("Comment savoir quels devis attendent une réponse ?",
         "Le registre des devis conserve l'état de chaque proposition, y compris celles restées sans réponse."),
    ],
)

PAGES["fr/gestion-portefeuille-courtier"] = dict(
    marche="FR",
    titre="Gestion de portefeuille courtier : contrats, échéances, renouvellements — COURTIA",
    description=(
        "Gérer un portefeuille de courtage : contrats, échéances, renouvellements, concentration par "
        "branche, opportunités. Ce que COURTIA suit réellement dans le portefeuille."
    ),
    h1="Gestion d'un portefeuille de courtage : ce qu'il faut voir, et quand",
    fil=[("Accueil", "/"), ("France", "/fr"), ("Gestion de portefeuille", "/fr/gestion-portefeuille-courtier")],
    maillage=[
        ("CRM courtier assurance", "/fr/crm-courtier-assurance", "le dossier client qui porte le portefeuille"),
        ("Relances clients", "/fr/relance-client-assurance", "les relances qui découlent des échéances"),
        ("Logiciel de gestion de cabinet", "/fr/logiciel-gestion-cabinet-courtage", "la vue cabinet : commissions, coûts, pilotage"),
        ("Gestion de portefeuille en Suisse", "/ch/gestion-portefeuille-assurance-suisse", "échéances et renouvellements côté suisse"),
    ],
    corps="""
<div class="section">
<h2>Un portefeuille ne se gère pas au nombre de contrats</h2>
<p>Deux cabinets peuvent avoir le même nombre de contrats et une santé de portefeuille très
différente. Ce qui compte : ce qui arrive à échéance dans les prochaines semaines, ce qui n'a pas été
renouvelé, et où l'activité est concentrée.</p>
</div>

<h2>Ce que COURTIA suit dans le portefeuille</h2>
<ul>
<li><strong>Contrats et échéances</strong> — chaque contrat porte ses dates et ses montants dans la
devise du cabinet, France ou Suisse.</li>
<li><strong>Renouvellements à venir</strong> — les échéances remontent dans les actions du jour et
dans le briefing du matin, au lieu de dépendre d'un agenda tenu à part.</li>
<li><strong>Concentration par branche</strong> — la répartition de l'activité est lisible, y compris
pour un cabinet multi-branches (IARD, santé, prévoyance, emprunteur).</li>
<li><strong>Documents et historique</strong> — les documents du dossier et l'historique des échanges
sont rattachés au client, donc restituables.</li>
<li><strong>Opportunités</strong> — les ouvertures détectées dans un portefeuille existant sont
listées comme pistes de travail, pas comme promesse commerciale.</li>
<li><strong>Indicateurs</strong> — les écrans de pilotage calculent sur les données réellement
saisies ; un indicateur qui n'a rien à calculer s'affiche « — » plutôt qu'une valeur inventée.</li>
</ul>

<h2>Trois questions auxquelles un cabinet doit pouvoir répondre vite</h2>
<ol>
<li>Combien de contrats arrivent à échéance dans les 90 jours ?</li>
<li>Quels dossiers n'ont eu aucun contact depuis six mois ?</li>
<li>Sur quelles branches mon activité est-elle concentrée — et est-ce voulu ?</li>
</ol>
<p>Si ces trois réponses demandent une consolidation manuelle, le portefeuille n'est pas géré : il est
subi.</p>

<h2>Ce que la page ne promet pas</h2>
<p>Aucun taux de rétention ni aucun gain de chiffre d'affaires n'est annoncé ici. Ces chiffres
dépendent du portefeuille, du marché et du travail commercial du cabinet ; nous n'avons pas de mesure
publiable à citer.</p>
""",
    faq=[
        ("COURTIA gère-t-il plusieurs branches dans un même cabinet ?",
         "Oui. Un portefeuille multi-branches est le cas normal : chaque contrat porte sa compagnie et son échéance, et les vues se filtrent par branche."),
        ("Peut-on reprendre un portefeuille existant ?",
         "Oui. L'import de portefeuille permet de démarrer avec les dossiers déjà détenus (offres principales et cabinet)."),
        ("Les échéances sont-elles calculées automatiquement ?",
         "Les échéances suivies proviennent des dates portées par les contrats du cabinet. Le produit ne devine pas une date qu'il n'a pas."),
    ],
)

PAGES["fr/logiciel-gestion-cabinet-courtage"] = dict(
    marche="FR",
    titre="Logiciel de gestion de cabinet de courtage : équipe, commissions, pilotage — COURTIA",
    description=(
        "Gérer un cabinet de courtage : suivi des commissions, coûts, pilotage, objectifs, équipe et "
        "rôles. Ce que COURTIA couvre réellement côté cabinet, en France comme en Suisse."
    ),
    h1="Gestion d'un cabinet de courtage : ce qui se pilote, et avec quoi",
    fil=[("Accueil", "/"), ("France", "/fr"), ("Logiciel de gestion de cabinet", "/fr/logiciel-gestion-cabinet-courtage")],
    maillage=[
        ("Logiciel courtier assurance", "/fr/logiciel-courtier-assurance", "la vue d'ensemble du produit"),
        ("Gestion de portefeuille", "/fr/gestion-portefeuille-courtier", "les contrats et leurs échéances"),
        ("Commissions en Suisse", "/ch/gestion-commissions-courtier-assurance-suisse", "barèmes et rétrocessions côté suisse"),
        ("Gagner du temps au cabinet", "/fr/gagner-du-temps-courtier-assurance", "les postes où le temps se perd"),
    ],
    corps="""
<div class="section">
<h2>Gérer un cabinet, ce n'est pas gérer des dossiers</h2>
<p>Un courtier seul peut tenir son activité dans sa tête et quelques outils. Dès qu'il y a deux
personnes, une question apparaît : qui fait quoi, qui a accès à quoi, et où en est l'activité. C'est
un autre métier que le suivi client — et cela demande d'autres écrans.</p>
</div>

<h2>Ce que COURTIA couvre côté cabinet</h2>
<ul>
<li><strong>Commissions</strong> — barèmes par partenaire, import des relevés, états par période,
calculateur. Le suivi des commissions ne dépend plus d'un tableur tenu à part.</li>
<li><strong>Coûts et administration</strong> — les coûts du cabinet se suivent dans le même outil que
l'activité, pour ne pas recomposer une marge à la main.</li>
<li><strong>Pilotage</strong> — tableau de bord, reporting, objectifs et arbitrages calculés sur les
données saisies.</li>
<li><strong>Équipe et rôles</strong> — plusieurs utilisateurs par cabinet, avec des rôles distincts et
des données <strong>cloisonnées par cabinet</strong> : un cabinet ne voit que ses données.</li>
<li><strong>Conformité par marché</strong> — référentiels et listes de contrôle adaptés au marché du
cabinet plutôt qu'une liste générique.</li>
<li><strong>Suivi opérationnel</strong> — tâches, affectations et file d'actions du jour, pour que la
répartition du travail soit visible.</li>
</ul>

<h2>Avant / avec, pour un cabinet de deux à dix personnes</h2>
<table>
<tr><th>Question du dirigeant</th><th>Sans outil de pilotage</th><th>Avec COURTIA</th></tr>
<tr><td>Où en sont les commissions de ce trimestre ?</td><td>Consolidation manuelle des relevés</td><td>Relevés importés, états par période</td></tr>
<tr><td>Qui suit ce dossier ?</td><td>À demander à l'oral</td><td>Affectation visible dans le tableau de travail</td></tr>
<tr><td>Où va l'activité ?</td><td>Reconstituer des chiffres</td><td>Tableau de bord et reporting sur les données saisies</td></tr>
</table>

<h2>Ce que cette page ne prétend pas</h2>
<p>COURTIA n'est ni un logiciel de paie, ni un outil de comptabilité générale — et il ne remplace pas
un expert-comptable. Il couvre le suivi de l'activité de courtage : dossiers, commissions, coûts
d'exploitation du cabinet, pilotage et équipe.</p>
""",
    faq=[
        ("Peut-on donner des accès différents aux collaborateurs ?",
         "Oui. Plusieurs utilisateurs peuvent être rattachés au cabinet avec des rôles distincts, et les données sont cloisonnées par cabinet."),
        ("Les commissions sont-elles calculées automatiquement ?",
         "Le produit applique les barèmes saisis par partenaire et importe les relevés. Un barème non renseigné ne donne pas lieu à un calcul inventé."),
        ("COURTIA gère-t-il la comptabilité du cabinet ?",
         "Non. Le suivi des commissions et des coûts d'exploitation sert le pilotage du cabinet ; la comptabilité reste tenue par le professionnel qui en a la charge."),
    ],
)

PAGES["fr/comparateur-assurance-courtier"] = dict(
    marche="FR",
    titre="Comparateur pour courtier d'assurance : comparer des propositions, pas des marques",
    description=(
        "Comparer les propositions reçues pour un même besoin client : garanties, exclusions, "
        "cotisations, écarts. COURTIA est un outil de cabinet, pas un comparateur grand public."
    ),
    h1="Comparer des propositions d'assurance : ce qu'un cabinet doit pouvoir mettre côte à côte",
    fil=[("Accueil", "/"), ("France", "/fr"), ("Comparateur", "/fr/comparateur-assurance-courtier")],
    maillage=[
        ("Devis et suivi des propositions", "/fr/relance-client-assurance", "suivre les devis envoyés"),
        ("CRM courtier assurance", "/fr/crm-courtier-assurance", "le dossier sur lequel les propositions sont comparées"),
        ("Logiciel courtier assurance", "/fr/logiciel-courtier-assurance", "la vue d'ensemble du produit"),
        ("Devis en Suisse", "/ch/logiciel-devis-courtier-assurance-suisse", "produire et suivre les propositions"),
    ],
    corps="""
<div class="section">
<h2>Une mise au point nécessaire</h2>
<p>COURTIA <strong>n'est pas un comparateur grand public</strong> : il n'affiche pas de palmarès
d'assureurs et ne vend pas de leads. C'est un outil de cabinet, pour comparer les propositions reçues
pour un besoin client donné.</p>
<p>La confusion est fréquente, parce que le mot « comparateur » recouvre deux métiers très différents :
le site qui met en relation un particulier et des assureurs, et l'outil qui aide un courtier à
présenter une comparaison défendable à son client.</p>
</div>

<h2>Ce que la comparaison doit faire apparaître</h2>
<ul>
<li><strong>Le besoin, tel qu'il est formulé</strong> — la comparaison ne vaut que rattachée au besoin
exprimé et aux informations du dossier (situation, garanties attendues, budget).</li>
<li><strong>Les garanties et leurs limites</strong> — plafonds, franchises, exclusions : ce qui
distingue réellement deux propositions que le prix seul rendrait comparables à tort.</li>
<li><strong>Les cotisations</strong> — dans la devise du marché du cabinet, et selon la périodicité
réelle de la proposition reçue.</li>
<li><strong>Les écarts</strong> — ce qui justifie une recommandation plutôt qu'une autre, et ce qui
doit être dit au client.</li>
<li><strong>La trace</strong> — ce qui a été présenté, à quelle date, et depuis quelles données. C'est
ce qui rend l'entretien de conseil restituable plus tard.</li>
</ul>

<h2>Où cela se passe dans COURTIA</h2>
<p>La comparaison s'appuie sur le dossier du client et sur les propositions qui y sont enregistrées :
les devis produits, les documents reçus des partenaires, et les éléments du contrat. Le cabinet garde
donc la comparaison au même endroit que le conseil, l'historique et la pièce justificative — au lieu
d'un tableur séparé qu'il faut reconstituer à chaque rendez-vous.</p>

<h2>Ce que cette page ne promet pas</h2>
<p>COURTIA ne garantit pas un meilleur résultat de comparaison qu'un autre outil : le résultat dépend
de la qualité des propositions reçues et du travail d'analyse du courtier. Et aucun classement
d'assureurs n'est publié ici — nous n'aurions pas de données mesurées pour le faire honnêtement.</p>
""",
    faq=[
        ("COURTIA est-il un comparateur d'assurance pour particuliers ?",
         "Non. COURTIA est un outil destiné aux courtiers et cabinets de courtage. Il n'y a ni palmarès d'assureurs, ni mise en relation de particuliers."),
        ("Peut-on comparer deux propositions pour un même client ?",
         "Oui, et la comparaison reste rattachée au dossier : besoin exprimé, propositions reçues, pièces et historique."),
        ("Le cabinet peut-il tracer ce qu'il a recommandé ?",
         "Oui. Les éléments présentés au client restent rattachés au dossier, avec leur date, ce qui permet de les restituer plus tard."),
    ],
)


def main():
    parseur = argparse.ArgumentParser()
    parseur.add_argument("--dry-run", action="store_true")
    args = parseur.parse_args()
    ecrits = []
    for chemin, page_def in PAGES.items():
        rendu = page(chemin=chemin, **page_def)
        cible = os.path.join(PUBLIC, chemin, "index.html")
        if args.dry_run:
            print(f"[dry-run] {cible} ({len(rendu)} octets)")
            continue
        os.makedirs(os.path.dirname(cible), exist_ok=True)
        with open(cible, "w", encoding="utf-8") as f:
            f.write(rendu)
        ecrits.append((chemin, len(rendu)))
        print(f"OK  /{chemin}  {len(rendu)} octets")
    if ecrits:
        print(f"\n{len(ecrits)} page(s) pilier générée(s) dans {PUBLIC}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
