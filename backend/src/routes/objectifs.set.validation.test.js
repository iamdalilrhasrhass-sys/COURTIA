/**
 * objectifs.set.validation.test.js — UN CHAMP IGNORÉ NE RÉPOND PAS « ok:true ».
 *
 * POURQUOI CE TEST (P3, deuxième QA adverse, 20/09/2026)
 *   POST /api/objectifs/set {"annee":2026,"ca_cible":250000,"clients_cible":40}
 *   -> 200 {"ok":true,"objectif":{"ca_target_cents":"0","new_clients_target":0,…}}
 * L'appelant croyait avoir fixé 250 000 de CA ; la base contenait 0. Et les
 * champs ABSENTS étaient écrits à 0 (`ON CONFLICT … EXCLUDED`) : une mise à jour
 * partielle remettait à zéro les trois cibles non transmises.
 *
 * Ce test fige la règle :
 *   • un champ non reconnu → 400 `champ_inconnu` nommant les noms acceptés ;
 *   • une mise à jour partielle ne touche QUE les cibles transmises ;
 *   • des cibles hors nomenclature ne sont jamais écrites ;
 *   • aucune réponse ne porte de message SQL.
 */
jest.mock('../db', () => ({ query: jest.fn() }))
jest.mock('../middleware/auth', () => ({
  verifyToken: (req, _res, next) => { req.user = { id: 7, userId: 7 }; next() },
  isSessionRevoked: async () => ({ revoked: false }),
}))

const express = require('express')
const pool = require('../db')
const router = require('./objectifsAdvanced')

describe('POST /api/objectifs/set — champs inconnus et mise à jour partielle', () => {
  let server
  let origin
  let requetes

  beforeAll(async () => {
    const app = express()
    app.locals.pool = pool
    app.use(express.json())
    app.use('/api', router)
    await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve) })
    origin = `http://127.0.0.1:${server.address().port}`
  })
  afterAll(async () => { await new Promise((r) => server.close(r)) })

  beforeEach(() => {
    requetes = []
    pool.query.mockReset()
    pool.query.mockImplementation(async (sql, params) => {
      requetes.push({ sql: String(sql), params })
      return { rows: [{ user_id: 7, year: 2026, ca_target_cents: params[2] }] }
    })
  })

  const definir = (corps) => fetch(`${origin}/api/objectifs/set`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corps),
  })

  test('champ non reconnu (« ca_cible », « annee ») : 400, AUCUNE écriture', async () => {
    const res = await definir({ annee: 2026, ca_cible: 250000, clients_cible: 40 })
    expect(res.status).toBe(400)
    const corps = await res.json()
    expect(corps.error).toBe('champ_inconnu')
    expect(corps.champs).toEqual(expect.arrayContaining(['annee', 'ca_cible', 'clients_cible']))
    expect(corps.champs_acceptes).toContain('ca_target_cents')
    expect(requetes.some((r) => r.sql.includes('INSERT INTO objectifs'))).toBe(false)
  })

  test('mise à jour PARTIELLE : seules les cibles transmises figurent dans l’écriture', async () => {
    const res = await definir({ year: 2026, ca_target_cents: 25000000 })
    expect(res.status).toBe(200)
    const ins = requetes.find((r) => r.sql.includes('INSERT INTO objectifs'))
    expect(ins.sql).toContain('ca_target_cents')
    // Les trois autres cibles ne sont NI insérées NI écrasées : une mise à jour
    // partielle ne remet pas à zéro ce qui n'est pas transmis.
    for (const colonne of ['new_clients_target', 'new_contracts_target', 'commissions_target_cents']) {
      expect({ colonne, present: ins.sql.includes(colonne) }).toEqual({ colonne, present: false })
    }
    expect(ins.params).toEqual([7, 2026, 25000000])
    expect(res.json).toBeTruthy()
  })

  test('aucune cible transmise : 400 (jamais un « ok » sans écriture)', async () => {
    const res = await definir({ year: 2026 })
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('aucune_cible')
  })

  test('cible négative ou non numérique : 400 valeur_invalide', async () => {
    for (const valeur of [-5, 'abc']) {
      const res = await definir({ ca_target_cents: valeur })
      expect(res.status).toBe(400)
      expect((await res.json()).error).toBe('valeur_invalide')
    }
    expect(requetes.some((r) => r.sql.includes('INSERT INTO objectifs'))).toBe(false)
  })

  test('année invalide : 400 annee_invalide', async () => {
    const res = await definir({ year: 1999, ca_target_cents: 1000 })
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('annee_invalide')
  })

  test('appel nominal (année + quatre cibles) : 200 et les quatre colonnes écrites', async () => {
    const res = await definir({
      year: 2027, ca_target_cents: 25000000, new_clients_target: 40,
      new_contracts_target: 90, commissions_target_cents: 3000000,
    })
    expect(res.status).toBe(200)
    const ins = requetes.find((r) => r.sql.includes('INSERT INTO objectifs'))
    for (const colonne of ['ca_target_cents', 'new_clients_target', 'new_contracts_target', 'commissions_target_cents']) {
      expect({ colonne, present: ins.sql.includes(colonne) }).toEqual({ colonne, present: true })
    }
    expect(ins.params).toEqual([7, 2027, 25000000, 40, 90, 3000000])
  })

  test('panne de base : 500 avec message produit, aucun message SQL', async () => {
    pool.query.mockImplementation(async () => { throw new Error('relation "objectifs" does not exist') })
    const res = await definir({ ca_target_cents: 1000 })
    expect(res.status).toBe(500)
    const brut = await res.text()
    expect(brut).not.toMatch(/objectifs" does not exist/)
    expect(brut).not.toMatch(/relation/i)
  })
})
