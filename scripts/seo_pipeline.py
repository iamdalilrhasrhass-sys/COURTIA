#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
seo_pipeline.py — ORCHESTRATEUR DU SEO COURTIA (un seul point d'entrée, ordre obligatoire).

Pourquoi cet orchestrateur : les pages sont RENDUSES depuis les scripts (`generer_vague3.py`), puis
ENRICHIES par des scripts séparés (données locales, périmètre anti-cannibalisation, maillage JEV).
Régénérer une page écrase ce que les scripts d'enrichissement y avaient ajouté. Un défaut réel a été
constaté : après une régénération, les blocs de périmètre et le maillage validé par JEV avaient
disparu des pages générées — la page répondait toujours 200, mais sans les blocs.

L'ordre ci-dessous est donc le seul correct. Ne jamais lancer `generer_vague3.py` seul en production.

Usage : python3 scripts/seo_pipeline.py [--sans-build]
"""
import subprocess
import sys

ETAPES = [
    ("1. génération des pages (vagues 1, 2, 3)", ["python3", "scripts/generer_vague3.py"]),
    ("2. données publiques réelles sur les pages locales", ["python3", "scripts/enrichir_pages_villes.py"]),
    ("3. enrichissement des pages métier faibles", ["python3", "scripts/enrichir_pages_metier.py"]),
    ("4. enrichissement des guides réglementaires", ["python3", "scripts/enrichir_guides.py"]),
    ("4bis. enrichissement des pages sous 530 mots", ["python3", "scripts/enrichir_pages_faibles.py"]),
    ("5. désambiguïsation (sections de périmètre JEV)", ["python3", "scripts/desambiguiser_pages.py"]),
    ("6. maillage interne validé par JEV", ["python3", "scripts/appliquer_maillage_jev.py"]),
    ("6bis. maillage complémentaire (orphelines, liens sortants, fonctions écartées)", ["python3", "scripts/mailler_complementaire.py"]),
    ("7. hygiène des pages locales + sitemaps", ["python3", "scripts/seo_hygiene_pages_villes.py"]),
    ("8. graphe de maillage (artefact)", ["python3", "scripts/maillage_interne.py"]),
    ("9. suivi des pages", ["python3", "scripts/generer_suivi_seo.py"]),
]


def controler():
    """Contrôle que les enrichissements sont bien présents après la passe complète."""
    import os
    import re
    attendus = {
        "frontend/public/fr/relance-client-assurance/index.html": "périmètre de cette page",
        "frontend/public/fr/o/i": None,  # ignoré
        "frontend/public/ch/logiciel-intermediaire-assurance-suisse/index.html": "périmètre de cette page",
        "frontend/public/fr/ia-gestion-documentaire-assurance/index.html": "périmètre de cette page",
        "frontend/public/ch/automatisation-courtier-assurance-suisse/index.html": "maillage:jev-20260922",
        "frontend/public/fr/logiciel-courtier-assurance/index.html": "un dossier, de bout en bout",
        "frontend/public/fr/logiciel-devis-courtier-assurance/index.html": "ce que cette page ne prétend pas",
        "frontend/public/fr/logiciel-courtier-assurance-paris/index.html": "données publiques",
        "frontend/public/fr/logiciel-courtier-mutuelle/index.html": "spécifique",
        "frontend/public/fr/guide/lcb-ft/index.html": "ce que cela change",
        "frontend/public/ch/import-portefeuille-courtier-assurance-suisse/index.html": "l'ordre de travail",
        "frontend/public/fr/logiciel-courtier-transport-flotte/index.html": "véhicule",
        "frontend/public/fr/logiciel-courtier-decennale/index.html": "ouverture de chantier",
        "frontend/public/fr/comparatif/automatisation-vs-gestion-manuelle/index.html": "ne doit pas faire",
        "frontend/public/ch/gestion-documentaire-courtier-assurance-suisse/index.html": "conservation, accès et durée",
        "frontend/public/fr/sinistres-courtier-assurance/index.html": "module sinistres",
        "frontend/public/fr/conformite-courtier-assurance/index.html": "checklist DDA",
        "frontend/public/fr/logiciel-courtier-assurance/index.html": "logiciel-courtier-grossiste",
        "frontend/public/fr/ia-gestion-documentaire-assurance/index.html": "carte grise",
        "frontend/public/ch/sinistres-courtier-assurance-suisse/index.html": "expertise",
        "frontend/public/ch/partenaires-apporteurs-courtier-assurance-suisse/index.html": "rétrocession",
    }
    manquants = []
    for chemin, motif in attendus.items():
        if motif is None:
            continue
        if not os.path.isfile(chemin):
            manquants.append(f"{chemin} (fichier absent)")
            continue
        if motif.lower() not in open(chemin, encoding="utf-8").read().lower():
            manquants.append(f"{chemin} (motif « {motif} » absent)")
    return manquants


def main():
    sans_build = "--sans-build" in sys.argv
    for libelle, cmd in ETAPES:
        r = subprocess.run(cmd, capture_output=True, text=True)
        etat = "OK " if r.returncode == 0 else "ÉCHEC"
        print(f"[{etat}] {libelle}")
        if r.returncode != 0:
            print(r.stdout[-1500:])
            print(r.stderr[-1500:])
            return 1
    manquants = controler()
    if manquants:
        print("CONTRÔLE FINAL : échec")
        for m in manquants:
            print("   ", m)
        return 1
    print("[OK ] contrôle final : enrichissements, périmètre et maillage présents")
    if not sans_build:
        r = subprocess.run(["npm", "run", "build"], cwd="frontend", capture_output=True, text=True)
        ligne = [l for l in r.stdout.splitlines() if "built in" in l or "error" in l.lower()]
        print("[OK ] build frontend :", ligne[0] if ligne else "(sortie non lue)", "| code", r.returncode)
        return r.returncode
    return 0


if __name__ == "__main__":
    sys.exit(main())
