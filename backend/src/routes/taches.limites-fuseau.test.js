/**
 * taches.limites-fuseau.test.js — UNE TÂCHE REFUSE AVANT LA BASE, ET PORTE LE
 * FUSEAU DU MARCHÉ DE SON CABINET.
 *
 * POURQUOI CE TEST (P2, deuxième QA adverse, 20/09/2026)
 *   1. `POST /api/taches` avec un titre de 256 caractères répondait
 *      500 {"error":"task_create_failed","message":"Création de tâche
 *      impossible pour le moment."} alors que 255 caractères passaient : le
 *      `catch` de la route remplace le message de PostgreSQL, donc le
 *      middleware `traduireErreursEntree` ne peut plus reconnaître la cause et
 *      le courtier ne sait pas quel champ corriger.
 *   2. `appointments.timezone` portait `DEFAULT 'Europe/Paris'` : une tâche
 *      créée par un cabinet suisse était estampillée « Europe/Paris ».
 *
 * Ce test fige la règle :
 *   • titre > 255 (limite de la colonne) → 400 `champ_trop_long` avec la limite ;
 *   • titre = 255 → 201 (aucune régression) ;
 *   • description > 5000 (limite produit annoncée) → 400 `champ_trop_long` ;
 *   • cabinet suisse → `timezone` = Europe/Zurich écrit dans l'INSERT ;
 *   • compte mono-utilisateur → Europe/Paris (comportement historique) ;
 *   • PUT : mêmes limites.
 */
jest.mock('../db', () => ({ query: jest.fn() }))

const express = require('express')
const jwt = require('jsonwebtoken')
const { getJwtSecret } = require('../utils/jwtSecret')
const router = require('./taches')

const CAB_CH = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
const CAB_FR = 'ffffffff-ffff-ffff-ffff-ffffffffffff'

describe('POST /api/taches — longueurs et fuseau du marché', () => {
  let server
  let origin
  let requetes
  let appartenances
  let paysCabinet

  const fakePool = {
    async query(sql, params) {
      requetes.push({ sql: String(sql), params })
      const s = String(sql)
      if (s.includes('cabinet_members')) return { rows: appartenances }
      if (s.includes('FROM cabinets')) return { rows: [{ id: CAB_CH, name: 'Helvetia', country: paysCabinet }] }
      if (s.includes('FROM broker_profiles')) return { rows: [] }
      if (s.includes('INSERT INTO appointments')) {
        return { rows: [{ id: 1, title: params[0], timezone: params[7] }] }
      }
      return { rows: [] }
    },
  }

  const jeton = () => jwt.sign({ id: 7, userId: 7, role: 'owner' }, getJwtSecret(), { expiresIn: '1h' })

  beforeAll(async () => {
    const app = express()
    app.locals.pool = fakePool
    app.use(express.json())
    app.use('/api/taches', router)
    await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve) })
    origin = `http://127.0.0.1:${server.address().port}`
  })
  afterAll(async () => { await new Promise((r) => server.close(r)) })

  beforeEach(() => {
    requetes = []
    appartenances = [{ cabinet_id: CAB_CH, role: 'owner' }]
    paysCabinet = 'CH'
  })

  const creer = (corps) => fetch(`${origin}/api/taches`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jeton()}` },
    body: JSON.stringify(corps),
  })

  const insertion = () => requetes.find((r) => r.sql.includes('INSERT INTO appointments'))

  test('titre de 300 caractères : 400 champ_trop_long avec la limite annoncée', async () => {
    const res = await creer({ titre: 'A'.repeat(300), echeance: '2026-10-10' })
    expect(res.status).toBe(400)
    const corps = await res.json()
    expect(corps.error).toBe('champ_trop_long')
    expect(corps.limite).toBe(255)
    expect(corps.message).toContain('255')
    expect(insertion()).toBeUndefined()
  })

  test('titre de 256 caractères : 400 (plus jamais un 500 « création impossible »)', async () => {
    const res = await creer({ titre: 'A'.repeat(256), echeance: '2026-10-10' })
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('champ_trop_long')
  })

  test('titre de 255 caractères : 201 (la limite réelle de la colonne est respectée)', async () => {
    const res = await creer({ titre: 'A'.repeat(255), echeance: '2026-10-10' })
    expect(res.status).toBe(201)
    expect(insertion()).toBeTruthy()
  })

  test('description de 5 001 caractères : 400 champ_trop_long', async () => {
    const res = await creer({ titre: 'Relance', description: 'Z'.repeat(5001), echeance: '2026-10-10' })
    expect(res.status).toBe(400)
    const corps = await res.json()
    expect(corps.error).toBe('champ_trop_long')
    expect(corps.champs).toEqual(['description'])
    expect(insertion()).toBeUndefined()
  })

  test('cabinet suisse : la tâche porte Europe/Zurich', async () => {
    const res = await creer({ titre: 'Relance Dupont', echeance: '2026-10-10' })
    expect(res.status).toBe(201)
    const ins = insertion()
    expect(ins.sql).toContain('timezone')
    expect(ins.params).toContain('Europe/Zurich')
    expect(ins.params).not.toContain('Europe/Paris')
  })

  test('cabinet français : la tâche porte Europe/Paris', async () => {
    appartenances = [{ cabinet_id: CAB_FR, role: 'owner' }]
    paysCabinet = 'FR'
    const res = await creer({ titre: 'Relance Martin', echeance: '2026-10-10' })
    expect(res.status).toBe(201)
    expect(insertion().params).toContain('Europe/Paris')
  })

  test('compte SANS cabinet : comportement historique (Europe/Paris)', async () => {
    appartenances = []
    const res = await creer({ titre: 'Sans cabinet', echeance: '2026-10-10' })
    expect(res.status).toBe(201)
    expect(insertion().params).toContain('Europe/Paris')
  })

  test('PUT : le titre trop long est refusé en 400, avant la base', async () => {
    const res = await fetch(`${origin}/api/taches/12`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jeton()}` },
      body: JSON.stringify({ titre: 'B'.repeat(300) }),
    })
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('champ_trop_long')
    expect(requetes.some((r) => r.sql.includes('UPDATE appointments'))).toBe(false)
  })
})
