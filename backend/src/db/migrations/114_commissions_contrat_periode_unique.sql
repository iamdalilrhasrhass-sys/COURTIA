-- ============================================================================
-- 114 — LA CHAÎNE « CONTRAT → COMMISSION » REDEVIENT ÉCRIVABLE
--
-- POURQUOI CETTE MIGRATION
-- Le code écrit les commissions avec un UPSERT :
--     INSERT INTO commissions (…) VALUES (…)
--     ON CONFLICT (user_id, contract_id, period_year, period_month) DO UPDATE …
-- Or la table `commissions` ne possède AUCUNE contrainte (ni index unique) sur ce
-- quatuor : PostgreSQL refuse la requête avant même de l'exécuter —
-- « there is no unique or exclusion constraint matching the ON CONFLICT
-- specification ». Défaut reproduit en production le 20/09/2026 :
--     POST /api/commissions/contracts/15 → 500
--     POST /api/commissions/calculate/15 → 500
-- Deux autres blocages se cachaient DERRIÈRE cette erreur (mesurés sur une copie
-- locale du schéma de production, une fois la contrainte posée) :
--   1. `commission_amount` est NOT NULL **sans valeur par défaut** : tout INSERT
--      qui ne la fournit pas échoue en 23502 (« null value in column
--      "commission_amount" »). Le code ne l'alimente jamais (elle vient d'un
--      schéma d'origine).
--   2. `commissions.contract_id` référence `contracts(id)` — une table
--      d'origine VIDE (0 ligne en production), alors que le « contrat » du
--      produit est une ligne de `quotes` : c'est `quotes` qu'écrit
--      POST /api/contrats, que liste GET /api/contrats, et que le service
--      commissions joint (`JOIN quotes q ON q.id = co.contract_id`). Sans
--      réparation, chaque commission d'un contrat réel violait la clé étrangère
--      (23503) : la chaîne contrat → commission restait morte.
--
-- CE QUE FAIT CETTE MIGRATION (additive, idempotente, rejouable)
--   1. Fusionne les éventuels DOUBLONS sur (user_id, contract_id, period_year,
--      period_month) — impossible de poser `UNIQUE` sinon. La ligne conservée
--      est la plus récente et elle REÇOIT le montant reçu le plus élevé observé :
--      aucun encaissement réel n'est perdu par la fusion.
--   2. Crée l'index unique attendu par le ON CONFLICT du code.
--   3. Donne à `commission_amount` la valeur par défaut 0 (la colonne reste
--      NOT NULL : les lignes existantes ne sont pas touchées).
--   4. Repointe la clé étrangère `contract_id` vers `quotes(id)` — la table
--      réellement utilisée comme contrat par l'application. `contracts` est vide
--      en production : aucune ligne existante n'est invalidée. La contrainte est
--      posée `NOT VALID` : les ÉCRITURES NOUVELLES sont contrôlées dès
--      maintenant, et une éventuelle ligne héritée pointant vers `contracts`
--      n'empêche pas la migration de s'appliquer (elle n'est jamais supprimée).
--   5. Renseigne `cabinet_id` des commissions existantes quand le cabinet du
--      client est connu (même règle que la migration 113) : sinon une commission
--      créée avant la migration resterait invisible pour le reste du cabinet.
--      Le backfill ne touche QUE `cabinet_id IS NULL` : aucune affectation déjà
--      posée n'est réécrite.
--
-- Aucune table n'est recréée, aucune colonne supprimée, aucune donnée effacée
-- en dehors des doublons fusionnés (dont le montant est reporté).
-- ============================================================================

-- ── 1. Fusion des doublons (au plus une ligne par contrat et par période) ───
DROP TABLE IF EXISTS _comm_doublons_114;
CREATE TEMP TABLE _comm_doublons_114 AS
SELECT user_id,
       contract_id,
       period_year,
       period_month,
       MAX(received_amount_cents) AS recu_max
  FROM commissions
 WHERE user_id      IS NOT NULL
   AND contract_id  IS NOT NULL
   AND period_year  IS NOT NULL
   AND period_month IS NOT NULL
 GROUP BY user_id, contract_id, period_year, period_month
HAVING COUNT(*) > 1;

DO $$
DECLARE
  groupe     RECORD;
  id_garde   integer;
BEGIN
  FOR groupe IN SELECT * FROM _comm_doublons_114 LOOP
    -- Ligne conservée : la plus récemment touchée, puis le plus grand id.
    SELECT id INTO id_garde
      FROM commissions
     WHERE user_id      = groupe.user_id
       AND contract_id  = groupe.contract_id
       AND period_year  = groupe.period_year
       AND period_month = groupe.period_month
     ORDER BY COALESCE(updated_at, created_at) DESC NULLS LAST, id DESC
     LIMIT 1;

    -- Le montant reçu le plus élevé du groupe est reporté sur la ligne gardée :
    -- on n'efface jamais un encaissement réel en supprimant un doublon.
    UPDATE commissions
       SET received_amount_cents = GREATEST(COALESCE(received_amount_cents, 0), COALESCE(groupe.recu_max, 0)),
           updated_at            = NOW()
     WHERE id = id_garde;

    DELETE FROM commissions
     WHERE user_id      = groupe.user_id
       AND contract_id  = groupe.contract_id
       AND period_year  = groupe.period_year
       AND period_month = groupe.period_month
       AND id <> id_garde;
  END LOOP;
END $$;

DROP TABLE IF EXISTS _comm_doublons_114;

-- ── 2. Contrainte unique : cible du ON CONFLICT (user_id, contract_id, année, mois) ──
CREATE UNIQUE INDEX IF NOT EXISTS commissions_user_contract_period_uniq
  ON commissions (user_id, contract_id, period_year, period_month);

-- ── 3. `commission_amount` NOT NULL sans défaut bloquait toute écriture ─────
ALTER TABLE commissions ALTER COLUMN commission_amount SET DEFAULT 0;

-- ── 4. La clé étrangère désigne le contrat RÉEL (quotes), pas la table vide `contracts` ──
DO $$
BEGIN
  -- L'ancienne contrainte pointait `contracts(id)` : on la retire pour repointer
  -- vers `quotes(id)`. `IF EXISTS` : rejouer la migration ne casse rien.
  ALTER TABLE commissions DROP CONSTRAINT IF EXISTS commissions_contract_id_fkey;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'commissions_contract_id_quotes_fkey'
       AND conrelid = 'commissions'::regclass
  ) THEN
    -- NOT VALID : les lignes existantes ne sont pas re-vérifiées (aucune donnée
    -- n'est supprimée ni modifiée), mais toute écriture à venir l'est.
    ALTER TABLE commissions
      ADD CONSTRAINT commissions_contract_id_quotes_fkey
      FOREIGN KEY (contract_id) REFERENCES quotes(id) NOT VALID;
  END IF;
END $$;

-- ── 5. Rattachement au cabinet des commissions déjà enregistrées ────────────
UPDATE commissions co
   SET cabinet_id = c.cabinet_id,
       updated_at = NOW()
  FROM quotes q
  JOIN clients c ON c.id = q.client_id
 WHERE co.contract_id = q.id
   AND co.cabinet_id IS NULL
   AND c.cabinet_id IS NOT NULL;
