jest.mock('../db', () => ({
  query: jest.fn(),
  connect: jest.fn(),
}))

const importService = require('./importService')

describe('importService preview and mapping', () => {
  it('validates all rows in simulation stats and reports unknown columns', () => {
    const headers = ['Prénom', 'Nom', 'Email', 'Téléphone', 'Notes', 'Colonne libre']
    const rows = [
      ['Sophie', 'Martin', 'sophie@example.com', '06 12 34 56 78', 'VIP', 'A garder'],
      ['', '', '', '', '', 'inexploitable'],
    ]
    const mapping = importService.suggestMapping(headers)

    const stats = importService.getPreviewStats({ headers, rows, mapping })

    expect(stats).toMatchObject({
      total_rows: 2,
      valid_rows_estimate: 1,
      error_rows_estimate: 1,
      unknown_columns: ['Colonne libre'],
    })
    expect(stats.preview_rows[1].errors).toContain('Aucun identifiant client exploitable (nom/prénom/email/téléphone).')
  })
})
