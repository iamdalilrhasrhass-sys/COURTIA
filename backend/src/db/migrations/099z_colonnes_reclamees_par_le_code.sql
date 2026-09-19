-- ============================================================
-- MIGRATION 099z : COLONNES HISTORIQUES RÉCLAMÉES PAR LE CODE
--
-- Volontairement en DERNIER : elle ajoute des colonnes à des tables créées
-- par des migrations plus tardives (reach_*, whatsapp_*, ark_chat_sessions...).
-- Placée après elles, toutes ses gardes to_regclass s'exécutent.
-- COURTIA — 2026-09-19
--
-- CONSTAT DE FOND (mesuré, pas supposé)
-- ------------------------------------
-- `database/schema.sql` décrit un modèle ANGLais (clients.first_name,
-- clients.last_name, clients.phone, contracts, quotes minimal) alors que les
-- routes du backend utilisent un modèle FRANÇAIS (clients.nom, clients.prenom,
-- clients.telephone, clients.bonus_malus, contracts.prime_annuelle,
-- contracts.numero_contrat, quotes.provider_id...).
--
-- Preuve : après reconstruction d'une base VIDE (37 migrations au vert, 0
-- erreur), POST /api/clients renvoyait
--    500 {"error":"column \"bonus_malus\" of relation \"clients\" does not exist"}
-- donc la base décrite par le dépôt n'est pas celle que le code interroge.
-- La production, elle, a été créée par une lignée antérieure et possède bien
-- ces colonnes : c'est pourquoi le code y fonctionne et pas sur une base neuve.
--
-- CONSÉQUENCE PRATIQUE : le dépôt ne permettait pas de reconstruire la base.
--
-- CE QUE FAIT CETTE MIGRATION
-- ---------------------------
-- Elle ajoute les colonnes que le code utilise réellement et qui ne sont
-- déclarées NULLE PART dans le dépôt. Elles ont été extraites automatiquement
-- par `python3 scripts/audit_colonnes_code.py`, qui lit les requêtes du
-- backend (INSERT INTO t (...), UPDATE t SET col =, alias.col avec l'alias
-- défini dans la même requête) et compare à information_schema.
--
-- Elle est ADDITIVE et IDEMPOTENTE : aucune colonne existante n'est modifiée
-- ni supprimée, aucun effet sur la production (les colonnes y existent déjà).
-- Les types suivent l'usage observé : identifiants et libellés en TEXT,
-- montants en NUMERIC, scores et compteurs en INTEGER, horodatages en
-- TIMESTAMPTZ, dates en DATE, indicateurs en BOOLEAN, structures en JSONB.
-- ============================================================

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.clients') IS NOT NULL THEN
    ALTER TABLE clients ADD COLUMN IF NOT EXISTS nom TEXT;
    ALTER TABLE clients ADD COLUMN IF NOT EXISTS prenom TEXT;
    ALTER TABLE clients ADD COLUMN IF NOT EXISTS telephone TEXT;
    ALTER TABLE clients ADD COLUMN IF NOT EXISTS phone_mobile TEXT;
    ALTER TABLE clients ADD COLUMN IF NOT EXISTS adresse TEXT;
    ALTER TABLE clients ADD COLUMN IF NOT EXISTS ville TEXT;
    ALTER TABLE clients ADD COLUMN IF NOT EXISTS code_postal TEXT;
    ALTER TABLE clients ADD COLUMN IF NOT EXISTS date_naissance DATE;
    ALTER TABLE clients ADD COLUMN IF NOT EXISTS birth_date DATE;
    ALTER TABLE clients ADD COLUMN IF NOT EXISTS profession TEXT;
    ALTER TABLE clients ADD COLUMN IF NOT EXISTS situation_familiale TEXT;
    ALTER TABLE clients ADD COLUMN IF NOT EXISTS segment TEXT;
    ALTER TABLE clients ADD COLUMN IF NOT EXISTS source TEXT;
    ALTER TABLE clients ADD COLUMN IF NOT EXISTS zone_geographique TEXT;
    ALTER TABLE clients ADD COLUMN IF NOT EXISTS bonus_malus NUMERIC(4,2) DEFAULT 1.0;
    ALTER TABLE clients ADD COLUMN IF NOT EXISTS annees_permis INTEGER DEFAULT 0;
    ALTER TABLE clients ADD COLUMN IF NOT EXISTS nb_sinistres_3ans INTEGER DEFAULT 0;
    ALTER TABLE clients ADD COLUMN IF NOT EXISTS ark_score INTEGER;
    ALTER TABLE clients ADD COLUMN IF NOT EXISTS lead_score INTEGER;
    ALTER TABLE clients ADD COLUMN IF NOT EXISTS last_contact_date DATE;
    ALTER TABLE clients ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
    ALTER TABLE clients ADD COLUMN IF NOT EXISTS broker_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
  END IF;

  IF to_regclass('public.contracts') IS NOT NULL THEN
    ALTER TABLE contracts ADD COLUMN IF NOT EXISTS numero_contrat TEXT;
    ALTER TABLE contracts ADD COLUMN IF NOT EXISTS compagnie TEXT;
    ALTER TABLE contracts ADD COLUMN IF NOT EXISTS type_contrat TEXT;
    ALTER TABLE contracts ADD COLUMN IF NOT EXISTS prime_annuelle NUMERIC(12,2);
    ALTER TABLE contracts ADD COLUMN IF NOT EXISTS date_effet DATE;
    ALTER TABLE contracts ADD COLUMN IF NOT EXISTS date_echeance DATE;
  END IF;

  IF to_regclass('public.quotes') IS NOT NULL THEN
    ALTER TABLE quotes ADD COLUMN IF NOT EXISTS provider_id INTEGER;
    ALTER TABLE quotes ADD COLUMN IF NOT EXISTS insurance_type TEXT;
    ALTER TABLE quotes ADD COLUMN IF NOT EXISTS product_type TEXT;
    ALTER TABLE quotes ADD COLUMN IF NOT EXISTS premium NUMERIC(12,2);
    ALTER TABLE quotes ADD COLUMN IF NOT EXISTS amount NUMERIC(12,2);
    ALTER TABLE quotes ADD COLUMN IF NOT EXISTS details JSONB;
    ALTER TABLE quotes ADD COLUMN IF NOT EXISTS end_date DATE;
    ALTER TABLE quotes ADD COLUMN IF NOT EXISTS broker_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
  END IF;

  IF to_regclass('public.users') IS NOT NULL THEN
    ALTER TABLE users ADD COLUMN IF NOT EXISTS name TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS cabinet_name TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS plan TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_plan TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS grace_period_until TIMESTAMPTZ;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS founder_pricing BOOLEAN DEFAULT FALSE;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_reason TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS google_access_token TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS google_refresh_token TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS iobsp_status TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS iobsp_orias_number TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS iobsp_category TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS iobsp_attestation_url TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS iobsp_requested_at TIMESTAMPTZ;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS iobsp_approved_at TIMESTAMPTZ;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS iobsp_approved_by INTEGER;
  END IF;

  IF to_regclass('public.document_requests') IS NOT NULL THEN
    ALTER TABLE document_requests ADD COLUMN IF NOT EXISTS broker_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
    ALTER TABLE document_requests ADD COLUMN IF NOT EXISTS notes TEXT;
    ALTER TABLE document_requests ADD COLUMN IF NOT EXISTS requested_types JSONB DEFAULT '[]'::jsonb;
    ALTER TABLE document_requests ADD COLUMN IF NOT EXISTS reminder_count INTEGER DEFAULT 0;
    ALTER TABLE document_requests ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;
  END IF;

  IF to_regclass('public.whatsapp_messages') IS NOT NULL THEN
    ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS template_name TEXT;
    ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS template_params JSONB DEFAULT '[]'::jsonb;
    ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS whatsapp_message_id TEXT;
    ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS error_message TEXT;
  END IF;

  IF to_regclass('public.whatsapp_conversations') IS NOT NULL THEN
    ALTER TABLE whatsapp_conversations ADD COLUMN IF NOT EXISTS phone TEXT;
    ALTER TABLE whatsapp_conversations ADD COLUMN IF NOT EXISTS unread_count INTEGER DEFAULT 0;
    ALTER TABLE whatsapp_conversations ADD COLUMN IF NOT EXISTS window_expires_at TIMESTAMPTZ;
  END IF;

  IF to_regclass('public.automations') IS NOT NULL THEN
    ALTER TABLE automations ADD COLUMN IF NOT EXISTS actions JSONB DEFAULT '[]'::jsonb;
    ALTER TABLE automations ADD COLUMN IF NOT EXISTS conditions JSONB DEFAULT '{}'::jsonb;
    ALTER TABLE automations ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE;
  END IF;

  IF to_regclass('public.reach_messages') IS NOT NULL THEN
    ALTER TABLE reach_messages ADD COLUMN IF NOT EXISTS content TEXT;
    ALTER TABLE reach_messages ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
  END IF;

  IF to_regclass('public.reach_campaigns') IS NOT NULL THEN
    ALTER TABLE reach_campaigns ADD COLUMN IF NOT EXISTS description TEXT;
  END IF;

  IF to_regclass('public.reach_sequence_runs') IS NOT NULL THEN
    ALTER TABLE reach_sequence_runs ADD COLUMN IF NOT EXISTS steps_json JSONB DEFAULT '[]'::jsonb;
  END IF;

  IF to_regclass('public.appointments') IS NOT NULL THEN
    ALTER TABLE appointments ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
  END IF;

  IF to_regclass('public.client_tags') IS NOT NULL THEN
    ALTER TABLE client_tags ADD COLUMN IF NOT EXISTS tag_id INTEGER;
  END IF;

  IF to_regclass('public.ark_chat_sessions') IS NOT NULL THEN
    ALTER TABLE ark_chat_sessions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

COMMIT;
