jest.mock('../db', () => ({
  query: jest.fn(),
}))

describe('planService V1 billing plans', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('exposes the V1 self-serve plans with Pro highlighted and Cabinet available', () => {
    process.env.STRIPE_PRICE_STARTER = 'price_starter'
    process.env.STRIPE_PRICE_PRO = 'price_pro'
    process.env.STRIPE_PRICE_CABINET = 'price_cabinet'

    const planService = require('./planService')
    const plans = planService.getAllPlans()

    expect(plans.map((plan) => plan.id)).toEqual(['starter', 'pro', 'cabinet', 'premium'])
    expect(plans.find((plan) => plan.id === 'starter')).toMatchObject({ price: 89, has_stripe_price: true })
    expect(plans.find((plan) => plan.id === 'pro')).toMatchObject({ price: 199, highlighted: true, has_stripe_price: true })
    expect(plans.find((plan) => plan.id === 'cabinet')).toMatchObject({ price: 399, has_stripe_price: true })
    expect(plans.find((plan) => plan.id === 'premium')).toMatchObject({ price: null, has_stripe_price: false })
  })
})
