const STATIC_ACTIONS = [
  { type: 'action', id: 'dashboard', title: 'Tableau de bord', subtitle: 'Ouvrir le cockpit courtier', path: '/dashboard' },
  { type: 'action', id: 'morning-brief', title: 'Morning Brief', subtitle: 'Voir les priorités ARK du jour', path: '/morning-brief' },
  { type: 'action', id: 'documents', title: 'Documents DDA', subtitle: 'Générer FIC, mandat ou devoir de conseil', path: '/documents' },
  { type: 'action', id: 'commissions', title: 'Commissions', subtitle: 'Piloter les commissions par compagnie', path: '/commissions' },
  { type: 'action', id: 'billing', title: 'Abonnement', subtitle: 'Gérer le plan et les factures', path: '/billing' },
  { type: 'action', id: 'settings', title: 'Intégrations', subtitle: 'Configurer Gmail, Agenda et WhatsApp', path: '/parametres/integrations' },
]

function buildSearchPattern(query = '') {
  const value = String(query || '').trim().replace(/\s+/g, ' ').slice(0, 80)
  return `%${value}%`
}

function normalizeSearchResult(row = {}) {
  return {
    type: String(row.type || 'action'),
    id: String(row.id || row.path || row.title || ''),
    title: String(row.title || '').slice(0, 120),
    subtitle: String(row.subtitle || '').slice(0, 180),
    path: String(row.path || '/dashboard'),
  }
}

async function runOptionalQuery(pool, sql, params) {
  try {
    const result = await pool.query(sql, params)
    return result.rows || []
  } catch (err) {
    if (err.code === '42P01' || err.code === '42703') return []
    throw err
  }
}

async function searchCourtia(pool, userId, query, { limit = 10 } = {}) {
  const pattern = buildSearchPattern(query)
  const params = [userId, pattern]
  const results = []

  const clients = await runOptionalQuery(pool, `
    SELECT 'client' AS type,
           c.id,
           CONCAT(COALESCE(c.first_name, c.prenom, ''), ' ', COALESCE(c.last_name, c.nom, '')) AS title,
           CONCAT('Client · ', COALESCE(c.email, c.phone, c.telephone, 'fiche portefeuille')) AS subtitle,
           CONCAT('/clients/', c.id) AS path
    FROM clients c
    WHERE c.courtier_id = $1
      AND (
        CONCAT(COALESCE(c.first_name, c.prenom, ''), ' ', COALESCE(c.last_name, c.nom, '')) ILIKE $2
        OR COALESCE(c.email, '') ILIKE $2
        OR COALESCE(c.phone, c.telephone, '') ILIKE $2
      )
    ORDER BY c.updated_at DESC NULLS LAST
    LIMIT 5
  `, params)
  results.push(...clients)

  const contracts = await runOptionalQuery(pool, `
    SELECT 'contrat' AS type,
           q.id,
           COALESCE(q.quote_data->>'type_contrat', q.quote_data->>'type', 'Contrat') AS title,
           CONCAT(COALESCE(c.first_name, c.prenom, ''), ' ', COALESCE(c.last_name, c.nom, ''), ' · ', COALESCE(q.quote_data->>'compagnie', 'compagnie')) AS subtitle,
           CONCAT('/clients/', q.client_id) AS path
    FROM quotes q
    JOIN clients c ON c.id = q.client_id
    WHERE c.courtier_id = $1
      AND (
        COALESCE(q.quote_data->>'type_contrat', q.quote_data->>'type', '') ILIKE $2
        OR COALESCE(q.quote_data->>'compagnie', '') ILIKE $2
        OR CONCAT(COALESCE(c.first_name, c.prenom, ''), ' ', COALESCE(c.last_name, c.nom, '')) ILIKE $2
      )
    ORDER BY q.created_at DESC NULLS LAST
    LIMIT 4
  `, params)
  results.push(...contracts)

  const documents = await runOptionalQuery(pool, `
    SELECT 'document' AS type,
           d.id,
           UPPER(d.type) AS title,
           CONCAT('Document ', d.status, ' · client #', d.client_id) AS subtitle,
           CONCAT('/clients/', d.client_id) AS path
    FROM documents d
    WHERE d.user_id = $1
      AND (d.type ILIKE $2 OR d.status ILIKE $2)
    ORDER BY d.created_at DESC NULLS LAST
    LIMIT 3
  `, params)
  results.push(...documents)

  const actions = STATIC_ACTIONS.filter((action) => {
    const text = `${action.title} ${action.subtitle}`.toLowerCase()
    return text.includes(String(query || '').trim().toLowerCase())
  })
  results.push(...(actions.length > 0 ? actions : STATIC_ACTIONS.slice(0, 2)))

  return results
    .map(normalizeSearchResult)
    .filter((row) => row.title)
    .slice(0, Math.max(1, Math.min(Number(limit) || 10, 25)))
}

module.exports = {
  STATIC_ACTIONS,
  buildSearchPattern,
  normalizeSearchResult,
  searchCourtia,
}
