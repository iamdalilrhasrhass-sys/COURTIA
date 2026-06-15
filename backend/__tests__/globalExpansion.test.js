const assert = require('node:assert/strict')
const { describe, test } = require('node:test')

const {
  buildCommissionSchedule,
  calculateCloserCommission,
  getPricingSnapshot,
  shouldClawBackSetup,
} = require('../src/services/globalExpansionService')

describe('Courtia global expansion commission engine', () => {
  test('calculates FR closer commission from setup and recurring revenue', () => {
    const commission = calculateCloserCommission('FR')

    assert.deepEqual(commission, {
      setupCommission: 119.6,
      mrrCommission: 29.85,
      mrrMonths: 12,
      totalPotential: 477.8,
      currency: 'EUR',
      currencySym: '€',
    })
  })

  test('uses the carrier pricing snapshot for US insurer deals', () => {
    const pricing = getPricingSnapshot('US', 'insurer')
    const commission = calculateCloserCommission('US', pricing)

    assert.equal(pricing.setupFee, 999)
    assert.equal(pricing.monthlyFee, 799)
    assert.equal(commission.setupCommission, 399.6)
    assert.equal(commission.mrrCommission, 119.85)
    assert.equal(commission.totalPotential, 1837.8)
    assert.equal(commission.currency, 'USD')
  })

  test('builds one setup commission and twelve monthly MRR commissions', () => {
    const rows = buildCommissionSchedule({
      closerId: 'closer-1',
      dealId: 'deal-1',
      countryCode: 'CH',
      clientType: 'broker',
      signedAt: new Date('2026-06-15T10:00:00.000Z'),
    })

    assert.equal(rows.length, 13)
    assert.equal(rows[0].commission_type, 'setup')
    assert.equal(rows[0].amount, 196)
    assert.equal(rows[1].commission_type, 'mrr')
    assert.equal(rows[1].amount, 52.35)
    assert.equal(rows[1].period_month, '2026-07-01')
    assert.equal(rows[12].period_month, '2027-06-01')
  })

  test('applies setup claw-back only inside the churn guard period', () => {
    assert.equal(
      shouldClawBackSetup({
        signedAt: new Date('2026-01-01T00:00:00.000Z'),
        churnedAt: new Date('2026-03-20T00:00:00.000Z'),
        guardMonths: 3,
      }),
      true,
    )

    assert.equal(
      shouldClawBackSetup({
        signedAt: new Date('2026-01-01T00:00:00.000Z'),
        churnedAt: new Date('2026-04-15T00:00:00.000Z'),
        guardMonths: 3,
      }),
      false,
    )
  })
})
