-- 042: Password reset support
ALTER TABLE IF EXISTS users
  ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(128),
  ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_users_password_reset_token
  ON users (password_reset_token);
