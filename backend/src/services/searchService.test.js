const {
  buildSearchPattern,
  normalizeSearchResult,
  searchCourtia,
} = require('./searchService')

describe('searchService', () => {
  test('builds a bounded ilike search pattern', () => {
    expect(buildSearchPattern('  Sophie Martin  ')).toBe('%Sophie Martin%')
    expect(buildSearchPattern('x'.repeat(120))).toHaveLength(82)
  })

  test('normalizes search rows into command palette results', () => {
    expect(normalizeSearchResult({ type: 'client', id: 12, title: 'Sophie', subtitle: 'Client actif', path: '/clients/12' })).toEqual({
      type: 'client',
      id: '12',
      title: 'Sophie',
      subtitle: 'Client actif',
      path: '/clients/12',
    })
  })

  test('searches clients, contracts, documents and actions without throwing on missing optional tables', async () => {
    const calls = []
    const pool = {
      async query(sql) {
        calls.push(sql)
        if (sql.includes('FROM documents')) throw Object.assign(new Error('missing'), { code: '42P01' })
        if (sql.includes('FROM clients')) return { rows: [{ type: 'client', id: 1, title: 'Sophie Martin', subtitle: 'Client', path: '/clients/1' }] }
        if (sql.includes('FROM quotes')) return { rows: [{ type: 'contrat', id: 2, title: 'Auto', subtitle: 'Sophie Martin', path: '/contrats' }] }
        return { rows: [] }
      },
    }

    const results = await searchCourtia(pool, 9, 'sophie')
    expect(results.some((row) => row.type === 'client')).toBe(true)
    expect(results.some((row) => row.type === 'contrat')).toBe(true)
    expect(results.some((row) => row.type === 'action')).toBe(true)
    expect(calls.length).toBeGreaterThanOrEqual(3)
  })
})
