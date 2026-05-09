DELETE FROM feature_flags WHERE key = 'v1_google_gmail_calendar';
DROP TABLE IF EXISTS email_messages;
DROP TABLE IF EXISTS email_threads;
DROP TABLE IF EXISTS oauth_tokens;
