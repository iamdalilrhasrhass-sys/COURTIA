const assert = require('node:assert/strict')
const { describe, test } = require('node:test')

const {
  getMarketConfig,
  normalizeMarket,
  resolveMarketContext,
} = require('../src/services/marketService')

describe('dual-market context resolver', () => {
  test('routes Swiss visitors to the CH product by default', () => {
    const context = resolveMarketContext({
      headers: { 'cf-ipcountry': 'CH' },
    })

    assert.equal(context.market, 'CH')
    assert.equal(context.country, 'CH')
    assert.equal(context.locale, 'fr-CH')
    assert.equal(context.currency, 'CHF')
    assert.equal(context.source, 'geo')
  })

  test('keeps non-Swiss visitors on the French product by default', () => {
    const context = resolveMarketContext({
      headers: { 'x-vercel-ip-country': 'DE' },
    })

    assert.equal(context.market, 'FR')
    assert.equal(context.country, 'DE')
    assert.equal(context.locale, 'fr-FR')
    assert.equal(context.currency, 'EUR')
    assert.equal(context.source, 'geo')
  })

  test('manual overrides win over geolocation and account market', () => {
    const context = resolveMarketContext({
      accountMarket: 'CH',
      marketOverride: 'FR',
      headers: { 'cf-ipcountry': 'CH' },
    })

    assert.equal(context.market, 'FR')
    assert.equal(context.source, 'override')
  })

  test('normalizes invalid markets to FR and exposes CH setup pricing', () => {
    assert.equal(normalizeMarket('unknown'), 'FR')

    const ch = getMarketConfig('CH')
    assert.equal(ch.pricing.starter.currency, 'CHF')
    assert.equal(ch.pricing.starter.monthlyAmountCents, 19900)
    assert.equal(ch.pricing.starter.setupAmountCents, 49000)
    assert.equal(ch.pricing.pro.monthlyAmountCents, 34900)
    assert.equal(ch.pricing.pro.setupAmountCents, 99000)
  })
})
