/**
 * scripts/migrate.js — Runner de migrations SQL
 * Usage: npm run migrate
 *
 * Exécute les fichiers .sql dans db/migrations/ par ordre alphabétique.
 * Chaque migration est exécutée dans une transaction.
 */

const fs = require('fs');
const path = require('path');
const pool = require('../src/db');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'src', 'db', 'migrations');

async function migrate() {
  console.log('🔄 COURTIA — Migration runner');
  console.log(`📂 Dossier: ${MIGRATIONS_DIR}`);

  let files;
  try {
    files = fs.readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith('.sql'))
      .sort();
  } catch (err) {
    console.log('⚠️  Aucun dossier de migrations trouvé.');
    process.exit(0);
  }

  if (files.length === 0) {
    console.log('✅ Aucune migration à exécuter.');
    process.exit(0);
  }

  console.log(`📋 ${files.length} migration(s) trouvée(s):`);
  files.forEach(f => console.log(`   - ${f}`));

  let success = 0;
  let skipped = 0;
  let errors = 0;

  for (const file of files) {
    const filepath = path.join(MIGRATIONS_DIR, file);
    const sql = fs.readFileSync(filepath, 'utf8');

    console.log(`\n▶️  Exécution: ${file}`);
    try {
      await pool.query('BEGIN');
      await pool.query(sql);
      await pool.query('COMMIT');
      console.log(`   ✅ OK`);
      success++;
    } catch (err) {
      await pool.query('ROLLBACK').catch(() => {});
      // Si l'erreur est "already exists", on considère que c'est déjà appliqué
      if (err.message.includes('already exists') || err.message.includes('duplicate')) {
        console.log(`   ⏭️  Déjà appliqué (${err.message.split('\n')[0]})`);
        skipped++;
      } else {
        console.error(`   ❌ Erreur: ${err.message}`);
        errors++;
      }
    }
  }

  console.log(`\n📊 Résultat: ${success} OK, ${skipped} sauté(s), ${errors} erreur(s)`);

  if (errors > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

migrate().catch(err => {
  console.error('Erreur fatale:', err);
  process.exit(1);
});
