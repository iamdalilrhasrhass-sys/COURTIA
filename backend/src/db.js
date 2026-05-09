const { Pool } = require('pg');

const runningInTest = process.env.NODE_ENV === 'test' || Boolean(process.env.JEST_WORKER_ID)

if (!process.env.DATABASE_URL && !runningInTest) {
  console.error('❌ ERROR: DATABASE_URL environment variable is not set!');
  console.error('   Make sure DATABASE_URL is configured in Render environment.');
  process.exit(1);
}

const connectionString = process.env.DATABASE_URL || 'postgresql://localhost:5432/courtia_test'

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false }
});

pool.on('error', (err) => {
  console.error('❌ PostgreSQL pool error:', err.message);
});

module.exports = pool;
