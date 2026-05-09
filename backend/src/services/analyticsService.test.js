jest.mock('axios', () => ({ post: jest.fn() }))
jest.mock('../db', () => ({ query: jest.fn() }))

describe('analyticsService', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
    jest.clearAllMocks()
  })

  it('stores product events locally when PostHog is not configured', async () => {
    delete process.env.POSTHOG_KEY
    const pool = require('../db')
    pool.query.mockResolvedValue({ rows: [] })

    const analyticsService = require('./analyticsService')
    const result = await analyticsService.trackEvent({
      userId: 4,
      event: 'feedback_sent',
      properties: { page: '/dashboard' },
    })

    expect(result).toMatchObject({ stored: true, provider: 'local' })
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO product_events'), [
      4,
      null,
      'feedback_sent',
      JSON.stringify({ page: '/dashboard' }),
    ])
  })
})
