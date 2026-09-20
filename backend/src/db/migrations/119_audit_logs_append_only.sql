-- ============================================================================
-- 119 — LE JOURNAL D'AUDIT EST APPEND-ONLY
--
-- DÉFAUT FERMÉ (P3 SEC-024, mesuré en production le 20/09/2026)
-- `audit_logs` contenait 0 ligne et le middleware qui l'alimente n'était monté
-- nulle part. Le montage est fait dans `server.js` (`journaliserEcritures`).
-- Reste la garantie qui donne sa valeur au journal : une entrée d'audit ne doit
-- pouvoir être NI MODIFIÉE NI SUPPRIMÉE. Un journal modifiable ne prouve rien :
-- celui qui veut effacer sa trace commence par réécrire le journal.
--
-- POURQUOI un trigger et pas une convention applicative : ce qui compte pour un
-- audit, c'est que la modification soit IMPOSSIBLE, pas seulement non prévue.
-- Le trigger s'applique à TOUTES les voies d'accès (application, psql, script,
-- outil tiers, sauvegarde restaurée).
--
-- LES DEUX RÈGLES, ET POURQUOI ELLES DIFFÈRENT
--   * UPDATE : refusé TOUJOURS, sans aucune dérogation. Réécrire une entrée est
--     exactement ce qu'un audit doit rendre impossible ; aucun besoin légitime
--     n'existe (une correction se journalise par une NOUVELLE entrée).
--   * DELETE : refusé par défaut, mais une dérogation EXPLICITE existe pour la
--     maintenance (`SET LOCAL courtia.audit_purge = 'autorise'`). Deux raisons,
--     toutes deux vérifiables dans ce dépôt :
--       1. `audit_logs.user_id` porte une clé étrangère vers `users` : sans
--          dérogation, il deviendrait IMPOSSIBLE de supprimer un compte de test
--          (les scripts de recette `qa_*` créent et purgent leurs cabinets) ;
--       2. l'exploitant de la base est superutilisateur PostgreSQL : il peut de
--          toute façon désactiver le trigger. Une garantie qui prétend résister
--          au propriétaire de la base serait mensongère ; ce qui est garanti
--          ici, c'est que l'APPLICATION — et tout appelant HTTP — ne peut ni
--          réécrire ni effacer une entrée.
--     L'application ne pose JAMAIS cette variable : elle n'apparaît que dans une
--     commande de maintenance explicite, visible dans l'historique SQL.
--
-- Idempotent : rejouable sans erreur sur une base qui possède déjà la garantie.
-- ============================================================================

CREATE OR REPLACE FUNCTION audit_logs_append_only() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'audit_logs est en écriture seule (append-only) : une entrée de journal ne peut pas être modifiée. Journalisez une NOUVELLE entrée.'
      USING ERRCODE = '42501';
  END IF;

  -- TG_OP = 'DELETE'
  IF current_setting('courtia.audit_purge', true) IS DISTINCT FROM 'autorise' THEN
    RAISE EXCEPTION 'audit_logs est en écriture seule (append-only) : une entrée de journal ne peut pas être supprimée sans la dérogation de maintenance (SET LOCAL courtia.audit_purge = ''autorise'').'
      USING ERRCODE = '42501';
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_logs_append_only ON audit_logs;

CREATE TRIGGER trg_audit_logs_append_only
  BEFORE UPDATE OR DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION audit_logs_append_only();

-- Le journal est lu par date, par utilisateur et par ressource, et il ne se purge
-- pas : sans index, sa lecture devient un parcours complet dès les premières
-- semaines d'exploitation.
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
