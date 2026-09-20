/**
 * commissions.baremes-exemples.test.js — L'API DIT QUELS BARÈMES SONT DES EXEMPLES.
 *
 * POURQUOI CE TEST (P3 « D2-12 », deuxième QA adverse, 20/09/2026)
 * `GET /api/commissions/baremes` servait 80 barèmes d'EXEMPLE (huit compagnies
 * qui n'existent pas : Oria, Novalia, Solenys, Atlas, Aurora, Serenis, Helios,
 * Nivalis) à un cabinet qui n'en possédait AUCUN, sans marque par ligne : un
 * client d'API ne pouvait pas distinguer un taux du cabinet d'un taux inventé.
 *
 * Ce test fige la règle :
 *   • `data` ne contient QUE les barèmes du cabinet (`exemple: false`) ;
 *   • le catalogue d'exemple est servi à part, CHAQUE ligne marquée
 *     `exemple: true` et `calculable: false` ;
 *   • le message annonce qu'aucun barème d'exemple n'est applicable ;
 *   • un cabinet SANS barème ne reçoit rien d'appliquable (data vide) ;
 *   • `source` reste 'cabinet' quand le cabinet a des barèmes (contrat de l'écran
 *     /commissions/calculator), 'exemple_a_configurer' sinon.
 */
jest.mock('../db', () => ({ query: jest.fn() }))
jest.mock('../middleware/cabinetAccess', () => ({
  requireCabinetFeature: () => (_req, _res, next) => next(),
  attachCabinet: (_req, _res, next) => next(),
}))
jest.mock('../services/commissionsAutoService', () => ({
  listRules: jest.fn(), upsertRule: jest.fn(), calculateCommission: jest.fn(),
  calculatePeriodCommissions: jest.fn(), reconcileMonth: jest.fn(),
  generateStatement: jest.fn(), detectVariance: jest.fn(),
}))

const express = require('express')
const pool = require('../db')
const commissions = require('./commissions')

const router = commissions.router
const CAB_CH = 'cccccccc-cccc-cccc-cccc-cccccccccccc'

describe('GET /api/commissions/baremes — barèmes du cabinet vs exemples', () => {
  let server
  let origin
  let baremesCabinet

  beforeAll(async () => {
    const app = express()
    app.locals.pool = pool
    app.use(express.json())
    app.use((req, _res, next) => { req.user = { id: 7, userId: 7 }; next() })
    app.use('/api/commissions', router)
    await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve) })
    origin = `http://127.0.0.1:${server.address().port}`
  })
  afterAll(async () => { await new Promise((r) => server.close(r)) })

  beforeEach(() => {
    pool.query.mockReset()
    baremesCabinet = []
    pool.query.mockImplementation(async (sql) => {
      const s = String(sql)
      if (s.includes('cabinet_members')) return { rows: [{ cabinet_id: CAB_CH, role: 'owner' }] }
      // Barèmes DU CABINET : la requête borne sur cabinet_id / user_id.
      if (s.includes('commission_baremes') && s.includes('cabinet_id = $')) {
        return { rows: baremesCabinet }
      }
      // Catalogue d'EXEMPLE : lignes de portée plateforme.
      if (s.includes('commission_baremes') && s.includes('user_id IS NULL')) {
        return {
          rows: [
            { compagnie: 'Oria', produit: 'Auto', rate_percent: '12.000', rate_recurring_percent: '7.200' },
            { compagnie: 'Atlas', produit: 'Habitation', rate_percent: '10.000', rate_recurring_percent: '6.000' },
          ],
        }
      }
      return { rows: [] }
    })
  })

  const lire = () => fetch(`${origin}/api/commissions/baremes`).then(async (r) => ({ statut: r.status, corps: await r.json() }))

  test('cabinet SANS barème : data VIDE, exemples marqués exemple:true et non calculables', async () => {
    const { statut, corps } = await lire()
    expect(statut).toBe(200)
    expect(corps.data).toEqual([])
    expect(corps.total).toBe(0)
    expect(corps.total_cabinet).toBe(0)
    expect(corps.source).toBe('exemple_a_configurer')
    expect(corps.exemples.length).toBeGreaterThan(0)
    for (const ligne of corps.exemples) {
      expect(ligne.exemple).toBe(true)
      expect(ligne.calculable).toBe(false)
    }
    expect(corps.message).toMatch(/EXEMPLE/)
    expect(corps.message).toMatch(/jamais appliquées à un calcul/)
  })

  test('aucune ligne servie n’est ambiguë : chaque ligne porte `exemple`', async () => {
    const { corps } = await lire()
    for (const ligne of [...corps.data, ...corps.exemples]) {
      expect(typeof ligne.exemple).toBe('boolean')
    }
  })

  test('cabinet AVEC un barème : data = SES barèmes (exemple:false) et source=« cabinet »', async () => {
    baremesCabinet = [{ compagnie: 'Helvetia', produit: 'RC Ménage', rate_percent: '18.000', rate_recurring_percent: '9.000' }]
    const { corps } = await lire()
    expect(corps.source).toBe('cabinet')
    expect(corps.data).toHaveLength(1)
    expect(corps.data[0]).toMatchObject({ compagnie: 'Helvetia', exemple: false })
    expect(corps.total_cabinet).toBe(1)
    // Les exemples restent servis à part — jamais dans `data`.
    expect(corps.exemples.every((l) => l.exemple === true)).toBe(true)
  })

  test('la requête des barèmes du cabinet est bornée au cabinet de l’appelant', async () => {
    const appels = []
    pool.query.mockImplementation(async (sql, params) => {
      appels.push({ sql: String(sql), params })
      const s = String(sql)
      if (s.includes('cabinet_members')) return { rows: [{ cabinet_id: CAB_CH, role: 'owner' }] }
      if (s.includes('commission_baremes') && s.includes('cabinet_id = $')) return { rows: [] }
      if (s.includes('commission_baremes')) return { rows: [] }
      return { rows: [] }
    })
    await lire()
    const requeteCabinet = appels.find((a) => a.sql.includes('commission_baremes') && a.sql.includes('cabinet_id = $'))
    expect(requeteCabinet.params).toContain(CAB_CH)
    expect(requeteCabinet.params).toContain(7)
  })

})
