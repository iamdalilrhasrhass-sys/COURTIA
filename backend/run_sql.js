const fs = require('fs');
const { Client } = require('pg');

// Render database credentials
const client = new Client({
  host: 'dpg-cmn5fqfqf0us73aq5d10-a.oregon-postgres.render.com',
  user: 'courtia_db_user',
  password: 'Courtia2026!',
  database: 'crm_assurance',
  port: 5432,
  ssl: { rejectUnauthorized: false }
});

async function runSQL() {
  try {
    await client.connect();
    console.log('✅ Connecté à PostgreSQL Render');

    // 1. Insert clients
    console.log('\n📝 [1/4] Insérant 40 clients...');
    const clients_sql = fs.readFileSync('./sql/01_insert_clients.sql', 'utf8');
    await client.query(clients_sql);
    console.log('✅ 40 clients insérés');

    // 2. Insert contrats
    console.log('\n📝 [2/4] Insérant 60 contrats...');
    const contrats_sql = fs.readFileSync('./sql/02_insert_contracts.sql', 'utf8');
    await client.query(contrats_sql);
    console.log('✅ 60 contrats insérés');

    // 3. Insert tâches
    console.log('\n📝 [3/4] Insérant 10 tâches...');
    const taches_sql = fs.readFileSync('./sql/03_insert_tasks.sql', 'utf8');
    await client.query(taches_sql);
    console.log('✅ 10 tâches insérées');

    // 4. Update scores
    console.log('\n📝 [4/4] Recalculant scores risque...');
    const scores_sql = fs.readFileSync('./sql/04_update_risk_scores.sql', 'utf8');
    await client.query(scores_sql);
    console.log('✅ Scores risque recalculés');

    // Vérifier les stats
    const stats = await client.query(
      'SELECT COUNT(*) as clients FROM clients WHERE courtier_id = 1'
    );
    console.log(`\n📊 Total clients: ${stats.rows[0].clients}`);

    const contrats = await client.query(
      'SELECT COUNT(*) as count FROM contracts WHERE courtier_id = 1 AND statut = \'actif\''
    );
    console.log(`📊 Contrats actifs: ${contrats.rows[0].count}`);

    const scores = await client.query(
      'SELECT AVG(score_risque) as avg_score, MIN(score_risque) as min, MAX(score_risque) as max FROM clients WHERE courtier_id = 1'
    );
    console.log(`📊 Score risque: moy=${Math.round(scores.rows[0].avg_score)}, min=${scores.rows[0].min}, max=${scores.rows[0].max}`);

    await client.end();
    console.log('\n✅ INJECTION COMPLÉTÉE AVEC SUCCÈS');
    process.exit(0);
  } catch (err) {
    console.error('❌ Erreur:', err.message);
    process.exit(1);
  }
}

runSQL();
