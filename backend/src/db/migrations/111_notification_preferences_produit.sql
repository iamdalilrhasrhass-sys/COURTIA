-- ============================================================================
-- 110 — PRÉFÉRENCES DE NOTIFICATION : « NOUVEAUTÉS PRODUIT »
--
-- POURQUOI CETTE MIGRATION
-- L'écran Paramètres > Notifications expose quatre interrupteurs. Trois d'entre
-- eux correspondent à des colonnes déjà présentes dans `user_notification_prefs`
-- (migration 021) :
--     Alertes échéances contrats -> contract_expiry_enabled
--     Rappels de tâches          -> overdue_tasks_enabled
--     Morning Brief quotidien    -> morning_brief_enabled
-- Le quatrième (« Nouveautés produit ») n'avait AUCUNE colonne : il ne pouvait
-- donc pas être enregistré. Cette migration ajoute la colonne manquante pour que
-- les quatre choix soient réellement persistés et relus au chargement.
--
-- Additive et idempotente : aucune table recréée, aucune donnée réécrite.
-- Le CREATE TABLE IF NOT EXISTS reproduit la définition de 021 afin que cette
-- migration reste applicable seule, même sur une base où 021 n'aurait pas été
-- passée (le runner applique par ordre alphabétique, 021 reste la référence).
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_notification_prefs (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  in_app_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  email_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  whatsapp_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  morning_brief_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  overdue_tasks_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  contract_expiry_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE user_notification_prefs
  ADD COLUMN IF NOT EXISTS product_news_enabled BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE user_notification_prefs
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

COMMENT ON COLUMN user_notification_prefs.product_news_enabled IS
  'Préférence « Nouveautés produit » (Paramètres > Notifications). FALSE par défaut : aucun cabinet ne reçoit d''annonce produit sans l''avoir demandé.';
COMMENT ON COLUMN user_notification_prefs.contract_expiry_enabled IS
  'Préférence « Alertes échéances contrats » (Paramètres > Notifications).';
COMMENT ON COLUMN user_notification_prefs.overdue_tasks_enabled IS
  'Préférence « Rappels de tâches » (Paramètres > Notifications).';
COMMENT ON COLUMN user_notification_prefs.morning_brief_enabled IS
  'Préférence « Morning Brief quotidien » (Paramètres > Notifications).';
