const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuration de connexion
const config = {
  host: 'dpg-cmn5fqfqf0us73aq5d10-a.oregon-postgres.render.com',
  port: 5432,
  database: 'crm_assurance',
  user: 'courtia_db_user',
  password: 'Courtia2026!',
  ssl: {
    rejectUnauthorized: false
  }
};

async function injectDatabase() {
  const client = new Client(config);
  
  try {
    console.log('🔗 Connexion à la base de données...');
    await client.connect();
    console.log('✅ Connecté avec succès à crm_assurance\n');

    // Fichiers SQL à exécuter dans l'ordre
    const sqlFiles = [
      '01_insert_clients.sql',
      '02_insert_contracts.sql',
      '03_insert_tasks.sql',
      '04_update_risk_scores.sql'
    ];

    const sqlDir = '/tmp/COURTIA/backend/sql';
    const results = {};

    // Exécuter chaque fichier SQL
    for (const file of sqlFiles) {
      const filePath = path.join(sqlDir, file);
      console.log(`\n📄 Exécution: ${file}`);
      
      try {
        const sqlContent = fs.readFileSync(filePath, 'utf-8');
        await client.query(sqlContent);
        console.log(`✅ ${file} exécuté avec succès`);
        results[file] = 'SUCCESS';
      } catch (err) {
        console.error(`❌ Erreur lors de l'exécution de ${file}:`, err.message);
        results[file] = `ERREUR: ${err.message}`;
      }
    }

    // Vérifier les stats
    console.log('\n📊 VÉRIFICATION DES DONNÉES\n');
    
    const queries = [
      { name: 'Nombre de clients', query: 'SELECT COUNT(*) as count FROM clients;' },
      { name: 'Nombre de contrats', query: 'SELECT COUNT(*) as count FROM contracts;' },
      { name: 'Nombre de tâches', query: 'SELECT COUNT(*) as count FROM tasks;' },
      { name: 'Score de risque (min/max/avg)', query: 'SELECT MIN(risk_score) as min, MAX(risk_score) as max, AVG(risk_score)::DECIMAL(5,2) as avg FROM clients WHERE risk_score IS NOT NULL;' }
    ];

    const stats = {};
    for (const {name, query} of queries) {
      try {
        const result = await client.query(query);
        if (result.rows.length > 0) {
          stats[name] = result.rows[0];
          console.log(`${name}: ${JSON.stringify(result.rows[0])}`);
        }
      } catch (err) {
        console.error(`Erreur lors de la requête "${name}":`, err.message);
      }
    }

    // Rapport final
    console.log('\n' + '='.repeat(60));
    console.log('📋 RAPPORT FINAL D\'INJECTION');
    console.log('='.repeat(60));
    
    const clientCount = stats['Nombre de clients']?.count || 0;
    const contractCount = stats['Nombre de contrats']?.count || 0;
    const taskCount = stats['Nombre de tâches']?.count || 0;
    const riskScores = stats['Score de risque (min/max/avg)'] || {};

    console.log(`
✅ Clients chargés: ${clientCount} (attendu: 40)
✅ Contrats chargés: ${contractCount} (attendu: 60)
✅ Tâches chargées: ${taskCount} (attendu: 10)

📈 Scores de risque:
   - MIN: ${riskScores.min || 'N/A'}
   - MAX: ${riskScores.max || 'N/A'}
   - AVG: ${riskScores.avg || 'N/A'}

${clientCount === 40 && contractCount === 60 && taskCount === 10 
  ? '🎉 INJECTION RÉUSSIE - Toutes les données ont été chargées correctement!' 
  : '⚠️  INJECTION PARTIELLE - Vérifier les fichiers SQL'}
    `);

    console.log('='.repeat(60));

  } catch (err) {
    console.error('❌ Erreur de connexion ou d\'injection:', err.message);
  } finally {
    await client.end();
    console.log('\n🔌 Déconnexion complétée');
  }
}

// Lancer l'injection
injectDatabase().catch(err => {
  console.error('Erreur fatale:', err);
  process.exit(1);
});
