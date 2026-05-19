jest.mock('../db', () => ({
  query: jest.fn(),
}))

describe('billingService V1 plan helpers', () => {
  beforeEach(() => {
    jest.resetModules()
  })

  it('keeps Cabinet and Premium as contact-only while Starter/Pro stay self-serve', () => {
    const billingService = require('./billingService')

    expect(billingService.normalizePlanCode('starter')).toBe('starter')
    expect(billingService.normalizePlanCode('PRO')).toBe('pro')
    expect(billingService.normalizePlanCode('cabinet')).toBe('cabinet')
    expect(billingService.normalizePlanCode('premium')).toBe('premium')
    expect(billingService.normalizePlanCode('enterprise')).toBeNull()

    const plans = billingService.getPlans()
    expect(plans.find((plan) => plan.code === 'pro')).toMatchObject({
      display_price_ht: '199 € HT / mois',
      has_checkout: true,
    })
    expect(plans.find((plan) => plan.code === 'cabinet')).toMatchObject({
      display_price_ht: 'Sur devis',
      has_checkout: false,
    })
    expect(plans.find((plan) => plan.code === 'premium')).toMatchObject({
      display_price_ht: 'Sur devis',
      has_checkout: false,
    })
  })
})
