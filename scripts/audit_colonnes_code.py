#!/usr/bin/env python3
"""Compare les colonnes RÉELLEMENT utilisées par le code à celles de la base.

POURQUOI : un schéma peut se reconstruire sans erreur et rester inutilisable.
Mesure du 19/09/2026 : après reconstruction d'une base vide (37 migrations au
vert), POST /api/clients renvoyait 500 `column "bonus_malus" of relation
"clients" does not exist`. Les fichiers SQL du dépôt ne décrivent donc pas
fidèlement ce que le code interroge.

MÉTHODE (sans IA, sans supposition) : on lit les requêtes SQL du backend,
on en extrait le couple (table, colonne) pour les formes non ambiguës —
`INSERT INTO t (a, b)`, `UPDATE t SET a = ...`, et `alias.colonne` dont
l'alias est défini dans la MÊME requête (`FROM t alias`, `JOIN t AS alias`) —
puis on compare à `information_schema.columns`.

Ce que le script ne fait pas : deviner un type. Il produit la liste des
colonnes manquantes ; le type se choisit en lisant l'usage.

Usage :
  python3 scripts/audit_colonnes_code.py            # rapport
  python3 scripts/audit_colonnes_code.py --sql      # propose les ALTER TABLE

Connexion : DATABASE_URL, ou PGHOST/PGUSER/PGPASSWORD/PGDATABASE.
"""
import os
import re
import subprocess
import sys
from collections import defaultdict
from pathlib import Path

RACINE = Path(__file__).resolve().parent.parent
BACKEND = RACINE / "backend" / "src"

MOTS_RESERVES = {
    "select", "from", "where", "and", "or", "not", "null", "as", "on", "set",
    "values", "insert", "update", "delete", "join", "left", "right", "inner",
    "outer", "group", "order", "by", "limit", "offset", "returning", "case",
    "when", "then", "else", "end", "count", "sum", "avg", "max", "min", "coalesce",
    "now", "current_date", "current_timestamp", "distinct", "asc", "desc", "into",
    "conflict", "do", "nothing", "interval", "date", "extract", "cast", "int",
    "text", "jsonb", "boolean", "numeric", "timestamp", "with", "union", "all",
    "exists", "in", "like", "ilike", "is", "true", "false", "using", "begin",
    "commit", "rollback", "if", "table", "index", "create", "alter", "add",
    "column", "primary", "key", "default", "references", "unique", "check",
}


def colonnes_base():
    """{table: set(colonnes)} lu depuis information_schema."""
    requete = ("SELECT table_name, column_name FROM information_schema.columns "
               "WHERE table_schema='public'")
    try:
        sortie = subprocess.run(["psql", "-tAF|", "-c", requete], capture_output=True,
                                text=True, timeout=60, check=True).stdout
    except Exception as e:
        print(f"Impossible de lire le schéma : {e}", file=sys.stderr)
        print("Renseigne DATABASE_URL (ou PGHOST/PGUSER/PGPASSWORD/PGDATABASE).", file=sys.stderr)
        sys.exit(2)
    tables = defaultdict(set)
    for ligne in sortie.strip().split("\n"):
        if "|" in ligne:
            t, c = ligne.split("|", 1)
            tables[t.strip()].add(c.strip())
    return tables


BLOC_SQL = re.compile(r"(SELECT|INSERT\s+INTO|UPDATE|DELETE\s+FROM)\b", re.I)
ALIAS_SQL = re.compile(r"\.(query|execute)\s*\(\s*[`'\"](.*?)[`'\"],", re.S)
TABLE_APRES = re.compile(r"\b(?:FROM|JOIN|INTO|UPDATE)\s+([a-z_][a-z0-9_]*)\s*(?:AS\s+)?([a-z][a-z0-9_]*)?", re.I)


def requetes(chemin: Path):
    texte = chemin.read_text(encoding="utf-8", errors="ignore")
    for m in ALIAS_SQL.finditer(texte):
        if BLOC_SQL.search(m.group(2)):
            ligne = texte[:m.start()].count("\n") + 1
            yield ligne, m.group(2)


def main():
    tables = colonnes_base()
    manquants = defaultdict(set)
    usages = defaultdict(list)
    for f in sorted(BACKEND.rglob("*.js")):
        if f.name.endswith(".test.js"):
            continue
        for ligne, sql in requetes(f):
            # 1. INSERT INTO t (a, b, c)
            for m in re.finditer(r"INSERT\s+INTO\s+([a-z_][a-z0-9_]*)\s*\(([^)]*)\)", sql, re.I):
                t = m.group(1).lower()
                if t not in tables:
                    continue
                for col in re.split(r"\s*,\s*", m.group(2)):
                    col = col.strip().strip('"').lower()
                    if col and col.isidentifier() and col not in tables[t]:
                        manquants[t].add(col); usages[(t, col)].append(f"{f.relative_to(RACINE)}:{ligne} (INSERT)")
            # 2. UPDATE t SET a = ..., b = ...
            for m in re.finditer(r"UPDATE\s+([a-z_][a-z0-9_]*)\s+SET\s+(.*?)(?:WHERE|RETURNING|$)", sql, re.I | re.S):
                t = m.group(1).lower()
                if t not in tables:
                    continue
                for col in re.finditer(r"(?:^|,)\s*([a-z_][a-z0-9_]*)\s*=", m.group(2), re.I):
                    c = col.group(1).lower()
                    if c not in tables[t] and c not in MOTS_RESERVES:
                        manquants[t].add(c); usages[(t, c)].append(f"{f.relative_to(RACINE)}:{ligne} (UPDATE)")
            # 3. alias.colonne, alias défini dans la même requête
            aliases = {}
            for m in TABLE_APRES.finditer(sql):
                t, a = m.group(1).lower(), (m.group(2) or "").lower()
                if t in tables and a and a not in MOTS_RESERVES and a != t:
                    aliases[a] = t
            for m in re.finditer(r"\b([a-z][a-z0-9_]*)\.([a-z_][a-z0-9_]*)", sql, re.I):
                a, c = m.group(1).lower(), m.group(2).lower()
                if a in aliases and c not in tables[aliases[a]] and c not in MOTS_RESERVES:
                    manquants[aliases[a]].add(c)
                    usages[(aliases[a], c)].append(f"{f.relative_to(RACINE)}:{ligne} ({a}.{c})")

    total = sum(len(v) for v in manquants.values())
    print(f"=== COLONNES UTILISÉES PAR LE CODE ET ABSENTES DE LA BASE : {total} sur {len(manquants)} table(s) ===\n")
    for t in sorted(manquants, key=lambda x: -len(manquants[x])):
        print(f"{t} ({len(manquants[t])}) : {', '.join(sorted(manquants[t]))}")
    if "--sql" in sys.argv and total:
        print("\n=== ALTER TABLE PROPOSÉS (types à valider en lisant l'usage) ===")
        for t in sorted(manquants):
            for c in sorted(manquants[t]):
                emplacement = usages[(t, c)][0]
                print(f"ALTER TABLE {t} ADD COLUMN IF NOT EXISTS {c} TEXT;  -- {emplacement}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
