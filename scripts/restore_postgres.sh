#!/usr/bin/env bash
# ============================================================================
# COURTIA — restauration d'une sauvegarde PostgreSQL.
#
# Usage :
#   scripts/restore_postgres.sh <fichier.dump> <base_cible> [--force]
#
# Comportement :
#   - vérifie l'empreinte sha256 si un fichier .sha256 est présent à côté ;
#   - REFUSE d'écrire dans une base existante sans --force (garde-fou : on ne
#     veut pas écraser une base de production par erreur) ;
#   - restaure, puis affiche le nombre de tables et de lignes obtenu ;
#   - indique clairement qu'il faut ensuite vérifier les variables
#     d'environnement du backend (DATABASE_URL) avant de redémarrer le service.
#
# La production ne doit JAMAIS être restaurée par-dessus sans sauvegarde
# préalable de son état courant : lancez d'abord backup_postgres.sh.
# ============================================================================
set -uo pipefail

FICHIER="${1:?usage: restore_postgres.sh <fichier.dump> <base_cible> [--force]}"
CIBLE="${2:?usage: restore_postgres.sh <fichier.dump> <base_cible> [--force]}"
FORCE="${3:-}"

[ -f "$FICHIER" ] || { echo "Fichier introuvable : $FICHIER"; exit 1; }

# --- 1. empreinte ------------------------------------------------------------
if [ -f "${FICHIER}.sha256" ]; then
  ATTENDU=$(cut -d' ' -f1 "${FICHIER}.sha256")
  OBTENU=$(sha256sum "$FICHIER" | cut -d' ' -f1)
  if [ "$ATTENDU" != "$OBTENU" ]; then
    echo "ECHEC : empreinte sha256 differente — fichier corrompu ou modifie"
    echo "  attendu : $ATTENDU"
    echo "  obtenu  : $OBTENU"
    exit 1
  fi
  echo "Empreinte sha256 verifiee"
else
  echo "ATTENTION : aucune empreinte .sha256 a cote du dump, integrite non verifiee"
fi

# --- 2. garde-fou ------------------------------------------------------------
EXISTE=$(psql -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='${CIBLE}'" 2>/dev/null)
if [ "$EXISTE" = "1" ] && [ "$FORCE" != "--force" ]; then
  echo "REFUS : la base ${CIBLE} existe deja."
  echo "  Sauvegardez son etat courant (scripts/backup_postgres.sh ${CIBLE}) puis relancez avec --force."
  exit 2
fi
if [ "$EXISTE" = "1" ]; then
  echo "Suppression de ${CIBLE} (--force) puis recreation"
  psql -d postgres -q -c "DROP DATABASE IF EXISTS \"${CIBLE}\""
fi
psql -d postgres -q -c "CREATE DATABASE \"${CIBLE}\"" || exit 1

# --- 3. restauration --------------------------------------------------------
if ! pg_restore -d "$CIBLE" --no-owner "$FICHIER"; then
  echo "ECHEC : pg_restore a retourne une erreur (voir ci-dessus)"
  exit 1
fi

# --- 4. etat obtenu ---------------------------------------------------------
TABLES=$(psql -d "$CIBLE" -tAc "SELECT count(*) FROM pg_tables WHERE schemaname='public'")
SOMME=$(psql -d "$CIBLE" -tAc "SELECT string_agg(format('(SELECT count(*) FROM %I.%I)', schemaname, tablename), ' + ') FROM pg_tables WHERE schemaname='public'")
LIGNES=$(psql -d "$CIBLE" -tAc "SELECT ${SOMME:-0}")
echo
echo "Restauration terminee dans ${CIBLE} : ${TABLES} tables, ${LIGNES} lignes"
echo "Rappel : mettre a jour DATABASE_URL du service backend pointant sur cette base,"
echo "         puis redemarrer le service et verifier GET /api/status (database=connected)."
exit 0
