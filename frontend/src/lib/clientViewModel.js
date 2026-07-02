const EMPTY = '—'

const STATUS_LABELS = {
  actif: 'Actif',
  prospect: 'Prospect',
  a_risque: 'À risque',
  silencieux: 'Silencieux',
  inactif: 'Inactif',
  resilié: 'Résilié',
  résilié: 'Résilié',
  perdu: 'Perdu',
}

function toNumber(value, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function clean(value) {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

function titleCase(value) {
  const text = clean(value)
  if (!text) return EMPTY
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function getClientName(client = {}) {
  const explicit = clean(client.name || client.full_name || client.client_name)
  if (explicit) return explicit

  const first = clean(client.prenom || client.first_name || client.firstName)
  const last = clean(client.nom || client.last_name || client.lastName)
  return [first, last].filter(Boolean).join(' ') || EMPTY
}

export function normalizeStatus(status) {
  const raw = clean(status || 'prospect').toLowerCase()
  return raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '') === 'resilie'
    ? 'resilié'
    : raw
}

export function formatDateFr(value) {
  if (!value) return EMPTY
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return EMPTY
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatRelativeDays(value) {
  if (!value) return EMPTY
  const time = new Date(value).getTime()
  if (Number.isNaN(time)) return EMPTY
  const diff = Math.max(0, Date.now() - time)
  const days = Math.floor(diff / 86400000)
  if (days === 0) return "aujourd'hui"
  if (days === 1) return '1 j'
  if (days < 31) return `${days} j`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months} mois`
  return `${Math.floor(days / 365)} an${days >= 730 ? 's' : ''}`
}

export function normalizeClient(row = {}) {
  const name = getClientName(row)
  const status = normalizeStatus(row.statut || row.status)
  const segment = clean(row.segment || row.type || row.client_type || row.company_name && 'pro')
  const contracts = toNumber(row.contracts_count ?? row.nb_contrats ?? row.contracts, 0)
  const prime = toNumber(row.prime_annuelle_total ?? row.total_prime ?? row.portfolio_value ?? row.lifetime_value, 0)
  const score = Math.round(toNumber(row.score ?? row.score_risque ?? row.risk_score ?? row.loyalty_score, 0))
  const city = clean(row.city || row.ville || row.zone_geographique)

  return {
    ...row,
    id: row.id,
    prenom: clean(row.prenom || row.first_name || row.firstName),
    nom: clean(row.nom || row.last_name || row.lastName),
    name,
    type: titleCase(segment || 'particulier'),
    status,
    statusLabel: STATUS_LABELS[status] || titleCase(status),
    city: city || EMPTY,
    contracts,
    prime,
    score,
    lastContact: formatRelativeDays(row.last_contact || row.updated_at || row.created_at),
    createdAtLabel: formatDateFr(row.created_at),
    ark: row.ark || row.next_best_action || null,
  }
}

export function filterClientViewModels(clients = [], { search = '', filter = 'tous' } = {}) {
  const term = clean(search).toLowerCase()
  return clients.filter((client) => {
    const matchesSearch = !term || [
      client.name,
      client.city,
      client.type,
      client.email,
      client.telephone,
    ].some(value => clean(value).toLowerCase().includes(term))

    if (!matchesSearch) return false
    if (filter === 'tous') return true
    if (filter === 'particulier') return client.type.toLowerCase().includes('particulier')
    if (filter === 'pro') return ['pro', 'professionnel'].some(v => client.type.toLowerCase().includes(v))
    return client.status === filter
  })
}

export function buildClientStats(clients = []) {
  const total = clients.length
  const actifs = clients.filter(c => c.status === 'actif').length
  const inactifs = clients.filter(c => ['silencieux', 'a_risque', 'inactif', 'perdu', 'resilié', 'résilié'].includes(c.status)).length
  const avgScore = total ? Math.round(clients.reduce((sum, c) => sum + toNumber(c.score), 0) / total) : 0
  return { total, actifs, inactifs, avgScore }
}

export function normalizeClientDetail(row = {}) {
  const normalized = normalizeClient(row)
  return {
    ...normalized,
    email: clean(row.email) || EMPTY,
    telephone: clean(row.telephone || row.phone) || EMPTY,
    adresse: clean(row.adresse || row.address) || EMPTY,
    siret: clean(row.siret || row.siren) || EMPTY,
    created_at: row.created_at || row.createdAt || null,
    last_contact: row.last_contact || row.updated_at || row.created_at || null,
    portfolio_value: normalized.prime,
    risque: normalized.score >= 75 ? 'Faible' : normalized.score >= 45 ? 'Modéré' : 'À surveiller',
  }
}

export function normalizeContract(row = {}) {
  const prime = toNumber(row.prime ?? row.prime_annuelle ?? row.annual_premium, 0)
  const echeance = row.echeance || row.date_echeance || row.due_date || null
  const days = echeance ? Math.ceil((new Date(echeance).getTime() - Date.now()) / 86400000) : null
  return {
    ...row,
    id: row.id,
    type: clean(row.type || row.type_contrat || row.product) || 'Contrat',
    compagnie: clean(row.compagnie || row.company || row.assureur) || EMPTY,
    prime,
    echeance: formatDateFr(echeance),
    jours: Number.isFinite(days) ? days : null,
    alert: Number.isFinite(days) && days >= 0 && days <= 30,
    statut: normalizeStatus(row.statut || row.status || 'actif'),
  }
}

export function normalizeTask(row = {}) {
  return {
    id: row.id,
    label: clean(row.label || row.titre || row.title) || 'Tâche',
    due: formatDateFr(row.due || row.echeance || row.start_time),
    priority: clean(row.priority || row.priorite || 'normale'),
  }
}

export function buildClientHistory(client, contracts = [], tasks = []) {
  const events = []
  if (client?.created_at) {
    events.push({
      id: 'created',
      label: 'Client créé',
      date: formatDateFr(client.created_at),
      color: '#6B7280',
    })
  }
  contracts.slice(0, 3).forEach((contract) => {
    events.unshift({
      id: `contract-${contract.id}`,
      label: `Contrat ${contract.type} ${contract.statut === 'actif' ? 'actif' : contract.statut}`,
      date: contract.echeance,
      color: '#22C55E',
    })
  })
  tasks.slice(0, 3).forEach((task) => {
    events.unshift({
      id: `task-${task.id}`,
      label: task.label,
      date: task.due,
      color: '#F59E0B',
    })
  })
  return events
}
