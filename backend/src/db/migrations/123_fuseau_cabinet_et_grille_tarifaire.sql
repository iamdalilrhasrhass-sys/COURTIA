-- ============================================================================
-- 123 — FUSEAU DES TÂCHES = CELUI DU MARCHÉ DU CABINET, ET GRILLE TARIFAIRE
--       FRANÇAISE EXPLICITEMENT IDENTIFIÉE (deuxième QA adverse, 20/09/2026)
--
-- POURQUOI CETTE MIGRATION
--
-- DÉFAUT 1 (P2) — `appointments.timezone` portait encore
--   `DEFAULT 'Europe/Paris'::character varying` en base :
--     SELECT column_name, column_default FROM information_schema.columns
--      WHERE table_name='appointments' AND column_name='timezone';
--     --  timezone | 'Europe/Paris'::character varying
--   Tous les writers de `appointments` OMETTENT la colonne : la valeur par
--   défaut décidait donc, et une tâche créée par un cabinet SUISSE était
--   estampillée « Europe/Paris » (mesuré en production sur POST /api/taches).
--   La migration 120 avait volontairement laissé ce défaut en place le temps que
--   les writers écrivent le fuseau du marché (sinon la colonne serait passée à
--   NULL). C'est chose faite dans le même lot :
--     • routes/taches.js           → fuseau du marché à la création ;
--     • jobs/autoTasks.js          → fuseau du marché (tâches automatiques) ;
--     • services/importService.js  → fuseau du marché (import de portefeuille).
--   La source est UNIQUE et déjà existante : lib/marcheCabinet.FUSEAUX
--   (`FR` → Europe/Paris, `CH` → Europe/Zurich), résolue depuis le CABINET
--   (cabinet → référent → profil mono-utilisateur → France).
--
-- DÉFAUT 2 (P2) — la grille tarifaire FRANÇAISE subsistait en base alors que
--   l'API sert la grille suisse depuis le code (199 / 349 CHF HT, TVA 8,1 %) :
--     billing_plans : starter=8900 EUR | pro=15900 EUR | cabinet/premium EUR
--     pricing_config: Starter 15.00 EUR | Pro 50.00 EUR | Premium 200.00 EUR
--     plan_addons   : capitia — « Module Financement IOBSP » — 49 EUR/mois
--                     (« 2 000–5 000 €/dossier signé »)
--   L'affichage des offres est correct (il vient du CODE, pas de ces tables),
--   mais rien en base ne disait que ces lignes sont une grille NATIONALE
--   française : elles restaient lisibles et exploitables comme s'il s'agissait
--   des tarifs du produit.
--
-- CHOIX RETENU POUR LA GRILLE : NEUTRALISER PAR L'EXPLICITE, PAS PAR LA
-- SUPPRESSION DE L'HISTORIQUE.
--   • `billing_plans` est réécrite à CHAQUE démarrage par
--     `services/billingService.ensureBillingFoundation()` (INSERT … ON CONFLICT
--     DO UPDATE de `starter`/`pro`/`cabinet` avec des montants en euros) :
--     supprimer ces lignes serait SANS EFFET (elles reviennent au prochain
--     démarrage) et supprimer la colonne casserait les jointures
--     d'abonnement (`subscriptions.plan_id`, adminSuperAdmin, getBillingStatus).
--   • `pricing_config` est lue par le tableau de bord de coûts de l'exploitant
--     (`routes/adminCosts.js`) pour les quotas IA : ce n'est pas une grille
--     client, mais elle affiche un prix mensuel en euros.
--   • `plan_addons` n'est PLUS lue par le code (vérifié : aucune occurrence hors
--     migrations) ; la ligne CAPITIA est conservée comme historique, marquée.
--   La colonne `grille_marche` est donc ajoutée aux trois tables, renseignée
--   ('FR' pour les lignes en euros, 'CH' pour celles en francs), commentée, et un
--   contrôle final ÉCHOUE si une offre en euros reste non identifiée. Aucune
--   donnée n'est supprimée, aucun montant n'est INVENTÉ : aucun prix suisse
--   n'est écrit ici (la grille suisse vient du code).
--
-- CE QUE CETTE MIGRATION N'ÉCRIT JAMAIS : un prix. Les seules valeurs posées
-- sont des ÉTIQUETTES de provenance ('FR' / 'CH') et la suppression d'un défaut
-- de colonne.
--
-- IDEMPOTENCE / REJOUABILITÉ
--   `DROP DEFAULT` est sans effet si la colonne n'en a plus ; chaque ALTER est
--   précédé d'un test d'existence (table + colonne) via `information_schema` ;
--   `ADD COLUMN IF NOT EXISTS` et les `UPDATE … WHERE grille_marche IS NULL`
--   rendent le fichier rejouable sur une base neuve comme partiellement migrée.
--   Aucun DROP COLUMN, aucun DELETE.
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. `appointments.timezone` : plus aucune référence nationale par défaut.
--    Le fuseau est ÉCRIT par le code, depuis le marché du cabinet.
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name   = 'appointments'
       AND column_name  = 'timezone'
  ) THEN
    EXECUTE 'ALTER TABLE public.appointments ALTER COLUMN timezone DROP DEFAULT';
    EXECUTE $c$COMMENT ON COLUMN appointments.timezone IS
      'Fuseau horaire de la tache/du rendez-vous, ECRIT par le code depuis le marche du CABINET (lib/marcheCabinet.FUSEAUX : Europe/Zurich en Suisse, Europe/Paris en France). Plus de valeur par defaut francaise : une tache d''un cabinet suisse ne doit plus porter une reference etrangere.'$c$;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Grille tarifaire : rendre EXPLICITE la provenance nationale de chaque offre
--    (colonne `grille_marche`) au lieu de laisser une grille euro muette.
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  -- 2.a billing_plans — offres d'abonnement (lues par la facturation).
  IF EXISTS (SELECT 1 FROM information_schema.tables
              WHERE table_schema = 'public' AND table_name = 'billing_plans') THEN
    EXECUTE 'ALTER TABLE public.billing_plans ADD COLUMN IF NOT EXISTS grille_marche VARCHAR(8)';
    EXECUTE $u$UPDATE public.billing_plans
                 SET grille_marche = 'FR'
               WHERE grille_marche IS NULL
                 AND (currency IS NULL OR upper(currency) = 'EUR')$u$;
    EXECUTE $u$UPDATE public.billing_plans
                 SET grille_marche = 'CH'
               WHERE grille_marche IS NULL
                 AND upper(currency) = 'CHF'$u$;
    EXECUTE $c$COMMENT ON COLUMN billing_plans.grille_marche IS
      'Grille nationale dont vient l''offre : FR = grille France historique (montants en euros), CH = grille suisse. Les offres servies a un cabinet dependent de son MARCHE (lib/marcheCabinet) et sont resolues par le CODE (billingService.getPlans), jamais lues telles quelles dans cette table : une ligne FR n''est JAMAIS servie a un cabinet suisse.'$c$;
    EXECUTE $c$COMMENT ON TABLE billing_plans IS
      'Offres d''abonnement. La/les lignes marquees grille_marche = FR sont la grille France historique (montants en euros) : elles ne sont pas servies a un cabinet suisse, dont la grille (CHF) vient du code.'$c$;
  END IF;

  -- 2.b pricing_config — tableau de bord de coûts de l'exploitant.
  IF EXISTS (SELECT 1 FROM information_schema.tables
              WHERE table_schema = 'public' AND table_name = 'pricing_config') THEN
    EXECUTE 'ALTER TABLE public.pricing_config ADD COLUMN IF NOT EXISTS grille_marche VARCHAR(8)';
    EXECUTE $u$UPDATE public.pricing_config SET grille_marche = 'FR' WHERE grille_marche IS NULL$u$;
    EXECUTE $c$COMMENT ON COLUMN pricing_config.grille_marche IS
      'Grille nationale de reference : FR = grille France historique (monthly_price_eur). Table INTERNE d''exploitation (cout et quotas IA, routes/adminCosts.js) : elle n''est jamais servie a un cabinet, et aucun de ses montants n''est une offre commerciale.'$c$;
  END IF;

  -- 2.c plan_addons — catalogue des modules optionnels (plus lu par le code).
  IF EXISTS (SELECT 1 FROM information_schema.tables
              WHERE table_schema = 'public' AND table_name = 'plan_addons') THEN
    EXECUTE 'ALTER TABLE public.plan_addons ADD COLUMN IF NOT EXISTS grille_marche VARCHAR(8)';
    EXECUTE $u$UPDATE public.plan_addons SET grille_marche = 'FR' WHERE grille_marche IS NULL$u$;
    EXECUTE $c$COMMENT ON COLUMN plan_addons.grille_marche IS
      'Grille nationale de l''historique : FR = grille France (price_monthly_eur, description en euros et registre IOBSP). Le module CAPITIA n''est PAS propose a un cabinet suisse (routes/capitia et l''ecran le refusent) : cette ligne est un historique, pas une offre servie.'$c$;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. CONTRÔLES — une base qui échoue ici est une base qui fabrique encore une
--    référence française (fuseau) ou qui garde une offre euro non identifiée.
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  defaut_fuseau TEXT;
  offres_muettes INTEGER;
BEGIN
  -- 3.a Plus aucun défaut de colonne portant un fuseau national sur appointments.
  SELECT column_default
    INTO defaut_fuseau
    FROM information_schema.columns
   WHERE table_schema = 'public'
     AND table_name   = 'appointments'
     AND column_name  = 'timezone'
     AND column_default IS NOT NULL;

  IF defaut_fuseau IS NOT NULL THEN
    RAISE EXCEPTION 'appointments.timezone porte encore un defaut de colonne (%) : le fuseau doit venir du marche du cabinet.', defaut_fuseau;
  END IF;

  -- 3.b Aucune offre en euros ne doit rester sans étiquette de provenance.
  IF EXISTS (SELECT 1 FROM information_schema.tables
              WHERE table_schema = 'public' AND table_name = 'billing_plans') THEN
    SELECT COUNT(*) INTO offres_muettes
      FROM public.billing_plans
     WHERE grille_marche IS NULL;

    IF offres_muettes > 0 THEN
      RAISE EXCEPTION '% offre(s) de billing_plans sans grille_marche : une grille nationale doit etre identifiee (FR/CH).', offres_muettes;
    END IF;
  END IF;
END $$;
