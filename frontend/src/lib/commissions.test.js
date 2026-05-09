import { describe, expect, it } from 'vitest'
import {
  formatCommissionCurrency,
  getCommissionStatusMeta,
  summarizeCommissions,
} from './commissions'

describe('commissions frontend helpers', () => {
  it('formats commission euros for French brokers', () => {
    expect(formatCommissionCurrency(120.5)).toBe('121 €')
    expect(formatCommissionCurrency(null)).toBe('—')
  })

  it('maps status to business labels and tones', () => {
    expect(getCommissionStatusMeta('paid')).toMatchObject({ label: 'Payée', tone: 'success' })
    expect(getCommissionStatusMeta('unknown')).toMatchObject({ label: 'Prévue', tone: 'info' })
  })

  it('summarizes expected, received and pending amounts', () => {
    expect(summarizeCommissions([
      { expected_amount_eur: 200, received_amount_eur: 150 },
      { expected_amount_cents: 10000, received_amount_cents: 0 },
    ])).toMatchObject({
      expected: 300,
      received: 150,
      pending: 150,
      count: 2,
    })
  })
})
