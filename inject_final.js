const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuration via connection string URI (plus fiable)
const connectionString = 'postgres://courtia_db_user:Courtia2026!@dpg-cmn5fqfqf0us73aq5d10-a.oregon-postgres.render.com:5432/crm_assurance?sslmode=require';

async function injectDatabase() {
  const client = new Client({
    connectionString: connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });
  
  try {
    console.log('🔗 Connexion à PostgreSQL Render...');
    await client.connect();
    console.log('✅ Connecté avec succès!\n');

    // Fichiers SQL à exécuter dans l'ordre
    const sqlFiles = [
      '01_insert_clients.sql',
      '02_insert_contracts.sql',
      '03_insert_tasks.sql',
      '04_update_risk_scores.sql'
    ];

    const sqlDir = '/tmp/COURTIA/backend/sql';

    // Exécuter chaque fichier SQL
    for (const file of sqlFiles) {
      const filePath = path.join(sqlDir, file);
      console.log(`📄 Exécution: ${file}`);
      
      try {
        const sqlContent = fs.readFileSync(filePath, 'utf-8');
        const result = await client.query(sqlContent);
        console.log(`   ✅ ${file} exécuté (${result.rowCount} lignes affectées)\n`);
      } catch (err) {
        console.error(`   ❌ ERREUR: ${err.message}\n`);
      }
    }

    // Vérifier les stats
    console.log('📊 VÉRIFICATION DES DONNÉES\n');
    
    try {
      const clients = await client.query('SELECT COUNT(*) as count FROM clients;');
      const contracts = await client.query('SELECT COUNT(*) as count FROM contracts;');
      const tasks = await client.query('SELECT COUNT(*) as count FROM tasks;');
      const scores = await client.query('SELECT MIN(risk_score) as min, MAX(risk_score) as max, AVG(risk_score)::DECIMAL(5,2) as avg FROM clients WHERE risk_score IS NOT NULL;');
      
      const c = clients.rows[0].count;
      const ct = contracts.rows[0].count;
      const t = tasks.rows[0].count;
      const sc = scores.rows[0];

      console.log(`Clients: ${c} (attendu: 40)`);
      console.log(`Contrats: ${ct} (attendu: 60)`);
      console.log(`Tâches: ${t} (attendu: 10)`);
      console.log(`Scores - MIN: ${sc.min}, MAX: ${sc.max}, AVG: ${sc.avg}\n`);

      // Rapport final
      console.log('='.repeat(60));
      if (c === 40 && ct === 60 && t === 10) {
        console.log('🎉 INJECTION RÉUSSIE');
        console.log(`✅ ${c} clients chargés`);
        console.log(`✅ ${ct} contrats chargés`);
        console.log(`✅ ${t} tâches chargées`);
        console.log(`📈 Scores de risque: ${sc.min} à ${sc.max}, moyenne ${sc.avg}`);
      } else {
        console.log('⚠️  INJECTION PARTIELLE');
        console.log(`❌ Clients: ${c}/40`);
        console.log(`❌ Contrats: ${ct}/60`);
        console.log(`❌ Tâches: ${t}/10`);
      }
      console.log('='.repeat(60));

    } catch (err) {
      console.error('Erreur lors de la vérification:', err.message);
    }

  } catch (err) {
    console.error('❌ Erreur de connexion:', err.message);
  } finally {
    await client.end();
    console.log('🔌 Déconnexion');
  }
}

injectDatabase().catch(err => {
  console.error('Erreur fatale:', err);
  process.exit(1);
});
