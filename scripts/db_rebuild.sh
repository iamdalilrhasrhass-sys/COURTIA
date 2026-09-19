#!/usr/bin/env bash
# ============================================================================
# COURTIA — reconstruction DÉTERMINISTE d'une base vide.
#
# Objectif : prouver qu'une PostgreSQL VIDE peut être amenée à l'état attendu
# par le code, sans bricolage manuel. Aujourd'hui ce n'était pas le cas :
#   - database/schema.sql ne contient pas la table `contrats` ;
#   - 4 migrations échouent sur une base neuve ;
#   - la production dépend d'une base créée à la main.
#
# Usage :
#   scripts/db_rebuild.sh [nom_de_base]        # reconstruit et rapporte
#
# Variables d'environnement lues (jamais affichées) :
#   PGHOST PGPORT PGUSER PGPASSWORD  ou  DATABASE_URL
#
# Le script NE TOUCHE PAS à une base existante : il refuse si la base cible
# existe déjà, sauf si --force est passé (et il la recrée alors entièrement).
# ============================================================================
set -uo pipefail

CIBLE="${1:-courtia_rebuild_$(date +%s)}"
MAINT="${PGMAINTENANCE_DB:-postgres}"   # base de service pour CREATE/DROP
FORCE="${2:-}"
RACINE="$(cd "$(dirname "$0")/.." && pwd)"
SCHEMA="$RACINE/database/schema.sql"
MIGRATIONS="$RACINE/backend/src/db/migrations"
JOURNAL="/tmp/db_rebuild_${CIBLE}.log"

: > "$JOURNAL"

echo "=== RECONSTRUCTION DE $CIBLE ==="
echo "schema : $SCHEMA"
echo "migrations : $MIGRATIONS"
echo "journal : $JOURNAL"
echo "erreurs detaillees : /tmp/migrations_erreurs_${CIBLE}.log"
: > "/tmp/migrations_erreurs_${CIBLE}.log"

# --- la base ne doit pas exister (garde-fou anti-destruction) ---------------
EXISTE=$(psql -d "$MAINT" -tAc "SELECT 1 FROM pg_database WHERE datname='$CIBLE'" 2>>"$JOURNAL")
if [ "$EXISTE" = "1" ]; then
  if [ "$FORCE" != "--force" ]; then
    echo "REFUS : la base $CIBLE existe déjà. Relancer avec --force pour la recréer."
    exit 2
  fi
  echo "suppression de $CIBLE (--force)"
  psql -d "$MAINT" -q -c "DROP DATABASE IF EXISTS \"$CIBLE\"" >>"$JOURNAL" 2>&1
fi

psql -d "$MAINT" -q -c "CREATE DATABASE \"$CIBLE\"" >>"$JOURNAL" 2>&1 || { echo "ECHEC creation"; tail -5 "$JOURNAL"; exit 1; }

# --- 1. schema de base -----------------------------------------------------
echo
echo "--- 1. database/schema.sql ---"
psql -d "$CIBLE" -v ON_ERROR_STOP=1 -f "$SCHEMA" >>"$JOURNAL" 2>&1
if [ $? -ne 0 ]; then
  echo "ECHEC sur schema.sql :"
  grep -iE "^ERROR|^psql.*ERROR" "$JOURNAL" | head -5
else
  echo "OK ($(psql -d "$CIBLE" -tAc "SELECT count(*) FROM pg_tables WHERE schemaname='public'") tables)"
fi

# --- 2. migrations, une par une, dans l'ordre ------------------------------
echo
echo "--- 2. migrations ---"
OK=0; KO=0; ROUGES=()
for f in "$MIGRATIONS"/*.sql; do
  nom="$(basename "$f")"
  sortie=$(psql -d "$CIBLE" -v ON_ERROR_STOP=1 -f "$f" 2>&1)
  echo "--- $nom ---" >> "/tmp/migrations_erreurs_${CIBLE}.log"; echo "$sortie" | grep -iE "ERROR|LINE [0-9]+" >> "/tmp/migrations_erreurs_${CIBLE}.log"
  if echo "$sortie" | grep -qiE "^psql:.*ERROR|^ERROR"; then
    KO=$((KO+1))
    msg=$(echo "$sortie" | grep -iE "^psql:.*ERROR|^ERROR" | head -1 | sed 's/^psql:[^ ]* //')
    ROUGES+=("$nom :: $msg")
    echo "  KO   $nom — $msg"
  else
    OK=$((OK+1))
  fi
done

# --- 3. bilan --------------------------------------------------------------
TABLES=$(psql -d "$CIBLE" -tAc "SELECT count(*) FROM pg_tables WHERE schemaname='public'")
INDEX=$(psql -d "$CIBLE" -tAc "SELECT count(*) FROM pg_indexes WHERE schemaname='public'")
CONTRAINTES=$(psql -d "$CIBLE" -tAc "SELECT count(*) FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid JOIN pg_namespace n ON n.oid=t.relnamespace WHERE n.nspname='public'")

echo
echo "=== BILAN ==="
echo "migrations appliquées : $OK"
echo "migrations en échec   : $KO"
echo "tables                : $TABLES"
echo "index                 : $INDEX"
echo "contraintes           : $CONTRAINTES"
if [ "$KO" -gt 0 ]; then
  echo
  echo "MIGRATIONS ROUGES :"
  for r in "${ROUGES[@]}"; do echo "  - $r"; done
  echo
  echo "Base conservée pour diagnostic : $CIBLE"
  exit 1
fi
echo
echo "Base reconstruite sans aucune migration rouge : $CIBLE"
