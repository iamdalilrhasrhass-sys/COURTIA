const {
  normalizeDocumentType,
  validateDdaReadiness,
  buildDdaVariables,
  renderDdaPlainText,
} = require('./documentDdaService')

describe('documentDdaService', () => {
  it('normalizes DDA document aliases', () => {
    expect(normalizeDocumentType('FIC')).toBe('fic')
    expect(normalizeDocumentType('mandat de courtage')).toBe('mandat_courtage')
    expect(normalizeDocumentType('devoir-de-conseil')).toBe('devoir_conseil')
    expect(normalizeDocumentType('attestation_info')).toBe('attestation')
  })

  it('blocks generation when ORIAS is missing', () => {
    expect(validateDdaReadiness({ cabinet: {}, courtier: {} })).toMatchObject({ ok: false, error: 'orias_required' })
  })

  it('builds and renders a FIC with client, cabinet and compliance wording', () => {
    const variables = buildDdaVariables({
      type: 'fic',
      client: { id: 12, first_name: 'Sophie', last_name: 'Martin', email: 'sophie@example.fr', ville: 'Paris' },
      courtier: { first_name: 'Dalil', last_name: 'Rhasrhass', email: 'dalil@courtia.fr' },
      cabinet: { name: 'Cabinet Aurora', orias_number: '07000000' },
      contract: { type: 'Auto', company: 'Axa' },
    })

    const text = renderDdaPlainText('fic', variables)
    expect(text).toContain('Fiche d’information et de conseil')
    expect(text).toContain('Cabinet Aurora')
    expect(text).toContain('ORIAS : 07000000')
    expect(text).toContain('Sophie Martin')
    expect(text).toContain('COURTIA aide à structurer et tracer le devoir de conseil')
  })
})
