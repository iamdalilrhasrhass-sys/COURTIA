/**
 * portfolioAnalyzer.ltv.test.js — AUCUNE PRIME INVENTÉE DANS LA VALEUR CLIENT.
 *
 * POURQUOI CE TEST (défaut P2 corrigé le 20/09/2026)
 * `estimateClientLTV` remplaçait toute prime manquante ou nulle par `600`
 * (« sinon 600€/contrat par défaut »), puis le résultat partait dans le dossier
 * client sous le libellé « VALEUR CLIENT ESTIMÉE » — et jusque dans le prompt
 * envoyé au modèle. Deux contrats sans prime renseignée fabriquaient ainsi
 * 1 200 € de valeur client, sans qu'aucune mesure ne l'ait produite.
 *
 * Contrat testé : seules les primes RÉELLEMENT renseignées sont sommées ; sans
 * aucune prime, la valeur n'est pas estimable (`null`, source `estimee`) et le
 * nombre de contrats sans prime est publié.
 */
jest.mock('../db', () => ({ query: jest.fn() }))
jest.mock('@anthropic-ai/sdk', () => jest.fn())

const { estimateClientLTV } = require('./portfolioAnalyzer')

const actif = (prime_annuelle, extra = {}) => ({ status: 'actif', prime_annuelle, ...extra })

describe('portfolioAnalyzer — valeur client estimée, jamais inventée', () => {
  test('deux contrats sans prime ne fabriquent plus 1 200 €', () => {
    const ltv = estimateClientLTV({ quotes: [actif(null), actif(null)] }, 70)

    expect(ltv.min).toBeNull()
    expect(ltv.max).toBeNull()
    expect(ltv.annual_premium).toBeNull()
    expect(ltv.source).toBe('estimee')
    expect(ltv.contrats_sans_prime_renseignee).toBe(2)
    expect(ltv.label).toMatch(/Non estimable/)
    // Le forfait d'hier ne doit plus apparaître nulle part.
    expect(JSON.stringify(ltv)).not.toContain('1200')
  })

  test('l’estimation ne couvre que les primes renseignées et le dit', () => {
    const ltv = estimateClientLTV({ quotes: [actif(1000), actif(null)] }, 85)

    expect(ltv.annual_premium).toBe(1000)
    expect(ltv.min).toBe(Math.round(1000 * 4.2 * 0.85))
    expect(ltv.max).toBe(Math.round(1000 * 4.2 * 1.15))
    expect(ltv.contrats_actifs).toBe(2)
    expect(ltv.contrats_sans_prime_renseignee).toBe(1)
    expect(ltv.estimation_partielle).toBe(true)
    expect(ltv.source).toBe('estimee')
  })

  test('les lignes non actives et les primes illisibles sont ignorées, pas remplacées', () => {
    const ltv = estimateClientLTV({
      quotes: [actif(500), { status: 'resilie', prime_annuelle: 999999 }, actif('abc'), actif(-10)],
    }, 50)

    expect(ltv.annual_premium).toBe(500)
    expect(ltv.contrats_actifs).toBe(3)
    expect(ltv.contrats_sans_prime_renseignee).toBe(2)
    expect(ltv.estimation_partielle).toBe(true)
  })

  test('une prime zéro est traitée comme non renseignée, jamais comme un forfait', () => {
    const ltv = estimateClientLTV({ quotes: [actif(0)] }, 60)

    expect(ltv.annual_premium).toBeNull()
    expect(ltv.contrats_sans_prime_renseignee).toBe(1)
  })
})
