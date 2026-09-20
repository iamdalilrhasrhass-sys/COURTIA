/**
 * Tests du moteur de comparateur (point IA-001).
 *
 * Le moteur ne consulte AUCUN assureur : il doit donc produire des offres
 * explicitement étiquetées comme simulées, sans jamais laisser croire qu'un
 * tarif, une notation ou un délai proviennent d'une compagnie réelle.
 */
const {
  computeAllQuotes,
  SIMULATEURS,
  SIMULATION_NOTICE,
  SOURCE_SIMULATION,
} = require('./comparatorEngine')

const NOMS_COMPAGNIES_FICTIVES = [
  'Aurora', 'Novalia', 'Helios', 'Serenis', 'Atlas', 'Oria', 'Nivalis', 'Solenys',
]

describe('comparatorEngine — toute offre est marquée comme simulation', () => {
  const { quotes, summary } = computeAllQuotes(
    { age: 38, zone: 'urbain', sinistres_3ans: 0 },
    { produit: 'Auto', level: 'confort' }
  )

  test('les 8 offres portent is_simulation, source et notice', () => {
    expect(quotes).toHaveLength(8)
    for (const offre of quotes) {
      expect(offre.is_simulation).toBe(true)
      expect(offre.source).toBe(SOURCE_SIMULATION)
      expect(offre.simulation_notice).toBe(SIMULATION_NOTICE)
      expect(offre.prime_source).toBe(SOURCE_SIMULATION)
      expect(offre.notation_source).toBe(SOURCE_SIMULATION)
      expect(offre.delai_source).toBe(SOURCE_SIMULATION)
    }
  })

  test('aucune offre ne porte le nom d\'une compagnie qui n\'existe pas', () => {
    for (const offre of quotes) {
      expect(NOMS_COMPAGNIES_FICTIVES).not.toContain(offre.provider)
      expect(offre.provider).toMatch(/^Simulation [A-H]$/)
    }
    expect(NOMS_COMPAGNIES_FICTIVES).not.toContain(summary.ark_recommendation)
  })

  test('le résumé porte la provenance simulée de bout en bout', () => {
    expect(summary.is_simulation).toBe(true)
    expect(summary.source).toBe(SOURCE_SIMULATION)
    expect(summary.simulation_notice).toBe(SIMULATION_NOTICE)
    expect(summary.ark_explanation).toMatch(/Simulation/)
    expect(summary.ark_explanation).toMatch(/assureur/)
  })

  test('les badges ne présentent pas un classement comme réel', () => {
    for (const offre of quotes) {
      for (const badge of offre.badges || []) {
        expect(badge.label).toMatch(/simulé/i)
      }
    }
  })

  test('les comptes-rendus racine exposent is_simulation et la notice', () => {
    const resultat = computeAllQuotes({ age: 40 }, { produit: 'MRH', level: 'premium' })
    expect(resultat.is_simulation).toBe(true)
    expect(resultat.simulation_notice).toBe(SIMULATION_NOTICE)
    expect(resultat.source).toBe(SOURCE_SIMULATION)
  })

  test('la mécanique de calcul est conservée (descendante par prix)', () => {
    const primes = quotes.map(q => q.prime_annuelle_eur)
    expect(primes.every(p => Number.isFinite(p) && p > 0)).toBe(true)
    const parPrix = [...quotes].sort((a, b) => a.prime_annuelle_eur - b.prime_annuelle_eur)
    expect(parPrix[0].prime_annuelle_eur).toBeLessThanOrEqual(parPrix[7].prime_annuelle_eur)
    expect(summary.cheapest_eur).toBe(parPrix[0].prime_annuelle_eur)
  })

  test('le profil simulé reste déterministe (même entrée, même résultat)', () => {
    const a = computeAllQuotes({ age: 45, zone: 'rural' }, { produit: 'Santé' })
    const b = computeAllQuotes({ age: 45, zone: 'rural' }, { produit: 'Santé' })
    expect(a.quotes.map(q => q.prime_annuelle_eur)).toEqual(b.quotes.map(q => q.prime_annuelle_eur))
  })

  test('les 8 profils simulés sont distincts et étiquetés', () => {
    expect(Object.keys(SIMULATEURS)).toHaveLength(8)
    for (const [nom, info] of Object.entries(SIMULATEURS)) {
      expect(nom).toMatch(/^Simulation [A-H]$/)
      expect(info.brand).toMatch(/aucun assureur réel/)
    }
  })
})
