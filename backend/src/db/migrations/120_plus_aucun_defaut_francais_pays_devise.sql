-- ============================================================================
-- 120 — PLUS AUCUN DÉFAUT DE COLONNE FRANÇAIS (pays, devise, tutelle)
--
-- POURQUOI CETTE MIGRATION
-- La migration 117 a retiré les défauts « France » et « ACPR » de `cabinets`,
-- mais le reste du schéma en portait encore, mesurés en production le
-- 20/09/2026 (information_schema, base de production) :
--     clients.country                        DEFAULT 'France'
--     broker_profile_settings.country        DEFAULT 'France'
--     broker_profile_settings.supervisor_name DEFAULT 'ACPR'
--     broker_profile_settings.supervisor_address
--                                        DEFAULT '4 place de Budapest … PARIS'
--     organization_profiles.country          DEFAULT 'France'
--     commissions.currency                   DEFAULT 'eur'
--     billing_invoices.currency              DEFAULT 'eur'
--     invoices.currency                      DEFAULT 'EUR'
--     billing_plans.currency                 DEFAULT 'EUR'
--     accounting_entries.idevise             DEFAULT 'EUR'
-- Défaut P0 (CH-005) reproduit : `POST /api/clients` sans champ `country`
-- (le cas normal — l'écran de création ne demande pas le pays) écrit NULL,
-- PostgreSQL applique alors le DÉFAUT DE COLONNE, et le client devient
-- FRANÇAIS. Ce n'est pas une saisie : c'est la base qui décide du pays d'un
-- client, et elle décide « France » pour les cabinets suisses aussi. Même
-- mécanique pour la devise des commissions (P1 CH-013) : toute commission
-- insérée sans devise explicite naissait en euros.
--
-- RÈGLE POSÉE ICI : un DÉFAUT DE COLONNE ne doit jamais devenir une donnée
-- métier. Le pays d'un client reste VIDE tant que personne ne l'a saisi
-- (jamais « France » par défaut) ; la devise d'un montant est écrite par le
-- code depuis le marché du CABINET (`lib/marcheCabinet.js`), jamais devinée
-- par la base ; l'autorité de tutelle et son adresse ne sont pas fabriquées.
--
-- CE QUE CETTE MIGRATION FAIT
--   1. Retire les DÉFAUTS de colonne listés ci-dessus (ALTER … DROP DEFAULT).
--   2. Documente chaque colonne touchée (COMMENT ON COLUMN) pour que la règle
--      survive à la prochaine relecture du schéma.
--   3. Vérifie à la fin qu'aucun défaut français ne subsiste sur les colonnes
--      de pays / devise / tutelle et ÉCHOUE si c'est le cas.
--
-- CE QUE CETTE MIGRATION NE FAIT PAS
--   • Aucune ligne n'est modifiée ni supprimée : un défaut de colonne n'est pas
--     une donnée, et les lignes existantes (vérifié en production : 0 ligne
--     dans clients, commissions, invoices, billing_invoices,
--     accounting_entries, broker_profile_settings) ne sont pas touchées.
--   • Aucune colonne n'est renommée ni retypée ; les noms historiques restent
--     en place (les écrans et les API les lisent).
--   • Les tables de catalogue (`billing_plans`) gardent leurs lignes : seule la
--     valeur par défaut disparaît, et `billingService` écrit la devise de
--     chaque offre explicitement.
--
-- IDEMPOTENCE / REJOUABILITÉ
--   `ALTER TABLE … ALTER COLUMN … DROP DEFAULT` est sans effet (et sans erreur)
--   quand la colonne n'a plus de défaut, et chaque alter est précédé d'un test
--   d'existence de la colonne : le fichier peut donc être rejoué à volonté,
--   sur une base partiellement migrée comme sur une base neuve.
--
-- ATTENTION — `appointments.timezone DEFAULT 'Europe/Paris'` N'EST PAS TRAITÉ ICI
--   Tous les writers de `appointments` (src/jobs/autoTasks.js, création de
--   rendez-vous) OMETTENT la colonne : le défaut est donc la SEULE valeur posée.
--   Retirer le défaut sans leur faire écrire le fuseau du cabinet écrirait NULL
--   et casserait la synchronisation d'agenda. Le correctif complet (fuseau lu
--   depuis `lib/marcheCabinet.fuseauDuMarche`) touche les writers d'agenda et
--   fait l'objet d'un lot séparé : il est signalé comme restant ouvert.
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Retirer les défauts : une colonne absente est simplement ignorée.
--    (Garde `information_schema` : la table OU la colonne peut manquer sur une
--     base reconstruite depuis `database/schema.sql`)
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  cible RECORD;
  colonnes_a_nettoyer TEXT[][] := ARRAY[
    ['clients',                 'country'],
    ['broker_profile_settings', 'country'],
    ['broker_profile_settings', 'supervisor_name'],
    ['broker_profile_settings', 'supervisor_address'],
    ['organization_profiles',   'country'],
    ['commissions',             'currency'],
    ['billing_invoices',        'currency'],
    ['invoices',                'currency'],
    ['billing_plans',           'currency'],
    ['accounting_entries',      'idevise']
  ];
  i INTEGER;
BEGIN
  FOR i IN 1 .. array_length(colonnes_a_nettoyer, 1) LOOP
    IF EXISTS (
      SELECT 1
        FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name   = colonnes_a_nettoyer[i][1]
         AND column_name  = colonnes_a_nettoyer[i][2]
    ) THEN
      EXECUTE format(
        'ALTER TABLE public.%I ALTER COLUMN %I DROP DEFAULT',
        colonnes_a_nettoyer[i][1], colonnes_a_nettoyer[i][2]
      );
    END IF;
  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Documenter les colonnes : la règle doit survivre au fichier de migration.
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_schema='public' AND table_name='clients' AND column_name='country') THEN
    EXECUTE $c$COMMENT ON COLUMN clients.country IS
      'Pays du CLIENT (pas celui du cabinet). Vide = non renseigne : jamais ''France'' par defaut. Un client cree sans pays reste sans pays jusqu''a sa saisie.'$c$;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_schema='public' AND table_name='broker_profile_settings' AND column_name='country') THEN
    EXECUTE $c$COMMENT ON COLUMN broker_profile_settings.country IS
      'Pays d''etablissement du courtier. Vide = non renseigne : plus de ''France'' par defaut (un cabinet suisse naissait en France).'$c$;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_schema='public' AND table_name='broker_profile_settings' AND column_name='supervisor_name') THEN
    EXECUTE $c$COMMENT ON COLUMN broker_profile_settings.supervisor_name IS
      'Autorite de tutelle REELLE du courtier. Vide = non renseigne : plus d''ACPR par defaut (l''ACPR n''a aucune competence hors de France).'$c$;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_schema='public' AND table_name='broker_profile_settings' AND column_name='supervisor_address') THEN
    EXECUTE $c$COMMENT ON COLUMN broker_profile_settings.supervisor_address IS
      'Adresse de l''autorite de tutelle REELLE. Vide = non renseigne : plus d''adresse parisienne par defaut.'$c$;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_schema='public' AND table_name='organization_profiles' AND column_name='country') THEN
    EXECUTE $c$COMMENT ON COLUMN organization_profiles.country IS
      'Pays d''etablissement de l''organisation. Vide = non renseigne : plus de ''France'' par defaut.'$c$;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_schema='public' AND table_name='commissions' AND column_name='currency') THEN
    EXECUTE $c$COMMENT ON COLUMN commissions.currency IS
      'Devise de la commission, ecrite par le code depuis le marche du CABINET (CHF en Suisse, EUR en France — lib/marcheCabinet). Plus de ''eur'' par defaut.'$c$;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_schema='public' AND table_name='billing_plans' AND column_name='currency') THEN
    EXECUTE $c$COMMENT ON COLUMN billing_plans.currency IS
      'Devise de l''offre, ECRITE explicitement a la creation de chaque offre. Plus de ''EUR'' par defaut (la grille suisse est en CHF).'$c$;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_schema='public' AND table_name='accounting_entries' AND column_name='idevise') THEN
    EXECUTE $c$COMMENT ON COLUMN accounting_entries.idevise IS
      'Devise de l''ecriture comptable, ECRITE par fecService. Plus de ''EUR'' par defaut : l''export FEC est reserve au marche francais et le dit explicitement.'$c$;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. CONTRÔLE : plus aucun défaut français ne doit subsister sur une colonne de
--    pays, de devise ou de tutelle. Une base qui échoue ici est une base qui
--    fabrique encore un pays ou une devise.
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  restants TEXT;
BEGIN
  SELECT string_agg(table_name || '.' || column_name || ' = ' || column_default, ', ' ORDER BY table_name, column_name)
    INTO restants
    FROM information_schema.columns
   WHERE table_schema = 'public'
     AND column_default IS NOT NULL
     AND (
          -- Mot entier : « quote_comPARISons_id_seq » ne doit pas être confondu
          -- avec une adresse parisienne.
          column_default ~* '(^|[^[:alnum:]_])france([^[:alnum:]_]|$)'
       OR column_default ~* '''eur''|''EUR'''
       OR column_default ~* '(^|[^[:alnum:]_])acpr([^[:alnum:]_]|$)'
       OR column_default ~* '(^|[^[:alnum:]_])paris([^[:alnum:]_]|$)'
     )
     -- `appointments.timezone` : défaut assumé et documenté ci-dessus tant que
     -- les writers d'agenda ne portent pas le fuseau du cabinet.
     AND NOT (table_name = 'appointments' AND column_name = 'timezone');

  IF restants IS NOT NULL THEN
    RAISE EXCEPTION 'Défaut français restant sur le schéma : %', restants;
  END IF;
END $$;
