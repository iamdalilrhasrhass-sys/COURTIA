#!/usr/bin/env bash
# ============================================================================
# COURTIA — sauvegarde PostgreSQL avec vérification par restauration réelle.
#
# PRINCIPE : un backup jamais restauré n'est pas une preuve de backup. Ce script
# ne se contente donc pas de produire un fichier : il restaure la sauvegarde
# dans une base jetable et compare le nombre de tables et de lignes avec la
# source. Si la comparaison échoue, le script sort en erreur (exit 1) — un
# cron qui l'appelle doit donc alerter.
#
# Usage :
#   scripts/backup_postgres.sh [source_db] [destination_dir]
#
# Variables :
#   PGHOST PGPORT PGUSER PGPASSWORD   connexion (ou DATABASE_URL)
#   RETENTION_JOURS                   rétention des dumps (défaut : 14)
#   SANS_VERIFICATION=1               saute l'étape de restauration (déconseillé)
#
# La sauvegarde est écrite HORS de l'instance principale (destination_dir,
# défaut /var/backups/courtia) : un dump posé à côté de la base ne protège de
# rien (perte de disque, suppression accidentelle).
# ============================================================================
set -uo pipefail

SOURCE="${1:-${PGDATABASE:-crm_assurance}}"
DEST="${2:-/var/backups/courtia}"
RETENTION="${RETENTION_JOURS:-14}"
HORODATAGE="$(date -u +%Y%m%dT%H%M%SZ)"
FICHIER="${DEST}/${SOURCE}_${HORODATAGE}.dump"
JOURNAL="${DEST}/journal_sauvegardes.log"

mkdir -p "$DEST"
chmod 700 "$DEST" 2>/dev/null || true

journaliser() { echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) $*" | tee -a "$JOURNAL"; }

journaliser "=== sauvegarde de ${SOURCE} ==="

# --- 1. dump -----------------------------------------------------------------
if ! pg_dump -Fc -f "$FICHIER" "$SOURCE"; then
  journaliser "ECHEC : pg_dump a échoué pour ${SOURCE}"
  rm -f "$FICHIER"
  exit 1
fi
TAILLE=$(stat -c%s "$FICHIER" 2>/dev/null || echo 0)
journaliser "dump ecrit : ${FICHIER} (${TAILLE} octets)"
sha256sum "$FICHIER" > "${FICHIER}.sha256"
journaliser "empreinte : $(cut -d' ' -f1 "${FICHIER}.sha256")"

if [ "${TAILLE}" -lt 1024 ]; then
  journaliser "ECHEC : dump suspectement petit (${TAILLE} octets) — base vide ou erreur silencieuse"
  exit 1
fi

# --- 2. vérification par restauration réelle --------------------------------
if [ "${SANS_VERIFICATION:-0}" = "1" ]; then
  journaliser "ATTENTION : verification sautee (SANS_VERIFICATION=1) — ce dump n'est PAS prouve"
  exit 0
fi

VERIF="courtia_verif_$(date -u +%s)"
journaliser "verification : restauration dans ${VERIF}"

doit() { psql -d postgres -tAc "$1" 2>/dev/null; }

doit "CREATE DATABASE \"${VERIF}\"" || { journaliser "ECHEC : creation de la base de verification impossible"; exit 1; }
if ! pg_restore -d "$VERIF" --no-owner "$FICHIER" >/dev/null 2>&1; then
  journaliser "ECHEC : pg_restore a echoue — sauvegarde inexploitable"
  doit "DROP DATABASE IF EXISTS \"${VERIF}\"" >/dev/null
  exit 1
fi

lire() { # nb_tables puis nombre de lignes EXACT (COUNT(*), pas une estimation)
  psql -d "$1" -tAc "SELECT count(*) FROM pg_tables WHERE schemaname='public'"
  local somme
  somme=$(psql -d "$1" -tAc "SELECT string_agg(format('(SELECT count(*) FROM %I.%I)', schemaname, tablename), ' + ') FROM pg_tables WHERE schemaname='public'")
  [ -z "$somme" ] && somme="0"
  psql -d "$1" -tAc "SELECT $somme"
}
TAB_SRC=$(lire "$SOURCE" | head -1); LIG_SRC=$(lire "$SOURCE" | tail -1)
TAB_DST=$(lire "$VERIF"  | head -1); LIG_DST=$(lire "$VERIF"  | tail -1)
journaliser "source   : ${TAB_SRC} tables, ${LIG_SRC} lignes"
journaliser "restaure : ${TAB_DST} tables, ${LIG_DST} lignes"

doit "DROP DATABASE IF EXISTS \"${VERIF}\"" >/dev/null
journaliser "base de verification supprimee"

if [ "$TAB_SRC" != "$TAB_DST" ]; then
  journaliser "ECHEC : nombre de tables different apres restauration (${TAB_SRC} vs ${TAB_DST})"
  exit 1
fi
if [ "$LIG_SRC" != "$LIG_DST" ]; then
  journaliser "ECHEC : nombre de lignes different apres restauration (${LIG_SRC} vs ${LIG_DST})"
  exit 1
fi

# --- 3. rotation -------------------------------------------------------------
SUPPRIMES=$(find "$DEST" -name "${SOURCE}_*.dump" -mtime "+${RETENTION}" -print -delete | wc -l)
journaliser "rotation : ${SUPPRIMES} dump(s) de plus de ${RETENTION} jours supprime(s)"
find "$DEST" -name "${SOURCE}_*.dump.sha256" -mtime "+${RETENTION}" -delete 2>/dev/null

journaliser "OK : sauvegarde de ${SOURCE} verifiee par restauration"
exit 0
