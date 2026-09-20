jest.mock('../lib/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}))

const logger = require('../lib/logger')
const {
  MESSAGE_IA_INDISPONIBLE,
  chargeIaIndisponible,
  chargeIaNonConfiguree,
  repondreIaIndisponible,
  repondreIaNonConfiguree,
  erreurIaNormalisee,
  estErreurIa,
  resultatIaVide,
  detailTechnique,
} = require('./iaErreurs')

function fausseReponse() {
  const res = {
    statusCode: null,
    corps: null,
    status(code) { this.statusCode = code; return this },
    json(payload) { this.corps = payload; return this },
  }
  return res
}

const ERREUR_BRUTE = new Error(
  '401 {"type":"error","error":{"type":"authentication_error","message":"invalid x-api-key"}}'
)
ERREUR_BRUTE.status = 401
ERREUR_BRUTE.error = { type: 'authentication_error', message: 'invalid x-api-key' }

describe('iaErreurs — l\'erreur brute du fournisseur ne sort jamais', () => {
  test('repondreIaIndisponible renvoie 503 ia_indisponible avec message produit', () => {
    const res = fausseReponse()
    repondreIaIndisponible(res, ERREUR_BRUTE, { route: 'test' })

    expect(res.statusCode).toBe(503)
    expect(res.corps).toEqual({ error: 'ia_indisponible', message: MESSAGE_IA_INDISPONIBLE })
    const serialise = JSON.stringify(res.corps)
    expect(serialise).not.toContain('x-api-key')
    expect(serialise).not.toContain('authentication_error')
    expect(serialise).not.toContain('401')
  })

  test('le détail complet est journalisé côté serveur', () => {
    const res = fausseReponse()
    repondreIaIndisponible(res, ERREUR_BRUTE, { route: 'ark' })
    expect(logger.error).toHaveBeenCalled()
    const appel = logger.error.mock.calls.at(-1)
    expect(JSON.stringify(appel[0].erreur)).toContain('invalid x-api-key')
  })

  test('erreurIaNormalisee ne transporte pas le message du fournisseur', () => {
    const normalisee = erreurIaNormalisee(ERREUR_BRUTE, { route: 'ark' })
    expect(normalisee.message).toBe(MESSAGE_IA_INDISPONIBLE)
    expect(normalisee.message).not.toContain('x-api-key')
    expect(normalisee.code).toBe('ia_indisponible')
    expect(estErreurIa(normalisee)).toBe(true)
    expect(estErreurIa(new Error('boom'))).toBe(false)
  })

  test('une erreur sans champ message ne fait pas planter la normalisation', () => {
    expect(() => detailTechnique(null)).not.toThrow()
    expect(detailTechnique(null).type).toBe('UnknownError')
  })
})

describe('iaErreurs — IA absente = 503 configuration_required', () => {
  test('repondreIaNonConfiguree renvoie 503 avec un message produit', () => {
    const res = fausseReponse()
    repondreIaNonConfiguree(res, { route: 'relances-auto-generate' })
    expect(res.statusCode).toBe(503)
    expect(res.corps.error).toBe('configuration_required')
    expect(res.corps.configuration_required).toBe(true)
    expect(typeof res.corps.message).toBe('string')
    expect(res.corps.message.length).toBeGreaterThan(10)
  })

  test('chargeIaNonConfiguree accepte un message métier explicite', () => {
    const charge = chargeIaNonConfiguree('La génération IA est indisponible.')
    expect(charge).toEqual({
      error: 'configuration_required',
      message: 'La génération IA est indisponible.',
      configuration_required: true,
    })
  })

  test('chargeIaIndisponible est stable', () => {
    expect(chargeIaIndisponible()).toEqual({ error: 'ia_indisponible', message: MESSAGE_IA_INDISPONIBLE })
  })
})

describe('iaErreurs — détection d\'un résultat IA vide', () => {
  test('aucun contenu exploitable', () => {
    expect(resultatIaVide(null)).toBe(true)
    expect(resultatIaVide({ error: 'configuration_required' })).toBe(true)
    expect(resultatIaVide({ structured: null })).toBe(true)
    expect(resultatIaVide({ structured: undefined, text: 'x' })).toBe(true)
    expect(resultatIaVide({ structured: { relances: [] } })).toBe(false)
  })

  test('mode texte : un text vide compte comme vide', () => {
    expect(resultatIaVide({ text: '' }, { jsonAttendu: false })).toBe(true)
    expect(resultatIaVide({ text: 'bonjour' }, { jsonAttendu: false })).toBe(false)
  })
})
