-- ============================================================================
-- 122 — SUPPRIMER UN COMPTE RESTE POSSIBLE MALGRÉ LE JOURNAL APPEND-ONLY
--
-- POURQUOI CETTE MIGRATION (défaut reproduit le 20/09/2026)
-- La migration 119 a rendu `audit_logs` append-only : tout UPDATE est refusé par
-- un trigger. La migration 121 a voulu que supprimer un compte ne soit plus
-- bloqué par ses traces (FK en ON DELETE SET NULL) — mais l'action du moteur
-- pour mettre `user_id` à NULL est elle-même un UPDATE de `audit_logs` : le
-- trigger la refusait, donc la suppression du compte échouait toujours, avec un
-- message trompeur sur le journal :
--   « audit_logs est en écriture seule (append-only) : une entrée de journal ne
--     peut pas être modifiée »  (SQL: UPDATE ONLY audit_logs SET user_id = NULL)
--
-- CHOIX RETENU : le trigger continue de refuser TOUTE modification d'une entrée
-- de journal, à UNE exception près, strictement encadrée : l'effacement de la
-- référence à l'utilisateur (user_id qui passe à NULL) quand c'est l'unique
-- changement — c'est exactement ce que fait la suppression d'un compte, et c'est
-- une opération d'effacement d'identité, pas une réécriture de l'histoire. Tout
-- autre UPDATE et tout DELETE restent refusés.
--
-- Idempotente et rejouable (CREATE OR REPLACE FUNCTION).
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
    CREATE OR REPLACE FUNCTION audit_logs_append_only() RETURNS trigger AS $fn$
    BEGIN
      IF TG_OP = 'DELETE' THEN
        IF current_setting('courtia.audit_purge', true) = 'on' THEN
          RETURN OLD;
        END IF;
        RAISE EXCEPTION 'audit_logs est en écriture seule (append-only) : une entrée de journal ne peut pas être supprimée.';
      END IF;

      -- UPDATE : refusé, SAUF l'effacement d'identité provoqué par la suppression
      -- d'un compte (user_id -> NULL, et rien d'autre de modifié).
      IF NEW.user_id IS NULL AND OLD.user_id IS NOT NULL
         AND NEW.action IS NOT DISTINCT FROM OLD.action
         AND NEW.entity_type IS NOT DISTINCT FROM OLD.entity_type
         AND NEW.entity_id IS NOT DISTINCT FROM OLD.entity_id
         AND NEW.created_at IS NOT DISTINCT FROM OLD.created_at
         AND NEW.id IS NOT DISTINCT FROM OLD.id THEN
        RETURN NEW;
      END IF;

      RAISE EXCEPTION 'audit_logs est en écriture seule (append-only) : une entrée de journal ne peut pas être modifiée. Journalisez une NOUVELLE entrée.';
    END;
    $fn$ LANGUAGE plpgsql;
  END IF;
END $$;

COMMENT ON FUNCTION audit_logs_append_only() IS
  'Append-only, avec une seule exception encadrée : user_id -> NULL lors de la suppression d''un compte (défaut corrigé le 20/09/2026).';
