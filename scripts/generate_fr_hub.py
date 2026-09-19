#!/usr/bin/env python3
"""Génère le hub FR /fr — la page la plus liée du silo français.

Les liens vers les 10 pages ville prioritaires (noyau SEO) sont injectés par
`scripts/ameliorer_pages_ville.py` et repris ici pour qu'une régénération du hub
ne fasse pas perdre ce maillage.

POURQUOI CE FICHIER EXISTE
--------------------------
Mesure du 19/09/2026 : `https://courtiark.fr/fr` renvoyait la coquille SPA
(4 809 octets, aucun H1, canonical de la page d'accueil) alors que 1 077 pages
`/fr/**` pointent vers elle et qu'aucune route React ne la gère : le hub du silo
français menait donc à un 404 côté client affiché en HTTP 200. Les six hubs
verticaux (`/fr/logiciel-courtier-{assurance,iard,emprunteur,sante,prevoyance,mutuelle}`)
et les dix guides existaient déjà : seul le point d'entrée manquait.

Le gabarit reprend celui de `scripts/generate_ch_money_pages.py`.
Aucune donnée inventée : ni avis, ni chiffre de client, ni métrique.

Usage : python3 scripts/generate_fr_hub.py
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ameliorer_pages_ville import bloc_villes_hub_fr  # noqa: E402  (noyau SEO)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "frontend", "public", "fr", "index.html")
SITE = "https://courtiark.fr"

VERTICAUX = [
    ("assurance", "Courtier d'assurance (multi-branches)",
     "Portefeuille, échéances, relances et conformité DDA dans un seul cockpit, quel que soit le panier de produits du cabinet."),
    ("iard", "Courtier IARD (dommages)",
     "Suivi des échéances de flottes, multirisques et décennales, avec les pièces manquantes signalées par dossier."),
    ("emprunteur", "Courtier en assurance emprunteur",
     "Dossiers de prêt, pièces à réunir, dates d'échéance et relances : la mécanique administrative d'un dossier emprunteur."),
    ("sante", "Courtier santé et complémentaire santé",
     "Renouvellements, contrats collectifs, adhésions et échéances des contrats santé du portefeuille."),
    ("prevoyance", "Courtier prévoyance",
     "Contrats de prévoyance et de protection juridique : couvertures absentes détectées, échéances préparées."),
    ("mutuelle", "Courtier mutualiste",
     "Adhérents, contrats collectifs et individuels : le suivi du portefeuille mutualiste sans ressaisie."),
]

GUIDES = [
    ("dda-15h", "La formation DDA de 15 heures"),
    ("devoir-de-conseil", "Le devoir de conseil"),
    ("verification-orias", "Vérifier une immatriculation ORIAS"),
    ("audit-acpr", "Audit ACPR : la check-list"),
    ("conformite-2026", "Conformité 2026"),
    ("ipid", "L'IPID"),
    ("lcb-ft", "LCB-FT"),
    ("rgpd-courtier", "RGPD et cabinets de courtage"),
    ("sanctions-acpr", "Sanctions ACPR"),
    ("reforme-courtage", "Réforme du courtage"),
]

ALTERNATIVES = [
    ("alternative-courtigo", "Alternative à Courtigo"),
    ("alternative-lya", "Alternative à LYA"),
    ("alternative-kase", "Alternative à Kase"),
    ("alternative-oggo-data", "Alternative à Oggo Data"),
]

STYLE = """  :root{--bg:#050510;--fg:#f6f7ff;--muted:#b9bdd4;--cyan:#8fe7ff;--pink:#ff7cc3;--line:rgba(255,255,255,.14)}
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--fg);font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif;line-height:1.65}
  a{color:var(--cyan)}
  header.top{padding:20px 24px;display:flex;gap:16px;align-items:center;flex-wrap:wrap;border-bottom:1px solid var(--line)}
  header.top a.brand{font-weight:800;letter-spacing:-.02em;color:var(--fg);text-decoration:none}
  main{max-width:920px;margin:0 auto;padding:32px 24px 72px}
  h1{font-size:clamp(1.85rem,4.6vw,2.85rem);line-height:1.07;letter-spacing:-.03em;margin:8px 0 16px}
  h2{margin-top:44px;font-size:clamp(1.2rem,2.5vw,1.6rem);letter-spacing:-.02em}
  h3{margin-top:24px;font-size:1.03rem}
  p,li{color:var(--muted)}
  strong{color:var(--fg)}
  .eyebrow{color:var(--cyan);text-transform:uppercase;letter-spacing:.14em;font-size:12px;font-weight:800}
  .lede{font-size:1.06rem}
  .card{border:1px solid var(--line);border-radius:18px;padding:20px 22px;background:rgba(255,255,255,.03);margin:18px 0}
  .grid{display:grid;gap:14px;grid-template-columns:repeat(auto-fit,minmax(250px,1fr))}
  .cta{display:inline-flex;align-items:center;gap:8px;margin:8px 12px 8px 0;padding:13px 22px;border-radius:999px;background:linear-gradient(135deg,#a9f1ff,#ff71bd);color:#060717;font-weight:800;letter-spacing:.02em;text-decoration:none}
  .cta.ghost{background:none;border:1px solid var(--line);color:var(--fg)}
  .note{font-size:.86rem;color:#8f93ad}
  nav.crumbs{font-size:.85rem;color:#8f93ad;padding-top:8px}
  ul.links{list-style:none;padding:0}
  ul.links li{padding:8px 0;border-bottom:1px solid var(--line)}
  ol.steps{padding-left:22px}
  footer{border-top:1px solid var(--line);padding:24px;font-size:.85rem;color:#8f93ad}
  footer a{margin-right:14px}"""


def render():
    verticaux = "\n".join(
        f'      <li><a href="/fr/logiciel-courtier-{slug}">{titre}</a> — {desc}</li>'
        for slug, titre, desc in VERTICAUX
    )
    guides = "\n".join(
        f'      <li><a href="/fr/guide/{slug}">{titre}</a></li>' for slug, titre in GUIDES
    )
    alternatives = "\n".join(
        f'      <li><a href="/fr/{slug}">{titre}</a></li>' for slug, titre in ALTERNATIVES
    )
    villes = bloc_villes_hub_fr()
    return f"""<!DOCTYPE html>
<html lang="fr-FR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Logiciel et CRM pour courtiers d'assurance en France — COURTIA</title>
<meta name="description" content="COURTIA est un cockpit pour cabinets de courtage en assurance exerçant en France : portefeuille, échéances, relances, devis, commissions et conformité (ORIAS, DDA, RGPD) dans un seul outil, avec l'assistance ARK. Le courtier garde la main sur chaque envoi.">
<link rel="canonical" href="{SITE}/fr">
<link rel="alternate" hreflang="fr-FR" href="{SITE}/fr">
<link rel="alternate" hreflang="fr-CH" href="{SITE}/ch">
<link rel="alternate" hreflang="x-default" href="{SITE}/">
<meta name="robots" content="index, follow, max-image-preview:large">
<meta name="theme-color" content="#050510">
<meta property="og:type" content="website">
<meta property="og:title" content="Logiciel et CRM pour courtiers d'assurance en France — COURTIA">
<meta property="og:description" content="Portefeuille, échéances, relances, devis, commissions et conformité dans un seul cockpit. Le courtier valide chaque action préparée par ARK.">
<meta property="og:url" content="{SITE}/fr">
<meta property="og:image" content="{SITE}/og-courtia.png">
<meta property="og:locale" content="fr_FR">
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">{{"@context":"https://schema.org","@type":"Organization","name":"COURTIA","url":"{SITE}","logo":"{SITE}/og-courtia.png","email":"contact@courtiark.fr"}}</script>
<script type="application/ld+json">{{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{{"@type":"ListItem","position":1,"name":"Accueil","item":"{SITE}/"}},{{"@type":"ListItem","position":2,"name":"France","item":"{SITE}/fr"}}]}}</script>
<script type="application/ld+json">{{"@context":"https://schema.org","@type":"SoftwareApplication","name":"COURTIA","applicationCategory":"BusinessApplication","operatingSystem":"Web (navigateur)","url":"{SITE}/fr","inLanguage":"fr-FR","description":"Cockpit de gestion pour cabinets de courtage en assurance en France : portefeuille, échéances, relances, devis, commissions, conformité DDA.","offers":{{"@type":"Offer","priceCurrency":"EUR","url":"{SITE}/tarifs","description":"Abonnement par cabinet ; tarifs publics sur {SITE}/tarifs."}}}}</script>
<script type="application/ld+json">{{"@context":"https://schema.org","@type":"FAQPage","mainEntity":[
{{"@type":"Question","name":"COURTIA est-il un logiciel de courtage pour la France ?","acceptedAnswer":{{"@type":"Answer","text":"Oui. COURTIA est un cockpit destiné aux cabinets de courtage en assurance exerçant en France, avec les éléments de conformité du marché français : immatriculation ORIAS du cabinet, devoir de conseil (DDA), information précontractuelle et RGPD."}}}},
{{"@type":"Question","name":"ARK envoie-t-il des messages aux clients à la place du courtier ?","acceptedAnswer":{{"@type":"Answer","text":"Non. ARK prépare, classe et propose. L'envoi d'un message, d'un devis ou d'une relance reste un acte du courtier, qui valide avant tout départ."}}}},
{{"@type":"Question","name":"Faut-il ressaisir un portefeuille existant ?","acceptedAnswer":{{"@type":"Answer","text":"Un portefeuille peut être importé depuis un fichier Excel ou CSV, avec contrôle des colonnes, détection des doublons et lignes rejetées signalées. Le résultat de l'import affiché est celui réellement renvoyé par le traitement."}}}}]}}</script>
<style>
{STYLE}
</style>
</head>
<body>
<header class="top">
  <a class="brand" href="{SITE}/">COURTIA</a>
  <a href="{SITE}/fonctionnalites">Fonctionnalités</a>
  <a href="{SITE}/tarifs">Tarifs</a>
  <a href="{SITE}/ch">Suisse</a>
  <a href="{SITE}/demo-public">Démo</a>
  <a href="{SITE}/contact">Contact</a>
</header>
<main>
  <nav class="crumbs"><a href="{SITE}/">Accueil</a> › France</nav>
  <span class="eyebrow">France</span>
  <h1>Logiciel et CRM pour courtiers d'assurance en France</h1>
  <p class="lede">COURTIA réunit ce qu'un cabinet de courtage manipule tous les jours : le portefeuille, les échéances, les relances, les devis, les commissions et la conformité. ARK, son assistant, prépare et classe — <strong>le courtier décide et valide</strong>.</p>

  <div class="card">
    <h2 style="margin-top:0">Ce que COURTIA n'est pas</h2>
    <ul>
      <li><strong>Ce n'est pas un logiciel de comptabilité.</strong> COURTIA suit la commission ; il ne produit ni bilan, ni décompte de TVA, ni écriture comptable.</li>
      <li><strong>Ce n'est pas un outil de prospection de masse.</strong> Aucun message ne part sans une validation du courtier.</li>
      <li><strong>Ce n'est pas une promesse de conformité garantie.</strong> COURTIA structure et trace le suivi DDA ; il ne remplace ni le conseil juridique, ni le contrôle de l'ACPR.</li>
    </ul>
  </div>

  <h2>Par métier</h2>
  <ul class="links">
{verticaux}
  </ul>

  <h2>Les guides</h2>
  <ul class="links">
{guides}
  </ul>

  <h2>Comparatifs</h2>
  <ul class="links">
{alternatives}
  </ul>

{villes}
  <h2>Par où commencer</h2>
  <ol class="steps">
    <li><a href="{SITE}/demo">Faire la visite guidée</a> : neuf chapitres, données synthétiques, sans inscription.</li>
    <li><a href="{SITE}/demo-public">Demander une démo</a> sur votre portefeuille réel.</li>
    <li><a href="{SITE}/tarifs">Voir les tarifs</a> et le mode d'accompagnement.</li>
  </ol>

  <h2>Questions fréquentes</h2>
  <h3>COURTIA est-il fait pour la France ?</h3>
  <p>Oui : le cabinet renseigne son immatriculation ORIAS, ses catégories d'assurance et ses informations précontractuelles. Le suivi du devoir de conseil et de sa traçabilité est prévu pour le cadre français.</p>
  <h3>ARK envoie-t-il à ma place ?</h3>
  <p>Non. ARK produit un ordre de priorité, des recommandations et des ébauches. L'envoi reste un acte du courtier.</p>
  <h3>Puis-je commencer avec un portefeuille existant ?</h3>
  <p>Oui : import Excel/CSV, contrôle des colonnes, doublons et lignes rejetées comptés puis affichés tels qu'ils ressortent du traitement.</p>

  <h2>Voir l'outil plutôt que le lire</h2>
  <p><a class="cta" href="{SITE}/demo">Lancer la visite guidée</a><a class="cta ghost" href="{SITE}/demo-public">Demander une démo</a></p>
  <p class="note">Cabinet fictif dans la visite guidée : données synthétiques, aucun client réel.</p>
</main>
<footer>
  <div>
    <a href="{SITE}/">Accueil</a>
    <a href="{SITE}/fonctionnalites">Fonctionnalités</a>
    <a href="{SITE}/tarifs">Tarifs</a>
    <a href="{SITE}/ch">Suisse</a>
    <a href="{SITE}/contact">Contact</a>
    <a href="{SITE}/legal/mentions-legales">Mentions légales</a>
    <a href="{SITE}/legal/confidentialite">Confidentialité</a>
  </div>
  <div>COURTIA — cockpit pour cabinets de courtage en assurance.</div>
</footer>
</body>
</html>
"""


def main():
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        f.write(render())
    print("écrit :", OUT, os.path.getsize(OUT), "octets")


if __name__ == "__main__":
    main()
