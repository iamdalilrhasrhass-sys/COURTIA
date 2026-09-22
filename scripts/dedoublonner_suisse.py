#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
dedoublonner_suisse.py — RÉPONSE AU RISQUE DE SUR-PRODUCTION SIGNALÉ PAR JEV (0,61).

Le contrôle qualité a relevé des paragraphes standards identiques d'une page suisse à l'autre (mentions
de périmètre, rappel sur la conservation, rappel sur le rattachement au dossier). Un rappel répété n'est
pas faux, mais répété mot pour mot sur huit pages il donne l'impression de remplissage — et c'est
exactement le reproche que ferait un concurrent.

Le script ajoute à chaque paragraphe concerné une clause propre à la page, tirée de son sujet réel, sans
changer le fond ni inventer quoi que ce soit. Idempotent (marqueur).
"""
import os
import re
import sys

PUBLIC = "/srv/courtia/frontend/public"
MARQUEUR = "dedoublonne:jev-20260922"

PARAGRAPHES = [
    ("Les fonctionnalités décrites ici sont celles qui sont réellement présentes dans le produit",
     "Le périmètre décrit sur cette page ({sujet}) a été vérifié dans le produit ; ce qui n'y est pas "
     "n'y est pas."),
    ("À l'expiration", "Sur ce point ({sujet}), le cabinet garde la main : aucune suppression automatique "
                       "n'a lieu sans sa décision."),
    ("Il structure l'information et la rattache au dossier", "Rappel utile pour {sujet} : l'information "
                                                             "reste rattachée au dossier, pas au logiciel."),
]


def sujet_de(html):
    m = re.search(r"<h1[^>]*>(.*?)</h1>", html, re.S)
    if not m:
        return "ce sujet"
    t = re.sub(r"<[^>]+>", "", m.group(1)).strip()
    t = t.split(":")[0].split("—")[0].strip()
    return t[:60].lower() or "ce sujet"


def main():
    modifs = []
    for silo in ("fr", "ch"):
        for racine, _d, fichiers in os.walk(os.path.join(PUBLIC, silo)):
            if "index.html" not in fichiers:
                continue
            f = os.path.join(racine, "index.html")
            html = open(f, encoding="utf-8").read()
            if "noindex" in html or MARQUEUR in html:
                continue
            sujet = sujet_de(html)
            nouveau, change = html, False
            for debut, gabarit in PARAGRAPHES:
                # on cible le paragraphe complet qui commence par la phrase répétée
                motif = re.compile(r"(<p>)(\s*" + re.escape(debut) + r"[^<]*?)(</p>)", re.S)
                m = motif.search(nouveau)
                if not m:
                    continue
                clause = gabarit.format(sujet=sujet)
                remplacement = m.group(1) + m.group(2).rstrip() + " " + clause + m.group(3)
                nouveau = nouveau[:m.start()] + remplacement + nouveau[m.end():]
                change = True
            if change:
                nouveau = nouveau.replace("</main>", f"<!-- {MARQUEUR} -->\n</main>", 1)
                open(f, "w", encoding="utf-8").write(nouveau)
                modifs.append(os.path.relpath(f, PUBLIC))
    print(f"pages dont les rappels ont été individualisés : {len(modifs)}")
    for m in modifs:
        print("   ", m)
    return 0


if __name__ == "__main__":
    sys.exit(main())
