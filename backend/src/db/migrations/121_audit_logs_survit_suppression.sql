-- ============================================================================
-- 121 — LE JOURNAL D'AUDIT SURVIT À LA SUPPRESSION D'UN COMPTE
--
-- POURQUOI CETTE MIGRATION
-- La migration 119 a monté le journal d'audit (audit_logs) et l'a rendu
-- append-only. Sa colonne `user_id` référence `users(id)` avec la contrainte par
-- défaut (RESTRICT) : supprimer un utilisateur devient alors IMPOSSIBLE dès qu'il
-- a une seule trace d'audit. Constaté le 20/09/2026 en nettoyant les comptes
-- d'audit : « update or delete on table "users" violates foreign key constraint
-- "audit_logs_user_id_fkey" ».
--
-- Défaut réel, pas seulement gêne de nettoyage : un cabinet doit pouvoir
-- supprimer un collaborateur (départ, erreur d'invitation) sans que son journal
-- d'audit bloque l'opération — et sans perdre la trace de ce qui a été fait,
-- puisque c'est précisément la valeur d'un journal.
--
-- CHOIX RETENU : ON DELETE SET NULL. La ligne d'audit est CONSERVÉE (action,
-- date, entité, métadonnées), seule la référence à l'utilisateur disparaît. Le
-- journal reste append-only : la modification ne vient pas d'un UPDATE/DELETE
-- du journal, mais d'une action sur `users`, ce que le trigger autorise par
-- construction (il ne bloque que les écritures sur audit_logs lui-même).
--
-- Idempotente et rejouable : la contrainte est supprimée puis recréée.
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
    ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey;
    ALTER TABLE audit_logs
      ADD CONSTRAINT audit_logs_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
    COMMENT ON CONSTRAINT audit_logs_user_id_fkey ON audit_logs IS
      'ON DELETE SET NULL : la trace d''audit survit à la suppression du compte (défaut corrigé le 20/09/2026)';
  END IF;
END $$;

-- Même raison pour la colonne cabinet_id si elle existe : supprimer un cabinet
-- ne doit pas être bloqué par ses traces, ni les effacer silencieusement.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'audit_logs' AND column_name = 'cabinet_id') THEN
    ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_cabinet_id_fkey;
    ALTER TABLE audit_logs
      ADD CONSTRAINT audit_logs_cabinet_id_fkey
      FOREIGN KEY (cabinet_id) REFERENCES cabinets(id) ON DELETE SET NULL;
  END IF;
END $$;
