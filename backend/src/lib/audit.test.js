jest.mock('../db', () => ({
  query: jest.fn(),
}))

const pool = require('../db')
const { logAudit } = require('./audit')

describe('audit', () => {
  beforeEach(() => {
    pool.query.mockResolvedValue({ rows: [{ id: '1', created_at: '2026-05-09T00:00:00Z' }] })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('inserts redacted audit metadata', async () => {
    await logAudit({
      userId: 42,
      entityType: 'client',
      entityId: '123',
      action: 'documents.generate',
      metadata: { email: 'client@example.fr', token: 'secret' },
      req: {
        ip: '127.0.0.1',
        headers: {
          'user-agent': 'jest',
        },
      },
    })

    expect(pool.query).toHaveBeenCalledTimes(1)
    const args = pool.query.mock.calls[0][1]
    expect(args[2]).toBe('client')
    expect(args[4]).toBe('documents.generate')
    expect(args[5]).toContain('cl***@example.fr')
    expect(args[5]).toContain('[REDACTED]')
  })
})
