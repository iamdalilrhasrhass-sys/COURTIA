DROP TABLE IF EXISTS message_templates;
DROP TABLE IF EXISTS user_notification_prefs;
ALTER TABLE notifications DROP COLUMN IF EXISTS channel;
ALTER TABLE notifications DROP COLUMN IF EXISTS kind;
DELETE FROM feature_flags WHERE key = 'v1_notifications_search_reporting';
