-- ============================================================================
-- 110 — RÉVOCATION DE SESSION APRÈS CHANGEMENT DE MOT DE PASSE (SEC-016)
--
-- POURQUOI CETTE MIGRATION
-- Un jeton JWT volé restait valable jusqu'à son expiration naturelle (7 jours)
-- même après que le titulaire a remplacé son mot de passe : le mot de passe ne
-- révoquait donc AUCUNE session. `middleware/auth.js` (et `authMiddleware.js`)
-- refuse désormais tout jeton dont `iat` est antérieur à `password_changed_at`.
--
-- La colonne `password_changed_at` est introduite par 109 ; cette migration la
-- (re)affirme de façon idempotente pour les bases où 109 n'aurait pas été jouée.
-- Les comptes existants gardent la colonne à NULL : aucune session en cours
-- n'est invalidée par cette migration.
--
-- Additive et idempotente : aucune table recréée, aucune donnée réécrite.
-- ============================================================================

ALTER TABLE IF EXISTS users
  ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ;

COMMENT ON COLUMN users.password_changed_at IS
  'Horodatage du dernier changement de mot de passe (Paramètres > Sécurité ou réinitialisation). Les jetons émis avant cet instant sont refusés (SEC-016). NULL = compte jamais réinitialisé, aucune session révoquée.';
