#!/usr/bin/env python3
"""Compare les tables RÉELLEMENT interrogées par le code à celles de la base.

POURQUOI : `audit_colonnes_code.py` attrape les colonnes manquantes, mais pas les
TABLES absentes. Mesure du 20/09/2026 : sur une base reconstruite par la
procédure officielle du dépôt (schema.sql + 42 migrations, 0 rouge, 158 tables),
`GET /api/auth/me` répondait 500 `relation "broker_profiles" does not exist` :
la table est lue par le code et créée par aucun fichier SQL du dépôt.

MÉTHODE (sans IA, sans supposition) : on lit les chaînes SQL du backend, on en
extrait le nom qui suit FROM / JOIN / INSERT INTO / UPDATE / DELETE FROM / INTO,
on écarte les mots-clés, les noms de CTE déclarés en début de requête et les
appels de fonction, puis on compare à `information_schema.tables`.

Ce que le script ne fait pas : inventer la DDL. Il produit la liste des tables
manquantes ; les colonnes à déclarer se lisent dans l'usage (audit_colonnes_code).

Usage :
  python3 scripts/audit_tables_code.py
  python3 scripts/audit_tables_code.py --preuves   # cite un fichier:ligne par table

Connexion : PGHOST/PGUSER/PGPASSWORD/PGDATABASE (psql ne lit pas DATABASE_URL).
"""
import os
import re
import subprocess
import sys
from collections import defaultdict
from pathlib import Path

RACINE = Path(__file__).resolve().parent.parent
BACKEND = RACINE / "backend" / "src"

MOTS_A_ECARTER = {
    "select", "values", "set", "unnest", "generate_series", "jsonb_array_elements",
    "json_array_elements", "lateral", "only", "table", "information_schema", "pg_catalog",
    "dual", "returning", "where", "on", "using", "and", "or", "not", "with", "as",
}

BLOC_SQL = re.compile(r"(SELECT|INSERT\s+INTO|UPDATE|DELETE\s+FROM)\b", re.I)
ALIAS_SQL = re.compile(r"\.(query|execute)\s*\(\s*[`'\"](.*?)[`'\"]", re.S)
TABLE_APRES = re.compile(
    r"\b(?:FROM|JOIN|INSERT\s+INTO|UPDATE|DELETE\s+FROM|INTO)\s+([a-z_][a-z0-9_]*)", re.I)
CTE = re.compile(r"\bWITH\s+(?:RECURSIVE\s+)?([a-z_][a-z0-9_]*)", re.I)
# Liaisons d'alias dans la requête : « FROM table alias », « JOIN table AS alias ».
ALIAS_LIE = re.compile(
    r"\b(?:FROM|JOIN)\s+([a-z_][a-z0-9_]*)\s+(?:AS\s+)?([a-z_][a-z0-9_]*)", re.I)
MOTS_FIN = {
    "where", "on", "using", "left", "right", "inner", "outer", "full", "cross", "join",
    "group", "order", "limit", "offset", "having", "union", "except", "intersect",
    "set", "returning", "and", "or", "as", "select", "with", "values", "do", "conflict",
    "lateral", "natural", "fetch", "window", "for", "when", "then", "else", "end",
}
# Fonctions dont un FROM interne (« EXTRACT(YEAR FROM colonne) ») n'introduit
# PAS une table. Prouvé : fecService.js:266 `EXTRACT(YEAR FROM ecriture_date)`,
# reach.js:1349 `EXTRACT(DOW FROM sent_at)`.
FONCTIONS_A_FROM = re.compile(
    r"(extract|date_part|substring|cast|trim|left|right|position|overlay|string_agg|"
    r"array_agg|split_part|to_char|to_date|to_timestamp|translate|btrim|ltrim|rtrim|"
    r"date_trunc|age|make_interval|justify_days)$", re.I)


def inside_function_call(sql: str, pos: int) -> bool:
    """Le FROM à `pos` est-il à l'intérieur d'un appel de fonction ?

    On remonte jusqu'à la parenthèse ouvrante non fermée ; si elle est précédée
    d'un nom de fonction connu, ce n'est pas une table (EXTRACT(YEAR FROM x)).
    Une parenthèse fermée avant nous => on est dans une sous-requête légitime
    (« IN (SELECT x FROM vraie_table »), donc on garde la table.
    """
    i = pos - 1
    while i >= 0:
        c = sql[i]
        if c == ")":
            return False
        if c == "(":
            avant = sql[max(0, i - 24):i].strip()
            return bool(FONCTIONS_A_FROM.search(avant))
        if c == ";":
            return False
        i -= 1
    return False


def alias_lies(sql: str) -> set:
    """Noms utilisés comme ALIAS dans la requête (« FROM quotes q » -> q)."""
    noms = set()
    for m in ALIAS_LIE.finditer(sql):
        table, alias = m.group(1).lower(), m.group(2).lower()
        if alias in MOTS_FIN or alias == table:
            continue
        noms.add(alias)
    return noms


def tables_base():
    requete = "SELECT table_name FROM information_schema.tables WHERE table_schema='public'"
    try:
        sortie = subprocess.run(["psql", "-tAc", requete], capture_output=True,
                                text=True, timeout=60, check=True).stdout
    except Exception as e:
        print(f"Impossible de lire le schéma : {e}", file=sys.stderr)
        print("Renseigne PGHOST/PGUSER/PGPASSWORD/PGDATABASE.", file=sys.stderr)
        sys.exit(2)
    return {l.strip() for l in sortie.split() if l.strip()}


def requetes(chemin: Path):
    texte = chemin.read_text(encoding="utf-8", errors="ignore")
    for m in ALIAS_SQL.finditer(texte):
        if BLOC_SQL.search(m.group(2)):
            yield texte[:m.start()].count("\n") + 1, m.group(2)


def main():
    presentes = tables_base()
    manquantes = defaultdict(list)
    for f in sorted(BACKEND.rglob("*.js")):
        if f.name.endswith(".test.js"):
            continue
        for ligne, sql in requetes(f):
            ctes = {c.lower() for c in CTE.findall(sql)}
            alias = alias_lies(sql)
            for m in TABLE_APRES.finditer(sql):
                t = m.group(1).lower()
                if t in presentes or t in MOTS_A_ECARTER or t in ctes:
                    continue
                # écart des formes qui ne sont pas des tables
                if re.search(r"\b" + re.escape(t) + r"\s*\(", sql, re.I):
                    continue
                # écart 1 : alias lié dans la même requête (« FROM quotes q », hamon.js:25)
                if t in alias:
                    continue
                # écart 2 : FROM interne à une fonction (« EXTRACT(YEAR FROM
                # ecriture_date) », fecService.js:266 ; « EXTRACT(DOW FROM sent_at) »,
                # reach.js:1349) — ce sont des COLONNES, pas des tables.
                if inside_function_call(sql, m.start()):
                    continue
                manquantes[t].append(f"{f.relative_to(RACINE)}:{ligne}")

    print(f"=== TABLES INTERROGÉES PAR LE CODE ET ABSENTES DE LA BASE : "
          f"{len(manquantes)} ===\n")
    for t in sorted(manquantes, key=lambda x: (-len(manquantes[x]), x)):
        lieux = manquantes[t]
        print(f"{t} ({len(lieux)} référence(s)) : " + ", ".join(sorted(set(lieux))[:4]))
    if "--preuves" in sys.argv:
        print()
        for t in sorted(manquantes):
            print(t)
            for l in sorted(set(manquantes[t])):
                print("   ", l)
    return 1 if manquantes else 0


if __name__ == "__main__":
    sys.exit(main())
