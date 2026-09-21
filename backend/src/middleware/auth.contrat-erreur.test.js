/**
 * auth.contrat-erreur.test.js — LE CONTRAT D'ERREUR 401 EST UNIQUE ET NE NOMME
 * AUCUNE CLASSE INTERNE.
 *
 * DÉFAUT MESURÉ LE 21/09/2026 (audit de surface, preuve curl) :
 *   GET /api/auth/me   → {"success":false,"error":"AuthenticationError","message":"Token manquant"}
 *   GET /api/clients   → {"error":"En-tête d’authentification manquant"}
 * Deux formes pour un même refus, et le nom d'une classe interne du serveur
 * exposé au client. Le frontend, lui, décide sur le code HTTP (401) : aucun
 * écran ne dépendait de la chaîne « AuthenticationError ».
 *
 * Ce test fige la forme attendue : un code machine stable, un message rédigé,
 * et aucun nom de classe.
 */
const { verifyToken } = require('./auth')

// Le pool est simulé : cette suite n'a besoin d'AUCUNE base (le middleware testé
// ne touche la base que pour vérifier une session révoquée). Le module `../db`
// n'arrête plus le processus au chargement (voir src/db.js), mais on garde le
// pool simulé pour qu'aucune requête réelle ne parte.
jest.mock('../db', () => ({ query: jest.fn(async () => ({ rows: [] })), pool: {} }))

function fauxRes() {
  const res = {
    statut: null,
    corps: null,
    status(code) { this.statut = code; return this },
    json(corps) { this.corps = corps; return this },
  }
  return res
}

describe('middleware verifyToken — contrat d’erreur', () => {
  test('en-tête absent : 401, code machine, message rédigé, aucun nom de classe', async () => {
    const res = fauxRes()
    await verifyToken({ headers: {} }, res, () => { throw new Error('next ne doit pas être appelé') })
    expect(res.statut).toBe(401)
    expect(res.corps.error).toBe('token_absent')
    expect(typeof res.corps.message).toBe('string')
    expect(JSON.stringify(res.corps)).not.toMatch(/AuthenticationError|Error:|at Object\./)
  })

  test('jeton illisible : 401 token_invalide (jamais 403), sans détail technique', async () => {
    const res = fauxRes()
    await verifyToken({ headers: { authorization: 'Bearer pas-un-jeton' } }, res, () => { throw new Error('next ne doit pas être appelé') })
    expect(res.statut).toBe(401)
    expect(res.corps.error).toBe('token_invalide')
    expect(JSON.stringify(res.corps)).not.toMatch(/AuthenticationError|jsonwebtoken|jwt malformed/)
  })
})
