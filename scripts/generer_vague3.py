#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
generer_vague3.py — PILOTE DE LA VAGUE 3 SEO (France + Suisse, outils et données originales).

Il rend :
  - toutes les pages définies dans scripts/seo_pages/v3_*.py (35 pages) ;
  - la page de cartographie des courtiers, construite à partir de COMPTAGES RÉELS (base SIRENE /
    DINUM, code NAF 66.22Z) — aucune donnée inventée, source et date affichées, limites de lecture
    explicites.

Puis il enchaîne l'assainissement/sitemaps (scripts/seo_hygiene_pages_villes.py), le graphe de
maillage (scripts/maillage_interne.py) et le fichier de suivi (scripts/generer_suivi_seo.py).

Usage : python3 scripts/generer_vague3.py
"""
import importlib
import json
import os
import sys

BASE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE)
sys.path.insert(0, os.path.join(BASE, "seo_pages"))

from generate_seo_pillars import PAGES as PAGES_BASE, PUBLIC, SITE, page  # noqa: E402

SOURCES = "/root/ark/business/_mesures/densite_courtiers_fr.json"

REGIONS = {
    "01": "Guadeloupe", "02": "Martinique", "03": "Guyane", "04": "La Réunion", "06": "Mayotte",
    "11": "Île-de-France", "24": "Centre-Val de Loire", "27": "Bourgogne-Franche-Comté",
    "28": "Normandie", "32": "Hauts-de-France", "44": "Grand Est", "52": "Pays de la Loire",
    "53": "Bretagne", "75": "Nouvelle-Aquitaine", "76": "Occitanie", "84": "Auvergne-Rhône-Alpes",
    "93": "Provence-Alpes-Côte d'Azur", "94": "Corse",
}

DEPARTEMENTS = {
    "75": "Paris", "13": "Bouches-du-Rhône", "69": "Rhône", "33": "Gironde", "06": "Alpes-Maritimes",
    "59": "Nord", "34": "Hérault", "31": "Haute-Garonne", "44": "Loire-Atlantique",
    "67": "Bas-Rhin", "78": "Yvelines", "92": "Hauts-de-Seine", "93": "Seine-Saint-Denis",
    "94": "Val-de-Marne", "83": "Var", "35": "Ille-et-Vilaine", "38": "Isère", "76": "Seine-Maritime",
    "51": "Marne", "21": "Côte-d'Or", "30": "Gard",
}


def nfr(valeur):
    """Entier au format français (espace insécable fine comme séparateur de milliers)."""
    return f"{valeur:,}".replace(",", "\u202f")


def pfr(valeur):
    """Pourcentage au format français (virgule décimale)."""
    return f"{valeur:.1f}".replace(".", ",")


def page_cartographie():
    d = json.load(open(SOURCES, encoding="utf-8"))
    regions, departements = d["regions"], d["departements"]
    total = sum(regions.values())
    rangs = sorted(regions.items(), key=lambda x: -x[1])
    top_dep = sorted(departements.items(), key=lambda x: -x[1])[:20]
    lignes_reg = "\n".join(
        f"<tr><td>{REGIONS.get(k, 'Code ' + k)}</td><td>{nfr(v)}</td><td>{pfr(100 * v / total)} %</td></tr>"
        for k, v in rangs)
    lignes_dep = "\n".join(
        f"<tr><td>{DEPARTEMENTS.get(k, 'Département ' + k)}</td><td>{nfr(v)}</td></tr>"
        for k, v in top_dep)
    corps = f"""
<p>Cette page publie des <strong>comptages réels</strong> d'établissements de courtage d'assurance en
France, calculés à partir de la base publique des entreprises (code d'activité 66.22Z). Elle sert
deux usages : situer la densité du courtage sur le territoire, et donner un ordre de grandeur à un
cabinet qui se demande s'il est seul sur son marché.</p>

<div class="section">
<h2>Méthode, source et date</h2>
<ul>
<li><strong>Source :</strong> base SIRENE diffusée par la DINUM, filtrée sur le code d'activité
NAF 66.22Z (activités des agents et courtiers d'assurances).</li>
<li><strong>Extraction :</strong> 19 septembre 2026, sur le fichier national complet.</li>
<li><strong>Total mesuré :</strong> <strong>{nfr(total)} établissements</strong>, répartis par région et
par département.</li>
<li><strong>Ce qu'un établissement n'est pas :</strong> une entreprise. Un cabinet avec trois
implantations compte trois établissements. Ces chiffres mesurent des <em>lieux d'activité</em>, pas
des sociétés, et ils incluent des structures de toute taille — y compris des groupes.</li>
</ul>
<p class="doux">Aucun chiffre de cette page n'est estimé ni extrapolé : tous proviennent du fichier
source, et les pourcentages sont un simple rapport au total.</p>
</div>

<h2>Répartition par région</h2>
<table>
<tr><th>Région</th><th>Établissements</th><th>Part du total</th></tr>
{lignes_reg}
</table>

<h2>Les vingt premiers départements</h2>
<table>
<tr><th>Département</th><th>Établissements</th></tr>
{lignes_dep}
</table>

<h2>Comment lire ces chiffres</h2>
<ol>
<li><strong>La densité ne dit rien de la concurrence réelle.</strong> Deux cabinets peuvent être
implantés dans la même ville sans viser les mêmes clients : particuliers, professionnels, entreprises.</li>
<li><strong>Un établissement n'est pas un poste de travail.</strong> Le fichier ne dit pas combien de
personnes travaillent dans chaque structure.</li>
<li><strong>La concentration urbaine domine</strong> — la région capitale représente à elle seule une
part importante du total, ce qui reflète l'organisation du marché plutôt qu'une supériorité.</li>
</ol>

<h2>Ce que ces données permettent de faire</h2>
<p>Pour un cabinet : situer son marché, vérifier qu'il n'est pas isolé, et préparer une
argumentation de proximité sans inventer de statistique. Pour un éditeur : comprendre pourquoi un
outil de courtage doit fonctionner pour un cabinet d'une personne comme pour une structure
multi-sites — c'est exactement le cas d'usage de COURTIA.</p>

<h2>Réutilisation de ces données</h2>
<p>Ces comptages peuvent être repris par un tiers — journaliste, consultant, formateur, association
professionnelle, autre éditeur — sous deux conditions simples : <strong>citer la source</strong> (base
SIRENE, code d'activité NAF 66.22Z, extraction du 19 septembre 2026) et <strong>mentionner
COURTIA</strong> comme producteur de la mise en forme. Aucune autorisation préalable n'est nécessaire
pour une reprise partielle avec ces mentions.</p>
<p>Le détail par département ou par commune, ainsi que le script d'extraction, sont transmissibles sur
demande motivée à <strong>contact@courtiark.fr</strong> : c'est plus utile qu'une reprise
approximative, et cela évite les erreurs d'interprétation.</p>

<h2>Mise à jour</h2>
<p>La date d'extraction affichée en tête de cette page fait foi : nous ne publions pas de chiffre plus
récent que notre extraction. Une nouvelle extraction remplacera intégralement les tableaux ci-dessus,
avec sa date. Tant qu'aucune mise à jour n'a eu lieu, les chiffres publiés restent ceux du
19 septembre 2026 — et cette page le dit plutôt que de laisser croire à une donnée « en temps réel ».</p>

<h2>Éditeur et limites de responsabilité</h2>
<p>Page éditée par <strong>COURTIA</strong> (contact@courtiark.fr), à partir d'une base publique
administrée par la DINUM. Les erreurs de la base source — activité mal déclarée, établissement fermé
non radié, code d'activité inexact — se retrouvent mécaniquement dans nos comptages. Ces chiffres
décrivent une photographie administrative, pas la réalité commerciale d'un marché local.</p>
"""
    return dict(
        marche="FR",
        titre="Cartographie des courtiers d'assurance en France : les chiffres SIRENE",
        description=(
            "Comptages réels des établissements de courtage d'assurance en France par région et "
            "département (base SIRENE, code NAF 66.22Z, extraction 19/09/2026). Source et limites."
        ),
        h1="Où sont les courtiers d'assurance en France : ce que disent les données publiques",
        fil=[("Accueil", "/"), ("France", "/fr"), ("Cartographie du courtage", "/fr/cartographie-courtiers-assurance-france")],
        maillage=[
            ("Logiciel courtier assurance", "/fr/logiciel-courtier-assurance", "l'outil conçu pour ces cabinets"),
            ("CRM courtier assurance", "/fr/crm-courtier-assurance", "le dossier client au centre"),
            ("Gestion de cabinet", "/fr/logiciel-gestion-cabinet-courtage", "commissions et pilotage"),
            ("Pilier suisse", "/ch/logiciel-courtier-assurance-suisse", "le marché suisse, séparément"),
        ],
        corps=corps,
        faq=[
            ("D'où viennent ces chiffres ?",
             "De la base SIRENE (DINUM), filtrée sur le code d'activité 66.22Z, extraction du 19 septembre 2026. Les comptages sont publiés tels quels, sans extrapolation."),
            ("Un établissement, c'est un cabinet ?",
             "Non. C'est un lieu d'activité : une structure avec plusieurs implantations compte plusieurs établissements. Le fichier ne permet pas de compter les collaborateurs."),
            ("Puis-je réutiliser ces données ?",
             "Oui, avec mention de la source. Le détail par département ou par commune peut être transmis sur demande motivée."),
        ],
    )


def main():
    modules = [f[:-3] for f in sorted(os.listdir(os.path.join(BASE, "seo_pages")))
               if (f.startswith("v3_") or f.startswith("v5_")) and f.endswith(".py")]
    total = 0
    for m in modules:
        mod = importlib.import_module(m)
        print(f"--- {m} : {len(mod.PAGES)} page(s)")
        for chemin, definition in mod.PAGES.items():
            PAGES_BASE[chemin] = definition
            total += 1

    PAGES_BASE["fr/cartographie-courtiers-assurance-france"] = page_cartographie()
    total += 1

    ecrits = []
    for chemin, definition in PAGES_BASE.items():
        if not any(chemin.startswith(prefix) for prefix in ("fr/", "ch/")):
            continue
        rendu = page(chemin=chemin, **definition)
        cible = os.path.join(PUBLIC, chemin, "index.html")
        os.makedirs(os.path.dirname(cible), exist_ok=True)
        with open(cible, "w", encoding="utf-8") as f:
            f.write(rendu)
        ecrits.append(chemin)

    print(f"\n{len(ecrits)} page(s) rendues au total (vagues 1 a 5)")
    print(f"  dont {total} issues des modules de vagues 3 et 5")
    return 0


if __name__ == "__main__":
    sys.exit(main())
