function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (secret && secret.trim()) return secret.trim();

  if (process.env.NODE_ENV !== 'production') {
    return 'dev-only-jwt-secret-change-me';
  }

  const error = new Error('JWT secret missing');
  error.code = 'JWT_SECRET_MISSING';
  throw error;
}

module.exports = { getJwtSecret };

