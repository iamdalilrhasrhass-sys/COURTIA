const onboardingRouter = require('./onboarding')

const { __internals } = onboardingRouter

describe('onboarding route internals', () => {
  it('normalizes allowed steps', () => {
    expect(__internals.normalizeStep('cabinet')).toBe('cabinet')
    expect(__internals.normalizeStep('MORNING_BRIEF')).toBe('morning_brief')
    expect(__internals.normalizeStep('unknown')).toBe(null)
  })

  it('computes next step correctly', () => {
    expect(__internals.nextStepFor([])).toBe('cabinet')
    expect(__internals.nextStepFor(['cabinet', 'conformite'])).toBe('import')
    expect(__internals.nextStepFor(__internals.ONBOARDING_STEPS)).toBe('completed')
  })
})
