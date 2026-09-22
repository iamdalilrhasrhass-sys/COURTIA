#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
appliquer_maillage_jev.py — APPLICATION DES LIENS INTERNES VALIDÉS PAR JEV.

Source de la décision : appel TypeSafe réel `maillage_et_titre` du 22/09/2026
(/root/ark/seo_jev/preuves/20260922T124630Z_maillage_et_titre.json, journal JEV_JOURNAL.csv).

POLITIQUE (dans le code, pas dans le modèle) : un lien n'est appliqué que si la confiance du jugement
est ≥ 0,70. Les trois liens de contrôle volontairement faibles avaient une confiance de 0,51 / 0,59 /
0,60 : ils sont REFUSÉS. Les liens de cluster réel ont été validés entre 0,70 et 0,85 : ils sont
appliqués. C'est ce seuil qui sépare les deux groupes.

Le script est idempotent : le bloc inséré porte un marqueur, une seconde exécution ne le duplique pas.
"""
import os
import sys

PUBLIC = "/srv/courtia/frontend/public"
MARQUEUR = "<!-- maillage:jev-20260922 -->"
ANCRE_INSERTION = '<p><a class="cta" href="https://courtiark.fr/demo">'
# Points d'insertion de repli, dans l'ordre : le bloc doit rester DANS <main>, avant le pied de page.
ANCRES_REPLI = ['<div class="cta">', '<p><a class="cta"', "</main>", "<footer"]

# (source, cible, ancre, phrase de contexte, confiance du jugement JEV)
LIENS = [
    ("ch/automatisation-courtier-assurance-suisse", "ch/crm-courtier-assurance-suisse",
     "le CRM courtier en Suisse",
     "Le dossier client est le point de départ : sans lui, rien de ce qui se déclenche ne peut être suivi.",
     0.75),
    ("ch/conformite-intermediaire-assurance-lsa-finma", "ch/logiciel-courtier-assurance-suisse",
     "le logiciel de courtage en Suisse",
     "Ce que le produit documente réellement dans le cadre suisse.", 0.83),
    ("ch/gestion-commissions-courtier-assurance-suisse", "ch/logiciel-courtier-assurance-suisse",
     "le logiciel de courtage en Suisse",
     "La vue d'ensemble du produit, dont les commissions font partie.", 0.81),
    ("ch/ia-courtier-assurance-suisse", "ch/automatisation-courtier-assurance-suisse",
     "l'automatisation en Suisse",
     "Ce qui se déclenche sans intervention, et ce qui reste à valider par le cabinet.", 0.70),
    ("ch/gestion-portefeuille-assurance-suisse", "ch/logiciel-courtier-assurance-suisse",
     "le logiciel de courtage en Suisse",
     "Le socle : dossier client, contrats, devis, documents.", 0.83),
    ("ch/logiciel-devis-courtier-assurance-suisse", "ch/logiciel-courtier-assurance-suisse",
     "le logiciel de courtage en Suisse",
     "Le parcours complet dans lequel s'inscrit le devis.", 0.83),
    ("ch/relances-courtier-assurance-suisse", "ch/automatisation-courtier-assurance-suisse",
     "l'automatisation en Suisse",
     "Les relances suivies font partie de ce qui peut être automatisé — et de ce qui doit rester validé.",
     0.72),
    ("ch/logiciel-prospection-courtier-assurance-suisse", "ch/logiciel-courtier-assurance-suisse",
     "le logiciel de courtage en Suisse",
     "La prospection se poursuit dans le même outil, une fois le prospect devenu client.", 0.85),
]

# Liens REFUSÉS par la politique de seuil — conservés ici comme trace de la décision, non appliqués.
REFUSES = [
    ("ch/tarifs-logiciel-courtier-chf", "ch/logiciel-prospection-courtier-assurance-suisse", 0.60),
    ("fr/comparateur-assurance-courtier", "fr/logiciel-courtier-iard", 0.51),
    ("fr/logiciel-courtier-tns", "fr/logiciel-devis-courtier-assurance", 0.59),
]


def bloc(paires):
    lignes = "\n".join(
        f'    <li><a href="/{cible}">{ancre}</a> — {contexte}</li>'
        for cible, ancre, contexte in paires)
    return (
        f"{MARQUEUR}\n"
        "  <section>\n"
        "    <h2>Pour aller plus loin</h2>\n"
        "    <ul>\n"
        f"{lignes}\n"
        "    </ul>\n"
        "  </section>\n\n"
    )


def main():
    assert all(c >= 0.70 for _s, _c, _a, _t, c in LIENS), "un lien sous le seuil ne doit pas être appliqué"
    fait, deja, manquants = [], [], []
    par_source = {}
    for src, cible, ancre, contexte, conf in LIENS:
        par_source.setdefault(src, []).append((cible, ancre, contexte))

    for src, paires in par_source.items():
        f = os.path.join(PUBLIC, src, "index.html")
        if not os.path.isfile(f):
            manquants.append(src)
            continue
        html = open(f, encoding="utf-8").read()
        if MARQUEUR in html:
            deja.append(src)
            continue
        ancre = next((a for a in [ANCRE_INSERTION] + ANCRES_REPLI if a in html), None)
        if ancre is None:
            manquants.append(src + " (point d'insertion introuvable)")
            continue
        html = html.replace(ancre, bloc(paires) + ancre, 1)
        open(f, "w", encoding="utf-8").write(html)
        fait.append(src)

    print(f"liens appliqués : {len(fait)} page(s) — seuil de confiance >= 0,70")
    for s in fait:
        print("   ", s)
    if deja:
        print("déjà présents (idempotence) :", ", ".join(deja))
    if manquants:
        print("PROBLÈME :", ", ".join(manquants))
    print(f"liens refusés par la politique : {len(REFUSES)} (confiance < 0,70)")
    for s, c, conf in REFUSES:
        print(f"    {s} -> {c} : confiance {conf}")
    return 1 if manquants else 0


if __name__ == "__main__":
    sys.exit(main())
