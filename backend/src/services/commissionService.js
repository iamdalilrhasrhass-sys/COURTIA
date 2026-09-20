const porteeCabinet = require('../lib/porteeCabinet')

const COMMISSION_STATUSES = new Set(['expected', 'partial', 'paid', 'overdue', 'cancelled'])

function normalizePeriod(period = {}) {
  if (typeof period === 'string') {
    const match = period.trim().match(/^(\d{4})-(\d{1,2})$/)
    if (!match) throw new Error('invalid_period')
    const year = Number.parseInt(match[1], 10)
    const month = Number.parseInt(match[2], 10)
    if (month < 1 || month > 12) throw new Error('invalid_period')
    return { year, month }
  }

  const year = Number.parseInt(period.year ?? period.period_year, 10)
  const month = Number.parseInt(period.month ?? period.period_month, 10)
  if (!Number.isFinite(year) || year < 2000 || year > 2100 || !Number.isFinite(month) || month < 1 || month > 12) {
    throw new Error('invalid_period')
  }
  return { year, month }
}

function eurosToCents(value) {
  if (value === null || value === undefined || value === '') return 0
  if (typeof value === 'number') return Math.round(value * 100)
  const normalized = String(value)
    .trim()
    .replace(/\s/g, '')
    .replace(/[€]/g, '')
    .replace(',', '.')
  const amount = Number.parseFloat(normalized)
  if (!Number.isFinite(amount)) return 0
  return Math.round(amount * 100)
}

function centsToEuros(value) {
  const cents = Number.parseInt(value || 0, 10)
  return Math.round((cents / 100) * 100) / 100
}

function sanitizeStatus(value) {
  const status = String(value || 'expected').trim().toLowerCase()
  return COMMISSION_STATUSES.has(status) ? status : 'expected'
}

function sanitizeBps(value) {
  const parsed = Number.parseInt(value || 0, 10)
  if (!Number.isFinite(parsed)) return 0
  return Math.min(Math.max(parsed, 0), 10000)
}

function normalizeCommissionPayload(input = {}) {
  const period = normalizePeriod(input.period || input)
  const insurer = String(input.insurer || input.compagnie || '').trim()
  if (!insurer) throw new Error('insurer_required')

  return {
    insurer,
    period_year: period.year,
    period_month: period.month,
    expected_amount_cents: eurosToCents(input.expected_amount_cents != null ? Number(input.expected_amount_cents) / 100 : input.expected_amount ?? input.montant_attendu),
    received_amount_cents: eurosToCents(input.received_amount_cents != null ? Number(input.received_amount_cents) / 100 : input.received_amount ?? input.montant_recu),
    status: sanitizeStatus(input.status || input.statut),
    apporteur_user_id: input.apporteur_user_id ? Number.parseInt(input.apporteur_user_id, 10) : null,
    apporteur_share_bps: sanitizeBps(input.apporteur_share_bps),
    notes: String(input.notes || '').trim() || null,
  }
}

function splitCsvLine(line, delimiter) {
  const out = []
  let current = ''
  let quoted = false

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]
    const next = line[i + 1]
    if (ch === '"' && quoted && next === '"') {
      current += '"'
      i += 1
    } else if (ch === '"') {
      quoted = !quoted
    } else if (ch === delimiter && !quoted) {
      out.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  out.push(current.trim())
  return out
}

function normalizeHeader(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function mapCsvKey(header) {
  const key = normalizeHeader(header)
  const aliases = {
    compagnie: 'insurer',
    insurer: 'insurer',
    contract_ref: 'contract_ref',
    contrat_ref: 'contract_ref',
    numero: 'contract_ref',
    numero_contrat: 'contract_ref',
    periode: 'period',
    period: 'period',
    montant_attendu: 'expected_amount',
    expected_amount: 'expected_amount',
    expected: 'expected_amount',
    montant_recu: 'received_amount',
    montant_recu_eur: 'received_amount',
    received_amount: 'received_amount',
    received: 'received_amount',
    statut: 'status',
    status: 'status',
    notes: 'notes',
  }
  return aliases[key] || key
}

function parseCommissionCsv(content = '') {
  const lines = String(content || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length < 2) return []
  const delimiter = lines[0].includes(';') ? ';' : ','
  const headers = splitCsvLine(lines[0], delimiter).map(mapCsvKey)

  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line, delimiter)
    return headers.reduce((row, key, index) => {
      row[key] = cells[index] || ''
      return row
    }, {})
  })
}

function getUserId(user = {}) {
  return user.id || user.userId
}

// ─────────────────────────────────────────────────────────────────────────────
// PORTÉE CABINET DES COMMISSIONS
//
// POURQUOI : `commissions.user_id` = le courtier bénéficiaire était aussi la
// clé de lecture — un collaborateur du cabinet ne voyait donc aucune commission
// de son collègue, et le propriétaire ne voyait que les siennes. La portée
// passe par `commissions.cabinet_id` (migration 113) ; `user_id` et
// `apporteur_user_id` restent l'ATTRIBUTION (qui a produit l'affaire).
//
// Rétro-compatibilité : sans portée explicite (appel interne, job), le service
// garde EXACTEMENT son comportement historique.
// ─────────────────────────────────────────────────────────────────────────────

/** Portée SQL des commissions (propriétaire = user_id). */
function filtrePorteeCommission(portee, { depart = 1, ecriture = false, alias = 'co' } = {}) {
  if (!portee) return null
  return porteeCabinet.fragment(portee, {
    cabinet: `${alias}.cabinet_id`,
    proprietaire: `${alias}.user_id`,
    depart,
    ecriture,
  })
}

function appliquerPortee(clauses, params, portee, { ecriture = false } = {}) {
  const f = filtrePorteeCommission(portee, { depart: params.length + 1, ecriture })
  if (!f) return false
  clauses.push(f.sql)
  params.push(...f.params)
  return true
}

function canSeeAllCommissions(user = {}) {
  const role = String(user.role || '').toLowerCase()
  return ['super_admin', 'admin', 'owner', 'manager'].includes(role)
}

function mapCommissionRow(row = {}) {
  return {
    ...row,
    expected_amount_cents: Number.parseInt(row.expected_amount_cents || 0, 10),
    received_amount_cents: Number.parseInt(row.received_amount_cents || 0, 10),
    expected_amount_eur: centsToEuros(row.expected_amount_cents),
    received_amount_eur: centsToEuros(row.received_amount_cents),
  }
}

async function getOwnedQuote(pool, user, contractId, portee = null) {
  const userId = getUserId(user)
  const params = [contractId]
  const clauses = ['q.id = $1']
  // Avec une portée cabinet, le contrat du collègue est légitime ; sans elle
  // (appel interne), on garde le contrôle historique par client.
  if (portee) {
    const f = porteeCabinet.fragment(portee, {
      cabinet: 'c.cabinet_id',
      proprietaire: 'c.courtier_id',
      depart: params.length + 1,
      ecriture: true,
    })
    clauses.push(f.sql)
    params.push(...f.params)
  } else {
    params.push(userId)
    clauses.push(`c.courtier_id = $${params.length}`)
  }
  const result = await pool.query(
    `SELECT q.id,
            q.client_id,
            q.quote_data,
            q.status,
            c.first_name AS client_prenom,
            c.last_name AS client_nom
     FROM quotes q
     JOIN clients c ON c.id = q.client_id
     WHERE ${clauses.join(' AND ')}
     LIMIT 1`,
    params
  )
  return result.rows[0] || null
}

async function upsertCommission(pool, user, contractId, input = {}, portee = null) {
  const quote = await getOwnedQuote(pool, user, contractId, portee)
  if (!quote) {
    const err = new Error('contract_not_found')
    err.statusCode = 404
    throw err
  }

  const payload = normalizeCommissionPayload(input)
  const userId = getUserId(user)
  const apporteurUserId = payload.apporteur_user_id || userId
  // `commission_amount` (colonne d'origine, NOT NULL) n'était JAMAIS alimentée
  // par le code : l'insertion échouait en 23502 « null value in column
  // commission_amount » (la migration 114 lui donne en plus un DEFAULT 0 pour
  // les chemins qui ne la connaissent pas). On y écrit le montant attendu, en
  // euros, pour que la colonne historique reste cohérente avec les colonnes
  // `*_amount_cents`.
  const montantAttenduEuros = centsToEuros(payload.expected_amount_cents)
  const result = await pool.query(
    `INSERT INTO commissions (
       user_id, contract_id, insurer, period_year, period_month,
       expected_amount_cents, received_amount_cents, currency, status,
       apporteur_user_id, apporteur_share_bps, notes, cabinet_id,
       commission_amount, created_at, updated_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'eur', $8, $9, $10, $11, $12, $13, NOW(), NOW())
     ON CONFLICT (user_id, contract_id, period_year, period_month)
     DO UPDATE SET
       insurer = EXCLUDED.insurer,
       expected_amount_cents = EXCLUDED.expected_amount_cents,
       received_amount_cents = EXCLUDED.received_amount_cents,
       status = EXCLUDED.status,
       apporteur_user_id = EXCLUDED.apporteur_user_id,
       apporteur_share_bps = EXCLUDED.apporteur_share_bps,
       notes = EXCLUDED.notes,
       commission_amount = EXCLUDED.commission_amount,
       updated_at = NOW()
     RETURNING *`,
    [
      userId,
      contractId,
      payload.insurer,
      payload.period_year,
      payload.period_month,
      payload.expected_amount_cents,
      payload.received_amount_cents,
      payload.status,
      apporteurUserId,
      payload.apporteur_share_bps,
      payload.notes,
      // Cabinet propriétaire (NULL pour un cabinet mono-utilisateur).
      portee ? porteeCabinet.cabinetPourCreation(portee) : null,
      montantAttenduEuros,
    ]
  )
  return mapCommissionRow(result.rows[0])
}

async function listCommissions(pool, user, filters = {}, portee = null) {
  const userId = getUserId(user)
  const clauses = []
  const params = []

  // Portée CABINET : tout membre du cabinet lit les commissions du cabinet
  // (assistant/viewer inclus — ils lisent, ils n'écrivent pas). Le filtre
  // « apporteur = moi » ne s'applique qu'en l'absence de portée.
  if (portee) {
    const f = filtrePorteeCommission(portee, { depart: 1 })
    clauses.push(f.sql)
    params.push(...f.params)
  } else {
    clauses.push('co.user_id = $1')
    params.push(userId)
    if (!canSeeAllCommissions(user)) {
      params.push(userId)
      clauses.push(`co.apporteur_user_id = $${params.length}`)
    }
  }
  if (filters.period) {
    const period = normalizePeriod(filters.period)
    params.push(period.year)
    clauses.push(`co.period_year = $${params.length}`)
    params.push(period.month)
    clauses.push(`co.period_month = $${params.length}`)
  }
  if (filters.insurer) {
    params.push(`%${String(filters.insurer).trim()}%`)
    clauses.push(`co.insurer ILIKE $${params.length}`)
  }
  if (filters.status) {
    params.push(sanitizeStatus(filters.status))
    clauses.push(`co.status = $${params.length}`)
  }
  if (filters.client_id || filters.clientId) {
    params.push(Number.parseInt(filters.client_id || filters.clientId, 10))
    clauses.push(`q.client_id = $${params.length}`)
  }
  if (filters.contract_id || filters.contractId) {
    params.push(Number.parseInt(filters.contract_id || filters.contractId, 10))
    clauses.push(`co.contract_id = $${params.length}`)
  }

  const result = await pool.query(
    `SELECT co.*,
            q.client_id,
            q.quote_data->>'type_contrat' AS type_contrat,
            q.quote_data->>'numero' AS contract_number,
            c.first_name AS client_prenom,
            c.last_name AS client_nom,
            u.first_name || ' ' || u.last_name AS broker_name
     FROM commissions co
     JOIN quotes q ON q.id = co.contract_id
     ${portee
       ? 'JOIN clients c ON c.id = q.client_id'
       : 'JOIN clients c ON c.id = q.client_id AND c.courtier_id = co.user_id'}
     LEFT JOIN users u ON u.id = co.apporteur_user_id
     WHERE ${clauses.join(' AND ')}
     ORDER BY co.period_year DESC, co.period_month DESC, co.updated_at DESC
     LIMIT 500`,
    params
  )
  return result.rows.map(mapCommissionRow)
}

async function getCommissionStats(pool, user, filters = {}, portee = null) {
  const year = Number.parseInt(filters.year || new Date().getFullYear(), 10)
  const userId = getUserId(user)
  const clauses = []
  const params = []

  // Même portée que la liste : des statistiques calculées sur un autre
  // périmètre que les lignes affichées seraient fausses.
  if (portee) {
    const f = filtrePorteeCommission(portee, { depart: 1 })
    clauses.push(f.sql)
    params.push(...f.params)
    params.push(year)
    clauses.push(`co.period_year = $${params.length}`)
  } else {
    clauses.push('co.user_id = $1')
    params.push(userId, year)
    clauses.push('co.period_year = $2')
    if (!canSeeAllCommissions(user)) {
      params.push(userId)
      clauses.push(`co.apporteur_user_id = $${params.length}`)
    }
  }

  const result = await pool.query(
    `SELECT co.period_month,
            co.insurer,
            co.status,
            co.apporteur_user_id,
            COALESCE(u.first_name || ' ' || u.last_name, 'Courtier') AS broker_name,
            SUM(co.expected_amount_cents)::bigint AS expected_amount_cents,
            SUM(co.received_amount_cents)::bigint AS received_amount_cents,
            COUNT(*)::int AS count
     FROM commissions co
     LEFT JOIN users u ON u.id = co.apporteur_user_id
     WHERE ${clauses.join(' AND ')}
     GROUP BY co.period_month, co.insurer, co.status, co.apporteur_user_id, broker_name
     ORDER BY co.period_month ASC, co.insurer ASC`,
    params
  )

  const byMonth = new Map()
  const byInsurer = new Map()
  const byBroker = new Map()
  const totals = { expected_amount_cents: 0, received_amount_cents: 0, count: 0 }

  for (const row of result.rows) {
    const expected = Number.parseInt(row.expected_amount_cents || 0, 10)
    const received = Number.parseInt(row.received_amount_cents || 0, 10)
    const count = Number.parseInt(row.count || 0, 10)
    totals.expected_amount_cents += expected
    totals.received_amount_cents += received
    totals.count += count

    const monthKey = Number.parseInt(row.period_month, 10)
    const month = byMonth.get(monthKey) || { month: monthKey, expected_amount_cents: 0, received_amount_cents: 0, count: 0 }
    month.expected_amount_cents += expected
    month.received_amount_cents += received
    month.count += count
    byMonth.set(monthKey, month)

    const insurerKey = row.insurer || 'Non renseigné'
    const insurer = byInsurer.get(insurerKey) || { insurer: insurerKey, expected_amount_cents: 0, received_amount_cents: 0, count: 0 }
    insurer.expected_amount_cents += expected
    insurer.received_amount_cents += received
    insurer.count += count
    byInsurer.set(insurerKey, insurer)

    const brokerKey = row.apporteur_user_id || 'unknown'
    const broker = byBroker.get(brokerKey) || { apporteur_user_id: row.apporteur_user_id || null, broker_name: row.broker_name || 'Courtier', expected_amount_cents: 0, received_amount_cents: 0, count: 0 }
    broker.expected_amount_cents += expected
    broker.received_amount_cents += received
    broker.count += count
    byBroker.set(brokerKey, broker)
  }

  const withEuros = (row) => ({
    ...row,
    expected_amount_eur: centsToEuros(row.expected_amount_cents),
    received_amount_eur: centsToEuros(row.received_amount_cents),
  })

  return {
    year,
    totals: withEuros(totals),
    by_month: Array.from(byMonth.values()).sort((a, b) => a.month - b.month).map(withEuros),
    by_insurer: Array.from(byInsurer.values()).sort((a, b) => b.received_amount_cents - a.received_amount_cents).map(withEuros),
    by_broker: Array.from(byBroker.values()).sort((a, b) => b.received_amount_cents - a.received_amount_cents).map(withEuros),
  }
}

async function importCommissionsCsv(pool, user, content = '', portee = null) {
  const rows = parseCommissionCsv(content)
  const report = { total: rows.length, imported: 0, unmatched: 0, errors: [] }

  for (const [index, row] of rows.entries()) {
    try {
      if (!row.contract_ref) {
        report.unmatched += 1
        report.errors.push({ line: index + 2, error: 'contract_ref_missing' })
        continue
      }

      // Le contrat est recherché dans le périmètre CABINET quand la portée est
      // fournie (sinon comportement historique : les contrats du seul appelant).
      const clauses = ['(' +
        `q.id::text = $2` +
        ` OR q.quote_data->>'numero' = $2` +
        ` OR q.quote_data->>'policy_number' = $2` +
        ')']
      const params = [getUserId(user), row.contract_ref]
      if (portee) {
        const f = porteeCabinet.fragment(portee, {
          cabinet: 'c.cabinet_id',
          proprietaire: 'c.courtier_id',
          depart: params.length + 1,
          ecriture: true,
        })
        clauses.push(f.sql)
        params.push(...f.params)
      } else {
        params.push(getUserId(user))
        clauses.push(`c.courtier_id = $${params.length}`)
      }

      const match = await pool.query(
        `SELECT q.id
         FROM quotes q
         JOIN clients c ON c.id = q.client_id
         WHERE ${clauses.join(' AND ')}
         LIMIT 1`,
        params
      )
      const quote = match.rows[0]
      if (!quote) {
        report.unmatched += 1
        report.errors.push({ line: index + 2, error: 'contract_not_found', contract_ref: row.contract_ref })
        continue
      }

      await upsertCommission(pool, user, quote.id, row, portee)
      report.imported += 1
    } catch (err) {
      report.errors.push({ line: index + 2, error: err.message || 'import_failed' })
    }
  }

  return report
}

module.exports = {
  normalizePeriod,
  eurosToCents,
  centsToEuros,
  normalizeCommissionPayload,
  parseCommissionCsv,
  upsertCommission,
  listCommissions,
  importCommissionsCsv,
  getCommissionStats,
  mapCommissionRow,
}
