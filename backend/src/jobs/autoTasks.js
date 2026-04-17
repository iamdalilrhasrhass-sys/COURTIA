/**
 * @file autoTasks.js — Générateur de tâches automatiques basé sur règles locales.
 * Aucun appel IA. Déclenchement manuel via POST /api/taches/auto-generate.
 */

const RULES = [
  {
    key: 'renouvellement_urgent',
    check: (client, contrat, tachesClient) => {
      if (!contrat.date_echeance) return null
      const days = Math.ceil((new Date(contrat.date_echeance) - new Date()) / 86400000)
      if (days < 0 || days > 15) return null
      const exists = tachesClient.some(t =>
        t.statut !== 'terminee' &&
        t.titre?.toLowerCase().includes('urgent') &&
        String(t.client_id) === String(client.id)
      )
      if (exists) return null
      return {
        titre: `URGENT Renouvellement — ${contrat.type_contrat || 'contrat'}`,
        description: `Échéance dans ${days} jour${days !== 1 ? 's' : ''} (${new Date(contrat.date_echeance).toLocaleDateString('fr-FR')})`,
        priorite: 'haute',
        echeance: contrat.date_echeance,
      }
    }
  },
  {
    key: 'renouvellement_prepare',
    check: (client, contrat, tachesClient) => {
      if (!contrat.date_echeance) return null
      const days = Math.ceil((new Date(contrat.date_echeance) - new Date()) / 86400000)
      if (days < 15 || days > 30) return null
      const exists = tachesClient.some(t =>
        t.statut !== 'terminee' &&
        t.titre?.toLowerCase().includes('renouvellement') &&
        String(t.client_id) === String(client.id)
      )
      if (exists) return null
      return {
        titre: `Préparer renouvellement — ${contrat.type_contrat || 'contrat'}`,
        description: `Échéance dans ${days} jours`,
        priorite: 'normale',
        echeance: contrat.date_echeance,
      }
    }
  },
]

const CLIENT_RULES = [
  {
    key: 'reprendre_contact',
    check: (client, contrats, tachesClient) => {
      const lastActivity = client.updated_at || client.created_at
      if (!lastActivity) return null
      const daysSince = Math.floor((Date.now() - new Date(lastActivity).getTime()) / 86400000)
      if (daysSince < 90) return null
      const statut = (client.statut || '').toLowerCase()
      if (statut !== 'actif' && statut !== 'active') return null
      const exists = tachesClient.some(t =>
        t.statut !== 'terminee' &&
        t.titre?.toLowerCase().includes('contact') &&
        String(t.client_id) === String(client.id)
      )
      if (exists) return null
      const echeance = new Date(Date.now() + 7 * 86400000).toISOString()
      return {
        titre: `Reprendre contact — ${client.nom || ''} ${client.prenom || ''}`.trim(),
        description: `Aucune activité depuis ${daysSince} jours`,
        priorite: 'normale',
        echeance,
      }
    }
  },
  {
    key: 'completude',
    check: (client, contrats, tachesClient) => {
      const CHAMPS = ['nom', 'prenom', 'email', 'telephone', 'adresse', 'profession',
        'situation_familiale', 'bonus_malus', 'annees_permis', 'nb_sinistres_3ans', 'zone_geographique', 'segment']
      const filled = CHAMPS.filter(k => client[k] !== null && client[k] !== undefined && String(client[k]).trim() !== '').length
      const completude = Math.round(filled / CHAMPS.length * 100)
      if (completude >= 50) return null
      const exists = tachesClient.some(t =>
        t.statut !== 'terminee' &&
        t.titre?.toLowerCase().includes('dossier') &&
        String(t.client_id) === String(client.id)
      )
      if (exists) return null
      const echeance = new Date(Date.now() + 14 * 86400000).toISOString()
      return {
        titre: `Compléter dossier — ${client.nom || ''} ${client.prenom || ''}`.trim(),
        description: `Dossier à ${completude}% — données clés manquantes`,
        priorite: 'basse',
        echeance,
      }
    }
  },
]

/**
 * Génère les tâches automatiques manquantes pour un courtier.
 * @param {Object} pool — instance pg pool
 * @param {number|string} courtierId
 * @returns {Promise<{ created: number, tasks: Object[] }>}
 */
async function generateAutoTasks(pool, courtierId) {
  const created = []

  const [clientsRes, contratsRes, tachesRes] = await Promise.all([
    pool.query(`
      SELECT
        id, first_name as nom, last_name as prenom,
        email, phone as telephone, address as adresse,
        status as statut, bonus_malus, annees_permis,
        nb_sinistres_3ans, zone_geographique, profession,
        situation_familiale, type as segment,
        created_at, updated_at
      FROM clients
    `),
    pool.query(`
      SELECT
        id, client_id, status as statut,
        quote_data->>'date_echeance' as date_echeance,
        quote_data->>'type_contrat' as type_contrat
      FROM quotes
    `),
    pool.query(
      `SELECT id, title as titre, status as statut, client_id
       FROM appointments WHERE user_id = $1`,
      [courtierId]
    ),
  ])

  const clients  = clientsRes.rows
  const contrats = contratsRes.rows
  const taches   = tachesRes.rows

  for (const client of clients) {
    const tachesClient = taches.filter(t => String(t.client_id) === String(client.id))
    const contratsClient = contrats.filter(c => String(c.client_id) === String(client.id))

    // Règles par contrat
    for (const contrat of contratsClient) {
      const statut = (contrat.statut || '').toLowerCase()
      if (statut !== 'actif' && statut !== 'active') continue
      for (const rule of RULES) {
        const task = rule.check(client, contrat, tachesClient)
        if (!task) continue
        const res = await pool.query(
          `INSERT INTO appointments (title, description, client_id, start_time, status, user_id, created_at)
           VALUES ($1, $2, $3, $4, 'a_faire', $5, NOW()) RETURNING *`,
          [task.titre, task.description, client.id, task.echeance, courtierId]
        )
        created.push(res.rows[0])
      }
    }

    // Règles par client
    for (const rule of CLIENT_RULES) {
      const task = rule.check(client, contratsClient, tachesClient)
      if (!task) continue
      const res = await pool.query(
        `INSERT INTO appointments (title, description, client_id, start_time, status, user_id, created_at)
         VALUES ($1, $2, $3, $4, 'a_faire', $5, NOW()) RETURNING *`,
        [task.titre, task.description, client.id, task.echeance, courtierId]
      )
      created.push(res.rows[0])
    }
  }

  return { created: created.length, tasks: created }
}

module.exports = { generateAutoTasks }
