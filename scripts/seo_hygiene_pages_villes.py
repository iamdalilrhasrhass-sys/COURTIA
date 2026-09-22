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


def main():
    modifiees, deja = appliquer_noindex()
    print(f"noindex appliqué : {len(modifiees)} page(s) locale(s) | déjà conformes : {deja}")

    urls = sitemap_seo()
    n = ecrire_sitemap(
        "sitemap-seo.xml", urls,
        "Pages statiques INDEXABLES de /fr : piliers, pages métier, alternatives, guide et les\n"
        "     10 villes retenues. Les ~1 075 autres pages locales sont en noindex et NE figurent PLUS ici :\n"
        "     elles partageaient un bloc de contenu commun et n'avaient pas de valeur propre suffisante.",
    )
    print(f"sitemap-seo.xml : {n} URL indexables déclarées")
    print(f"sitemap-ch.xml : {maj_sitemap_ch()} URL suisse(s) ajoutée(s)")

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
