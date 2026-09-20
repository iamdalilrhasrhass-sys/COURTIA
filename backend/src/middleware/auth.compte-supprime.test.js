/**
 * auth.compte-supprime.test.js — UN COMPTE SUPPRIMÉ N'A PLUS DE SESSION
 * (défaut D3-08, troisième QA adverse, mesuré le 20/09/2026).
 *
 * DÉFAUT MESURÉ : `isSessionRevoked` lisait `users` et répondait
 * `{ revoked: false }` quand la ligne était INTROUVABLE — c'est-à-dire quand le
 * compte avait été SUPPRIMÉ. Le jeton émis avant la suppression (7 jours de vie)
 * restait donc accepté : `GET /api/clients` → 200, `POST /api/notifications/
 * read-all` → 200 `success:true`, et les routes d'écriture atteignaient leurs
 * handlers (500/409) au lieu d'être refusées. L'application savait pourtant, sur
 * `/api/auth/me`, que le compte n'existait plus (404) : deux réponses
 * contradictoires pour le même jeton.
 *
 * CE QUE CE TEST FIGE
 *   1. compte introuvable ⇒ verdict `revoked: true` + `compteInexistant` ;
 *   2. les deux middlewares d'authentification répondent 401 (jamais 200, jamais
 *      403, jamais 500) sur une route d'écriture COMME sur une route de lecture ;
 *   3. un compte existant sans marque de révocation n'est PAS impacté (aucune
 *      session légitime cassée) ;
 *   4. une panne de base reste 503 (on ne confond pas panne et suppression).
 */
jest.mock('../db', () => ({ query: jest.fn() }))
jest.mock('../utils/jwtSecret', () => ({ getJwtSecret: () => 'qa-supprime-signing-fixture' }))

const express = require('express')
const jwt = require('jsonwebtoken')
const pool = require('../db')
const { isSessionRevoked, verifyToken, reinitialiserCacheColonnes } = require('./auth')
const verifyTokenLegacy = require('./authMiddleware')

const SECRET = 'qa-supprime-signing-fixture'

function jeton(userId = 4242) {
  return jwt.sign({ id: userId, userId, email: 'supprime@courtia-qa.test' }, SECRET, { expiresIn: '1h' })
}

function fausseReponse() {
  return {
    statusCode: null,
    corps: null,
    status(c) { this.statusCode = c; return this },
    json(p) { this.corps = p; return this },
  }
}

describe('session d’un compte supprimé (D3-08)', () => {
  beforeEach(() => {
    pool.query.mockReset()
    reinitialiserCacheColonnes()
  })

  test('compte introuvable ⇒ session révoquée (et signalée comme telle)', async () => {
    pool.query.mockResolvedValue({ rows: [] })
    const verdict = await isSessionRevoked(jwt.decode(jeton()))
    expect(verdict.revoked).toBe(true)
    expect(verdict.compteInexistant).toBe(true)
  })

  test('compte existant sans marque de révocation ⇒ session valide (aucune régression)', async () => {
    pool.query.mockResolvedValue({ rows: [{ password_changed_at: null, sessions_revoked_at: null }] })
    const verdict = await isSessionRevoked(jwt.decode(jeton()))
    expect(verdict.revoked).toBe(false)
  })

  test('panne de base : 503, jamais « compte supprimé » (on ne confond pas panne et suppression)', async () => {
    pool.query.mockRejectedValue(new Error('connexion perdue'))
    const verdict = await isSessionRevoked(jwt.decode(jeton()))
    expect(verdict.revoked).toBe(false)
    expect(verdict.dbError).toBe(true)
  })

  test('verifyToken : 401 sur une route de LECTURE d’un compte supprimé', async () => {
    pool.query.mockResolvedValue({ rows: [] })
    const res = fausseReponse()
    let suiteAppelee = false
    await verifyToken(
      { headers: { authorization: `Bearer ${jeton()}` } },
      res,
      () => { suiteAppelee = true }
    )
    expect(suiteAppelee).toBe(false)
    expect(res.statusCode).toBe(401)
    expect(res.corps.error).toBe('SessionRevoked')
    expect(String(res.corps.message)).toMatch(/compte n’existe plus|compte n'existe plus/)
  })

  test('les deux middlewares répondent 401 sur une route d’ÉCRITURE', async () => {
    pool.query.mockResolvedValue({ rows: [] })
    for (const middleware of [verifyToken, verifyTokenLegacy]) {
      const res = fausseReponse()
      let suiteAppelee = false
      await middleware(
        { method: 'POST', headers: { authorization: `Bearer ${jeton()}` } },
        res,
        () => { suiteAppelee = true }
      )
      expect([middleware.name, suiteAppelee]).toEqual([middleware.name, false])
      expect([middleware.name, res.statusCode]).toEqual([middleware.name, 401])
    }
  })

  test('un compte existant écrit normalement (le correctif ne bloque pas les vivants)', async () => {
    pool.query.mockResolvedValue({ rows: [{ password_changed_at: null, sessions_revoked_at: null }] })
    const res = fausseReponse()
    let suiteAppelee = false
    await verifyToken({ headers: { authorization: `Bearer ${jeton()}` } }, res, () => { suiteAppelee = true })
    expect(suiteAppelee).toBe(true)
    expect(res.statusCode).toBe(null)
  })

  test('de bout en bout : la route n’est jamais atteinte avec un jeton de compte supprimé', async () => {
    pool.query.mockResolvedValue({ rows: [] })
    const app = express()
    app.use(express.json())
    let atteinte = false
    app.post('/ecriture', verifyToken, (_req, res) => { atteinte = true; res.json({ success: true }) })
    const serveur = await new Promise((resolve) => {
      const s = app.listen(0, '127.0.0.1', () => resolve(s))
    })
    const origin = `http://127.0.0.1:${serveur.address().port}`
    const reponse = await fetch(`${origin}/ecriture`, {
      method: 'POST',
      headers: { authorization: `Bearer ${jeton()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ x: 1 }),
    })
    expect(reponse.status).toBe(401)
    expect(atteinte).toBe(false)
    await new Promise((r) => serveur.close(r))
  })
})
