-- ============================================================
-- MIGRATION 009z : RECONCILIATION DU BASELINE POUR UNE BASE VIDE
-- COURTIA — 2026-09-19
--
-- POURQUOI CETTE MIGRATION EXISTE
-- -------------------------------
-- `database/schema.sql` crée plusieurs tables sous forme de brouillon
-- minimal (ex. partners, quotes : une seule ligne) puis les migrations les
-- redéclarent avec CREATE TABLE IF NOT EXISTS en leur donnant une autre
-- forme. Sur une base NEUVE, le IF NOT EXISTS ne fait rien : la table garde
-- la forme minimale et tout ce qui suit échoue.
--
-- Mesure du 19/09/2026 (scripts/db_rebuild.sh, base vide) : 5 migrations
-- échouaient — 005 column "user_id", 010/032 relation "quotes"/"contrats",
-- 016 column "created_at", 018 column "period_year", 025 column
-- "courtier_id"/"event_date", 026 column "user_id".
--
-- La section générée ci-dessous est produite par
-- `python3 scripts/generer_reconciliation.py` : elle ne contient QUE des
-- colonnes réellement déclarées par une migration du dépôt. La section
-- manuelle ne contient que des colonnes réclamées par une requête du code.
-- Aucune colonne inventée.
--
-- NOTE importante : la table `contrats` n'existe nulle part dans ce dépôt.
-- Les routes françaises (routes/contrats.js) lisent et écrivent en vérité
-- dans `quotes` (INSERT INTO quotes, UPDATE quotes, FROM quotes). Les
-- migrations 010 et 025 qui visaient `contrats` sont corrigées dans le même
-- lot pour viser `quotes`.
--
-- Idempotente : ADD COLUMN IF NOT EXISTS + gardes to_regclass. Sur la base de
-- production, où ces colonnes existent déjà, elle ne fait STRICTEMENT RIEN.
-- ============================================================

BEGIN;

-- Colonnes declarees par les migrations mais absentes de database/schema.sql.
-- Genere par scripts/generer_reconciliation.py — ne pas editer a la main.
DO $$
BEGIN
  IF to_regclass('public.audit_logs') IS NOT NULL THEN
    ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS resource_type VARCHAR(50);
    ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS resource_id VARCHAR(100);
    ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS old_values JSONB;
    ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS new_values JSONB;
    ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45);
    ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_agent TEXT;
  END IF;
  IF to_regclass('public.commissions') IS NOT NULL THEN
    ALTER TABLE commissions ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
    ALTER TABLE commissions ADD COLUMN IF NOT EXISTS insurer TEXT;
    ALTER TABLE commissions ADD COLUMN IF NOT EXISTS period_year INTEGER;
    ALTER TABLE commissions ADD COLUMN IF NOT EXISTS period_month INTEGER CHECK (period_month BETWEEN 1 AND 12);
    ALTER TABLE commissions ADD COLUMN IF NOT EXISTS expected_amount_cents BIGINT DEFAULT 0;
    ALTER TABLE commissions ADD COLUMN IF NOT EXISTS received_amount_cents BIGINT DEFAULT 0;
    ALTER TABLE commissions ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'eur';
    ALTER TABLE commissions ADD COLUMN IF NOT EXISTS apporteur_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
    ALTER TABLE commissions ADD COLUMN IF NOT EXISTS apporteur_share_bps INTEGER DEFAULT 0 CHECK (apporteur_share_bps BETWEEN 0 AND 10000);
    ALTER TABLE commissions ADD COLUMN IF NOT EXISTS notes TEXT;
  END IF;
  IF to_regclass('public.documents') IS NOT NULL THEN
    ALTER TABLE documents ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
    ALTER TABLE documents ADD COLUMN IF NOT EXISTS type TEXT CHECK (type IN ('fic', 'mandat_courtage', 'devoir_conseil', 'attestation'));
    ALTER TABLE documents ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'generated', 'sent_to_sign', 'signed', 'refused', 'expired', 'archived'));
    ALTER TABLE documents ADD COLUMN IF NOT EXISTS template_version TEXT;
    ALTER TABLE documents ADD COLUMN IF NOT EXISTS variables JSONB DEFAULT '{}'::jsonb;
    ALTER TABLE documents ADD COLUMN IF NOT EXISTS storage_path TEXT;
    ALTER TABLE documents ADD COLUMN IF NOT EXISTS signed_storage_path TEXT;
    ALTER TABLE documents ADD COLUMN IF NOT EXISTS yousign_signature_id TEXT;
    ALTER TABLE documents ADD COLUMN IF NOT EXISTS generated_by INTEGER REFERENCES users(id) ON DELETE SET NULL;
    ALTER TABLE documents ADD COLUMN IF NOT EXISTS generated_at TIMESTAMPTZ;
    ALTER TABLE documents ADD COLUMN IF NOT EXISTS archive_until TIMESTAMPTZ DEFAULT NOW() + INTERVAL '5 years';
    ALTER TABLE documents ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
    ALTER TABLE documents ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
  IF to_regclass('public.messages') IS NOT NULL THEN
    ALTER TABLE messages ADD COLUMN IF NOT EXISTS sujet VARCHAR(500);
    ALTER TABLE messages ADD COLUMN IF NOT EXISTS corps TEXT;
    ALTER TABLE messages ADD COLUMN IF NOT EXISTS analyse_type VARCHAR(30);
    ALTER TABLE messages ADD COLUMN IF NOT EXISTS analyse_confiance DECIMAL(3,2);
    ALTER TABLE messages ADD COLUMN IF NOT EXISTS analyse_resume TEXT;
    ALTER TABLE messages ADD COLUMN IF NOT EXISTS action_effectuee VARCHAR(50);
    ALTER TABLE messages ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
  END IF;
  IF to_regclass('public.partners') IS NOT NULL THEN
    ALTER TABLE partners ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
    ALTER TABLE partners ADD COLUMN IF NOT EXISTS nom VARCHAR(255);
    ALTER TABLE partners ADD COLUMN IF NOT EXISTS categorie VARCHAR(100);
    ALTER TABLE partners ADD COLUMN IF NOT EXISTS type_partenaire VARCHAR(50);
    ALTER TABLE partners ADD COLUMN IF NOT EXISTS contact_nom VARCHAR(255);
    ALTER TABLE partners ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255);
    ALTER TABLE partners ADD COLUMN IF NOT EXISTS contact_telephone VARCHAR(30);
    ALTER TABLE partners ADD COLUMN IF NOT EXISTS produit_principal VARCHAR(200);
    ALTER TABLE partners ADD COLUMN IF NOT EXISTS code_courtage VARCHAR(100);
    ALTER TABLE partners ADD COLUMN IF NOT EXISTS commission VARCHAR(100);
    ALTER TABLE partners ADD COLUMN IF NOT EXISTS extranet_url VARCHAR(500);
    ALTER TABLE partners ADD COLUMN IF NOT EXISTS extranet_login VARCHAR(255);
    ALTER TABLE partners ADD COLUMN IF NOT EXISTS statut VARCHAR(50) DEFAULT 'A_contacter';
    ALTER TABLE partners ADD COLUMN IF NOT EXISTS documents_envoyes TEXT[];
    ALTER TABLE partners ADD COLUMN IF NOT EXISTS notes TEXT;
    ALTER TABLE partners ADD COLUMN IF NOT EXISTS date_contact TIMESTAMPTZ;
    ALTER TABLE partners ADD COLUMN IF NOT EXISTS date_relance TIMESTAMPTZ;
    ALTER TABLE partners ADD COLUMN IF NOT EXISTS priorite INTEGER DEFAULT 2;
    ALTER TABLE partners ADD COLUMN IF NOT EXISTS vague INTEGER DEFAULT 1;
    ALTER TABLE partners ADD COLUMN IF NOT EXISTS volume_potentiel VARCHAR(100);
    ALTER TABLE partners ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
    ALTER TABLE partners ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────
-- Colonnes réclamées par une requête du code (aucune migration ne les
-- déclare) :
--   quotes.prime_annuelle, quotes.date_echeance : agrégées par 025
--     (mv_user_kpis : SUM(ct.prime_annuelle), ct.date_echeance) ;
--   clients.courtier_id : jointure de 025 (clients.courtier_id = users.id)
--     et cloisonnement des clients par courtier ;
--   claims.contract_id/type/amount/insurer_ref/courtier_id/opened_at/
--     ark_summary : INSERT et SELECT de services/claimsService.js.
-- ─────────────────────────────────────────────────────────
DO $$
BEGIN
  IF to_regclass('public.quotes') IS NOT NULL THEN
    ALTER TABLE quotes ADD COLUMN IF NOT EXISTS prime_annuelle NUMERIC(12,2);
    ALTER TABLE quotes ADD COLUMN IF NOT EXISTS date_echeance DATE;
    ALTER TABLE quotes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;

  IF to_regclass('public.clients') IS NOT NULL THEN
    ALTER TABLE clients ADD COLUMN IF NOT EXISTS courtier_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
  END IF;

  IF to_regclass('public.claims') IS NOT NULL THEN
    ALTER TABLE claims ADD COLUMN IF NOT EXISTS contract_id INTEGER REFERENCES contracts(id) ON DELETE SET NULL;
    ALTER TABLE claims ADD COLUMN IF NOT EXISTS type VARCHAR(50);
    ALTER TABLE claims ADD COLUMN IF NOT EXISTS amount DECIMAL(12,2);
    ALTER TABLE claims ADD COLUMN IF NOT EXISTS insurer_ref VARCHAR(120);
    ALTER TABLE claims ADD COLUMN IF NOT EXISTS courtier_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
    ALTER TABLE claims ADD COLUMN IF NOT EXISTS opened_at DATE;
    ALTER TABLE claims ADD COLUMN IF NOT EXISTS ark_summary TEXT;
    ALTER TABLE claims ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

COMMIT;
