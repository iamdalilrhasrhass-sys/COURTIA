const documentsRouter = require('./documents')

const { __internals } = documentsRouter

describe('documents route internals', () => {
  it('exposes DDA templates', () => {
    expect(__internals.DDA_TEMPLATES).toEqual(
      expect.arrayContaining(['fic', 'mandat_courtage', 'devoir_conseil', 'synthese_client'])
    )
    expect(__internals.VALID_TEMPLATES).toEqual(
      expect.arrayContaining(['attestation_assurance', 'fic'])
    )
  })

  it('normalizes document statuses safely', () => {
    expect(__internals.normalizeDocumentStatus('envoye')).toBe('envoye')
    expect(__internals.normalizeDocumentStatus(' archive ')).toBe('archive')
    expect(__internals.normalizeDocumentStatus('not_a_status')).toBe('genere')
  })

  it('returns localized template titles', () => {
    expect(__internals.getTemplateTitle('fic')).toMatch(/FICHE D'INFORMATION CLIENT/)
    expect(__internals.getTemplateTitle('mandat_courtage')).toMatch(/MANDAT DE COURTAGE/)
  })
})
