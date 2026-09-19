-- ============================================================
-- MIGRATION 100 : TABLES MANQUANTES DES FONCTIONS DÉJÀ CÂBLÉES
-- COURTIA — 2026-09-19
--
-- POURQUOI CETTE MIGRATION EXISTE
-- -------------------------------
-- Trois tables utilisées par du code RÉELLEMENT MONTÉ n'étaient déclarées dans
-- AUCUN des fichiers SQL du dépôt. Sur une base pourtant reconstruite sans
-- erreur, les requêtes correspondantes échouaient donc en
-- « relation does not exist ».
--
-- Décision prise après vérification (et non « parce que le code les mentionne ») :
--   * financing_files — route ACTIVE (POST /api/financing/iobsp/submit, montée
--     avec verifyToken dans server.js) et écran ACTIF (/capitia, routé dans
--     App.jsx) : l'envoi de l'attestation IOBSP écrit dans cette table.
--   * voice_calls et user_voice_settings — routes ACTIVES
--     (POST /api/voice/call-client, /voice/morning-brief, GET/POST
--     /voice/settings via killerFeatures2) et composant MONTÉ
--     (components/voice/ArkVoiceCockpit.jsx rendu dans Dashboard.jsx).
--
-- Les colonnes ci-dessous sont exactement celles que le code lit et écrit :
-- aucune n'est devinée (voir services/iobspService.js:132, routes/financing.js:82,
-- services/arkVoice.js:113-286).
--
-- Idempotente et additive : CREATE TABLE IF NOT EXISTS, aucun impact sur une
-- base où ces tables existeraient déjà.
-- ============================================================

BEGIN;

-- ── CapitiA : pièces du dossier IOBSP ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS financing_files (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER REFERENCES users(id) ON DELETE CASCADE,
  file_type     VARCHAR(50),                 -- 'iobsp_attestation', ...
  file_name     VARCHAR(255),
  file_url      TEXT,
  uploaded_at   TIMESTAMPTZ DEFAULT NOW(),
  reviewed      BOOLEAN DEFAULT FALSE,
  reviewed_at   TIMESTAMPTZ,
  reviewed_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  review_notes  TEXT
);

CREATE INDEX IF NOT EXISTS idx_financing_files_user
  ON financing_files(user_id, uploaded_at DESC);

-- ── ARK Voice : appels passés par le courtier ──────────────────────────────
CREATE TABLE IF NOT EXISTS voice_calls (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER REFERENCES users(id) ON DELETE CASCADE,
  client_id     INTEGER REFERENCES clients(id) ON DELETE SET NULL,
  vapi_call_id  VARCHAR(120),
  call_type     VARCHAR(50),                 -- 'morning_brief', 'qualification', ...
  direction     VARCHAR(20) DEFAULT 'outbound',
  status        VARCHAR(30) DEFAULT 'queued',-- queued, ringing, completed, failed
  phone_number  VARCHAR(40),
  transcript    TEXT,
  ai_summary    TEXT,
  cost_eur      NUMERIC(10,4) DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_voice_calls_user ON voice_calls(user_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_voice_calls_vapi ON voice_calls(vapi_call_id)
  WHERE vapi_call_id IS NOT NULL;

-- ── ARK Voice : réglages par cabinet ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_voice_settings (
  user_id               INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  morning_call_enabled  BOOLEAN DEFAULT FALSE,
  morning_call_time     TIME DEFAULT '07:30:00',
  phone_number          VARCHAR(40),
  daily_budget_eur      NUMERIC(8,2) DEFAULT 5.00,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

COMMIT;
