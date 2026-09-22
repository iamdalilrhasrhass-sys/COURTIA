#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
refresh_seo.py — MOTEUR DE RAFRAÎCHISSEMENT (règle 27 de la mission).

Un site SEO se dégrade sans bruit : un prix change dans le produit et reste faux sur la page tarifs, une
fonction disparaît du code et la page continue de la décrire, une capture devient obsolète, une source
prend de l'âge, un lien interne casse. Ce script compare ce qui est PUBLIÉ à ce qui EXISTE, et sort une
liste d'actions datée.

Contrôles :
  1. PRIX — les montants publiés sur les pages tarifs sont comparés à la grille du produit
     (frontend/src/market/plansReference.js, backend/src/services/planService.js). Toute divergence est
     signalée : c'est le défaut le plus coûteux et le plus fréquent.
  2. FONCTIONS — chaque page de fonction publiée est rattachée au module du produit qui la porte ; si le
     module disparaît ou change de nom, la page est signalée comme à revérifier.
  3. DATES DE SOURCE — les pages qui publient des données sourcées rappellent leur date d'extraction :
     au-delà de 180 jours, une revérification est demandée.
  4. IMAGES — toute image référencée par une page doit exister dans frontend/public/img.
  5. LIENS — reprend le résultat du contrôle qualité (liens internes cassés).
  6. PAGES ANCIENNES — les pages dont la date de dernière modification du fichier dépasse 12 mois sont
     signalées (aucune mise à jour depuis un an = page à relire).

Sortie : docs/seo/REFRESH_A_FAIRE.csv (type, element, constat, action, priorite)
Code de sortie 1 si une divergence de PRIX ou un lien cassé est détecté (défauts bloquants).
"""
import csv
import datetime as dt
import os
import re
import sys

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC = os.path.join(BASE, "frontend", "public")
DOCS = os.path.join(BASE, "docs", "seo")
AUJOURDHUI = dt.date(2026, 9, 22)          # date de référence de la mission

# Pages de fonction → module du produit qui porte la fonction
FONCTIONS = {
    "fr/sinistres-courtier-assurance": "backend/src/routes/claims.js",
    "ch/sinistres-courtier-assurance-suisse": "backend/src/routes/claims.js",
    "fr/conformite-courtier-assurance": "backend/src/routes/conformite.js",
    "ch/conformite-intermediaire-assurance-lsa-finma": "backend/src/routes/conformite.js",
    "fr/gestion-commissions-courtier-assurance": "backend/src/routes/commissions.js",
    "fr/sante-portefeuille-courtier-assurance": "backend/src/routes/portfolio.js",
    "fr/whatsapp-courtier-assurance": "backend/src/routes/whatsappMeta.js",
    "fr/dicter-compte-rendu-appel-assurance": "backend/src/routes/voice.js",
    "fr/gestion-taches-cabinet-courtage": "backend/src/routes/taches.js",
    "fr/rendez-vous-courtier-assurance": "backend/src/routes/calendar.js",
    "fr/pipeline-kanban-courtier-assurance": "backend/src/routes/kanban.js",
    "fr/partenaires-apporteurs-courtier-assurance": "backend/src/routes/partners.js",
    "fr/formation-equipe-courtier-assurance": "backend/src/routes/academy.js",
    "fr/ia-gestion-documentaire-assurance": "backend/src/routes/docvision.js",
    "fr/gestion-documentaire-courtier-assurance": "backend/src/routes/documentInbox.js",
    "fr/relance-client-assurance": "backend/src/routes/relances.js",
    "fr/import-portefeuille-courtier-assurance": "backend/src/routes/import.js",
    "fr/logiciel-courtier-equipe": "backend/src/routes/enterprise.js",
    "fr/gestion-portefeuille-courtier": "backend/src/routes/portfolio.js",
}

# Pages qui publient des données sourcées et leur date d'extraction
SOURCES_DATEES = {
    "fr/cartographie-courtiers-assurance-france": dt.date(2026, 9, 19),
    "fr/sources-courtia": dt.date(2026, 9, 19),
}
for ville in ["paris", "lyon", "marseille", "bordeaux", "toulouse", "nantes", "lille", "strasbourg",
              "montpellier", "nice"]:
    SOURCES_DATEES[f"fr/logiciel-courtier-assurance-{ville}"] = dt.date(2026, 9, 19)

# Prix attendus, lus dans le produit (et non écrits ici)
PAGES_TARIFS = ["fr/tarifs-logiciel-courtier", "ch/tarifs-logiciel-courtier-chf"]


def grille_produit():
    """
    Lit les montants réellement définis dans le produit, PAR MARCHÉ.

    La grille France et la grille Suisse sont distinctes : une page française ne doit pas publier les
    montants suisses, et réciproquement. On lit donc les deux blocs séparément
    (frontend/src/market/plansReference.js : PLANS_FR puis PLANS_CH).
    """
    grilles = {"FR": set(), "CH": set()}
    f = os.path.join(BASE, "frontend/src/market/plansReference.js")
    if os.path.isfile(f):
        t = open(f, encoding="utf-8").read()
        decoupe = re.split(r"export const PLANS_(FR|CH)", t)
        for i in range(1, len(decoupe) - 1, 2):
            marche, corps = decoupe[i], decoupe[i + 1]
            for m in re.finditer(r"(?:monthly|price)\s*[:=]\s*(\d{2,4})", corps):
                grilles[marche].add(m.group(1))
    return grilles


def montants_plan_service():
    """Montants définis dans le service de plans, pour contrôle croisé (les deux marchés y figurent)."""
    f = os.path.join(BASE, "backend/src/services/planService.js")
    if not os.path.isfile(f):
        return set()
    return {m.group(1) for m in re.finditer(r"price:\s*(\d{2,4})", open(f, encoding="utf-8").read())}


def pages():
    trouve = {}
    for silo in ("fr", "ch"):
        for racine, _d, fichiers in os.walk(os.path.join(PUBLIC, silo)):
            if "index.html" not in fichiers:
                continue
            f = os.path.join(racine, "index.html")
            chemin = os.path.relpath(racine, PUBLIC).replace("\\", "/")
            trouve[chemin] = (open(f, encoding="utf-8").read(), os.path.getmtime(f))
    return trouve


def main():
    os.makedirs(DOCS, exist_ok=True)
    P = pages()
    grilles = grille_produit()
    actions, bloquant = [], False
    # montants légitimes hors abonnement (frais de mise en service annoncés en Suisse)
    EXTRAS = {"FR": set(), "CH": {"490", "990", "1500"}}

    # 1. prix, marché par marché
    MOTIF_PRIX = re.compile(r"(?<!\d)(\d{2,4})(?!\d)\s*(?:€|CHF)")
    for p, marche in (("fr/tarifs-logiciel-courtier", "FR"), ("ch/tarifs-logiciel-courtier-chf", "CH")):
        if p not in P:
            continue
        affiches = set(m.group(1) for m in MOTIF_PRIX.finditer(P[p][0]))
        attendus = grilles[marche]
        absents = attendus - affiches
        inconnus = affiches - attendus - EXTRAS[marche]
        if absents:
            actions.append({"type": "prix", "element": p,
                            "constat": f"montants de la grille {marche} absents de la page : {sorted(absents)}",
                            "action": "aligner la page sur la grille du produit", "priorite": "1-blquant"})
            bloquant = True
        if inconnus:
            # Autres montants publiés (frais de setup, exemples, montants réglementaires) : ils ne sont
            # pas un défaut en soi, mais ils doivent être relus — d'où une priorité informative.
            actions.append({"type": "prix", "element": p,
                            "constat": f"montants publiés hors abonnement ({marche}) : {sorted(inconnus)}",
                            "action": "relire ces montants et vérifier leur source", "priorite": "3-info"})
        actions.append({"type": "prix", "element": p,
                        "constat": f"grille {marche} lue dans le produit : {sorted(attendus)} | publiés : {sorted(affiches)}",
                        "action": "aucune" if not (absents or inconnus) else "corriger", "priorite": "3-info"})

    ps = montants_plan_service()
    connus = grilles["FR"] | grilles["CH"]
    orphelins = ps - connus
    if orphelins:
        actions.append({"type": "prix", "element": "backend/src/services/planService.js",
                        "constat": f"montants définis dans le produit mais absents des grilles publiées : {sorted(orphelins)}",
                        "action": "vérifier s'il s'agit d'une offre non publiée ou d'une grille obsolète",
                        "priorite": "1-blquant"})
        bloquant = True
    else:
        actions.append({"type": "prix", "element": "contrôle croisé",
                        "constat": f"montants produit {sorted(ps)} tous couverts par les grilles {sorted(connus)}",
                        "action": "aucune", "priorite": "3-info"})

    # 2. fonctions
    for page, module in FONCTIONS.items():
        if page not in P:
            actions.append({"type": "fonction", "element": page, "constat": "page absente du disque",
                            "action": "vérifier le pipeline de génération", "priorite": "2-a-faire"})
            continue
        if not os.path.isfile(os.path.join(BASE, module)):
            actions.append({"type": "fonction", "element": page,
                            "constat": f"module produit introuvable : {module}",
                            "action": "revérifier la fonction décrite et corriger la page",
                            "priorite": "1-blquant"})
            bloquant = True

    # 3. dates de source
    for page, date in SOURCES_DATEES.items():
        if page in P and (AUJOURDHUI - date).days > 180:
            actions.append({"type": "source", "element": page,
                            "constat": f"extraction du {date} ({(AUJOURDHUI - date).days} jours)",
                            "action": "réextraire la source et mettre à jour la date publiée",
                            "priorite": "2-a-faire"})

    # 4. images
    for chemin, (t, _m) in P.items():
        for src in set(re.findall(r'src="(/img/[^"]+)"', t)):
            if not os.path.isfile(os.path.join(PUBLIC, src.lstrip("/"))):
                actions.append({"type": "image", "element": chemin, "constat": f"image manquante : {src}",
                                "action": "reprendre la capture ou retirer la référence",
                                "priorite": "1-blquant"})
                bloquant = True

    # 5. liens cassés (résultat du contrôle qualité)
    qa = os.path.join(DOCS, "QA_LIENS_CASSES.csv")
    if os.path.isfile(qa):
        n = sum(1 for _ in csv.DictReader(open(qa, encoding="utf-8")))
        if n:
            actions.append({"type": "lien", "element": "toutes pages", "constat": f"{n} lien(s) interne(s) cassé(s)",
                            "action": "corriger les cibles", "priorite": "1-blquant"})
            bloquant = True

    # 6. pages anciennes
    for chemin, (_t, mtime) in P.items():
        age = (dt.datetime.fromtimestamp(mtime).date() - AUJOURDHUI).days
        if age < -365:
            actions.append({"type": "anciennete", "element": chemin,
                            "constat": f"fichier non modifié depuis {abs(age)} jours",
                            "action": "relire le contenu, les dates et les sources", "priorite": "3-info"})

    with open(os.path.join(DOCS, "REFRESH_A_FAIRE.csv"), "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["type", "element", "constat", "action", "priorite"])
        w.writeheader()
        w.writerows(actions)

    bl = [a for a in actions if a["priorite"].startswith("1")]
    print(f"contrôles effectués sur {len(P)} page(s) | actions : {len(actions)} | bloquantes : {len(bl)}")
    for a in bl:
        print(f"   BLOQUANT [{a['type']}] {a['element']} : {a['constat']}")
    for a in [x for x in actions if x["priorite"].startswith("2")][:10]:
        print(f"   A FAIRE [{a['type']}] {a['element']} : {a['constat']}")
    return 1 if bloquant else 0


if __name__ == "__main__":
    sys.exit(main())
