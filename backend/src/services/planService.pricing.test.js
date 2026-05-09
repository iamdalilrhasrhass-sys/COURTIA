const planService = require('./planService')

describe('planService pricing', () => {
  it('keeps Pro plan at 199 EUR for courtier sprint', () => {
    const plans = planService.getAllPlans()
    const pro = plans.find((p) => p.id === 'pro')
    expect(pro).toBeTruthy()
    expect(pro.price).toBe(199)
  })
})
