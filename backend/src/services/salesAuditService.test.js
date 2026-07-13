jest.mock('../db', () => ({ query: jest.fn(), connect: jest.fn() }))

const { hashEntry, sanitizeMetadata } = require('./salesAuditService')

describe('salesAuditService', () => {
  test('redacts secrets recursively before persistence', () => {
    expect(sanitizeMetadata({ password: 'abc', nested: { accessToken: 'xyz', harmless: 'ok' }, api_key: 'secret' })).toEqual({
      password: '[REDACTED]',
      nested: { accessToken: '[REDACTED]', harmless: 'ok' },
      api_key: '[REDACTED]',
    })
  })

  test('creates the same hash regardless of metadata key order', () => {
    const base = { actorId: 1, action: 'call.complete', entityType: 'sales_call', entityId: 7, cabinetId: 4, ipAddress: '127.0.0.1', previousHash: null, createdAt: '2026-07-13T10:00:00.000Z' }
    expect(hashEntry({ ...base, metadata: { z: 2, a: { c: 3, b: 1 } } })).toBe(hashEntry({ ...base, metadata: { a: { b: 1, c: 3 }, z: 2 } }))
  })

  test('changes the hash when an audited field changes', () => {
    const base = { actorId: 1, action: 'call.complete', entityType: 'sales_call', entityId: 7, cabinetId: 4, metadata: {}, ipAddress: null, previousHash: null, createdAt: '2026-07-13T10:00:00.000Z' }
    expect(hashEntry(base)).not.toBe(hashEntry({ ...base, action: 'call.start' }))
  })

  test('normalizes PostgreSQL BIGINT values returned as strings', () => {
    const base = { actorId: 1, action: 'cabinet.view', entityType: 'sales_cabinet', entityId: 7, metadata: {}, ipAddress: null, previousHash: null, createdAt: '2026-07-13T10:00:00.000Z' }
    expect(hashEntry({ ...base, cabinetId: 42 })).toBe(hashEntry({ ...base, cabinetId: '42' }))
  })
})
