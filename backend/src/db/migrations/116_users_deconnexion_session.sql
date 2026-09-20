-- ============================================================================
-- 116 — DÉCONNEXION : RÉVOCATION SERVEUR DES SESSIONS (POST /api/auth/logout)
--
-- POURQUOI CETTE MIGRATION
-- Une route de déconnexion n'existait pas : le client jetait son jeton, mais le
-- serveur continuait de l'accepter jusqu'à son expiration naturelle (7 jours).
-- Un jeton copié sur un autre appareil restait donc utilisable après une
-- déconnexion (défaut relevé le 20/09/2026).
--
-- MÉCANISME (le même que celui déjà en place, migration 110)
-- `users.password_changed_at` porte déjà la règle « tout jeton émis AVANT cet
-- instant est refusé » (SEC-016, comparé à `iat` par middleware/auth.js).
-- `sessions_revoked_at` est la MÊME marque, posée par la déconnexion : aucun
-- stockage de jetons révoqués n'est introduit, aucune table n'est créée, la
-- vérification reste une simple comparaison de dates — un jeton ne peut donc
-- pas « revenir » après une reconnexion.
--
-- SÉMANTIQUE POSÉE PAR LA ROUTE
--   * POST /api/auth/logout (défaut) : marque = `iat` de la session appelante.
--     Toutes les sessions ouvertes AVANT celle-ci (autres appareils,
--     navigateurs restés ouverts) sont fermées ; la session appelante reste
--     valide jusqu'à l'expiration de son jeton, et c'est le client qui efface
--     son jeton. POURQUOI ce défaut : un appelant qui enchaîne une
--     déconnexion puis un appel avec le même jeton (c'est ce que fait la
--     recette E2E de production) doit continuer à fonctionner ; invalider la
--     session appelante est un choix EXPLICITE.
--   * POST /api/auth/logout { "toutes_les_sessions": true } : marque = NOW(),
--     la session appelante est fermée aussi (le jeton suivant reçoit un 401).
--
-- NULL = aucune déconnexion enregistrée : aucun compte existant n'est
-- déconnecté par cette migration (les sessions en cours restent valides).
-- Additive et idempotente : aucune donnée réécrite.
-- ============================================================================

ALTER TABLE IF EXISTS users
  ADD COLUMN IF NOT EXISTS sessions_revoked_at TIMESTAMPTZ;

COMMENT ON COLUMN users.sessions_revoked_at IS
  'Instant de la dernière déconnexion enregistrée côté serveur. Un jeton dont `iat` est antérieur est refusé (401). NULL = jamais déconnecté.';
