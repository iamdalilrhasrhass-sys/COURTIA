-- ============================================================================
-- 109 — ACCÈS CLIENT : MOT DE PASSE TEMPORAIRE REMIS PAR COURTIA
--
-- POURQUOI CETTE MIGRATION
-- Jusqu'ici un cabinet mis en essai devait OBLIGATOIREMENT passer par un lien
-- d'activation (jeton 72 h) pour exister dans le produit : il ne pouvait pas se
-- connecter tant qu'il n'avait pas choisi son mot de passe. L'exploitant reçoit
-- désormais les identifiants directement (identifiant = e-mail, mot de passe
-- initial = nom du cabinet, première lettre en majuscule) et peut les
-- transmettre lui-même.
--
-- REGLE APPLIQUEE (décision du 20/09/2026)
--   - le compte créé pour un cabinet est utilisable IMMÉDIATEMENT : mot de passe
--     posé dès la création, haché par le même mécanisme que le reste du produit
--     (bcrypt, 10 tours) — jamais de mot de passe en clair en base ;
--   - l'essai de 7 jours court à partir de la création du compte (il n'y a plus
--     d'activation à attendre) ;
--   - le mot de passe initial est TEMPORAIRE : `must_change_password = true`
--     invite le cabinet à le remplacer dès la première connexion depuis
--     Paramètres > Sécurité. La colonne ne bride AUCUNE fonctionnalité : elle
--     informe l'interface, rien de plus.
--
-- Additive et idempotente : aucune table recréée, aucune donnée réécrite.
-- =======================================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ;

COMMENT ON COLUMN users.must_change_password IS
  'Vrai tant que le cabinet n''a pas remplacé le mot de passe initial remis par COURTIA. Purement informatif : n''interdit aucune route.';
COMMENT ON COLUMN users.password_changed_at IS
  'Horodatage du dernier changement de mot de passe effectué par le titulaire (Paramètres > Sécurité).';

-- Les comptes existants gardent leur mot de passe actuel : rien à convertir.
-- Les comptes encore en attente d'activation restent tels quels jusqu'à ce que
-- l'exploitant leur pose un mot de passe (voir scripts/../poser_mot_de_passe_essai).
