/**
 * Database Connection Pool
 * Lazy-loaded PostgreSQL pool
 */

const { Pool } = require('pg');

let pool = null;

function getPool() {
  if (!pool) {
    pool = new Pool({
      user: process.env.DB_USER || 'dalilrhasrhass',
      password: process.env.DB_PASSWORD || '',
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'crm_assurance',
      connectionTimeoutMillis: 2000,
      idleTimeoutMillis: 10000,
      max: 10,
      application_name: 'crm-assurance-backend'
    });

    pool.on('error', (err) => {
      console.error('⚠️  Database error:', err.message);
    });
  }

  return pool;
}

// Expose pool as getter
module.exports = {
  query: (sql, params) => getPool().query(sql, params),
  end: () => {
    if (pool) {
      return pool.end();
    }
    return Promise.resolve();
  }
};
