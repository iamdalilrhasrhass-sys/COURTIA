jest.mock('../db', () => ({ query: jest.fn(), connect: jest.fn() }))
jest.mock('./salesAuditService', () => ({ appendSalesAudit: jest.fn() }))

const { canonicalHeader, duplicateKey, mapRow, parseWorkbook, suggestMapping } = require('./salesImportService')

describe('salesImportService national cabinet imports', () => {
  test('recognizes French SIRENE and ORIAS headers', () => {
    expect(suggestMapping(['Dénomination', 'SIREN', 'Numéro ORIAS', 'Code postal', 'Téléphone'])).toEqual({
      mapping: { legal_name: 'Dénomination', siren: 'SIREN', orias_number: 'Numéro ORIAS', postal_code: 'Code postal', phone: 'Téléphone' },
      unknown: [],
    })
    expect(canonicalHeader('  Chiffre_d’affaires  ')).toBe("chiffre d'affaires")
  })

  test('maps a CSV row and computes its transparent size score', () => {
    const row = { 'Raison sociale': 'Cabinet Alpha', SIREN: '123 456 789', Salariés: '8', Ville: 'Lyon' }
    const mapping = suggestMapping(Object.keys(row)).mapping
    expect(mapRow(row, mapping)).toMatchObject({ legal_name: 'Cabinet Alpha', siren: '123456789', employee_count: 8, city: 'Lyon', size_is_estimated: true })
  })

  test('prioritizes SIREN, then SIRET, then normalized name and address for duplicates', () => {
    expect(duplicateKey({ siren: '123456789', siret: '12345678900001', legal_name: 'Alpha' })).toBe('siren:123456789')
    expect(duplicateKey({ siret: '12345678900001', legal_name: 'Alpha' })).toBe('siret:12345678900001')
    expect(duplicateKey({ legal_name: 'Alpha', address: '1 rue A' })).toBe('name:alpha|1 rue a')
  })

  test('parses a UTF-8 CSV workbook', () => {
    const csv = Buffer.from('Dénomination,SIREN,Ville\nCabinet Beta,987654321,Paris\n', 'utf8')
    const parsed = parseWorkbook(csv, 'cabinets.csv')
    expect(parsed.headers).toEqual(['Dénomination', 'SIREN', 'Ville'])
    expect(parsed.rows).toHaveLength(1)
  })
})
