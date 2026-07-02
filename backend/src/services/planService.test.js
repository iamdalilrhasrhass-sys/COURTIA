jest.mock('../db', () => ({
  query: jest.fn(),
}))

describe('planService V1 billing plans', () => {
  const originalEnv = process.env
  let pool

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv }
    pool = require('../db')
    pool.query.mockReset()
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('exposes the V1 self-serve plans with Pro highlighted and Cabinet available', () => {
    process.env.STRIPE_PRICE_STARTER = 'price_starter'
    process.env.STRIPE_PRICE_PRO = 'price_pro'

    const planService = require('./planService')
    const plans = planService.getAllPlans()

    expect(plans.map((plan) => plan.id)).toEqual(['starter', 'pro', 'cabinet'])
    expect(plans.find((plan) => plan.id === 'starter')).toMatchObject({ price: 89, has_stripe_price: true })
    expect(plans.find((plan) => plan.id === 'pro')).toMatchObject({ price: 159, highlighted: true, has_stripe_price: true })
    expect(plans.find((plan) => plan.id === 'cabinet')).toMatchObject({ price: null, has_stripe_price: false })
  })

  it('blocks Starter when the client limit is reached through route aliases', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ role: 'broker' }] })
      .mockResolvedValueOnce({
        rows: [{
          id: 7,
          plan: 'starter',
          subscription_status: 'active',
          trial_ends_at: null,
          stripe_customer_id: null,
          stripe_subscription_id: null,
        }],
      })
      .mockResolvedValueOnce({ rows: [{ count: '3' }] })

    const planService = require('./planService')
    const result = await planService.checkLimit(7, 'clients')

    expect(result).toMatchObject({
      allowed: false,
      current: 3,
      max: 3,
      limit_key: 'max_clients',
    })
  })

  it('allows Pro ARK usage when below the message cap and records usage increments', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ role: 'broker' }] })
      .mockResolvedValueOnce({
        rows: [{
          id: 8,
          plan: 'pro',
          subscription_status: 'active',
          trial_ends_at: null,
          stripe_customer_id: null,
          stripe_subscription_id: null,
        }],
      })
      .mockResolvedValueOnce({ rows: [{ total: '42' }] })
      .mockResolvedValueOnce({ rows: [] })

    const planService = require('./planService')
    const result = await planService.checkLimit(8, 'ark_messages')
    const usage = await planService.incrementUsage(8, 'ark_messages', 2)

    expect(result).toMatchObject({
      allowed: true,
      current: 42,
      max: 2000,
      limit_key: 'max_ark_messages',
    })
    expect(usage).toMatchObject({ userId: 8, usageType: 'ark_messages', amount: 2 })
    expect(pool.query).toHaveBeenLastCalledWith(expect.stringContaining('INSERT INTO plan_usage_events'), [8, 'ark_messages', 2])
  })
})
