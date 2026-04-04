const { Client } = require('pg');

// Tenter de déduire quelle DB le backend utilise en testant les 2 possibilités
const configs = [
  {
    name: 'Frankfurt crm_assurance',
    connectionString: 'postgresql://crm_assurance_user:FhVu5BCbU9NNKy7TkSQX1RgEVNkFzZz0@dpg-d754sspaae7s73br85kg-a.frankfurt-postgres.render.com/crm_assurance',
    ssl: { rejectUnauthorized: false }
  },
  {
    name: 'Oregon courtia-db (ancienne)',
    connectionString: 'postgresql://courtia_db_user:Courtia2026!@dpg-cmn5fqfqf0us73aq5d10-a.oregon-postgres.render.com/crm_assurance',
    ssl: { rejectUnauthorized: false }
  }
];

async function testConfig(config) {
  const client = new Client(config);
  try {
    await client.connect();
    const result = await client.query('SELECT COUNT(*) as client_count FROM clients');
    const contrats = await client.query('SELECT COUNT(*) as quote_count FROM quotes LIMIT 1').catch(() => ({ rows: [{ quote_count: 'N/A' }] }));
    
    console.log(`\n✅ ${config.name}:`);
    console.log(`   - Clients: ${result.rows[0].client_count}`);
    console.log(`   - Quotes: ${contrats.rows[0].quote_count}`);
    await client.end();
    return true;
  } catch (err) {
    console.log(`\n❌ ${config.name}: ${err.message.split('\n')[0]}`);
    return false;
  }
}

async function main() {
  console.log('🔍 Vérification des configurations DB possibles...\n');
  for (const config of configs) {
    await testConfig(config);
  }
  process.exit(0);
}

main().catch(err => {
  console.error('Erreur:', err);
  process.exit(1);
});
