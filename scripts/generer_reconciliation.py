#!/usr/bin/env python3
"""Génère le corps de la migration de réconciliation du baseline.

PROBLÈME QUE CE SCRIPT RÉSOUT
-----------------------------
`database/schema.sql` crée certaines tables sous forme de brouillon minimal
(ex. `partners (id, name, specialties, commission_rate, contact)`), puis les
migrations les redéclarent avec `CREATE TABLE IF NOT EXISTS` en leur donnant
une toute autre forme. Sur une base neuve, le `IF NOT EXISTS` ne fait rien :
la table garde la forme minimale et ce sont les index / colonnes utilisés plus
loin qui échouent (`column "user_id" does not exist`, etc.).

Ce script compare, pour chaque table présente dans schema.sql, les colonnes
déclarées par les migrations avec celles réellement présentes, et produit les
`ALTER TABLE ... ADD COLUMN IF NOT EXISTS` correspondants.

Ce qui est généré n'est donc jamais inventé : chaque colonne vient d'une
déclaration existante d'une migration du dépôt.

Usage : python3 scripts/generer_reconciliation.py > /tmp/reconciliation.sql
"""
import re
import sys
from pathlib import Path

RACINE = Path(__file__).resolve().parent.parent
SCHEMA = RACINE / "database" / "schema.sql"
MIGRATIONS = RACINE / "backend" / "src" / "db" / "migrations"

BLOC = re.compile(r"CREATE TABLE IF NOT EXISTS\s+(\w+)\s*\((.*?)\)\s*;", re.S | re.I)
# une colonne = "nom TYPE ..." ; on ignore les contraintes de table
CONTRAINTES = ("PRIMARY KEY", "UNIQUE", "FOREIGN KEY", "CHECK", "CONSTRAINT")


def colonnes(corps: str):
    """Retourne {nom_colonne: definition} d'un corps de CREATE TABLE."""
    resultat = {}
    for brute in corps.split("\n"):
        ligne = brute.strip().rstrip(",")
        if not ligne or ligne.startswith("--"):
            continue
        haut = ligne.upper()
        if any(haut.startswith(c) for c in CONTRAINTES):
            continue
        m = re.match(r"([a-zA-Z_][a-zA-Z0-9_]*)\s+(.+)$", ligne)
        if not m:
            continue
        nom, definition = m.group(1).lower(), m.group(2)
        resultat.setdefault(nom, definition)
    return resultat


def tables(texte: str):
    return {m.group(1).lower(): colonnes(m.group(2)) for m in BLOC.finditer(texte)}


def definition_sure(ddl: str) -> str:
    """Rend une définition ajoutable sur une table peuplée : pas de NOT NULL."""
    ddl = re.sub(r"--.*$", "", ddl)                       # commentaire de fin de ligne
    ddl = re.sub(r"\s+NOT\s+NULL", "", ddl, flags=re.I)
    return " ".join(ddl.split()).strip().rstrip(",")


def main():
    base = tables(SCHEMA.read_text(encoding="utf-8"))
    a_generer = {}          # table -> {colonne: ddl}
    for f in sorted(MIGRATIONS.glob("*.sql")):
        for nom, cols in tables(f.read_text(encoding="utf-8")).items():
            if nom not in base:
                continue            # table créée par une migration : elle est déjà complète
            for col, ddl in cols.items():
                if col not in base[nom]:
                    a_generer.setdefault(nom, {})[col] = f"{col} {definition_sure(ddl)}"

    if not a_generer:
        print("-- aucune divergence detectee")
        return

    print("-- Colonnes declarees par les migrations mais absentes de database/schema.sql.")
    print("-- Genere par scripts/generer_reconciliation.py — ne pas editer a la main.")
    print("DO $$")
    print("BEGIN")
    for nom in sorted(a_generer):
        print(f"  IF to_regclass('public.{nom}') IS NOT NULL THEN")
        for col, ddl in a_generer[nom].items():
            print(f"    ALTER TABLE {nom} ADD COLUMN IF NOT EXISTS {ddl};")
        print("  END IF;")
    print("END $$;")
    print(f"\n-- {sum(len(v) for v in a_generer.values())} colonnes sur {len(a_generer)} tables : "
          + ", ".join(sorted(a_generer)), file=sys.stderr)


if __name__ == "__main__":
    main()
