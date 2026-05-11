const { Pool } = require('pg');

if (!process.env.ADMIN_EMAIL) {
  console.error("❌ ERREUR: La variable d'environnement ADMIN_EMAIL est requise.");
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error("❌ ERREUR: La variable DATABASE_URL est requise.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function promoteAdmin() {
  const email = process.env.ADMIN_EMAIL.toLowerCase();
  
  try {
    const result = await pool.query(
      `UPDATE users 
       SET role = 'super_admin' 
       WHERE lower(email) = $1 
       RETURNING id, email, role`,
      [email]
    );

    if (result.rows.length === 0) {
      console.log(`⚠️ Aucun compte trouvé avec l'email: ${email}`);
    } else {
      console.log(`✅ Compte mis à jour avec succès :`);
      console.table(result.rows);
    }
  } catch (error) {
    console.error("❌ Erreur lors de la mise à jour:", error.message);
  } finally {
    await pool.end();
  }
}

promoteAdmin();