-- 021_v1_notifications_search_reporting.sql
-- Notifications, message templates and cockpit search.

CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  severity TEXT DEFAULT 'info',
  link TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  read_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS channel TEXT NOT NULL DEFAULT 'in_app';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS kind TEXT;
UPDATE notifications SET kind = COALESCE(kind, type) WHERE kind IS NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read
  ON notifications(user_id, read_at);

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

CREATE TABLE IF NOT EXISTS message_templates (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  scope TEXT NOT NULL CHECK (scope IN ('system', 'cabinet')),
  channel TEXT NOT NULL CHECK (channel IN ('email', 'whatsapp')),
  kind TEXT NOT NULL,
  name TEXT NOT NULL,
  subject TEXT,
  body_mjml TEXT,
  body_text TEXT,
  variables_schema JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(scope, channel, kind, name)
);

CREATE INDEX IF NOT EXISTS idx_message_templates_user_channel
  ON message_templates(user_id, channel, kind);

INSERT INTO feature_flags (key, description, default_enabled)
VALUES ('v1_notifications_search_reporting', 'V1 notifications, templates, global search and reporting cockpit', TRUE)
ON CONFLICT (key) DO UPDATE SET
  description = EXCLUDED.description,
  default_enabled = EXCLUDED.default_enabled;
