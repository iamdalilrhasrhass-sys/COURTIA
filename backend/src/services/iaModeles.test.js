jest.mock('../lib/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}))

const {
  MODELES,
  estModeleValide,
  tarifModele,
  listerModeles,
  modeleDepuisEnv,
  coutAppelUsd,
  resoudreAlias,
  MODELE_DEFAUT,
  MODELE_LEGER,
  MODELE_SECOURS,
  MODELE_VISION,
  MODELE_ANALYSE,
} = require('./iaModeles')

const IDENTIFIANTS_MORTS = [
  'claude-haiku-4-5-20250514', // n'a jamais existé
  'claude-3-5-opus-20241022',  // Opus 3.5 jamais publié
  'claude-3-haiku-20240307',   // retiré le 20/04/2026
  'claude-3-5-haiku-20241022', // retiré le 19/02/2026
]

describe('iaModeles — centralisation des identifiants', () => {
  test('les identifiants morts ne sont plus déclarés', () => {
    for (const mort of IDENTIFIANTS_MORTS) {
      expect(MODELES[mort]).toBeUndefined()
      expect(estModeleValide(mort)).toBe(false)
    }
  })

  test('les modèles par défaut sont des identifiants valides', () => {
    for (const modele of [MODELE_DEFAUT, MODELE_SECOURS, MODELE_LEGER, MODELE_VISION, MODELE_ANALYSE]) {
      expect(estModeleValide(modele)).toBe(true)
    }
  })

  test('chaque modèle déclaré porte un tarif complet', () => {
    for (const id of listerModeles()) {
      const tarif = tarifModele(id)
      expect(typeof tarif.input).toBe('number')
      expect(typeof tarif.output).toBe('number')
      expect(tarif.input).toBeGreaterThan(0)
      expect(tarif.output).toBeGreaterThan(0)
    }
  })

  test('les alias officiels sont résolus vers un identifiant daté', () => {
    expect(resoudreAlias('claude-haiku-4-5')).toBe('claude-haiku-4-5-20251001')
    expect(estModeleValide('claude-haiku-4-5')).toBe(true)
  })

  test('coutAppelUsd ne renvoie jamais NaN ni négatif', () => {
    expect(coutAppelUsd('modele-inexistant', 1000, 1000)).toBe(0)
    expect(coutAppelUsd(MODELE_LEGER, 0, 0)).toBe(0)
    expect(coutAppelUsd(MODELE_LEGER, 1000000, 0)).toBeGreaterThan(0)
  })
})

describe('iaModeles — surcharge par variable d\'environnement validée', () => {
  const ENV = 'ARK_TEST_MODELE'

  afterEach(() => { delete process.env[ENV] })

  test('une variable absente retombe sur le défaut', () => {
    delete process.env[ENV]
    expect(modeleDepuisEnv(ENV, MODELE_LEGER)).toBe(MODELE_LEGER)
  })

  test('une variable valide est acceptée', () => {
    process.env[ENV] = MODELE_DEFAUT
    expect(modeleDepuisEnv(ENV, MODELE_LEGER)).toBe(MODELE_DEFAUT)
  })

  test('un modèle retiré en variable d\'environnement est REFUSÉ (chemin IA préservé)', () => {
    for (const mort of IDENTIFIANTS_MORTS) {
      process.env[ENV] = mort
      expect(modeleDepuisEnv(ENV, MODELE_LEGER)).toBe(MODELE_LEGER)
    }
  })
})
