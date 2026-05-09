const { insertStripePaymentEventIfNew } = require('./billingWebhookService')

describe('billingWebhookService', () => {
  it('returns true only when a Stripe event is inserted for the first time', async () => {
    const pool = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [] }),
    }
    const event = { id: 'evt_123', type: 'invoice.paid', data: { object: { id: 'in_123' } } }

    await expect(insertStripePaymentEventIfNew(pool, event, 7, 9)).resolves.toBe(true)
    await expect(insertStripePaymentEventIfNew(pool, event, 7, 9)).resolves.toBe(false)

    expect(pool.query).toHaveBeenCalledTimes(2)
    expect(pool.query.mock.calls[0][1]).toEqual([
      'evt_123',
      'invoice.paid',
      7,
      9,
      JSON.stringify(event),
    ])
  })
})
