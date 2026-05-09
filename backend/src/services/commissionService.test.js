const {
  normalizePeriod,
  eurosToCents,
  normalizeCommissionPayload,
  parseCommissionCsv,
  upsertCommission,
  getCommissionStats,
} = require('./commissionService')

function makePool(rowsByCall = []) {
  const calls = []
  return {
    calls,
    query: jest.fn(async (sql, params) => {
      calls.push({ sql, params })
      const next = rowsByCall.shift()
      if (next instanceof Error) throw next
      return next || { rows: [], rowCount: 0 }
    }),
  }
}

describe('commissionService', () => {
  it('normalizes periods and money amounts for monthly commissions', () => {
    expect(normalizePeriod('2026-05')).toEqual({ year: 2026, month: 5 })
    expect(normalizePeriod({ year: '2026', month: '11' })).toEqual({ year: 2026, month: 11 })
    expect(() => normalizePeriod('2026-13')).toThrow('invalid_period')

    expect(eurosToCents('1 234,56')).toBe(123456)
    expect(eurosToCents('99.90')).toBe(9990)

    expect(normalizeCommissionPayload({
      period: '2026-05',
      insurer: 'AXA',
      expected_amount: '120,50',
      received_amount: '100',
      apporteur_share_bps: '2500',
      status: 'paid',
    })).toMatchObject({
      period_year: 2026,
      period_month: 5,
      insurer: 'AXA',
      expected_amount_cents: 12050,
      received_amount_cents: 10000,
      apporteur_share_bps: 2500,
      status: 'paid',
    })
  })

  it('parses broker CSV imports without inventing missing data', () => {
    const rows = parseCommissionCsv([
      'compagnie;contrat_ref;periode;montant_attendu;montant_recu;statut;notes',
      'AXA;AUTO-42;2026-05;120,50;100,00;paid;Premier règlement',
      'Generali;;2026-06;80;;expected;',
    ].join('\n'))

    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({
      insurer: 'AXA',
      contract_ref: 'AUTO-42',
      period: '2026-05',
      expected_amount: '120,50',
      received_amount: '100,00',
      status: 'paid',
      notes: 'Premier règlement',
    })
    expect(rows[1]).toMatchObject({
      insurer: 'Generali',
      contract_ref: '',
      received_amount: '',
    })
  })

  it('upserts a commission only when the quote belongs to the broker', async () => {
    const pool = makePool([
      { rows: [{ id: 42, client_id: 7, quote_data: { compagnie: 'AXA', numero: 'AUTO-42' }, client_nom: 'Martin', client_prenom: 'Sophie' }], rowCount: 1 },
      { rows: [{ id: 3, contract_id: 42, insurer: 'AXA', period_year: 2026, period_month: 5, expected_amount_cents: 12050, received_amount_cents: 10000, status: 'paid' }], rowCount: 1 },
    ])

    const row = await upsertCommission(pool, { id: 99, role: 'broker' }, 42, {
      period: '2026-05',
      insurer: 'AXA',
      expected_amount: '120,50',
      received_amount: '100',
      status: 'paid',
    })

    expect(row).toMatchObject({ id: 3, contract_id: 42, expected_amount_eur: 120.5, received_amount_eur: 100 })
    expect(pool.query).toHaveBeenCalledTimes(2)
    expect(pool.calls[0].sql).toContain('JOIN clients')
    expect(pool.calls[0].params).toEqual([42, 99])
    expect(pool.calls[1].sql).toContain('ON CONFLICT')
  })

  it('aggregates yearly commission stats for cockpit reporting', async () => {
    const pool = makePool([
      {
        rows: [
          { period_month: 5, insurer: 'AXA', status: 'paid', apporteur_user_id: 99, broker_name: 'Dalil Rhasrhass', expected_amount_cents: '12050', received_amount_cents: '10000', count: '2' },
          { period_month: 5, insurer: 'Generali', status: 'expected', apporteur_user_id: 77, broker_name: 'Sophie Martin', expected_amount_cents: '8000', received_amount_cents: '0', count: '1' },
        ],
        rowCount: 2,
      },
    ])

    const stats = await getCommissionStats(pool, { id: 99, role: 'manager' }, { year: 2026 })

    expect(stats.totals).toMatchObject({
      expected_amount_eur: 200.5,
      received_amount_eur: 100,
      count: 3,
    })
    expect(stats.by_month.find((m) => m.month === 5)).toMatchObject({ expected_amount_eur: 200.5, received_amount_eur: 100 })
    expect(stats.by_insurer.find((i) => i.insurer === 'AXA')).toMatchObject({ count: 2, received_amount_eur: 100 })
    expect(stats.by_broker.find((b) => b.apporteur_user_id === 77)).toMatchObject({ broker_name: 'Sophie Martin' })
  })
})
