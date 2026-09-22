#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
seo_hygiene_pages_villes.py — ASSAINISSEMENT DES PAGES LOCALES + SITEMAPS.

CONTEXTE (mesuré le 22/09/2026)
-------------------------------
`frontend/public/fr/` contenait 1 085 pages locales (`logiciel-courtier-<métier>-<ville>`) bâties
sur le même gabarit : mêmes sections, même bloc de contenu partagé, seuls le nom de la ville et
quelques phrases changeaient (mesure : 18 % des phrases > 40 caractères identiques entre Paris et
Lyon). Ces pages n'ont pas de valeur propre suffisante pour justifier une URL : c'est le motif que
la stratégie éditoriale de COURTIA interdit (« aucune doorway page », « une page doit avoir une
raison indépendante d'exister »).

CE QUE FAIT CE SCRIPT
---------------------
1. `noindex, follow` sur les pages locales non retenues : elles sortent de l'index sans casser les
   liens existants ni renvoyer une erreur à un visiteur.
2. Restent indexables : les pages nationales/métier (sans suffixe de ville), les pages
   `alternative-*`, `guide`, les nouveaux piliers — et, pour la seule famille principale
   `logiciel-courtier-assurance-<ville>`, les 10 villes déjà déclarées dans `sitemap.xml`.
3. Régénère `sitemap-seo.xml` à partir des fichiers RÉELLEMENT indexables (aucune URL morte, aucune
   page en noindex) et complète `sitemap-ch.xml` avec les piliers suisses.

Idempotent : relancé, le script ne modifie plus rien.
"""

import os
import re
import sys

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC = os.path.join(BASE, "frontend", "public")
SITE = "https://courtiark.fr"
MAJ = "2026-09-22"

VILLES_RETENUES = [
    "paris", "lyon", "marseille", "bordeaux", "toulouse",
    "nantes", "lille", "strasbourg", "montpellier", "nice",
]

PILIERS_FR = [
    ("fr/crm-courtier-assurance", "0.9", "monthly"),
    ("fr/ia-courtier-assurance", "0.8", "monthly"),
    ("fr/automatisation-courtier-assurance", "0.8", "monthly"),
    ("fr/gagner-du-temps-courtier-assurance", "0.8", "monthly"),
]
PILIERS_CH = [
    ("ch/logiciel-courtier-assurance-suisse", "0.9", "monthly"),
    ("ch/automatisation-courtier-assurance-suisse", "0.8", "monthly"),
]

NOINDEX = '<meta name="robots" content="noindex, follow">'


def slugs_villes():
    """Villes réellement présentes sur le disque (déduites de la famille principale)."""
    d = os.path.join(PUBLIC, "fr")
    return {
        n.replace("logiciel-courtier-assurance-", "")
        for n in os.listdir(d)
        if n.startswith("logiciel-courtier-assurance-") and os.path.isdir(os.path.join(d, n))
    }


def classer(nom, villes):
    """('ville', ville) si le dossier est une page locale, sinon ('pilier', None)."""
    if nom in villes:
        return "ville", nom
    for v in villes:
        if nom.endswith("-" + v):
            return "ville", v
    return "pilier", None


def ville_retenue(nom, ville):
    return nom == f"logiciel-courtier-assurance-{ville}" and ville in VILLES_RETENUES


def appliquer_noindex():
    villes = slugs_villes()
    modifiees, deja = [], 0
    d = os.path.join(PUBLIC, "fr")
    for nom in sorted(os.listdir(d)):
        if not os.path.isdir(os.path.join(d, nom)):
            continue
        nature, ville = classer(nom, villes)
        if nature == "pilier" or ville_retenue(nom, ville):
            continue
        f = os.path.join(d, nom, "index.html")
        if not os.path.isfile(f):
            continue
        html = open(f, encoding="utf-8").read()
        if 'name="robots"' in html:
            nouveau = re.sub(r'<meta name="robots" content="[^"]*">', NOINDEX, html, count=1)
        else:
            nouveau = html.replace('<meta charset="UTF-8">', '<meta charset="UTF-8">\n' + NOINDEX, 1)
        if nouveau != html:
            open(f, "w", encoding="utf-8").write(nouveau)
            modifiees.append(nom)
        else:
            deja += 1
    return modifiees, deja


def est_indexable(f):
    return "noindex" not in open(f, encoding="utf-8").read()


def sitemap_seo():
    """Toutes les pages statiques de /fr réellement indexables (source de vérité = le fichier)."""
    urls = []
    d = os.path.join(PUBLIC, "fr")
    for nom in sorted(os.listdir(d)):
        chemin = os.path.join(d, nom)
        if nom == "index.html":
            urls.append((f"{SITE}/fr", "0.8", "weekly"))
            continue
        if not os.path.isdir(chemin):
            continue
        f = os.path.join(chemin, "index.html")
        if os.path.isfile(f) and est_indexable(f):
            urls.append((f"{SITE}/fr/{nom}",
                         "0.6" if nom.startswith("logiciel-courtier-assurance-") else "0.8", "monthly"))
        # sous-niveau : /fr/guide/<slug>
        for sous in sorted(os.listdir(chemin)):
            fs = os.path.join(chemin, sous, "index.html")
            if os.path.isdir(os.path.join(chemin, sous)) and os.path.isfile(fs) and est_indexable(fs):
                urls.append((f"{SITE}/fr/{nom}/{sous}", "0.7", "monthly"))
    for chemin, prio, freq in PILIERS_FR:
        urls.append((f"{SITE}/{chemin}", prio, freq))
    vus, uniques = set(), []
    for u, p, f in urls:
        if u not in vus:
            vus.add(u)
            uniques.append((u, p, f))
    return uniques


def ecrire_sitemap(fichier, urls, commentaire):
    corps = "\n".join(
        f'  <url><loc>{u}</loc><lastmod>{MAJ}</lastmod><changefreq>{f}</changefreq><priority>{p}</priority></url>'
        for u, p, f in urls
    )
    contenu = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        f"<!-- {commentaire}\n"
        f"     Généré par scripts/seo_hygiene_pages_villes.py le {MAJ}. -->\n"
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        f"{corps}\n</urlset>\n"
    )
    open(os.path.join(PUBLIC, fichier), "w", encoding="utf-8").write(contenu)
    return len(urls)


def sitemap_ch():
    """
    Toutes les pages statiques de /ch réellement indexables.

    Corrigé le 22/09/2026 : cette fonction ajoutait auparavant des entrées DÉCLARÉES dans une liste
    (PILIERS_CH), ce qui laissait hors du sitemap suisse toutes les pages créées ensuite (intermédiaire
    d'assurance, gestion de cabinet, documentaire, dépôt de pièces, import, pilotage, nLPD, sinistres,
    partenaires). La source de vérité est désormais le fichier, exactement comme pour la France.
    """
    urls = []
    d = os.path.join(PUBLIC, "ch")
    for nom in sorted(os.listdir(d)):
        chemin = os.path.join(d, nom)
        if nom == "index.html":
            urls.append((f"{SITE}/ch", "0.8", "weekly"))
            continue
        if not os.path.isdir(chemin):
            continue
        f = os.path.join(chemin, "index.html")
        if os.path.isfile(f) and est_indexable(f):
            urls.append((f"{SITE}/ch/{nom}", "0.8", "monthly"))
        for sous in sorted(os.listdir(chemin)):
            fs = os.path.join(chemin, sous, "index.html")
            if os.path.isdir(os.path.join(chemin, sous)) and os.path.isfile(fs) and est_indexable(fs):
                urls.append((f"{SITE}/ch/{nom}/{sous}", "0.7", "monthly"))
    vus, uniques = set(), []
    for u, p, fr in urls:
        if u not in vus:
            vus.add(u)
            uniques.append((u, p, fr))
    return uniques


def ecrire_sitemap_ch():
    urls = sitemap_ch()
    return ecrire_sitemap(
        "sitemap-ch.xml", urls,
        "Sitemap Suisse — pages statiques réellement présentes et indexables (source : les fichiers)")


def maj_sitemap_ch():
    f = os.path.join(PUBLIC, "sitemap-ch.xml")
    xml = open(f, encoding="utf-8").read()
    ajouts = []
    for chemin, prio, freq in PILIERS_CH:
        url = f"{SITE}/{chemin}"
        if url in xml:
            continue
        ajouts.append(
            f'  <url><loc>{url}</loc><lastmod>{MAJ}</lastmod><changefreq>{freq}</changefreq><priority>{prio}</priority></url>'
        )
    if ajouts:
        xml = xml.replace("</urlset>", "\n".join(ajouts) + "\n</urlset>")
        open(f, "w", encoding="utf-8").write(xml)
    return len(ajouts)


def nettoyer_blocs_villes():
    """
    Les 6 piliers nationaux portaient un bloc `seo-noyau:villes-prioritaires` qui listait les 179
    pages locales — désormais en noindex. Laisser ces 1 064 liens serait incohérent (une page ne
    peut pas annoncer « villes couvertes » en pointant vers des pages retirées de l'index) et
    gaspillerait du budget de crawl. Le bloc est donc réécrit : villes retenues uniquement, plus
    une phrase qui dit la réalité.
    """
    villes_liens = "\n".join(
        f'      <li><a href="/fr/logiciel-courtier-assurance-{v}">{v.capitalize().replace("-", " ")}</a></li>'
        for v in VILLES_RETENUES
    )
    nouveau = """<!-- seo-noyau:villes-prioritaires:start -->
  <section id="villes-prioritaires">
    <h2>Le courtage, ville par ville</h2>
    <p>COURTIA est un cockpit destiné aux cabinets de courtage en assurance exerçant en France
    entière, et non dans une ville en particulier. Le produit ne dépend pas de la localisation du
    cabinet : les pages ci-dessous sont les seules entrées locales conservées, parce qu'elles
    portent un contenu propre sur leur tissu de courtage.</p>
    <ul class="links">
{villes_liens}
    </ul>
    <p>Les autres entrées locales ont été retirées de l'index : un même gabarit décliné sur
    plusieurs centaines de villes n'apporte rien à un courtier et n'a pas sa place dans un moteur
    de recherche. La réponse utile à la question « quel outil pour mon cabinet » se trouve dans la
    page nationale.</p>
  </section>
<!-- seo-noyau:villes-prioritaires:end -->""".replace("{villes_liens}", villes_liens)
    remplaces = []
    d = os.path.join(PUBLIC, "fr")
    for nom in sorted(os.listdir(d)):
        f = os.path.join(d, nom, "index.html")
        if not os.path.isfile(f) or not est_indexable(f):
            continue
        html = open(f, encoding="utf-8").read()
        if "seo-noyau:villes-prioritaires" not in html:
            continue
        nouveau_html = re.sub(
            r"<!-- seo-noyau:villes-prioritaires:start -->.*?<!-- seo-noyau:villes-prioritaires:end -->",
            lambda _m: nouveau, html, count=1, flags=re.S)
        if nouveau_html != html:
            open(f, "w", encoding="utf-8").write(nouveau_html)
            remplaces.append(nom)
    return remplaces


def nettoyer_sections_villes():
    """
    Les mêmes piliers portaient une SECONDE liste de villes (`<section id="villes">`, « Villes
    couvertes par cette page », « COURTIA accompagne les courtiers de N villes sur ce segment »).
    Elle aussi pointait vers des pages désormais en noindex et annonçait une couverture qui n'existe
    plus dans l'index : elle est remplacée par une réponse honnête, avec les liens qui comptent.
    """
    remplacement = """<section id="villes">
      <h2>Faut-il une page par ville pour couvrir la France ?</h2>
      <p>Non, et COURTIA n'en publie plus. Un cabinet exerce en France entière : la réponse utile à
      sa question est nationale, et le même texte décliné sur des centaines de villes n'apporte rien
      au courtier qui le lit. Les seules entrées locales conservées sont celles qui portent un
      contenu propre sur leur tissu de courtage ; elles figurent dans la section suivante.</p>
      <p>Pour aller à l'essentiel : <a href="/fr/logiciel-courtier-assurance">le logiciel de courtage</a>
      pour comparer les offres, <a href="/fr/crm-courtier-assurance">le CRM courtier assurance</a>
      pour le suivi client, <a href="/fr/automatisation-courtier-assurance">l'automatisation du cabinet</a>
      pour le travail répétitif — et l'<a href="/ch">univers suisse</a> pour un cabinet en Suisse.</p>
    </section>"""
    modifiees = []
    d = os.path.join(PUBLIC, "fr")
    for nom in sorted(os.listdir(d)):
        f = os.path.join(d, nom, "index.html")
        if not os.path.isfile(f) or not est_indexable(f):
            continue
        html = open(f, encoding="utf-8").read()
        if '<section id="villes">' not in html:
            continue
        nouveau = re.sub(r'<section id="villes">.*?</section>', lambda _m: remplacement, html,
                         count=1, flags=re.S)
        if nouveau != html:
            open(f, "w", encoding="utf-8").write(nouveau)
            modifiees.append(nom)
    return modifiees


def main():
    modifiees, deja = appliquer_noindex()
    print(f"noindex appliqué : {len(modifiees)} page(s) locale(s) | déjà conformes : {deja}")

    sections = nettoyer_sections_villes()
    print(f"sections « villes couvertes » réécrites : {len(sections)} page(s) -> {', '.join(sections)}")

    blocs = nettoyer_blocs_villes()
    print(f"blocs « villes prioritaires » réécrits : {len(blocs)} page(s) nationale(s) -> {', '.join(blocs)}")

    urls = sitemap_seo()
    n = ecrire_sitemap(
        "sitemap-seo.xml", urls,
        "Pages statiques INDEXABLES de /fr : piliers, pages métier, alternatives, guide et les\n"
        "     10 villes retenues. Les ~1 075 autres pages locales sont en noindex et NE figurent PLUS ici :\n"
        "     elles partageaient un bloc de contenu commun et n'avaient pas de valeur propre suffisante.",
    )
    print(f"sitemap-seo.xml : {n} URL indexables déclarées")
    print(f"sitemap-ch.xml : {ecrire_sitemap_ch()} URL suisse(s) (régénéré depuis les fichiers)")

    mortes = []
    for sm in ("sitemap.xml", "sitemap-seo.xml", "sitemap-ch.xml"):
        xml = open(os.path.join(PUBLIC, sm), encoding="utf-8").read()
        for u in re.findall(r"<loc>([^<]+)</loc>", xml):
            chemin = u.replace(SITE, "").strip("/")
            if not chemin:
                continue
            cible = os.path.join(PUBLIC, chemin, "index.html")
            if os.path.isfile(cible) or os.path.isfile(os.path.join(PUBLIC, chemin)):
                continue
            if chemin.startswith(("fr/", "ch/", "landing/")):
                mortes.append((sm, u))
    print(f"contrôle URL mortes : {len(mortes)} URL statique(s) manquante(s)")
    for sm, u in mortes:
        print("  MANQUANT :", u)
    return 0


if __name__ == "__main__":
    sys.exit(main())
