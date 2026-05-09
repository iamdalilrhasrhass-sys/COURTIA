DROP TABLE IF EXISTS whatsapp_messages;
DROP TABLE IF EXISTS whatsapp_conversations;
DELETE FROM feature_flags WHERE key = 'v1_whatsapp_business';
