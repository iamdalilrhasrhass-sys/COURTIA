-- ============================================================================
-- 102 — appointments.organizer_id : colonne héritée, jamais lue, jamais fournie
--
-- CONSTAT MESURÉ (20/09/2026) sur une base reconstruite (40 migrations, 0 erreur) :
--   POST /api/taches  ->  500
--   « null value in column "organizer_id" of relation "appointments"
--      violates not-null constraint »
--
-- Cause : `organizer_id` est déclarée NOT NULL par le schéma historique, mais
-- AUCUN lecteur ne l'utilise (vérifié : seul seed.js la mentionne, aucun
-- service, aucune route, aucune requête de lecture). Or les quatre chemins qui
-- créent une tâche — routes/taches.js, jobs/autoTasks.js (2 insertions) et
-- services/importService.js — fournissent `user_id` (la colonne que
-- autoTasks/gamificationService lisent réellement) et omettent organizer_id.
-- Résultat : la création de tâche échouait systématiquement, et l'écran Tâches
-- affichait à la place un jeu de données inventé.
--
-- Ce que fait cette migration : elle rend la colonne facultative, sans rien
-- supprimer ni renommer, et sans toucher à `user_id` qui reste la propriété
-- réelle de la tâche. routes/taches.js renseigne désormais organizer_id quand
-- l'information existe.
-- ============================================================================

ALTER TABLE appointments
  ALTER COLUMN organizer_id DROP NOT NULL;

-- `end_time` est dans le même cas : déclarée NOT NULL par le schéma historique,
-- mais aucune tâche n'a d'heure de fin (l'écran Tâches ne demande qu'une
-- échéance). Sans cela, POST /api/taches échouait en 500 sur cette seconde
-- colonne juste après organizer_id — le même symptôme déplacé.
-- Les rendez-vous du calendrier continuent de renseigner end_time.
ALTER TABLE appointments
  ALTER COLUMN end_time DROP NOT NULL;

COMMENT ON COLUMN appointments.organizer_id IS
  'Colonne historique facultative. La propriété de la tâche est appointments.user_id (lue par jobs/autoTasks.js et services/gamificationService.js).';
COMMENT ON COLUMN appointments.end_time IS
  'Fin facultative. Une tâche créée depuis l''écran Tâches n''en a pas ; un rendez-vous du calendrier oui.';
