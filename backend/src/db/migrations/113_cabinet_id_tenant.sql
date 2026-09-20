-- ============================================================================
-- 113 — LES DONNÉES MÉTIER APPARTIENNENT AU CABINET (et non plus au seul user)
--
-- POURQUOI CETTE MIGRATION
-- Aujourd'hui chaque ligne métier est rattachée à UN utilisateur : `clients`
-- porte `courtier_id` = id de l'utilisateur propriétaire, `kanban_boards` porte
-- `courtier_id`, `appointments` porte `user_id`, `opportunites` porte
-- `broker_id`… Et les routes filtrent `… = req.user.id`.
-- Conséquence reproduite en production le 20/09/2026 : un collaborateur invité
-- (rôle `broker`) dans un cabinet voit 0 client alors que le propriétaire en
-- voit 1 — un cabinet à plusieurs commerciaux n'a donc pas de CRM commun.
--
-- MODÈLE RETENU (une seule ancre de tenant, pas de duplication)
--   * `clients.cabinet_id` est L'ANCRE DU TENANT. Tout ce qui pend d'un client
--     (quotes, contrats, documents clients, relances liées à un devis client,
--     opportunités adossées à un client…) hérite du cabinet par jointure :
--     on ne duplique donc PAS `cabinet_id` sur les enfants déjà rattachés à un
--     client, sous peine d'avoir deux vérités à maintenir.
--   * `cabinet_id` est ajouté UNIQUEMENT aux entités métier de premier niveau
--     qui ne dépendent pas d'un client : opportunités, tâches et rendez-vous,
--     tableaux et cartes kanban, devis (v1 `quote_requests` et devis guidé
--     `devis_wizard` — leur `client_id` est facultatif), commissions,
--     documents, relances.
--   * `courtier_id` / `broker_id` / `user_id` / `assigned_to` NE SONT PAS
--     SUPPRIMÉS : ils restent le CRÉATEUR et le propriétaire COMMERCIAL de la
--     ligne (affectation commerciale, statistiques par courtier, commissions).
--
-- COMPATIBILITÉ DES CABINETS MONO-UTILISATEUR
-- La colonne est NULLable et la portée applicative retombe sur
-- `courtier_id = utilisateur` dès qu'il n'y a pas de cabinet : les cabinets
-- déjà en production (dont trois des quatre comptes réels, sans ligne dans
-- `cabinet_members`) gardent EXACTEMENT leur comportement d'avant.
--
-- IDEMPOTENCE / REJOUABILITÉ
-- `ADD COLUMN IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, et chaque
-- backfill ne touche que les lignes où `cabinet_id IS NULL` : rejouer cette
-- migration ne réécrit jamais une affectation déjà posée, ni une donnée
-- pilote. Aucune table n'est recréée, aucune colonne n'est supprimée.
--
-- BACKFILL — RÈGLE UNIQUE
-- Le cabinet d'une ligne est celui de son utilisateur propriétaire, tel que
-- porté par `cabinet_members`. Plusieurs appartenances sont possibles : on
-- privilégie `owner`, puis `manager`, puis `broker`, puis `assistant`, puis
-- `viewer`, et à défaut la plus ancienne (`created_at`). C'est le même ordre
-- que celui utilisé par l'application pour choisir le cabinet courant.
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Les colonnes (additives, NULLables : jamais de NOT NULL rétroactif)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE clients        ADD COLUMN IF NOT EXISTS cabinet_id UUID;
ALTER TABLE opportunites   ADD COLUMN IF NOT EXISTS cabinet_id UUID;
ALTER TABLE opportunities  ADD COLUMN IF NOT EXISTS cabinet_id UUID;
ALTER TABLE appointments   ADD COLUMN IF NOT EXISTS cabinet_id UUID;
ALTER TABLE taches         ADD COLUMN IF NOT EXISTS cabinet_id UUID;
ALTER TABLE kanban_boards  ADD COLUMN IF NOT EXISTS cabinet_id UUID;
ALTER TABLE kanban_cards   ADD COLUMN IF NOT EXISTS cabinet_id UUID;
ALTER TABLE quote_requests ADD COLUMN IF NOT EXISTS cabinet_id UUID;
ALTER TABLE devis_wizard   ADD COLUMN IF NOT EXISTS cabinet_id UUID;
ALTER TABLE commissions    ADD COLUMN IF NOT EXISTS cabinet_id UUID;
ALTER TABLE documents      ADD COLUMN IF NOT EXISTS cabinet_id UUID;
ALTER TABLE relances       ADD COLUMN IF NOT EXISTS cabinet_id UUID;

COMMENT ON COLUMN clients.cabinet_id IS
  'Ancre du tenant : cabinet propriétaire des données. NULL = cabinet mono-utilisateur (la portée retombe sur courtier_id).';
COMMENT ON COLUMN opportunites.cabinet_id IS
  'Cabinet propriétaire de l''opportunité. broker_id reste le courtier en charge.';
COMMENT ON COLUMN appointments.cabinet_id IS
  'Cabinet propriétaire du rendez-vous/tâche. user_id et organizer_id restent l''affectation commerciale.';
COMMENT ON COLUMN taches.cabinet_id IS
  'Cabinet propriétaire de la tâche. courtier_id reste le courtier en charge.';
COMMENT ON COLUMN kanban_boards.cabinet_id IS
  'Cabinet propriétaire du tableau kanban. courtier_id reste le créateur du tableau.';
COMMENT ON COLUMN kanban_cards.cabinet_id IS
  'Cabinet propriétaire de la carte kanban, dénormalisé depuis le tableau pour pouvoir filtrer sans jointure.';
COMMENT ON COLUMN quote_requests.cabinet_id IS
  'Cabinet propriétaire du devis v1. broker_id reste le créateur du devis.';
COMMENT ON COLUMN devis_wizard.cabinet_id IS
  'Cabinet propriétaire du devis guidé. user_id reste le créateur du devis.';
COMMENT ON COLUMN commissions.cabinet_id IS
  'Cabinet propriétaire de la commission. user_id reste le courtier bénéficiaire.';
COMMENT ON COLUMN documents.cabinet_id IS
  'Cabinet propriétaire du document. uploaded_by/user_id restent l''auteur du dépôt.';
COMMENT ON COLUMN relances.cabinet_id IS
  'Cabinet propriétaire de la relance. Aucune affectation commerciale propre : elle suit le client.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Backfill — l'ancre d'abord : clients
-- ─────────────────────────────────────────────────────────────────────────────

UPDATE clients c
   SET cabinet_id = m.cabinet_id
  FROM (
        SELECT DISTINCT ON (user_id) user_id, cabinet_id
          FROM cabinet_members
         WHERE removed_at IS NULL
         ORDER BY user_id,
                  CASE role
                    WHEN 'owner'   THEN 0
                    WHEN 'manager' THEN 1
                    WHEN 'broker'  THEN 2
                    WHEN 'assistant' THEN 3
                    WHEN 'viewer'  THEN 4
                    ELSE 5
                  END,
                  created_at ASC
       ) m
 WHERE c.cabinet_id IS NULL
   AND c.courtier_id = m.user_id;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Backfill — les enfants d'un client héritent du cabinet du client,
--    les entités de premier niveau de celui de leur utilisateur propriétaire.
--    L'ordre compte : chaque table peut s'appuyer sur celle qui précède.
-- ─────────────────────────────────────────────────────────────────────────────

-- Devis v1 : par le client, sinon par le créateur.
-- (deux UPDATE successifs plutôt qu'une jointure : PostgreSQL interdit de
--  référencer la table cible dans le ON d'une jointure de la clause FROM)
UPDATE quote_requests qr
   SET cabinet_id = c.cabinet_id
  FROM clients c
 WHERE qr.cabinet_id IS NULL
   AND qr.client_id = c.id
   AND c.cabinet_id IS NOT NULL;

UPDATE quote_requests qr
   SET cabinet_id = m.cabinet_id
  FROM (
        SELECT DISTINCT ON (user_id) user_id, cabinet_id
          FROM cabinet_members WHERE removed_at IS NULL
         ORDER BY user_id, CASE role WHEN 'owner' THEN 0 WHEN 'manager' THEN 1
                                     WHEN 'broker' THEN 2 WHEN 'assistant' THEN 3
                                     ELSE 4 END, created_at ASC
       ) m
 WHERE qr.cabinet_id IS NULL
   AND qr.broker_id = m.user_id;

-- Devis guidé (v2) : par le client, sinon par le créateur.
UPDATE devis_wizard d
   SET cabinet_id = c.cabinet_id
  FROM clients c
 WHERE d.cabinet_id IS NULL
   AND d.client_id = c.id
   AND c.cabinet_id IS NOT NULL;

UPDATE devis_wizard d
   SET cabinet_id = m.cabinet_id
  FROM (
        SELECT DISTINCT ON (user_id) user_id, cabinet_id
          FROM cabinet_members WHERE removed_at IS NULL
         ORDER BY user_id, CASE role WHEN 'owner' THEN 0 WHEN 'manager' THEN 1
                                     WHEN 'broker' THEN 2 WHEN 'assistant' THEN 3
                                     ELSE 4 END, created_at ASC
       ) m
 WHERE d.cabinet_id IS NULL
   AND d.user_id = m.user_id;

-- Rendez-vous / tâches : par le client, sinon par l'organisateur.
UPDATE appointments a
   SET cabinet_id = c.cabinet_id
  FROM clients c
 WHERE a.cabinet_id IS NULL
   AND a.client_id = c.id
   AND c.cabinet_id IS NOT NULL;

UPDATE appointments a
   SET cabinet_id = m.cabinet_id
  FROM (
        SELECT DISTINCT ON (user_id) user_id, cabinet_id
          FROM cabinet_members WHERE removed_at IS NULL
         ORDER BY user_id, CASE role WHEN 'owner' THEN 0 WHEN 'manager' THEN 1
                                     WHEN 'broker' THEN 2 WHEN 'assistant' THEN 3
                                     ELSE 4 END, created_at ASC
       ) m
 WHERE a.cabinet_id IS NULL
   AND COALESCE(a.user_id, a.organizer_id) = m.user_id;

-- Tâches (table `taches`, distincte de `appointments`)
UPDATE taches t
   SET cabinet_id = m.cabinet_id
  FROM (
        SELECT DISTINCT ON (user_id) user_id, cabinet_id
          FROM cabinet_members WHERE removed_at IS NULL
         ORDER BY user_id, CASE role WHEN 'owner' THEN 0 WHEN 'manager' THEN 1
                                     WHEN 'broker' THEN 2 WHEN 'assistant' THEN 3
                                     ELSE 4 END, created_at ASC
       ) m
 WHERE t.cabinet_id IS NULL
   AND COALESCE(t.courtier_id, t.user_id) = m.user_id;

-- Opportunités : par l'utilisateur propriétaire (broker_id puis user_id)
UPDATE opportunites o
   SET cabinet_id = m.cabinet_id
  FROM (
        SELECT DISTINCT ON (user_id) user_id, cabinet_id
          FROM cabinet_members WHERE removed_at IS NULL
         ORDER BY user_id, CASE role WHEN 'owner' THEN 0 WHEN 'manager' THEN 1
                                     WHEN 'broker' THEN 2 WHEN 'assistant' THEN 3
                                     ELSE 4 END, created_at ASC
       ) m
 WHERE o.cabinet_id IS NULL
   AND o.broker_id = m.user_id;

UPDATE opportunites o
   SET cabinet_id = m.cabinet_id
  FROM (
        SELECT DISTINCT ON (user_id) user_id, cabinet_id
          FROM cabinet_members WHERE removed_at IS NULL
         ORDER BY user_id, CASE role WHEN 'owner' THEN 0 WHEN 'manager' THEN 1
                                     WHEN 'broker' THEN 2 WHEN 'assistant' THEN 3
                                     ELSE 4 END, created_at ASC
       ) m
 WHERE o.cabinet_id IS NULL
   AND o.user_id = m.user_id;

-- Table historique `opportunities` (user_id uniquement)
UPDATE opportunities o
   SET cabinet_id = m.cabinet_id
  FROM (
        SELECT DISTINCT ON (user_id) user_id, cabinet_id
          FROM cabinet_members WHERE removed_at IS NULL
         ORDER BY user_id, CASE role WHEN 'owner' THEN 0 WHEN 'manager' THEN 1
                                     WHEN 'broker' THEN 2 WHEN 'assistant' THEN 3
                                     ELSE 4 END, created_at ASC
       ) m
 WHERE o.cabinet_id IS NULL
   AND o.user_id = m.user_id;

-- Documents : par le client rattaché, sinon par le déposant.
UPDATE documents d
   SET cabinet_id = c.cabinet_id
  FROM clients c
 WHERE d.cabinet_id IS NULL
   AND d.client_id = c.id
   AND c.cabinet_id IS NOT NULL;

UPDATE documents d
   SET cabinet_id = m.cabinet_id
  FROM (
        SELECT DISTINCT ON (user_id) user_id, cabinet_id
          FROM cabinet_members WHERE removed_at IS NULL
         ORDER BY user_id, CASE role WHEN 'owner' THEN 0 WHEN 'manager' THEN 1
                                     WHEN 'broker' THEN 2 WHEN 'assistant' THEN 3
                                     ELSE 4 END, created_at ASC
       ) m
 WHERE d.cabinet_id IS NULL
   AND COALESCE(d.user_id, d.uploaded_by) = m.user_id;

-- Relances : par le client, sinon par le devis v1 rattaché.
UPDATE relances r
   SET cabinet_id = c.cabinet_id
  FROM clients c
 WHERE r.cabinet_id IS NULL
   AND r.client_id = c.id
   AND c.cabinet_id IS NOT NULL;

UPDATE relances r
   SET cabinet_id = qr.cabinet_id
  FROM quote_requests qr
 WHERE r.cabinet_id IS NULL
   AND r.quote_request_id = qr.id
   AND qr.cabinet_id IS NOT NULL;

-- Commissions : par le contrat, donc par le client du contrat.
UPDATE commissions co
   SET cabinet_id = c.cabinet_id
  FROM contracts ct
  JOIN clients c ON c.id = ct.client_id
 WHERE co.cabinet_id IS NULL
   AND co.contract_id = ct.id
   AND c.cabinet_id IS NOT NULL;

UPDATE commissions co
   SET cabinet_id = m.cabinet_id
  FROM (
        SELECT DISTINCT ON (user_id) user_id, cabinet_id
          FROM cabinet_members WHERE removed_at IS NULL
         ORDER BY user_id, CASE role WHEN 'owner' THEN 0 WHEN 'manager' THEN 1
                                     WHEN 'broker' THEN 2 WHEN 'assistant' THEN 3
                                     ELSE 4 END, created_at ASC
       ) m
 WHERE co.cabinet_id IS NULL
   AND co.user_id = m.user_id;

-- Tableaux kanban : par le créateur (courtier_id).
UPDATE kanban_boards kb
   SET cabinet_id = m.cabinet_id
  FROM (
        SELECT DISTINCT ON (user_id) user_id, cabinet_id
          FROM cabinet_members WHERE removed_at IS NULL
         ORDER BY user_id, CASE role WHEN 'owner' THEN 0 WHEN 'manager' THEN 1
                                     WHEN 'broker' THEN 2 WHEN 'assistant' THEN 3
                                     ELSE 4 END, created_at ASC
       ) m
 WHERE kb.cabinet_id IS NULL
   AND kb.courtier_id = m.user_id;

-- Cartes kanban : par le tableau, sinon par le client de la carte.
UPDATE kanban_cards kc
   SET cabinet_id = kb.cabinet_id
  FROM kanban_boards kb
 WHERE kc.cabinet_id IS NULL
   AND kc.board_id = kb.id
   AND kb.cabinet_id IS NOT NULL;

UPDATE kanban_cards kc
   SET cabinet_id = c.cabinet_id
  FROM clients c
 WHERE kc.cabinet_id IS NULL
   AND kc.client_id = c.id
   AND c.cabinet_id IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Index — la portée cabinet est lue à CHAQUE requête métier.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_clients_cabinet_id        ON clients (cabinet_id);
CREATE INDEX IF NOT EXISTS idx_opportunites_cabinet_id   ON opportunites (cabinet_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_cabinet_id  ON opportunities (cabinet_id);
CREATE INDEX IF NOT EXISTS idx_appointments_cabinet_id   ON appointments (cabinet_id);
CREATE INDEX IF NOT EXISTS idx_taches_cabinet_id         ON taches (cabinet_id);
CREATE INDEX IF NOT EXISTS idx_kanban_boards_cabinet_id  ON kanban_boards (cabinet_id);
CREATE INDEX IF NOT EXISTS idx_kanban_cards_cabinet_id   ON kanban_cards (cabinet_id);
CREATE INDEX IF NOT EXISTS idx_quote_requests_cabinet_id ON quote_requests (cabinet_id);
CREATE INDEX IF NOT EXISTS idx_devis_wizard_cabinet_id   ON devis_wizard (cabinet_id);
CREATE INDEX IF NOT EXISTS idx_commissions_cabinet_id    ON commissions (cabinet_id);
CREATE INDEX IF NOT EXISTS idx_documents_cabinet_id      ON documents (cabinet_id);
CREATE INDEX IF NOT EXISTS idx_relances_cabinet_id       ON relances (cabinet_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Contrôle de couverture (informatif) — combien de lignes orphelines
--    restent sans cabinet ET sans utilisateur rattaché à un cabinet :
--    ce sont les cabinets mono-utilisateur, explicitement supportés.
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  restant BIGINT;
BEGIN
  SELECT COUNT(*) INTO restant FROM clients WHERE cabinet_id IS NULL;
  RAISE NOTICE '113 : clients sans cabinet (mono-utilisateur, comportement conservé) = %', restant;
END $$;
