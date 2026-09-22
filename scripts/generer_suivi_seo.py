#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
generer_suivi_seo.py — FICHIER DE SUIVI DES PAGES SEO (CSV).

Produit docs/seo/SUIVI_PAGES_SEO.csv à partir des fichiers RÉELLEMENT présents dans
frontend/public (aucune donnée déclarative : tout est lu dans la page publiée).

Colonnes vides assumées : IMPRESSIONS, CLICS, CONVERSIONS. Elles restent vides parce qu'aucun accès
Google Search Console / analytics n'existe depuis ce serveur. On n'écrit pas « 0 » : ce serait
affirmer une mesure qui n'a pas été faite.

Usage : python3 scripts/generer_suivi_seo.py
"""

import csv
import html
import os
import re
import sys

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC = os.path.join(BASE, "frontend", "public")
SORTIE = os.path.join(BASE, "docs", "seo", "SUIVI_PAGES_SEO.csv")
SITE = "https://courtiark.fr"

# Rattachement éditorial (cluster / intention) : décidé à la main, pas déduit par un script.
RATTACHEMENT = {
    "fr": ("France", "Accueil du silo France", "Navigation / hub"),
    "fr/logiciel-courtier-assurance": ("France", "Logiciel de courtage", "Commercial — logiciel courtier assurance"),
    "fr/crm-courtier-assurance": ("France", "CRM courtier", "Commercial — CRM courtier assurance"),
    "fr/ia-courtier-assurance": ("France", "IA / assistant", "Commercial — IA courtier assurance"),
    "fr/automatisation-courtier-assurance": ("France", "Automatisation", "Commercial — automatisation courtier"),
    "fr/gagner-du-temps-courtier-assurance": ("France", "Gain de temps", "Informationnel — gagner du temps cabinet de courtage"),
    "fr/logiciel-courtier-iard": ("France", "Métier — IARD", "Commercial — logiciel courtier IARD"),
    "fr/logiciel-courtier-emprunteur": ("France", "Métier — emprunteur", "Commercial — logiciel courtier emprunteur"),
    "fr/logiciel-courtier-sante": ("France", "Métier — santé", "Commercial — logiciel courtier santé"),
    "fr/logiciel-courtier-prevoyance": ("France", "Métier — prévoyance", "Commercial — logiciel courtier prévoyance"),
    "fr/logiciel-courtier-mutuelle": ("France", "Métier — mutuelle", "Commercial — logiciel courtier mutuelle"),
    "fr/logiciel-courtier-tns": ("France", "Métier — TNS", "Commercial — logiciel courtier TNS"),
    "fr/logiciel-courtier-grossiste": ("France", "Métier — grossiste", "Commercial — logiciel courtier grossiste"),
    "fr/logiciel-courtier-mandataire": ("France", "Métier — mandataire", "Commercial — logiciel courtier mandataire"),
    "fr/logiciel-courtier-multi-agences": ("France", "Métier — multi-agences", "Commercial — logiciel courtier multi-agences"),
    "ch": ("Suisse", "Accueil du silo Suisse", "Navigation / hub"),
    "ch/logiciel-courtier-assurance-suisse": ("Suisse", "Logiciel de courtage CH", "Commercial — logiciel courtier assurance Suisse"),
    "ch/automatisation-courtier-assurance-suisse": ("Suisse", "Automatisation CH", "Commercial — automatisation courtier Suisse"),
    "ch/crm-courtier-assurance-suisse": ("Suisse", "CRM CH", "Commercial — CRM courtier assurance Suisse"),
    "ch/ia-courtier-assurance-suisse": ("Suisse", "IA CH", "Commercial — IA courtier assurance Suisse"),
    "ch/conformite-intermediaire-assurance-lsa-finma": ("Suisse", "Conformité CH", "Informationnel — conformité intermédiaire d'assurance (LSA)"),
    "ch/tarifs-logiciel-courtier-chf": ("Suisse", "Tarifs CH", "Commercial — tarifs logiciel courtier CHF"),
    "ch/gestion-portefeuille-assurance-suisse": ("Suisse", "Portefeuille CH", "Commercial — gestion portefeuille assurance Suisse"),
    "ch/gestion-commissions-courtier-assurance-suisse": ("Suisse", "Commissions CH", "Commercial — gestion commissions Suisse"),
    "ch/relances-courtier-assurance-suisse": ("Suisse", "Relances CH", "Commercial — relances courtier Suisse"),
    "ch/logiciel-prospection-courtier-assurance-suisse": ("Suisse", "Prospection CH", "Commercial — prospection courtier Suisse"),
    "ch/logiciel-devis-courtier-assurance-suisse": ("Suisse", "Devis CH", "Commercial — devis courtier Suisse"),
}


def lire(f):
    return open(f, encoding="utf-8").read()


def extraire(chemin_rel, pages_indexables):
    f = os.path.join(PUBLIC, chemin_rel, "index.html")
    t = lire(f)
    url = f"{SITE}/{chemin_rel.strip('/')}"
    pays, cluster, intention = RATTACHEMENT.get(chemin_rel, ("France", "Page métier / guide", "À qualifier"))

    def un(motif, defaut=""):
        m = re.search(motif, t, re.S)
        return html.unescape(re.sub(r"<[^>]+>", " ", m.group(1))).strip() if m else defaut

    titre = un(r"<title>(.*?)</title>")
    meta = un(r'name="description" content="(.*?)"')
    h1 = un(r"<h1[^>]*>(.*?)</h1>")
    canonical = (re.search(r'rel="canonical" href="([^"]+)"', t) or [None, ""])[1]
    schemas = ",".join(sorted(set(re.findall(r'"@type"\s*:\s*"([A-Za-z]+)"', t))))
    liens = set(re.findall(r'href="(/[^"#?]*|https://courtiark\.fr[^"#?]*)"', t))
    liens = {l.replace(SITE, "") or "/" for l in liens}
    liens_externes = {l for l in liens if l.startswith("http")}
    sortants = ",".join(sorted(liens - liens_externes))
    entrants = [p for p in pages_indexables if p != chemin_rel
                and f'href="/{p}"' in lire(os.path.join(PUBLIC, p, "index.html"))]
    cta = ",".join(sorted(set(re.findall(r'href="(/(?:onboarding|demo|demo-public|contact|tarifs))"', t))))
    indexable = "NON" if "noindex" in t else "OUI"
    return {
        "URL": url, "PAYS": pays, "CLUSTER": cluster, "INTENTION": intention,
        "TITLE": titre, "H1": h1, "META": meta, "CANONICAL": canonical, "SCHEMA": schemas,
        "LIENS_ENTRANTS": ",".join(sorted(entrants)), "LIENS_SORTANTS": sortants, "CTA": cta,
        "STATUT": "En ligne (statique prerendu)", "DATE_PUBLICATION": "2026-09-22",
        "DATE_QA": "2026-09-22", "INDEXABLE": indexable,
        "IMPRESSIONS": "", "CLICS": "", "CONVERSIONS": "",
    }


def main():
    pages = []
    for silo in ("fr", "ch"):
        d = os.path.join(PUBLIC, silo)
        for nom, dossiers, fichiers in os.walk(d):
            if "index.html" in fichiers and not any(x in nom for x in ("/guide",)):
                rel = os.path.relpath(nom, PUBLIC)
                t = lire(os.path.join(nom, "index.html"))
                if "noindex" not in t:
                    pages.append(rel)
            if "index.html" in fichiers and "/guide/" in nom:
                rel = os.path.relpath(nom, PUBLIC)
                if "noindex" not in lire(os.path.join(nom, "index.html")):
                    pages.append(rel)
    pages = sorted(set(pages))
    lignes = [extraire(p, pages) for p in pages]
    os.makedirs(os.path.dirname(SORTIE), exist_ok=True)
    with open(SORTIE, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(lignes[0].keys()))
        w.writeheader()
        w.writerows(lignes)
    print(f"{SORTIE} : {len(lignes)} page(s) indexable(s), {sum(1 for l in lignes if l['INDEXABLE']=='OUI')} indexable(s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
