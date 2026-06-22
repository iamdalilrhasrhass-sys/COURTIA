const assert = require('node:assert/strict')
const { describe, test } = require('node:test')

const {
  buildSubscriptionCheckoutParams,
  getPriceId,
} = require('../src/services/stripeService')

describe('Stripe dual-market checkout parameters', () => {
  test('resolves FR and CH recurring price ids independently', () => {
    const previous = { ...process.env }
    process.env.BILLING_MODE = 'test'
    process.env.STRIPE_STARTER_PRICE_ID_TEST = 'price_fr_starter_test'
    process.env.STRIPE_CH_STARTER_PRICE_ID_TEST = 'price_ch_starter_test'

    assert.equal(getPriceId('starter', 'FR'), 'price_fr_starter_test')
    assert.equal(getPriceId('starter', 'CH'), 'price_ch_starter_test')

    process.env = previous
  })

  test('adds a separate one-shot setup line for Swiss checkout sessions', () => {
    const params = buildSubscriptionCheckoutParams({
      customerId: 'cus_123',
      priceId: 'price_ch_pro',
      successUrl: 'https://courtiark.fr/billing/success',
      cancelUrl: 'https://courtiark.fr/billing/cancel',
      metadata: { user_id: '7', plan_code: 'pro', market: 'CH' },
      market: 'CH',
      setupAmountCents: 99000,
      setupLabel: 'Frais d’inscription Cabinet',
      currency: 'CHF',
      trialDays: 0,
    })

    assert.equal(params.mode, 'subscription')
    assert.equal(params.line_items.length, 2)
    assert.deepEqual(params.line_items[0], { price: 'price_ch_pro', quantity: 1 })
    assert.equal(params.line_items[1].quantity, 1)
    assert.equal(params.line_items[1].price_data.currency, 'chf')
    assert.equal(params.line_items[1].price_data.unit_amount, 99000)
    assert.equal(params.line_items[1].price_data.product_data.name, 'Frais d’inscription Cabinet')
    assert.equal(params.automatic_tax.enabled, true)
    assert.equal(params.metadata.market, 'CH')
    assert.equal(params.subscription_data.metadata.market, 'CH')
    assert.equal('trial_period_days' in params.subscription_data, false)
  })

  test('preserves the French trial checkout without a setup line', () => {
    const params = buildSubscriptionCheckoutParams({
      customerId: 'cus_123',
      priceId: 'price_fr_starter',
      successUrl: 'https://courtiark.fr/billing/success',
      cancelUrl: 'https://courtiark.fr/billing/cancel',
      metadata: { user_id: '7', plan_code: 'starter', market: 'FR' },
      market: 'FR',
      setupAmountCents: 0,
      currency: 'EUR',
      trialDays: 7,
    })

    assert.equal(params.line_items.length, 1)
    assert.equal(params.subscription_data.trial_period_days, 7)
    assert.equal(params.automatic_tax.enabled, false)
  })
})
