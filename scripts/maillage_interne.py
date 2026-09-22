#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
maillage_interne.py — GRAPHE DE MAILLAGE INTERNE DU SILO PUBLIC COURTIA.

Produit, à partir des fichiers RÉELLEMENT publiés (jamais d'une liste déclarative) :
  - docs/seo/MAILLAGE_INTERNE.csv : pour chaque URL indexable, son parent, ses enfants, ses
    voisins de cluster, les liens DÉJÀ présents, et les liens PROPOSÉS (absents aujourd'hui) ;
  - docs/seo/MAILLAGE_PROPOSITIONS.txt : la liste courte des liens proposés, prête à être soumise au
    jugement TypeSafe/JEV avant application.

Règle de construction (volontairement simple et vérifiable) :
  parent   = pilier du cluster (ex. /fr/crm-courtier-assurance pour le cluster « crm »)
  enfants  = pages du cluster rattachées à ce pilier
  voisins  = autres pages du même cluster
  ancres   = libellés déjà utilisés dans les pages (pour varier les ancres, jamais la même partout)
"""
import csv
import html
import os
import re
import sys

PUBLIC = "/srv/courtia/frontend/public"
SITE = "https://courtiark.fr"
SORTIE = "/srv/courtia/docs/seo"

CLUSTERS = {
    "logiciel": {
        "parent": "fr/logiciel-courtier-assurance",
        "pages": ["fr/logiciel-devis-courtier-assurance", "fr/logiciel-gestion-cabinet-courtage",
                  "fr/gestion-portefeuille-courtier", "fr/comparateur-assurance-courtier",
                  "fr/logiciel-courtier-multi-agences"],
    },
    "relation_client": {
        "parent": "fr/crm-courtier-assurance",
        "pages": ["fr/relance-client-assurance", "fr/logiciel-courtier-assurance"],
    },
    "productivite": {
        "parent": "fr/gagner-du-temps-courtier-assurance",
        "pages": ["fr/mesurer-temps-administratif-cabinet", "fr/automatisation-courtier-assurance",
                  "fr/ia-courtier-assurance"],
    },
    "metier": {
        "parent": "fr/logiciel-courtier-assurance",
        "pages": ["fr/logiciel-courtier-iard", "fr/logiciel-courtier-sante",
                  "fr/logiciel-courtier-prevoyance", "fr/logiciel-courtier-emprunteur",
                  "fr/logiciel-courtier-mutuelle", "fr/logiciel-courtier-tns",
                  "fr/logiciel-courtier-grossiste", "fr/logiciel-courtier-mandataire"],
    },
    "suisse": {
        "parent": "ch",
        "pages": ["ch/logiciel-courtier-assurance-suisse", "ch/crm-courtier-assurance-suisse",
                  "ch/automatisation-courtier-assurance-suisse", "ch/gestion-portefeuille-assurance-suisse",
                  "ch/gestion-commissions-courtier-assurance-suisse",
                  "ch/relances-courtier-assurance-suisse",
                  "ch/logiciel-prospection-courtier-assurance-suisse",
                  "ch/logiciel-devis-courtier-assurance-suisse", "ch/ia-courtier-assurance-suisse",
                  "ch/conformite-intermediaire-assurance-lsa-finma", "ch/tarifs-logiciel-courtier-chf"],
    },
}

LIBELLES = {
    "fr/logiciel-courtier-assurance": "le logiciel de courtage",
    "fr/crm-courtier-assurance": "le CRM courtier assurance",
    "fr/relance-client-assurance": "les relances clients",
    "fr/gagner-du-temps-courtier-assurance": "où le temps se perd au cabinet",
    "fr/mesurer-temps-administratif-cabinet": "mesurer son temps administratif",
    "fr/automatisation-courtier-assurance": "l'automatisation du cabinet",
    "fr/ia-courtier-assurance": "l'IA pour courtier",
    "fr/logiciel-devis-courtier-assurance": "produire et suivre les devis",
    "fr/logiciel-gestion-cabinet-courtage": "la gestion de cabinet",
    "fr/gestion-portefeuille-courtier": "la gestion de portefeuille",
    "fr/comparateur-assurance-courtier": "comparer des propositions",
    "fr/logiciel-courtier-multi-agences": "le pilotage multi-agences",
    "ch": "l'univers suisse",
    "ch/logiciel-courtier-assurance-suisse": "le logiciel de courtage en Suisse",
    "ch/crm-courtier-assurance-suisse": "le CRM courtier en Suisse",
    "ch/automatisation-courtier-assurance-suisse": "l'automatisation en Suisse",
    "ch/gestion-portefeuille-assurance-suisse": "la gestion de portefeuille en Suisse",
    "ch/gestion-commissions-courtier-assurance-suisse": "les commissions en Suisse",
    "ch/relances-courtier-assurance-suisse": "les relances en Suisse",
    "ch/logiciel-devis-courtier-assurance-suisse": "les devis en Suisse",
    "ch/ia-courtier-assurance-suisse": "l'IA en Suisse",
    "ch/conformite-intermediaire-assurance-lsa-finma": "le cadre suisse de conformité",
    "ch/tarifs-logiciel-courtier-chf": "les tarifs en CHF",
}


def indexables():
    out = []
    for silo in ("fr", "ch"):
        for racine, _d, fichiers in os.walk(os.path.join(PUBLIC, silo)):
            if "index.html" in fichiers:
                if "noindex" in open(os.path.join(racine, "index.html"), encoding="utf-8").read():
                    continue
                out.append(os.path.relpath(racine, PUBLIC))
    return sorted(out)


def liens_presents(chemin):
    t = open(os.path.join(PUBLIC, chemin, "index.html"), encoding="utf-8").read()
    return sorted({l.strip("/") for l in re.findall(r'href="/([^"#?]*)"', t)})


def main():
    pages = indexables()
    os.makedirs(SORTIE, exist_ok=True)
    lignes, propositions = [], []

    for chemin in pages:
        cluster = next((c for c, d in CLUSTERS.items()
                        if chemin in ([d["parent"]] + d["pages"])), None)
        if cluster is None:
            continue
        d = CLUSTERS[cluster]
        parent = d["parent"] if chemin != d["parent"] else None
        enfants = [p for p in d["pages"] if p != chemin and (parent is None or p != chemin)]
        voisins = [p for p in ([d["parent"]] + d["pages"]) if p != chemin and p not in enfants]
        presents = liens_presents(chemin)
        proposes = []
        for cible in ([parent] if parent else []) + enfants[:3] + voisins[:2]:
            if cible and cible not in presents:
                proposes.append(cible)
        lignes.append({
            "URL": f"{SITE}/{chemin}", "CLUSTER": cluster,
            "PARENT": f"{SITE}/{parent}" if parent else "",
            "ENFANTS": " ".join(f"{SITE}/{p}" for p in enfants[:6]),
            "VOISINS": " ".join(f"{SITE}/{p}" for p in voisins[:6]),
            "LIENS_PRESENTS": len(presents),
            "LIENS_PROPOSES": " ".join(f"{SITE}/{p}" for p in proposes),
        })
        for p in proposes:
            propositions.append((chemin, p, LIBELLES.get(p, p)))

    with open(os.path.join(SORTIE, "MAILLAGE_INTERNE.csv"), "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(lignes[0].keys()))
        w.writeheader()
        w.writerows(lignes)

    with open(os.path.join(SORTIE, "MAILLAGE_PROPOSITIONS.txt"), "w", encoding="utf-8") as f:
        f.write("Liens internes PROPOSÉS (absents aujourd'hui), à soumettre au jugement JEV\n")
        f.write("avant application. Format : source -> cible | ancre prévue\n\n")
        for src, dst, libelle in propositions:
            f.write(f"/{src} -> /{dst} | {libelle}\n")

    print(f"{len(lignes)} page(s) dans le graphe, {len(propositions)} lien(s) proposé(s)")
    print(f"écrits : {SORTIE}/MAILLAGE_INTERNE.csv et MAILLAGE_PROPOSITIONS.txt")
    return 0


if __name__ == "__main__":
    sys.exit(main())
