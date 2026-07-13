const {
  PIPELINE_STATUSES,
  calculateSizeScore,
  normalizeCabinetPayload,
  statusAfterCall,
  validateCabinetPayload,
  validateCallResult,
} = require('./salesProspectingPolicy')

describe('salesProspectingPolicy', () => {
  test('exposes the complete 23-state commercial pipeline', () => {
    expect(PIPELINE_STATUSES).toHaveLength(23)
    expect(PIPELINE_STATUSES).toEqual(expect.arrayContaining(['non_attribue', 'appel_en_cours', 'demo_realisee', 'signe', 'ne_plus_contacter']))
  })

  test('scores cabinet size transparently from employees, revenue and establishments', () => {
    const micro = calculateSizeScore({ employee_count: 1, revenue_eur: 100000, establishment_count: 1, company_category: 'micro' })
    const national = calculateSizeScore({ employee_count: 400, revenue_eur: 50000000, establishment_count: 25, company_category: 'grande entreprise' })

    expect(micro).toMatchObject({ score: 9, category: 'independant_micro', estimated: false })
    expect(national).toMatchObject({ score: 100, category: 'groupe_national', estimated: false })
    expect(national.components).toEqual({ employees: 60, revenue: 25, establishments: 10, company_category: 5 })
  })

  test('marks an incomplete score as estimated and explains missing data', () => {
    const result = calculateSizeScore({ employee_count: 5 })
    expect(result.estimated).toBe(true)
    expect(result.explanation).toContain('données manquantes')
    expect(result.components.employees).toBe(22)
  })

  test('normalizes official identifiers and validates malformed data', () => {
    const normalized = normalizeCabinetPayload({ raison_sociale: ' Cabinet Test ', siren: '123 456 78', siret: '12345678901234', email: 'INVALIDE' })
    expect(normalized.legal_name).toBe('Cabinet Test')
    expect(normalized.siren).toBe('12345678')
    expect(validateCabinetPayload(normalized)).toEqual(expect.arrayContaining(['siren_invalid', 'email_invalid']))
  })

  test('requires a complete outcome for reached and failed calls', () => {
    expect(validateCallResult({ outcome: 'oui' })).toMatchObject({
      valid: false,
      errors: expect.arrayContaining(['contacted_person_name_required', 'interest_level_required', 'identified_need_required', 'next_step_required']),
    })
    expect(validateCallResult({ outcome: 'pas_de_reponse', comment: 'Standard fermé', callback_decision: 'oui' }).errors).toContain('callback_at_required')
    expect(validateCallResult({ outcome: 'oui', contacted_person_name: 'Mme Test', interest_level: 'fort', identified_need: 'Centraliser les relances', next_step: 'organiser_demo' })).toMatchObject({ valid: true, reached: true })
  })

  test('derives pipeline status from call qualification', () => {
    expect(statusAfterCall({ outcome: 'oui', reached: true, interest_level: 'tres_fort', next_step: 'organiser_demo' })).toBe('demo_programmee')
    expect(statusAfterCall({ outcome: 'pas_de_reponse', callback_decision: 'oui' })).toBe('a_rappeler')
    expect(statusAfterCall({ outcome: 'refus', callback_decision: 'non' })).toBe('refuse')
  })
})
