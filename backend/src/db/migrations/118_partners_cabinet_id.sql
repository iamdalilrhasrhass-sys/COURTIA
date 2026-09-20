-- ============================================================================
-- 118 — LES PARTENAIRES APPARTIENNENT AU CABINET (et non plus au seul user)
--
-- POURQUOI CETTE MIGRATION
-- La migration 113 a rattaché au CABINET les entités métier de premier niveau
-- (clients, opportunités, tâches, kanban, devis, commissions, documents,
-- relances). `partners` a été OUBLIÉE : le routeur continuait de filtrer
-- `partners.user_id = req.user.id`, c'est-à-dire « les partenaires de MON
-- utilisateur ». Conséquence reproduite le 20/09/2026 : un collaborateur invité
-- (rôle `broker`) dans le cabinet d'audit ne voyait AUCUN partenaire, alors que
-- le propriétaire en voyait — et deux collègues ne pouvaient pas travailler le
-- même carnet d'apporteurs/compagnies. Le reste du CRM est passé à la portée
-- cabinet (`lib/porteeCabinet`) ; un carnet de partenaires resté mono-utilisateur
-- est une incohérence de modèle, pas un choix.
--
-- MODÈLE
--   * `partners.cabinet_id` est l'ancre du tenant, exactement comme
--     `clients.cabinet_id` (migration 113).
--   * `partners.user_id` N'EST PAS SUPPRIMÉ : il reste le CRÉATEUR de la ligne
--     (et sert de repli « mono-utilisateur » pour un compte sans cabinet).
--
-- COMPATIBILITÉ DES CABINETS MONO-UTILISATEUR
-- La colonne est NULLable et la portée applicative retombe sur
-- `user_id = utilisateur` dès qu'il n'y a pas de cabinet : les comptes déjà en
-- production (sans ligne dans `cabinet_members`) gardent EXACTEMENT leur
-- comportement d'avant.
--
-- IDEMPOTENCE / REJOUABILITÉ
-- `ADD COLUMN IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, et le backfill ne
-- touche que les lignes où `cabinet_id IS NULL` : rejouer cette migration ne
-- réécrit jamais une affectation déjà posée, ni une donnée pilote. Aucune table
-- n'est recréée, aucune colonne n'est supprimée.
--
-- BACKFILL — RÈGLE UNIQUE (identique à 113)
-- Le cabinet d'une ligne est celui de son utilisateur propriétaire, tel que porté
-- par `cabinet_members`. Plusieurs appartenances sont possibles : on privilégie
-- `owner`, puis `manager`, puis `broker`, puis `assistant`, puis `viewer`, et à
-- défaut la plus ancienne (`created_at`).
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. La colonne (additive, NULLable : jamais de NOT NULL rétroactif)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE partners ADD COLUMN IF NOT EXISTS cabinet_id UUID;

COMMENT ON COLUMN partners.cabinet_id IS
  'Cabinet propriétaire du partenaire (migration 118). NULL pour une ligne créée avant la migration ou par un compte sans cabinet : la portée applicative retombe alors sur partners.user_id (comportement historique).';

CREATE INDEX IF NOT EXISTS idx_partners_cabinet_id ON partners(cabinet_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Backfill — le cabinet de l'utilisateur propriétaire de la ligne
-- ─────────────────────────────────────────────────────────────────────────────

UPDATE partners p
   SET cabinet_id = m.cabinet_id
  FROM (
        SELECT DISTINCT ON (user_id) user_id, cabinet_id
          FROM cabinet_members
         WHERE removed_at IS NULL
         ORDER BY user_id,
                  CASE role
                    WHEN 'owner'     THEN 0
                    WHEN 'manager'   THEN 1
                    WHEN 'broker'    THEN 2
                    WHEN 'assistant' THEN 3
                    WHEN 'viewer'    THEN 4
                    ELSE 5
                  END,
                  created_at ASC
       ) m
 WHERE p.cabinet_id IS NULL
   AND p.user_id = m.user_id;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Contrôle de non-régression (informatif uniquement : aucun échec de
--    migration, aucune donnée modifiée). Il reste normal qu'un partenaire d'un
--    compte SANS cabinet garde `cabinet_id IS NULL` — c'est le repli
--    mono-utilisateur prévu.
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  orphelins INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphelins
    FROM partners p
   WHERE p.cabinet_id IS NULL
     AND EXISTS (SELECT 1 FROM cabinet_members cm WHERE cm.user_id = p.user_id AND cm.removed_at IS NULL);
  IF orphelins > 0 THEN
    RAISE NOTICE '118 : % partenaire(s) sans cabinet alors que leur propriétaire a une appartenance — à vérifier.', orphelins;
  END IF;
END $$;
