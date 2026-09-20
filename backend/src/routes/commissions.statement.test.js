/**
 * commissions.statement.test.js — PLUS DE 501 « NON IMPLÉMENTÉ » NU.
 *
 * POURQUOI CE TEST (P2 « D2-11 », deuxième QA adverse, 20/09/2026)
 *   GET /api/commissions/statement/2026/9/pdf -> 501 {"error":"statement_pdf_unavailable"}
 * Le message était honnête, mais un 501 « non implémenté » est un 5xx nu : il
 * annonce que la ROUTE n'existe pas, et il est compté comme une erreur serveur
 * sur un point d'entrée du produit. La réponse est donc 403 « fonctionnalité non
 * souscrite » (« non installée sur cette installation »), message produit.
 *
 * Ce test fige la règle : plus de 501 pour ce chemin, un message produit, et
 * jamais de détail d'infrastructure.
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
  // Fabrique la panne du relevé À L'INTÉRIEUR de la fabrique de mock (aucune
  // variable hors portée : `jest.mock` l'interdit).
  generateStatement: jest.fn(async () => {
    throw Object.assign(
      new Error("Le relevé de commissions en PDF n'est pas encore disponible dans cette version : "
        + 'les montants restent consultables à l’écran et exportables en CSV.'),
      { code: 'fonctionnalite_non_souscrite', fonctionnalite: 'releve_commissions_pdf', statut: 403 }
    )
  }),
}))

const express = require('express')
const pool = require('../db')
const commissionsAutoService = require('../services/commissionsAutoService')
const commissions = require('./commissions')

const router = commissions.router

describe('GET /api/commissions/statement/:year/:month/pdf', () => {
  let server
  let origin

  beforeAll(async () => {
    const app = express()
    app.locals.pool = pool
    app.use((req, _res, next) => { req.user = { id: 7, userId: 7 }; next() })
    app.use('/api/commissions', router)
    await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve) })
    origin = `http://127.0.0.1:${server.address().port}`
  })
  afterAll(async () => { await new Promise((r) => server.close(r)) })

  beforeEach(() => {
    pool.query.mockReset()
    pool.query.mockImplementation(async (sql) => {
      if (String(sql).includes('cabinet_members')) {
        return { rows: [{ cabinet_id: 'cccccccc-cccc-cccc-cccc-cccccccccccc', role: 'owner' }] }
      }
      return { rows: [] }
    })
  })

  test('relevé non souscrit : 403 avec message produit (jamais un 501 nu)', async () => {
    const res = await fetch(`${origin}/api/commissions/statement/2026/9/pdf`)
    const corps = await res.json()
    expect(res.status).not.toBe(501)
    expect(res.status).toBe(403)
    expect(corps.error).toBe('fonctionnalite_non_souscrite')
    expect(corps.fonctionnalite).toBe('releve_commissions_pdf')
    expect(corps.message).toMatch(/PDF/)
    expect(corps.message).toMatch(/CSV/)
  })

  test('une panne réelle du relevé reste un 500 avec message produit', async () => {
    commissionsAutoService.generateStatement.mockImplementation(async () => {
      throw new Error('relation "commissions" does not exist')
    })
    const res = await fetch(`${origin}/api/commissions/statement/2026/9/pdf`)
    expect(res.status).toBe(500)
    const brut = await res.text()
    expect(brut).not.toMatch(/does not exist/)
    expect(brut).toMatch(/indisponible/i)
  })
})
