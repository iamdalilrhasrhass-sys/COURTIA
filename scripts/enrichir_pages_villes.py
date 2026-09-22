#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
enrichir_pages_villes.py — DONNÉES RÉELLES SUR LES DIX PAGES LOCALES CONSERVÉES.

Pourquoi : la revue TypeSafe/JEV a signalé que ces dix pages gardaient un gabarit proche des pages
locales supprimées (risque de production en série, 0,71). Les supprimer ferait perdre des entrées
réelles ; les laisser en gabarit entretient le risque. La réponse est de leur donner, à chacune, une
DONNÉE PROPRE, vérifiable et datée :

  - nombre d'établissements de courtage et d'agents d'assurance (code d'activité 66.22Z) dans la
    commune, dans son département et dans sa région — base SIRENE / DINUM, extraction du 19/09/2026 ;
  - population communale (INSEE, même extraction) ;
  - densité calculée : établissements pour 10 000 habitants — présentée comme un indicateur
    administratif, jamais comme une mesure de concurrence.

Aucun chiffre n'est écrit dans ce script : tout est lu dans les fichiers sources. Le script est
idempotent (marqueur) et n'insère rien deux fois.
"""
import json
import os
import sys

PUBLIC = "/srv/courtia/frontend/public"
SOURCES = "/root/ark/business/_mesures"
MARQUEUR = "<!-- villes-donnees:jev-20260922 -->"
ANCRES = ['<div class="cta">', '<p><a class="cta"', "</main>", "<footer"]

VILLES = {
    "paris": "Paris", "lyon": "Lyon", "marseille": "Marseille", "bordeaux": "Bordeaux",
    "toulouse": "Toulouse", "nantes": "Nantes", "lille": "Lille", "strasbourg": "Strasbourg",
    "montpellier": "Montpellier", "nice": "Nice",
}


def donnees():
    dens = json.load(open(os.path.join(SOURCES, "densite_courtiers_fr.json"), encoding="utf-8"))
    insee = json.load(open(os.path.join(SOURCES, "insee.json"), encoding="utf-8"))
    return dens["communes"], dens["departements"], dens["regions"], insee


def nombre(valeur):
    """Formatage français d'un entier, avec espace insécable fine comme séparateur de milliers."""
    return f"{valeur:,}".replace(",", "\u202f")


def bloc(ville, communes, departements, regions, insee):
    i = insee[ville]
    etab = communes[ville]
    dep_code = i["departement"]["code"]
    dep_nom = i["departement"]["nom"]
    reg_nom = i["region"]["nom"]
    etab_dep = departements.get(dep_code)
    pop = i["population"]
    ratio = round(etab / (pop / 10000), 1)
    nom = VILLES[ville]
    return f"""
  <section>
    <h2>Le courtage à {nom} : ce que disent les données publiques</h2>
    <ul>
      <li><strong>{nombre(etab)}</strong> établissements de courtage et d'agents d'assurance (code
      d'activité 66.22Z) sont recensés dans la commune de {nom}.</li>
      <li>Le département ({dep_nom}) en compte <strong>{nombre(etab_dep)}</strong>.</li>
      <li>Pour une population communale de <strong>{nombre(pop)}</strong> habitants, cela représente un
      ordre de grandeur de <strong>{str(ratio).replace(".", ",")}</strong> établissements pour
      10 000 habitants.</li>
      <li>Région : <strong>{reg_nom}</strong>.</li>
    </ul>
    <p><strong>Source :</strong> base SIRENE diffusée par la DINUM, code d'activité NAF 66.22Z,
    extraction du 19 septembre 2026 ; population INSEE, même extraction. Comptages publiés tels quels
    sur <a href="/fr/cartographie-courtiers-assurance-france">la cartographie des courtiers en
    France</a>.</p>
    <p><strong>Comment lire ces chiffres :</strong> un <em>établissement</em> est un lieu d'activité,
    pas une entreprise (une structure avec trois implantations compte trois fois), et le fichier ne
    dit pas combien de personnes y travaillent. La densité mesure une présence administrative, pas
    une concurrence : deux cabinets de la même ville peuvent viser des clients très différents.</p>
    <p><strong>Ce que cela ne change pas :</strong> COURTIA sert un cabinet quel que soit le nombre de
    confrères autour. Le produit ne s'adapte pas à la densité locale — il tient le dossier client, les
    échéances, les pièces, les devis et les commissions, à {nom} comme ailleurs.</p>
  </section>
"""


def main():
    if not os.path.isdir(SOURCES):
        print("sources absentes :", SOURCES)
        return 1
    communes, departements, regions, insee = donnees()
    poses, problemes = [], []
    for ville in VILLES:
        if ville not in communes or ville not in insee:
            problemes.append(f"donnée manquante pour {ville}")
            continue
        chemin = f"fr/logiciel-courtier-assurance-{ville}"
        f = os.path.join(PUBLIC, chemin, "index.html")
        if not os.path.isfile(f):
            problemes.append(f"page absente : {chemin}")
            continue
        html = open(f, encoding="utf-8").read()
        if MARQUEUR in html:
            continue
        ancre = next((a for a in ANCRES if a in html), None)
        if ancre is None:
            problemes.append(f"point d'insertion introuvable : {chemin}")
            continue
        html = html.replace(ancre, MARQUEUR + bloc(ville, communes, departements, regions, insee) + ancre, 1)
        open(f, "w", encoding="utf-8").write(html)
        poses.append(chemin)
    print(f"pages locales enrichies de données réelles : {len(poses)}")
    for p in poses:
        print("   ", p)
    if problemes:
        print("PROBLÈMES :")
        for p in problemes:
            print("   ", p)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
