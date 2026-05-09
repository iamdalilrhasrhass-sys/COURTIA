export function formatCommissionCurrency(value) {
  if (value === null || value === undefined || value === '') return '—'
  const num = Number(value)
  if (!Number.isFinite(num)) return '—'
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(num).replace(/\u00a0/g, ' ')
}

export function centsToEuros(cents) {
  const n = Number(cents || 0)
  if (!Number.isFinite(n)) return 0
  return Math.round((n / 100) * 100) / 100
}

export function getCommissionStatusMeta(status) {
  const normalized = String(status || 'expected').toLowerCase()
  const map = {
    expected: { label: 'Prévue', tone: 'info' },
    partial: { label: 'Partielle', tone: 'warning' },
    paid: { label: 'Payée', tone: 'success' },
    overdue: { label: 'En retard', tone: 'danger' },
    cancelled: { label: 'Annulée', tone: 'muted' },
  }
  return map[normalized] || map.expected
}

export function getCommissionAmount(row, key) {
  if (row?.[`${key}_amount_eur`] !== undefined) return Number(row[`${key}_amount_eur`] || 0)
  return centsToEuros(row?.[`${key}_amount_cents`])
}

export function summarizeCommissions(rows = []) {
  return rows.reduce((acc, row) => {
    const expected = getCommissionAmount(row, 'expected')
    const received = getCommissionAmount(row, 'received')
    acc.expected += expected
    acc.received += received
    acc.pending += Math.max(expected - received, 0)
    acc.count += 1
    return acc
  }, { expected: 0, received: 0, pending: 0, count: 0 })
}
