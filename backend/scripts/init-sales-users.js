require('dotenv').config()
const pool = require('../src/db')
const { inviteSalesUser } = require('../src/services/salesUserService')

const accounts = [
  { username: 'boss', role: 'super_admin', email: process.env.BOSS_EMAIL, first_name: 'Boss' },
  { username: 'tarek', role: 'prospecteur', email: process.env.TAREK_EMAIL, first_name: 'Tarek' },
  { username: 'ahmed', role: 'prospecteur', email: process.env.AHMED_EMAIL, first_name: 'Ahmed' },
]

async function run() {
  const missing = accounts.filter((account) => !account.email).map((account) => `${account.username.toUpperCase()}_EMAIL`)
  if (missing.length) {
    throw new Error(`Variables requises manquantes : ${missing.join(', ')}`)
  }
  const actorResult = await pool.query(`SELECT id FROM users WHERE role='super_admin' AND deleted_at IS NULL ORDER BY id LIMIT 1`)
  const actor = actorResult.rows[0] || null
  const results = []
  for (const account of accounts) {
    const created = await inviteSalesUser(actor, account, {}, { allowExisting: true, requireEmail: true })
    results.push({ username: created.username, email: created.email, role: created.role, invitation_sent: created.invitation_sent })
  }
  console.table(results)
  console.log('Aucun mot de passe temporaire n’a été généré ou affiché. Chaque utilisateur doit choisir son mot de passe via le lien reçu.')
}

run()
  .catch((error) => {
    console.error(`Initialisation impossible : ${error.code || error.message}`)
    process.exitCode = 1
  })
  .finally(() => pool.end())
