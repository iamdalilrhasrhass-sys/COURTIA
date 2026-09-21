const { Pool } = require('pg');


// ── POURQUOI CE MODULE N'APPELLE PLUS process.exit AU CHARGEMENT ─────────────
// (mesure du 21/09/2026) Avant, ce module affichait l'erreur puis appelait
// `process.exit(1)` dès son IMPORT quand DATABASE_URL était absente. Or `db` est
// importé transitivement par des services que les tests exercent avec un pool
// FACTICE (claimsService, arkWatch…) : sous Jest, l'import tuait le worker —
// « Jest worker encountered 4 child process exceptions, exceeding retry limit
// … process.exit called with "1" ». La CI backend était donc rouge PAR
// CONSTRUCTION (4 suites, 50 tests) alors qu'AUCUNE suite n'a besoin d'une base
// réelle : mesuré 201/201 suites et 1 373 tests verts avec une DATABASE_URL
// volontairement injoignable. Un module importable n'a pas à tuer le processus
// qui l'importe (cela cassait aussi tout outillage : lint, couverture, scripts).
//
// Le contrôle de démarrage EXISTE TOUJOURS, mais explicitement :
// `verifierConfigurationBase()` est appelé par les POINTS D'ENTRÉE (server.js,
// scripts/*) juste après le require. Démarrer sans DATABASE_URL échoue donc
// toujours — même message, même code de sortie 1 qu'avant.
function verifierConfigurationBase() {
  if (!process.env.DATABASE_URL) {
    console.error("❌ ERROR: DATABASE_URL environment variable is not set!");
    console.error("   Make sure DATABASE_URL is configured in Render environment.");
    process.exit(1);
  }
  return true;
}

// === STARTUP CHECK SECURE DB LOGGING ===
// Journalisé seulement si la variable existe : sans elle, c'est
// `verifierConfigurationBase()` qui arrête le processus, et sous Jest on ne
// journalise rien d'inutile.
if (process.env.DATABASE_URL) {
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
// Le contrôle de démarrage est accessible depuis les points d'entrée :
//   const pool = require('./src/db'); pool.verifierConfigurationBase()
module.exports.verifierConfigurationBase = verifierConfigurationBase;
