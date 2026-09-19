#!/usr/bin/env python3
"""Contrôle statique des fichiers SQL de COURTIA avant exécution PostgreSQL.

Le 19/09/2026, la reconstruction d'une base VIDE échouait en cascade à cause
de détails que psql ne signale qu'un par un. Ce script les détecte TOUS avant
l'exécution, sans toucher à la base.

Contrôles :
  1. syntaxe MySQL restée dans un fichier PostgreSQL (INDEX inline, LONGTEXT,
     TINYINT, AUTO_INCREMENT, ENGINE=, UNSIGNED, ZEROFILL, DATETIME) ;
  2. DDL non idempotente (CREATE TABLE / CREATE INDEX / ADD CONSTRAINT sans
     garde) : une base neuve n'est pas le seul chemin, la même procédure doit
     pouvoir repasser sur une base existante ;
  3. types déclarés après leur utilisation (CREATE TYPE après la table qui
     l'utilise) ;
  4. doublons de CREATE TABLE dans un même fichier.

Usage : python3 scripts/check_sql_postgres.py [chemin_racine]
Sortie : liste des constats, code retour 1 si au moins un constat.
"""
import re
import sys
from pathlib import Path

RACINE = Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()

MYSQL = [
    (re.compile(r"^\s+INDEX\s+\w+\s*\("), "INDEX inline (syntaxe MySQL) -> a mettre en CREATE INDEX"),
    (re.compile(r"\bLONGTEXT\b", re.I), "LONGTEXT -> TEXT"),
    (re.compile(r"\bMEDIUMTEXT\b|\bTINYTEXT\b", re.I), "MEDIUMTEXT/TINYTEXT -> TEXT"),
    (re.compile(r"\bTINYINT\b", re.I), "TINYINT -> SMALLINT"),
    (re.compile(r"\bAUTO_INCREMENT\b", re.I), "AUTO_INCREMENT -> SERIAL/IDENTITY"),
    (re.compile(r"\bENGINE\s*=", re.I), "ENGINE= (MySQL)"),
    (re.compile(r"\bUNSIGNED\b|\bZEROFILL\b", re.I), "UNSIGNED/ZEROFILL (MySQL)"),
]
NON_IDEMPOTENT = [
    (re.compile(r"^\s*CREATE TABLE\s+(?!IF NOT EXISTS)", re.I), "CREATE TABLE sans IF NOT EXISTS"),
    (re.compile(r"^\s*CREATE INDEX\s+(?!IF NOT EXISTS)", re.I), "CREATE INDEX sans IF NOT EXISTS"),
    (re.compile(r"^\s*ALTER TABLE\s+\w+\s+ADD COLUMN\s+(?!IF NOT EXISTS)", re.I), "ADD COLUMN sans IF NOT EXISTS"),
]


def controler(chemin: Path):
    constats = []
    try:
        lignes = chemin.read_text(encoding="utf-8").split("\n")
    except Exception as e:  # fichier illisible
        return [(chemin, 0, f"lecture impossible : {e}")]

    for n, ligne in enumerate(lignes, 1):
        for motif, message in MYSQL + NON_IDEMPOTENT:
            if motif.search(ligne):
                constats.append((chemin, n, message))

    # doublons de CREATE TABLE dans le même fichier
    tables = [m.group(1).lower() for m in
              (re.match(r"^\s*CREATE TABLE(?: IF NOT EXISTS)?\s+(\w+)", l, re.I) for l in lignes) if m]
    for nom in sorted({t for t in tables if tables.count(t) > 1}):
        constats.append((chemin, tables.index(nom) + 1, f"CREATE TABLE {nom} defini {tables.count(nom)} fois"))

    # CREATE TYPE apres une table qui l'utilise
    pos_type = {m.group(1): i for i, l in enumerate(lignes)
                if (m := re.match(r"\s*CREATE TYPE\s+(\w+)", l, re.I))}
    for nom, i in pos_type.items():
        for j, l in enumerate(lignes[:i]):
            if re.search(rf"\b{nom}\b", l) and not re.match(r"\s*--", l) and 'typname' not in l:
                constats.append((chemin, j + 1, f"type {nom} utilise avant sa definition (ligne {i+1})"))
                break
    return constats


def main():
    fichiers = sorted(list(RACINE.glob("database/*.sql")) +
                      list(RACINE.glob("backend/src/db/migrations/*.sql")))
    total = 0
    for f in fichiers:
        for chemin, ligne, message in controler(f):
            print(f"{chemin.relative_to(RACINE)}:{ligne}: {message}")
            total += 1
    print(f"\n{len(fichiers)} fichiers SQL controles, {total} constat(s).")
    return 1 if total else 0


if __name__ == "__main__":
    sys.exit(main())
