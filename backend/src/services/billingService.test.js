jest.mock('../db', () => ({
  query: jest.fn(),
}))

describe('billingService V1 plan helpers', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv, STRIPE_PRICE_STARTER: 'price_starter', STRIPE_PRICE_PRO: 'price_pro' }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('keeps Cabinet contact-only and maps legacy Premium to Cabinet', () => {
    const billingService = require('./billingService')

    expect(billingService.normalizePlanCode('starter')).toBe('starter')
    expect(billingService.normalizePlanCode('PRO')).toBe('pro')
    expect(billingService.normalizePlanCode('cabinet')).toBe('cabinet')
    expect(billingService.normalizePlanCode('premium')).toBe('cabinet')
    expect(billingService.normalizePlanCode('enterprise')).toBeNull()

    const plans = billingService.getPlans()
    expect(plans.find((plan) => plan.code === 'pro')).toMatchObject({
      display_price_ht: '159 € HT / mois',
      has_checkout: true,
    })
    expect(plans.find((plan) => plan.code === 'cabinet')).toMatchObject({
      display_price_ht: 'Sur devis',
      has_checkout: false,
    })
    expect(plans.find((plan) => plan.code === 'premium')).toBeUndefined()
  })
})
