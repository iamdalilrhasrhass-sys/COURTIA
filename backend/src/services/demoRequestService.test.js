const {
  isValidEmail,
  normalizeString,
  normalizeBoolean,
  sanitizeDemoRequestPayload,
  validateDemoRequestPayload,
} = require('./demoRequestService')

describe('demoRequestService', () => {
  it('validates professional-like email format', () => {
    expect(isValidEmail('cabinet@courtier.fr')).toBe(true)
    expect(isValidEmail('wrong-email')).toBe(false)
  })

  it('normalizes strings and booleans', () => {
    expect(normalizeString('  COURTIA  ', 10)).toBe('COURTIA')
    expect(normalizeBoolean('true')).toBe(true)
    expect(normalizeBoolean('0')).toBe(false)
  })

  it('sanitizes demo payload with defaults', () => {
    const payload = sanitizeDemoRequestPayload({
      first_name: '  Dalil ',
      last_name: ' Rhasrhass ',
      company_name: '  Courtia Cabinet ',
      email: 'DALIL@CABINET.FR',
      current_tools: 'Excel + Agenda papier',
      wants_google_calendar: 'true',
      wants_whatsapp: 1,
      wants_email_sync: false,
      consent: 'true',
      market: 'ch',
      preferred_locale: 'fr-CH',
      source_url: '/demo?market=CH',
      consent_version: 'demo-contact-v2-2026-07-12',
      marketing_consent: 'true',
      marketing_consent_version: 'marketing-email-optin-v1-2026-07-12',
    })

    expect(payload.first_name).toBe('Dalil')
    expect(payload.last_name).toBe('Rhasrhass')
    expect(payload.company_name).toBe('Courtia Cabinet')
    expect(payload.email).toBe('dalil@cabinet.fr')
    expect(payload.current_tools).toBe('Excel + Agenda papier')
    expect(payload.wants_google_calendar).toBe(true)
    expect(payload.wants_whatsapp).toBe(true)
    expect(payload.wants_email_sync).toBe(false)
    expect(payload.source).toBe('landing')
    expect(payload.consent).toBe(true)
    expect(payload.market).toBe('CH')
    expect(payload.preferred_locale).toBe('fr-CH')
    expect(payload.source_url).toBe('/demo?market=CH')
    expect(payload.consent_version).toBe('demo-contact-v2-2026-07-12')
    expect(payload.marketing_consent).toBe(true)
    expect(payload.marketing_consent_version).toBe('marketing-email-optin-v1-2026-07-12')
  })

  it('never keeps a marketing consent version without an explicit opt-in', () => {
    const payload = sanitizeDemoRequestPayload({
      market: 'invalid',
      marketing_consent: false,
      marketing_consent_version: 'forged-version',
    })

    expect(payload.market).toBe('FR')
    expect(payload.preferred_locale).toBe('fr-FR')
    expect(payload.marketing_consent).toBe(false)
    expect(payload.marketing_consent_version).toBe('')
  })

  it('rejects incomplete payloads', () => {
    const validation = validateDemoRequestPayload({
      first_name: 'Dalil',
      email: 'dalil@cabinet.fr',
      consent: false,
    })

    expect(validation.valid).toBe(false)
    expect(validation.errors).toContain('last_name_missing')
    expect(validation.errors).toContain('company_name_missing')
    expect(validation.errors).toContain('consent_required')
  })

  it('accepts complete payload', () => {
    const validation = validateDemoRequestPayload({
      first_name: 'Dalil',
      last_name: 'Rhasrhass',
      company_name: 'Cabinet Courtia',
      email: 'dalil@cabinet.fr',
      consent: true,
    })

    expect(validation.valid).toBe(true)
    expect(validation.errors).toHaveLength(0)
  })
})
