const { Client } = require('pg');

const config = {
  host: 'dpg-cmn5fqfqf0us73aq5d10-a.oregon-postgres.render.com',
  port: 5432,
  database: 'crm_assurance',
  user: 'courtia_db_user',
  password: 'Courtia2026!',
  ssl: true
};

async function test() {
  const client = new Client(config);
  try {
    console.log('Tentative de connexion...');
    await client.connect();
    console.log('✅ Connecté!');
    const res = await client.query('SELECT 1');
    console.log('Query result:', res.rows);
  } catch (err) {
    console.error('Erreur:', err.message);
  } finally {
    await client.end();
  }
}

test();
