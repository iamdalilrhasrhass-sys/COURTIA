jest.mock('../db', () => ({
  query: jest.fn(),
}))

const pool = require('../db')
const { clearFeatureFlagCache, getFeatureFlagsForUser, isFeatureEnabled } = require('./featureFlags')

describe('featureFlags', () => {
  afterEach(() => {
    clearFeatureFlagCache()
    jest.clearAllMocks()
  })

  it('maps database rows to booleans and caches results', async () => {
    pool.query.mockResolvedValue({
      rows: [
        { key: 'v1_foundations', enabled: true },
        { key: 'gmail', enabled: false },
      ],
    })

    const flags = await getFeatureFlagsForUser({ userId: 7 })
    const enabled = await isFeatureEnabled({ userId: 7, key: 'v1_foundations' })

    expect(flags).toEqual({ v1_foundations: true, gmail: false })
    expect(enabled).toBe(true)
    expect(pool.query).toHaveBeenCalledTimes(1)
  })
})
