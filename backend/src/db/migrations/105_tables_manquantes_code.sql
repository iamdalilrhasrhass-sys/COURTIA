-- ============================================================================
-- 105 — TABLES LUES PAR LE CODE ET DÉFINIES PAR AUCUN FICHIER SQL DU DÉPÔT
-- ============================================================================
-- POURQUOI CETTE MIGRATION EXISTE
--
-- Mesure sur une base reconstruite par la procédure officielle du dépôt
-- (database/schema.sql + 42 migrations, 0 échec, 158 tables) :
--   scripts/audit_tables_code.py -> 39 tables interrogées par le code et absentes
--   de la base. 15 sont définies dans backend/migrations/ (rejouées par 104).
--   Les 25 ci-dessous ne sont définies dans AUCUN fichier SQL du dépôt.
--   Symptôme mesuré en production : GET /api/auth/me -> 500
--   « relation "broker_profiles" does not exist » (broker_profiles, table n°1 ici).
--
-- MÉTHODE : chaque colonne vient d'une référence RÉELLE du code (fichier:ligne
-- cité en commentaire) — INSERT (liste de colonnes), UPDATE ... SET, ou
-- `alias.colonne` dont l'alias est défini dans la même requête. Les types sont
-- DÉDUITS DE L'USAGE : comparaison à un booléen -> BOOLEAN, EXTRACT(...) ->
-- TIMESTAMPTZ/DATE, JSON.stringify sans cast -> JSONB, identifiant de users ->
-- INTEGER, montant -> NUMERIC.
-- Aucune colonne inventée : les colonnes écartées faute de preuve sont listées
-- dans backend/src/db/migrations/README_RECONCILIATION_104.md.
--
-- IDEMPOTENCE : CREATE TABLE IF NOT EXISTS, CREATE INDEX IF NOT EXISTS hors des
-- CREATE TABLE, ALTER TABLE ... ADD COLUMN IF NOT EXISTS. Aucun NOT NULL sur une
-- colonne que le code n'alimente pas (cf. README, règle héritée de
-- 102_appointments_organizer_id_facultatif.sql).
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. broker_profiles — seed.js:139-153 (DDL écrite par le code lui-même)
--    + auth.js:46 (SELECT cabinet, orias, telephone, adresse, ville, code_postal
--      WHERE user_id), auth.js:93/96/101 (UPDATE/INSERT), adminSuperAdmin.js:382/
--      484/888 + documents.js:117 (bp.cabinet, bp.orias, bp.telephone, bp.adresse,
--      bp.ville, bp.code_postal), arkContext.js:20 (bp.cabinet_name, bp.specialites),
--      arkContext.js:301 (bp.first_name, bp.last_name),
--      arkContext.js:343 (bp.first_name, bp.last_name, bp.cabinet_name, bp.phone)
--    Colonnes supplémentaires par rapport à seed.js, réclamées par les requêtes :
--      cabinet_name, specialites, first_name, last_name, phone.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS broker_profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  cabinet VARCHAR(255),
  orias VARCHAR(50),
  telephone VARCHAR(20),
  adresse TEXT,
  ville VARCHAR(100),
  code_postal VARCHAR(10),
  cabinet_name VARCHAR(255),
  specialites TEXT,
  first_name VARCHAR(120),
  last_name VARCHAR(120),
  phone VARCHAR(40),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_broker_profiles_user ON broker_profiles(user_id);
-- auth.js:93 « SELECT id FROM broker_profiles WHERE user_id = $1 » puis UPDATE/INSERT :
-- un profil par utilisateur (sinon la lecture renvoie la mauvaise ligne).
CREATE UNIQUE INDEX IF NOT EXISTS idx_broker_profiles_user_unique ON broker_profiles(user_id);

-- ---------------------------------------------------------------------------
-- 2. user_email_settings — emailParser.js:51 (INSERT ... ON CONFLICT (user_id)),
--    :64 (SELECT *), :256 (UPDATE last_scan_at), :305 (WHERE enabled=true)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_email_settings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  imap_host VARCHAR(255),
  imap_port INTEGER,
  imap_user VARCHAR(255),
  imap_password_encrypted TEXT,
  imap_tls BOOLEAN DEFAULT TRUE,
  inbox_folder VARCHAR(255),
  signature TEXT,
  enabled BOOLEAN DEFAULT FALSE,
  scan_interval_minutes INTEGER DEFAULT 15,
  last_scan_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- emailParser.js:54 « ON CONFLICT (user_id) » : index unique obligatoire.
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_email_settings_user ON user_email_settings(user_id);

-- ---------------------------------------------------------------------------
-- 3. admin_impersonation_log — adminSuperAdmin.js:537 (SELECT id, admin_user_id,
--    started_at, ended_at, reason, actions_count WHERE target_user_id),
--    :676 (ail.target_user_id, ail.ip_address), :692 (COUNT(*))
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_impersonation_log (
  id SERIAL PRIMARY KEY,
  admin_user_id INTEGER,
  target_user_id INTEGER,
  reason TEXT,
  ip_address VARCHAR(64),
  actions_count INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_admin_impersonation_target ON admin_impersonation_log(target_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_impersonation_admin ON admin_impersonation_log(admin_user_id);

-- ---------------------------------------------------------------------------
-- 4. tags — tags.js:20 (SELECT * WHERE courtier_id ORDER BY name),
--    :53 (INSERT courtier_id, name, color ON CONFLICT (courtier_id, name)),
--    :81 (DELETE WHERE id, courtier_id), :126 (WHERE id = ANY(...))
--    name : 1-50 caractères (validation tags.js:44) ; color : #rrggbb (tags.js:88).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tags (
  id SERIAL PRIMARY KEY,
  courtier_id INTEGER,
  name VARCHAR(50) NOT NULL,
  color VARCHAR(7),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- tags.js:53 « ON CONFLICT (courtier_id, name) » : index unique obligatoire.
CREATE UNIQUE INDEX IF NOT EXISTS idx_tags_courtier_name ON tags(courtier_id, name);

-- ---------------------------------------------------------------------------
-- 5. portfolio_insights — portfolio.js:64-70 (id, generated_at|created_at,
--    total_clients, total_contracts, total_premium, health_score, health_breakdown,
--    raw_analysis), :93 (WHERE user_id), :393 (status IN ('completed','processing')),
--    portfolioAnalyzer.js:516 (INSERT user_id, status, created_at),
--    :641 (UPDATE total_clients, total_contracts, total_premium, health_score,
--    health_breakdown, raw_analysis, status), analytics.js:63 (WHERE courtier_id).
--    Types : health_score INTEGER (valeur 0-100), montants NUMERIC,
--    health_breakdown/raw_analysis JSONB (JSON.stringify en argument).
--    NB : `generated_at` du SELECT est un ALIAS (portfolioSchema.js:32) et non une
--    colonne : la colonne d'horodatage retenue est created_at (portfolioSchema.js:4).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS portfolio_insights (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  courtier_id INTEGER,
  status VARCHAR(32) DEFAULT 'processing',
  total_clients INTEGER,
  total_contracts INTEGER,
  total_premium NUMERIC,
  health_score INTEGER,
  health_breakdown JSONB,
  raw_analysis JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_portfolio_insights_user ON portfolio_insights(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_portfolio_insights_courtier ON portfolio_insights(courtier_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_insights_status ON portfolio_insights(status);

-- ---------------------------------------------------------------------------
-- 6. portfolio_actions — portfolioAnalyzer.js:651-655 (INSERT insight_id, user_id,
--    client_id, action_type, priority, title, description, suggested_action,
--    ai_reasoning, estimated_impact), portfolio.js:181-201 (pa.id, pa.insight_id,
--    pa.client_id, pa.action_type, pa.priority, pa.title, pa.description,
--    pa.suggested_action, pa.ai_reasoning, pa.estimated_impact, pa.status, pa.done_at,
--    pa.dismissed_reason, pa.created_at, WHERE pa.user_id, pa.status, pa.priority,
--    ORDER BY pa.estimated_impact DESC), :241 (UPDATE status, done_at,
--    dismissed_reason WHERE id AND user_id).
--    estimated_impact : « <number euros ou null> » (portfolioAnalyzer.js:585) -> NUMERIC.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS portfolio_actions (
  id SERIAL PRIMARY KEY,
  insight_id INTEGER,
  user_id INTEGER,
  client_id INTEGER,
  action_type VARCHAR(64),
  priority VARCHAR(16),
  title VARCHAR(255),
  description TEXT,
  suggested_action TEXT,
  ai_reasoning TEXT,
  estimated_impact NUMERIC,
  status VARCHAR(16) DEFAULT 'pending',
  done_at TIMESTAMPTZ,
  dismissed_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_portfolio_actions_user ON portfolio_actions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_portfolio_actions_insight ON portfolio_actions(insight_id);

-- ---------------------------------------------------------------------------
-- 7. portfolio_preferences — portfolio.js:435-437 (SELECT user_id,
--    morning_brief_time, email_notifications, push_notifications, min_priority,
--    updated_at WHERE user_id), :484-494 (INSERT ... ON CONFLICT (user_id)
--    DO UPDATE ... portfolio_preferences.colonne).
--    Défauts lus dans le code (portfolio.js:446-449) : morning_brief_time '08:00:00'
--    -> TIME, email_notifications/push_notifications BOOLEAN, min_priority
--    ('critical','high','medium','low') -> TEXT.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS portfolio_preferences (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  morning_brief_time TIME DEFAULT '08:00:00',
  email_notifications BOOLEAN DEFAULT TRUE,
  push_notifications BOOLEAN DEFAULT TRUE,
  min_priority VARCHAR(16) DEFAULT 'medium',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- portfolio.js:488 « ON CONFLICT (user_id) » : index unique obligatoire.
CREATE UNIQUE INDEX IF NOT EXISTS idx_portfolio_preferences_user ON portfolio_preferences(user_id);

-- ---------------------------------------------------------------------------
-- 8. dda_quizzes — ddaQuiz.js:17 (SELECT id, title, description, year WHERE active),
--    :33 (WHERE id AND active), :75 (SELECT id WHERE id AND active),
--    composeAi.js:164 (SELECT answers WHERE client_id ORDER BY completed_at DESC).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dda_quizzes (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255),
  description TEXT,
  year INTEGER,
  active BOOLEAN DEFAULT TRUE,
  client_id INTEGER,
  answers JSONB,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dda_quizzes_client ON dda_quizzes(client_id);
CREATE INDEX IF NOT EXISTS idx_dda_quizzes_active ON dda_quizzes(active);

-- ---------------------------------------------------------------------------
-- 9. dda_quiz_questions — ddaQuiz.js:42 (q.id, q.question, q.choices, q.quiz_id),
--    :84 (SELECT id, correct_answer WHERE quiz_id)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dda_quiz_questions (
  id SERIAL PRIMARY KEY,
  quiz_id INTEGER,
  question TEXT,
  choices JSONB,
  correct_answer TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dda_quiz_questions_quiz ON dda_quiz_questions(quiz_id);

-- ---------------------------------------------------------------------------
-- 10. dda_quiz_attempts — ddaQuiz.js:105 (INSERT user_id, quiz_id, score, passed,
--     answers, completed_at), :143 (SELECT * WHERE user_id ORDER BY completed_at),
--     analytics.js:117 (SELECT passed, completed_at WHERE user_id AND passed = TRUE)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dda_quiz_attempts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  quiz_id INTEGER,
  score INTEGER,
  passed BOOLEAN DEFAULT FALSE,
  answers JSONB,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dda_quiz_attempts_user ON dda_quiz_attempts(user_id, completed_at DESC);

-- ---------------------------------------------------------------------------
-- 11. dda_audits — ddaAudit.js:308-315 (INSERT client_id, user_id, global_score,
--     compliance_level, risk_level, checks, missing_items, red_flags,
--     recommendations, report_pdf_path, audited_at ON CONFLICT (client_id)),
--     killerFeatures2.js:162 (SELECT * WHERE client_id AND user_id),
--     :169 (SELECT report_pdf_path ...).
--     checks/missing_items/red_flags/recommendations : JSON.stringify sans cast -> JSONB.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dda_audits (
  id SERIAL PRIMARY KEY,
  client_id INTEGER,
  user_id INTEGER,
  global_score INTEGER,
  compliance_level VARCHAR(32),
  risk_level VARCHAR(32),
  checks JSONB,
  missing_items JSONB,
  red_flags JSONB,
  recommendations JSONB,
  report_pdf_path TEXT,
  audited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- ddaAudit.js:311 « ON CONFLICT (client_id) » : index unique obligatoire.
CREATE UNIQUE INDEX IF NOT EXISTS idx_dda_audits_client ON dda_audits(client_id);
CREATE INDEX IF NOT EXISTS idx_dda_audits_user ON dda_audits(user_id);

-- ---------------------------------------------------------------------------
-- 12. dda_documents — arkContext.js:376-379 (SELECT id, document_type, status,
--     signed_at, created_at WHERE client_id ORDER BY created_at DESC)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dda_documents (
  id SERIAL PRIMARY KEY,
  client_id INTEGER,
  document_type VARCHAR(100),
  status VARCHAR(32),
  signed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dda_documents_client ON dda_documents(client_id);

-- ---------------------------------------------------------------------------
-- 13. client_consents — arkContext.js:385-387 (SELECT consent_type, accepted,
--     accepted_at WHERE client_id)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS client_consents (
  id SERIAL PRIMARY KEY,
  client_id INTEGER,
  consent_type VARCHAR(64),
  accepted BOOLEAN DEFAULT FALSE,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_client_consents_client ON client_consents(client_id);

-- ---------------------------------------------------------------------------
-- 14. devis — ddaAudit.js:43 (SELECT id, produit, montant_prime, date_envoi,
--     justification WHERE client_id)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS devis (
  id SERIAL PRIMARY KEY,
  client_id INTEGER,
  produit VARCHAR(255),
  montant_prime NUMERIC,
  date_envoi TIMESTAMPTZ,
  justification TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_devis_client ON devis(client_id);

-- ---------------------------------------------------------------------------
-- 15. contrats — ddaAudit.js:42 (SELECT * WHERE client_id),
--     emailTemplates.js:111 (SELECT * WHERE client_id),
--     :209 (SELECT type_contrat WHERE client_id ORDER BY created_at DESC),
--     :123-124 (c.type_contrat || c.contract_type, c.statut || c.status,
--     c.prime_annuelle || c.annual_premium).
--     Les DEUX graphies présentes dans le code sont déclarées (on ajoute les
--     colonnes réellement citées, on ne renomme rien).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS contrats (
  id SERIAL PRIMARY KEY,
  client_id INTEGER,
  type_contrat VARCHAR(120),
  contract_type VARCHAR(120),
  statut VARCHAR(50),
  status VARCHAR(50),
  prime_annuelle NUMERIC,
  annual_premium NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_contrats_client ON contrats(client_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- 16. notes — composeAi.js:156-158 (SELECT content, created_at WHERE client_id
--     ORDER BY created_at DESC LIMIT 10)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notes (
  id SERIAL PRIMARY KEY,
  client_id INTEGER,
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notes_client ON notes(client_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- 17. generated_documents — documents.js:625 (SELECT * WHERE courtier_id
--     ORDER BY created_at DESC), :694 (INSERT courtier_id, client_id,
--     document_type, template_id, pdf_url, data), :808 (WHERE id::text = $1 OR
--     template_id = $1 AND courtier_id), :817 (doc.template_id).
--     `data` : objet passé en paramètre -> JSONB.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS generated_documents (
  id SERIAL PRIMARY KEY,
  courtier_id INTEGER,
  client_id INTEGER,
  document_type VARCHAR(100),
  template_id VARCHAR(128),
  pdf_url TEXT,
  data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_generated_documents_courtier ON generated_documents(courtier_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_generated_documents_client ON generated_documents(client_id);

-- ---------------------------------------------------------------------------
-- 18. email_templates — emailTemplates.js:58 (INSERT courtier_id, name, subject,
--     body, category, variables, is_default), :170 (SELECT * WHERE id AND
--     (courtier_id OR is_default = TRUE)).
--     `variables` : tableau JSON -> JSONB.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS email_templates (
  id SERIAL PRIMARY KEY,
  courtier_id INTEGER,
  name VARCHAR(255),
  subject TEXT,
  body TEXT,
  category VARCHAR(64),
  variables JSONB,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_email_templates_courtier ON email_templates(courtier_id);

-- ---------------------------------------------------------------------------
-- 19. opportunities — reporting.js:43-45 (COUNT(*), SUM(valeur_estimee),
--     FILTER (WHERE statut = 'gagne') WHERE user_id), :170 (SUM(valeur_estimee)
--     WHERE user_id AND statut IN ('nouveau','en_cours','chaud'))
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS opportunities (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  statut VARCHAR(32),
  valeur_estimee NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_opportunities_user ON opportunities(user_id, statut);

-- ---------------------------------------------------------------------------
-- 20. client_conformite — ddaAudit.js:45 (SELECT * WHERE client_id) puis lecture
--     des champs : :77 conformite_fields?.questionnaire_besoins_signe,
--     :86/:90/:91 conformite_fields?.rgpd_consent_at (horodatage -> TIMESTAMPTZ),
--     :95 conformite_fields?.capacite_evaluee,
--     :123 conformite_fields?.devoir_conseil_rempli.
--     Les trois derniers sont testés pour leur véracité (||) -> BOOLEAN.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS client_conformite (
  id SERIAL PRIMARY KEY,
  client_id INTEGER,
  questionnaire_besoins_signe BOOLEAN DEFAULT FALSE,
  rgpd_consent_at TIMESTAMPTZ,
  capacite_evaluee BOOLEAN DEFAULT FALSE,
  devoir_conseil_rempli BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_client_conformite_client ON client_conformite(client_id);

-- ---------------------------------------------------------------------------
-- 21. parsed_emails — emailParser.js:141 (SELECT id WHERE message_id=$1 — test
--     d'existence avant insertion), :195-206 (INSERT message_id, user_id,
--     client_id, opportunity_id, from_email, from_name, subject, body_text,
--     body_html, received_at, classification, sentiment, urgency, intent,
--     key_questions, suggested_reply, suggested_subject, suggested_next_action,
--     status), :276/280/284 (UPDATE status).
--     key_questions : JSON.stringify(analysis.key_questions || []) -> JSONB ;
--     received_at : parsed.date || new Date() -> TIMESTAMPTZ.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS parsed_emails (
  id SERIAL PRIMARY KEY,
  message_id TEXT,
  user_id INTEGER,
  client_id INTEGER,
  opportunity_id INTEGER,
  from_email VARCHAR(320),
  from_name VARCHAR(255),
  subject TEXT,
  body_text TEXT,
  body_html TEXT,
  received_at TIMESTAMPTZ,
  classification VARCHAR(64),
  sentiment VARCHAR(32),
  urgency VARCHAR(32),
  intent TEXT,
  key_questions JSONB,
  suggested_reply TEXT,
  suggested_subject TEXT,
  suggested_next_action TEXT,
  status VARCHAR(32) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- emailParser.js:141 teste l'existence AVANT d'insérer : unicité du message.
CREATE UNIQUE INDEX IF NOT EXISTS idx_parsed_emails_message_id ON parsed_emails(message_id);
CREATE INDEX IF NOT EXISTS idx_parsed_emails_user ON parsed_emails(user_id);

-- ---------------------------------------------------------------------------
-- 22. benchmarks_cache — analytics.js:223 (SELECT metric_key, label,
--     percentile_25, percentile_50, percentile_75 ORDER BY metric_key)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS benchmarks_cache (
  id SERIAL PRIMARY KEY,
  metric_key VARCHAR(64) NOT NULL,
  label VARCHAR(255),
  percentile_25 NUMERIC,
  percentile_50 NUMERIC,
  percentile_75 NUMERIC,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_benchmarks_cache_metric ON benchmarks_cache(metric_key);

-- ---------------------------------------------------------------------------
-- 23. ark_actions — reporting.js:223-227 (COUNT(*), COUNT(*) FILTER
--     (WHERE completed = true) WHERE user_id AND created_at >= NOW() - interval)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ark_actions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  type VARCHAR(64),
  label TEXT,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ark_actions_user ON ark_actions(user_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- 24. ark_signals — reporting.js:49-50 (COUNT(*), AVG(CASE WHEN type='ark_score'
--     THEN CAST(data->>'score' AS DECIMAL) END) WHERE user_id AND created_at),
--     :215-219 (SELECT type, COUNT(*) GROUP BY type WHERE user_id AND created_at).
--     data->>'score' -> colonne JSONB.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ark_signals (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  type VARCHAR(64),
  data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ark_signals_user ON ark_signals(user_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- 25. taches — deux graphies cohabitent dans le code, les DEUX sont déclarées :
--     inserts : reach.js:314 (courtier_id, titre, description, priorite, echeance,
--       statut, source), reach.js:690 (courtier_id, titre, description, priorite,
--       statut, source), arkVoice.js:254 (user_id, client_id, titre, description,
--       priority, due_date, source, created_at), reachSequenceWorker.js:58
--       (user_id, titre, description, statut, priorite, due_date),
--       intakeProcessor.js:309 (user_id, client_id, type, titre, description,
--       echeance, statut, created_at) ;
--     lectures : arkContext.js:61 (id, titre, statut, priorite, echeance,
--       description WHERE client_id AND statut), arkContext.js:259 (t.client_id,
--       t.courtier_id, t.user_id, t.statut), ark.js:223/260, arkProactiveService.js:266
--       (id, client_id, titre, statut, priorite, echeance WHERE courtier_id OR
--       user_id ORDER BY echeance), analytics.js:152 (t.created_at, t.client_id),
--       adminSuperAdmin.js:503 (t.courtier_id, t.status != 'done').
--     Types : priorite/priority portent des libellés ('normale','haute','moyenne')
--     ET un entier (arkVoice.js:257 action.priority || 3) -> TEXT ;
--     echeance/due_date reçoivent NOW() + INTERVAL -> TIMESTAMPTZ.
--     NB : `title`/`priority`/`status`/`due_date` de ark.js:260 sont des ALIAS
--     (`titre as title`), mais `t.status` (adminSuperAdmin.js:504) et
--     `priority`/`due_date` en INSERT (arkVoice.js:254) sont de vraies colonnes.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS taches (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  courtier_id INTEGER,
  client_id INTEGER,
  titre TEXT,
  description TEXT,
  statut VARCHAR(32) DEFAULT 'a_faire',
  status VARCHAR(32),
  priorite TEXT,
  priority TEXT,
  echeance TIMESTAMPTZ,
  due_date TIMESTAMPTZ,
  type VARCHAR(64),
  source VARCHAR(64),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_taches_client ON taches(client_id);
CREATE INDEX IF NOT EXISTS idx_taches_courtier ON taches(courtier_id);
CREATE INDEX IF NOT EXISTS idx_taches_user ON taches(user_id);
CREATE INDEX IF NOT EXISTS idx_taches_statut ON taches(statut);

COMMIT;
