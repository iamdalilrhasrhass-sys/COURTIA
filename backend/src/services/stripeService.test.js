describe('stripeService configuration', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('reports missing Stripe pieces without throwing', () => {
    delete process.env.STRIPE_SECRET_KEY
    delete process.env.STRIPE_WEBHOOK_SECRET
    delete process.env.STRIPE_PRICE_STARTER
    delete process.env.STRIPE_PRICE_PRO
    delete process.env.STRIPE_PRICE_CABINET

    const stripeService = require('./stripeService')
    const status = stripeService.getConfigurationStatus()

    expect(status.configured).toBe(false)
    expect(status.checkout_ready).toBe(false)
    expect(status.missing).toEqual(expect.arrayContaining([
      'STRIPE_SECRET_KEY',
      'STRIPE_PRICE_STARTER',
      'STRIPE_PRICE_PRO',
      'STRIPE_PRICE_CABINET',
      'STRIPE_WEBHOOK_SECRET',
    ]))
  })

  it('recognizes Starter, Pro and Cabinet price IDs in test mode', () => {
    process.env.BILLING_MODE = 'test'
    process.env.STRIPE_SECRET_KEY = 'sk_test_123'
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_123'
    process.env.STRIPE_PRICE_STARTER = 'price_starter'
    process.env.STRIPE_PRICE_PRO = 'price_pro'
    process.env.STRIPE_PRICE_CABINET = 'price_cabinet'

    const stripeService = require('./stripeService')

    expect(stripeService.getPriceId('starter')).toBe('price_starter')
    expect(stripeService.getPriceId('pro')).toBe('price_pro')
    expect(stripeService.getPriceId('cabinet')).toBe('price_cabinet')
    expect(stripeService.getConfigurationStatus()).toMatchObject({
      configured: true,
      checkout_ready: true,
      webhook_ready: true,
    })
  })
})
