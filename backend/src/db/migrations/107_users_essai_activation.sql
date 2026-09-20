-- ============================================================================
-- 107 — ESSAI COURTIA : LES 7 JOURS COMMENCENT A L'ACTIVATION REELLE
--
-- POURQUOI CETTE MIGRATION
-- L'invitation d'un cabinet en essai (`POST /api/admin/super/trials/invite`)
-- posait `trial_ends_at = NOW() + 7 jours` AU MOMENT DE L'INVITATION. Le lien
-- d'activation restant valable 72 h, un cabinet qui activait son accès au bout
-- de deux jours ne disposait donc plus que de cinq jours d'essai : la durée
-- annoncée n'était pas la durée réelle.
--
-- REGLE APPLIQUEE (décision du 20/09/2026)
--   - l'invitation crée le compte et enregistre la DUREE prévue, sans faire
--     courir l'essai : `subscription_status = 'pending_activation'`,
--     `trial_ends_at = NULL` ;
--   - l'essai démarre à l'ACTIVATION réelle (choix du mot de passe par le
--     cabinet via le lien d'invitation), pour exactement `trial_days` jours ;
--   - l'inscription libre-service (`/api/auth/register`) est inchangée : elle
--     démarre l'essai immédiatement, puisque le compte est actif dès l'inscription.
--
-- Additive et idempotente : aucune table existante n'est modifiée, aucune
-- donnée n'est réécrite, aucun compte en cours n'est touché.
-- ============================================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_days INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ;

COMMENT ON COLUMN users.trial_days IS
  'Durée de l''essai accordée à ce compte, en jours (invitation) — l''essai démarre à trial_started_at.';
COMMENT ON COLUMN users.trial_started_at IS
  'Date réelle de début de l''essai : posée à l''activation du compte, jamais à l''invitation.';
COMMENT ON COLUMN users.invited_at IS
  'Date d''émission de l''invitation d''essai (le compte n''est pas encore activé à cette date).';
