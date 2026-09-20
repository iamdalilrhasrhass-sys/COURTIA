-- ============================================================================
-- 115 — AFFECTATION D'UNE CARTE KANBAN À UN COLLABORATEUR
--
-- POURQUOI CETTE MIGRATION
-- L'écran de pipeline propose d'affecter une carte à un collaborateur
-- (`PATCH /api/kanban/cards/:id` avec `assigned_to`). Or `kanban_cards` n'avait
-- AUCUNE colonne d'affectation : le PATCH refusait la requête faute de champ
-- connu (« Aucun champ à mettre à jour ») et, quand d'autres champs étaient
-- envoyés en même temps, l'affectation était ignorée en SILENCE — l'écran
-- proposait donc une action sans effet (défaut relevé le 20/09/2026).
--
-- MODÈLE
-- `assigned_to` est un identifiant d'UTILISATEUR (integer, comme
-- `clients.courtier_id`), NULLable : NULL = carte non affectée. La colonne est
-- l'AFFECTATION COMMERCIALE de la carte ; la portée (quel cabinet peut la
-- modifier) reste portée par le TABLEAU, exactement comme avant
-- (`kanban_boards.cabinet_id`, migration 113). L'API refuse d'affecter une
-- carte à un utilisateur qui n'appartient pas au cabinet du tableau : sans ce
-- contrôle, une affectation pourrait désigner un collaborateur d'un AUTRE
-- cabinet.
--
-- IDEMPOTENCE / ADDITIVITÉ
-- `ADD COLUMN IF NOT EXISTS` + `CREATE INDEX IF NOT EXISTS` : rejouer cette
-- migration ne modifie aucune donnée, ne supprime aucune colonne et laisse
-- intactes les cartes existantes (toutes restent non affectées).
-- ============================================================================

ALTER TABLE IF EXISTS kanban_cards
  ADD COLUMN IF NOT EXISTS assigned_to INTEGER;

COMMENT ON COLUMN kanban_cards.assigned_to IS
  'Collaborateur (users.id) en charge de la carte. NULL = non affectée. L''appartenance au cabinet est vérifiée par l''API contre cabinet_members.';

-- L'écran « mes cartes » filtre par affectation : sans index, chaque
-- chargement de pipeline ferait un parcours complet.
CREATE INDEX IF NOT EXISTS idx_kanban_cards_assigned_to
  ON kanban_cards (assigned_to);
