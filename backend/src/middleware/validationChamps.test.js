/**
 * validationChamps.test.js — UN CHAMP TROP LONG EST REFUSÉ EN 400, NOMMÉ.
 *
 * POURQUOI CE TEST : `POST /api/clients` avec un nom de 2 500 caractères
 * répondait 500 « value too long for type character varying(100) » (Red Team
 * P1 #4). Le contrôle des longueurs se fait désormais avant la base, avec les
 * limites RÉELLES des colonnes, et le message nomme le champ envoyé par
 * l'utilisateur (« nom »), jamais la colonne (« last_name »).
 *
 * Le second contrôle porte sur le routeur TÂCHES : une échéance qui n'existe pas
 * (« 2026-02-31T99:99:99Z ») doit répondre 400 — et surtout ne JAMAIS atteindre
 * la base, où PostgreSQL la refuserait en 500.
 */
jest.mock('../db', () => ({ query: jest.fn() }))
jest.mock('../middleware/auth', () => ({
  verifyToken: (req, _res, next) => { req.user = { id: 7, userId: 7 }; next() },
  isSessionRevoked: async () => ({ revoked: false }),
}))
jest.mock('../middleware/authMiddleware', (req, _res, next) => {
  req.user = { id: 7, userId: 7 }
  next()
})

const express = require('express')
const pool = require('../db')
const { limiterLongueurs, LIMITES_CLIENTS } = require('./validationChamps')

describe('limiterLongueurs', () => {
  let server
  let origin

  beforeAll(async () => {
    const app = express()
    app.use(express.json())
    app.post('/clients', limiterLongueurs(LIMITES_CLIENTS), (req, res) => res.status(201).json({ ok: true }))
    app.put('/clients/:id', limiterLongueurs(LIMITES_CLIENTS), (req, res) => res.json({ ok: true }))
    app.get('/clients', limiterLongueurs(LIMITES_CLIENTS), (req, res) => res.json({ ok: true }))
    await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve) })
    origin = `http://127.0.0.1:${server.address().port}`
  })

  afterAll(async () => { await new Promise((r) => server.close(r)) })

  const poster = (corps) => fetch(`${origin}/clients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corps),
  })

  test('un nom de 2 500 caractères : 400, message produit, nom du champ', async () => {
    const res = await poster({ nom: 'x'.repeat(2500), prenom: 'Élise' })
    const corps = await res.json()
    expect(res.status).toBe(400)
    expect(corps.error).toBe('champ_trop_long')
    expect(corps.champs).toEqual(['nom'])
    expect(corps.message).toMatch(/« nom »/)
    expect(JSON.stringify(corps)).not.toMatch(/character varying|last_name|constraint/i)
  })

  test('un nom de 100 caractères passe (la limite réelle de la colonne)', async () => {
    const res = await poster({ nom: 'x'.repeat(100), prenom: 'Élise' })
    expect(res.status).toBe(201)
  })

  test('les autres champs bornés sont contrôlés aussi', async () => {
    const res = await poster({ nom: 'Dupont', prenom: 'Élise', email: `${'a'.repeat(260)}@x.fr` })
    expect(res.status).toBe(400)
    expect((await res.json()).champs).toEqual(['email'])
  })

  test('les LECTURES ne sont jamais filtrées par cette contrainte', async () => {
    const res = await fetch(`${origin}/clients`)
    expect(res.status).toBe(200)
  })
})

describe('POST /api/taches — échéance impossible', () => {
  let server
  let origin
  const requetes = []

  beforeAll(async () => {
    const app = express()
    app.locals.pool = pool
    app.use(express.json())
    app.use('/api/taches', require('../routes/taches'))
    await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve) })
    origin = `http://127.0.0.1:${server.address().port}`
  })

  afterAll(async () => { await new Promise((r) => server.close(r)) })

  beforeEach(() => {
    requetes.length = 0
    pool.query.mockReset()
    pool.query.mockImplementation(async (sql) => {
      requetes.push(String(sql))
      if (String(sql).includes('cabinet_members')) return { rows: [] }
      return { rows: [{ id: 1 }] }
    })
  })

  // `routes/taches.js` vérifie lui-même le jeton (vérification locale) : on en
  // signe un vrai avec le secret de l'application.
  const jeton = require('jsonwebtoken').sign(
    { id: 7, userId: 7, email: 'audit@courtia-qa.test' },
    require('../utils/jwtSecret').getJwtSecret(),
    { expiresIn: '1h' },
  )

  const creer = (corps) => fetch(`${origin}/api/taches`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jeton}` },
    body: JSON.stringify(corps),
  })

  test('« 2026-02-31T99:99:99Z » : 400 et AUCUNE requête d’écriture', async () => {
    const res = await creer({ titre: 'Rappeler', echeance: '2026-02-31T99:99:99Z' })
    const corps = await res.json()
    expect(res.status).toBe(400)
    expect(corps.error).toBe('validation_error')
    expect(corps.champs).toEqual(['echeance'])
    expect(corps.message).toMatch(/n'existe pas/i)
    expect(requetes.filter((sql) => /INSERT INTO appointments/.test(sql))).toHaveLength(0)
  })

  test('une échéance réelle est acceptée', async () => {
    const res = await creer({ titre: 'Rappeler', echeance: '2026-02-28T09:00:00Z' })
    expect(res.status).toBe(201)
    expect(requetes.some((sql) => /INSERT INTO appointments/.test(sql))).toBe(true)
  })

  test('une échéance manquante est refusée avec le champ en clair', async () => {
    const res = await creer({ titre: 'Rappeler' })
    expect(res.status).toBe(400)
    expect((await res.json()).champs).toEqual(['echeance'])
  })
})
