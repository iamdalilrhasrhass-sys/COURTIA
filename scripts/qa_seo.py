#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
qa_seo.py — CONTRÔLE QUALITÉ AUTOMATIQUE DES PAGES PUBLIÉES (règle 28 de la mission).

Pour chaque page indexable de frontend/public/{fr,ch} :
  HTTP (en option, sur la production) · TITLE · META DESCRIPTION · H1 · CANONICAL · INDEXABILITÉ ·
  SCHEMA JSON-LD · LIENS INTERNES (entrants/sortants) · MOTS · DUPLICATION (titres, descriptions, H1,
  paragraphes identiques entre pages) · LIENS INTERNES CASSÉS (cible absente des fichiers publiés) ·
  ALT DES IMAGES · LANGUE · PAYS (silo) · CTA.

Sorties :
  docs/seo/QA_PAGES.csv          — une ligne par page, tous les champs
  docs/seo/QA_LIENS_CASSES.csv   — liens internes sans cible publiée
  docs/seo/QA_DUPLICATIONS.csv   — titres, descriptions, H1 ou paragraphes dupliqués
  code de sortie 1 si au moins un défaut bloquant (lien cassé, canonical manquant, H1 absent ou multiple)

Usage : python3 scripts/qa_seo.py [--avec-http]
"""
import collections
import csv
import html
import os
import re
import sys
import urllib.error
import urllib.request

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC = os.path.join(BASE, "frontend", "public")
DOCS = os.path.join(BASE, "docs", "seo")
SITE = "https://courtiark.fr"

COLS = ["url", "silo", "lang", "mots", "title", "title_len", "meta_len", "h1_nb", "canonical",
        "canonical_correct", "indexable", "schema", "liens_sortants", "liens_entrants", "images",
        "images_sans_alt", "cta", "http", "verdict"]


def pages():
    trouve = {}
    for silo in ("fr", "ch"):
        for racine, _d, fichiers in os.walk(os.path.join(PUBLIC, silo)):
            if "index.html" not in fichiers:
                continue
            t = open(os.path.join(racine, "index.html"), encoding="utf-8").read()
            if "noindex" in t:
                continue
            rel = os.path.relpath(racine, PUBLIC).replace("\\", "/")
            trouve["/" + rel] = t
    return trouve


def texte(html_page):
    # On retire le châssis partagé (pied de page, navigation, bloc d'appel à l'action) : la duplication
    # d'un pied de page n'est pas un défaut de contenu, celle d'un paragraphe métier en est un.
    t = re.sub(r"<footer.*?</footer>", " ", html_page, flags=re.S)
    t = re.sub(r"<nav.*?</nav>", " ", t, flags=re.S)
    t = re.sub(r'<div class="cta".*?</div>', " ", t, flags=re.S)
    t = re.sub(r"<script.*?</script>|<style.*?</style>", "", t, flags=re.S)
    return html.unescape(re.sub(r"<[^>]+>", " ", t))


def main():
    avec_http = "--avec-http" in sys.argv
    os.makedirs(DOCS, exist_ok=True)
    P = pages()
    # index des cibles publiées (avec et sans slash final)
    cibles = set()
    for u in P:
        cibles.add(u)
        cibles.add(u + "/")
        cibles.add(u.rstrip("/"))
    cibles.update({"/fr", "/ch", "/", "/fr/", "/ch/"})

    lignes, casses, duplications = [], [], []
    titres, descs, h1s, paragraphes = collections.defaultdict(list), collections.defaultdict(list), \
        collections.defaultdict(list), collections.defaultdict(list)

    for url, t in sorted(P.items()):
        silo = url.split("/")[1]
        title = html.unescape((re.search(r"<title>([^<]*)</title>", t) or [None, ""])[1])
        meta = html.unescape((re.search(r'<meta name="description" content="([^"]*)"', t) or [None, ""])[1])
        h1 = re.findall(r"<h1[^>]*>(.*?)</h1>", t, re.S)
        canon = (re.search(r'<link rel="canonical" href="([^"]*)"', t) or [None, ""])[1]
        lang = (re.search(r'<html[^>]*lang="([^"]*)"', t) or [None, ""])[1]
        schema = sorted(set(re.findall(r'"@type"\s*:\s*"([^"]+)"', t)))
        liens = re.findall(r'href="(/[^"#?]*)"', t)
        liens_norm = {x.rstrip("/") or "/" for x in liens}
        imgs = re.findall(r"<img[^>]*>", t)
        sans_alt = [i for i in imgs if 'alt="' not in i or 'alt=""' in i]
        cta = ("/demo" in t) or ("essai" in t.lower()) or ('class="cta"' in t)
        mots = len(texte(t).split())
        txt = texte(t)
        for p in re.split(r"(?<=[.!?]) ", txt):
            p = p.strip()
            if len(p) > 80:
                paragraphes[p].append(url)
        titres[title].append(url)
        descs[meta].append(url)
        if h1:
            h1s[re.sub(r"<[^>]+>", "", h1[0]).strip()].append(url)

        for lien in liens_norm:
            if lien.startswith(("/fr", "/ch")) and lien not in cibles:
                casses.append({"source": url, "lien": lien})

        canon_attendu = SITE + (url if url != "/fr" and url != "/ch" else url)
        verdict = []
        if len(h1) != 1:
            verdict.append(f"H1={len(h1)}")
        if not canon:
            verdict.append("canonical absent")
        elif canon.rstrip("/") != canon_attendu.rstrip("/"):
            verdict.append(f"canonical={canon}")
        if not title:
            verdict.append("title absent")
        elif len(title) > 80:
            verdict.append(f"title {len(title)} car.")
        if not meta:
            verdict.append("meta absente")
        elif len(meta) > 175:
            verdict.append(f"meta {len(meta)} car.")
        if mots < 300:
            verdict.append(f"{mots} mots")
        if sans_alt:
            verdict.append(f"{len(sans_alt)} img sans alt")
        http = ""
        if avec_http:
            try:
                r = urllib.request.Request(SITE + url, headers={"User-Agent": "Googlebot/2.1"})
                with urllib.request.urlopen(r, timeout=30) as f:
                    http = str(f.status)
            except urllib.error.HTTPError as e:
                http = str(e.code)
            except Exception as e:
                http = "ERR:" + type(e).__name__
            if http != "200":
                verdict.append(f"http={http}")
        lignes.append({"url": url, "silo": silo, "lang": lang, "mots": mots, "title": title[:120],
                       "title_len": len(title), "meta_len": len(meta), "h1_nb": len(h1),
                       "canonical": canon, "canonical_correct": "oui" if canon.rstrip("/") == canon_attendu.rstrip("/") else "non",
                       "indexable": "oui", "schema": "|".join(schema), "liens_sortants": len(liens_norm),
                       "liens_entrants": 0, "images": len(imgs), "images_sans_alt": len(sans_alt),
                       "cta": "oui" if cta else "non", "http": http,
                       "verdict": "; ".join(verdict) if verdict else "OK"})

    # liens entrants
    compte = collections.Counter()
    for l in lignes:
        t = P[l["url"]]
        for x in {y.rstrip("/") or "/" for y in re.findall(r'href="(/[^"#?]*)"', t)}:
            compte[x] += 1
    for l in lignes:
        l["liens_entrants"] = compte.get(l["url"].rstrip("/"), 0)
        if l["liens_entrants"] == 0 and l["url"] not in ("/fr", "/ch"):
            l["verdict"] = (l["verdict"] + "; page orpheline") if l["verdict"] != "OK" else "page orpheline"

    for cle, urls in titres.items():
        if len(urls) > 1:
            duplications.append({"type": "title", "valeur": cle[:120], "pages": " ".join(urls)})
    for cle, urls in descs.items():
        if len(urls) > 1:
            duplications.append({"type": "meta description", "valeur": cle[:120], "pages": " ".join(urls)})
    for cle, urls in h1s.items():
        if len(urls) > 1:
            duplications.append({"type": "h1", "valeur": cle[:120], "pages": " ".join(urls)})
    for cle, urls in paragraphes.items():
        if len(urls) > 1:
            duplications.append({"type": "paragraphe", "valeur": cle[:120], "pages": " ".join(urls)})

    with open(os.path.join(DOCS, "QA_PAGES.csv"), "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=COLS)
        w.writeheader()
        w.writerows(lignes)
    with open(os.path.join(DOCS, "QA_LIENS_CASSES.csv"), "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["source", "lien"])
        w.writeheader()
        w.writerows(casses)
    with open(os.path.join(DOCS, "QA_DUPLICATIONS.csv"), "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["type", "valeur", "pages"])
        w.writeheader()
        w.writerows(duplications)

    defauts = [l for l in lignes if l["verdict"] != "OK"]
    print(f"pages indexables analysées : {len(lignes)}")
    print(f"pages conformes : {len(lignes) - len(defauts)} | avec remarque : {len(defauts)}")
    print(f"liens internes cassés : {len(casses)} | duplications : {len(duplications)}")
    if casses:
        for c in casses[:15]:
            print(f"   CASSE {c['source']} -> {c['lien']}")
    if duplications:
        for d in duplications[:8]:
            print(f"   DUPLIQUE [{d['type']}] {d['valeur'][:70]} -> {d['pages'][:90]}")
    for l in defauts[:15]:
        print(f"   A REVOIR {l['url']} : {l['verdict']}")
    bloquant = bool(casses) or any(
        ("H1=" in l["verdict"]) or ("canonical" in l["verdict"]) for l in lignes)
    return 1 if bloquant else 0


if __name__ == "__main__":
    sys.exit(main())
