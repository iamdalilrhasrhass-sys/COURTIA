const { Pool } = require('pg');


if (!process.env.DATABASE_URL) {
  console.error("❌ ERROR: DATABASE_URL environment variable is not set!");
  console.error("   Make sure DATABASE_URL is configured in Render environment.");
  process.exit(1);
}

// === STARTUP CHECK SECURE DB LOGGING ===
try {
  const dbUrl = new URL(process.env.DATABASE_URL);
  const dbName = dbUrl.pathname.replace(/^\//, "");
  const dbHost = dbUrl.hostname;
  
  const maskedHost = dbHost.length > 4 
    ? dbHost.substring(0, 2) + "***" + dbHost.substring(dbHost.length - 2)
    : "***";
  
  console.log(`\n[db-startup-check] NODE_ENV=${process.env.NODE_ENV || "development"}`);
  console.log(`[db-startup-check] database=${dbName}`);
  console.log(`[db-startup-check] host=${maskedHost}`);
  
  if (process.env.NODE_ENV === "production") {
    if (dbName === "crm_assurance") {
      console.log(`[db-startup-check] production database target OK`);
    } else {
      console.error(`[db-startup-check] WARNING production database is not crm_assurance`);
    }
  }
} catch (err) {
  console.error("[db-startup-check] WARNING: invalid DATABASE_URL format");
}
// =========================================


// SSL : par défaut activé (Render/Neon exigent TLS). PGSSLMODE=disable permet de
// faire tourner la recette QA contre une PostgreSQL locale (socket Unix), qui ne
// parle pas TLS. Le défaut en production est inchangé.
const sslDesactive = ['disable', 'disabled', 'false', '0', 'off']
  .includes(String(process.env.PGSSLMODE || '').trim().toLowerCase())

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: sslDesactive ? false : { rejectUnauthorized: false }
});

pool.on('error', (err) => {
  console.error('❌ PostgreSQL pool error:', err.message);
});

module.exports = pool;
