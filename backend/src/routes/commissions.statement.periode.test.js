/**
 * commissions.statement.periode.test.js — LA PÉRIODE DU RELEVÉ EST VALIDÉE
 * AVANT LA BASE.
 *
 * POURQUOI CE TEST (Red Team, 4e passe, 21/09/2026) :
 *   GET /api/commissions/statement/abc/1/pdf
 *   → 500 {"error":"22P02","message":"Le relevé de commissions est momentanément
 *      indisponible…"}
 * Deux défauts en un : une panne serveur (500) pour une demande mal formée, et
 * le code SQLSTATE PostgreSQL (22P02 = invalid_text_representation) servi comme
 * code d'erreur applicatif. La route répond désormais 400 `periode_invalide`,
 * SANS émettre la moindre requête.
 */
jest.mock('../db', () => ({ query: jest.fn() }))
jest.mock('../middleware/cabinetAccess', () => ({
  requireCabinetFeature: () => (_req, _res, next) => next(),
  attachCabinet: (_req, _res, next) => next(),
}))
jest.mock('../services/commissionsAutoService', () => ({
  listRules: jest.fn(), upsertRule: jest.fn(), calculateCommission: jest.fn(),
  calculatePeriodCommissions: jest.fn(), reconcileMonth: jest.fn(),
  detectVariance: jest.fn(),
  generateStatement: jest.fn(async () => ({ filename: 'releve.pdf', pdf: Buffer.from('%PDF-1.4') })),
}))

const express = require('express')
const commissionsAutoService = require('../services/commissionsAutoService')
const commissions = require('./commissions')

const router = commissions.router

describe('GET /api/commissions/statement/:year/:month/pdf — période invalide', () => {
  let server
  let origin

  beforeAll(async () => {
    const app = express()
    app.use((req, _res, next) => { req.user = { id: 11, userId: 11 }; next() })
    app.use((req, res, next) => { res.app = res.app || {}; req.app.locals.pool = { query: jest.fn() }; next() })
    app.use(router)
    await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve) })
    origin = `http://127.0.0.1:${server.address().port}`
  })
  afterAll(async () => { await new Promise((r) => server.close(r)) })

  beforeEach(() => {
    commissionsAutoService.generateStatement.mockClear()
  })

  test.each([
    ['abc', '1'],      // mesuré en production : NaN → 500 SQL
    ['2026', 'abc'],
    ['12abc', '1'],    // parseInt('12abc') = 12 : ce n'est PAS une période
    ['99999', '1'],    // hors plage d'une colonne entière d'année
    ['2026', '13'],    // mois inexistant
    ['2026', '0'],
    ['-2026', '1'],
    ['2026.5', '1'],
  ])('« %s/%s » → 400 periode_invalide, aucune requête émise', async (annee, mois) => {
    const res = await fetch(`${origin}/statement/${annee}/${mois}/pdf`)
    const corps = await res.json()
    expect(res.status).toBe(400)
    expect(corps.error).toBe('periode_invalide')
    expect(JSON.stringify(corps)).not.toMatch(/22P02|invalid input syntax|out of range|NaN|SQL/i)
    expect(commissionsAutoService.generateStatement).not.toHaveBeenCalled()
  })

  test('une période valide atteint bien le générateur', async () => {
    const res = await fetch(`${origin}/statement/2026/9/pdf`)
    expect(res.status).toBe(200)
    expect(commissionsAutoService.generateStatement).toHaveBeenCalledWith(
      expect.anything(), 11, 2026, 9
    )
  })
})
