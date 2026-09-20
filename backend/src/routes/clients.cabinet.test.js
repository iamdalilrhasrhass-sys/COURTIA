/**
 * clients.cabinet.test.js — la portée des clients est CELLE DU CABINET.
 *
 * POURQUOI CE TEST : le défaut reproduit en production le 20/09/2026 — un
 * collaborateur invité (rôle broker) dans un cabinet voyait 0 client alors que
 * le propriétaire en voyait 1, parce que `GET /api/clients` filtrait
 * `clients.courtier_id = req.user.id`.
 *
 * Ce test vérifie le comportement HTTP réel du routeur avec un pool simulé :
 *   1. owner / broker / assistant LISENT tout le cabinet (même clause SQL) ;
 *   2. un utilisateur SANS cabinet garde la requête historique (aucune
 *      régression pour les cabinets mono-utilisateur déjà en production) ;
 *   3. assistant / viewer : l'écriture est refusée (403) ;
 *   4. une ressource d'un autre cabinet produit 404 (jamais 403 : un 403
 *      révélerait son existence) ;
 *   5. la création estampille le cabinet (cabinet_id) du créateur.
 */
jest.mock('../db', () => ({ query: jest.fn() }))

const express = require('express')
const poolModule = require('../db')
const router = require('./clients')

const CAB_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const CAB_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'

describe('GET /api/clients — portée cabinet', () => {
  let server
  let origin
  const requetes = []
  let reponseMetier = () => ({ rows: [] })

  const fakePool = {
    async query(sql, params) {
      requetes.push({ sql, params })
      return reponseMetier(sql, params)
    },
  }

  /** Simule `cabinet_members` pour l'utilisateur de la requête. */
  function simulerAppartenances(appartenances) {
    poolModule.query.mockImplementation(async (sql) => {
      if (String(sql).includes('cabinet_members')) return { rows: appartenances }
      return { rows: [] }
    })
  }

  beforeAll(async () => {
    const app = express()
    app.locals.pool = fakePool
    app.use(express.json())
    app.use((req, _res, next) => { req.user = { id: 7, userId: 7, role: 'broker' }; next() })
    app.use(router)
    await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve) })
    origin = `http://127.0.0.1:${server.address().port}`
  })
  afterAll(async () => { await new Promise((r) => server.close(r)) })

  beforeEach(() => {
    requetes.length = 0
    poolModule.query.mockReset()
    reponseMetier = (sql) => (String(sql).includes('COUNT(*)')
      ? { rows: [{ count: 2 }] }
      : { rows: [{ id: 42, prenom: 'Léa', nom: 'Dupont' }] })
  })

  const dernierListe = () => requetes.find((r) => r.sql.includes('FROM clients') && !r.sql.includes('AS count FROM clients'))
  const dernierComptage = () => requetes.find((r) => r.sql.includes('AS count FROM clients'))

  test('owner : la liste est filtrée sur le CABINET, pas sur l’utilisateur', async () => {
    simulerAppartenances([{ cabinet_id: CAB_A, role: 'owner' }])
    const res = await fetch(`${origin}/`)
    expect(res.status).toBe(200)
    const corps = await res.json()
    expect(corps.filtres_appliques.portee).toBe('cabinet')
    expect(corps.filtres_appliques.role).toBe('owner')

    const liste = dernierListe()
    expect(liste.sql).toContain('clients.cabinet_id = ANY($1::uuid[]) OR clients.courtier_id = $2')
    expect(liste.params).toEqual([[CAB_A], 7, 20, 0])
    expect(dernierComptage().params).toEqual([[CAB_A], 7])
  })

  test('broker : MÊME portée que le propriétaire — le défaut est corrigé', async () => {
    simulerAppartenances([{ cabinet_id: CAB_A, role: 'broker' }])
    const res = await fetch(`${origin}/`)
    expect(res.status).toBe(200)
    const liste = dernierListe()
    expect(liste.sql).toContain('clients.cabinet_id = ANY($1::uuid[])')
    expect(liste.params).toEqual([[CAB_A], 7, 20, 0])
  })

  test('assistant : lecture de tout le cabinet', async () => {
    simulerAppartenances([{ cabinet_id: CAB_A, role: 'assistant' }])
    const res = await fetch(`${origin}/`)
    expect(res.status).toBe(200)
    expect(dernierListe().params).toEqual([[CAB_A], 7, 20, 0])
  })

  test('sans cabinet : requête historique conservée (mono-utilisateur)', async () => {
    simulerAppartenances([])
    const res = await fetch(`${origin}/`)
    expect(res.status).toBe(200)
    const corps = await res.json()
    expect(corps.filtres_appliques.portee).toBe('utilisateur')
    const liste = dernierListe()
    expect(liste.sql).toContain('WHERE clients.courtier_id = $1')
    expect(liste.params).toEqual([7, 20, 0])
  })

  test('deux cabinets : les deux sont dans la clause (jamais un seul)', async () => {
    simulerAppartenances([
      { cabinet_id: CAB_A, role: 'broker' },
      { cabinet_id: CAB_B, role: 'broker' },
    ])
    await fetch(`${origin}/`)
    expect(dernierListe().params[0]).toEqual([CAB_A, CAB_B])
  })
})

describe('écritures sur /api/clients — portée cabinet', () => {
  let server
  let origin
  const requetes = []
  let reponseMetier = () => ({ rows: [] })

  const fakePool = {
    async query(sql, params) {
      requetes.push({ sql, params })
      return reponseMetier(sql, params)
    },
  }

  function simulerAppartenances(appartenances) {
    poolModule.query.mockImplementation(async (sql) => {
      if (String(sql).includes('cabinet_members')) return { rows: appartenances }
      return { rows: [] }
    })
  }

  beforeAll(async () => {
    const app = express()
    app.locals.pool = fakePool
    app.use(express.json())
    app.use((req, _res, next) => { req.user = { id: 7, userId: 7 }; next() })
    app.use(router)
    await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve) })
    origin = `http://127.0.0.1:${server.address().port}`
  })
  afterAll(async () => { await new Promise((r) => server.close(r)) })

  beforeEach(() => {
    requetes.length = 0
    poolModule.query.mockReset()
    reponseMetier = () => ({ rows: [{ id: 42 }], rowCount: 1 })
  })

  test('assistant : création refusée (403 lecture seule) et AUCUNE écriture', async () => {
    simulerAppartenances([{ cabinet_id: CAB_A, role: 'assistant' }])
    const res = await fetch(`${origin}/`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prenom: 'Léa', nom: 'Dupont' }),
    })
    expect(res.status).toBe(403)
    expect((await res.json()).error).toBe('lecture_seule')
    expect(requetes.some((r) => r.sql.includes('INSERT INTO clients'))).toBe(false)
  })

  test('broker : le client créé porte le cabinet du créateur', async () => {
    simulerAppartenances([{ cabinet_id: CAB_A, role: 'broker' }])
    reponseMetier = (sql, params) => (String(sql).includes('INSERT INTO clients')
      ? { rows: [{ id: 900, cabinet_id: params[20] }] }
      : { rows: [{ max: 1 }], rowCount: 1 })
    const res = await fetch(`${origin}/`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prenom: 'Léa', nom: 'Dupont' }),
    })
    expect(res.status).toBe(201)
    const insertion = requetes.find((r) => r.sql.includes('INSERT INTO clients'))
    expect(insertion.sql).toContain('cabinet_id')
    expect(insertion.params[19]).toBe(7)      // courtier_id = créateur
    expect(insertion.params[20]).toBe(CAB_A)  // cabinet_id = tenant
  })

  test('modification d’un client d’un AUTRE cabinet : 404 (jamais 403)', async () => {
    simulerAppartenances([{ cabinet_id: CAB_A, role: 'broker' }])
    // Le client visé appartient au cabinet B : aucune ligne ne correspond.
    reponseMetier = () => ({ rows: [], rowCount: 0 })
    const res = await fetch(`${origin}/1234`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prenom: 'X', nom: 'Y' }),
    })
    expect(res.status).toBe(404)

    const maj = requetes.find((r) => r.sql.includes('UPDATE clients'))
    // La clause d'écriture borne bien au cabinet : pas de mise à jour possible
    // hors du cabinet de l'appelant.
    expect(maj.sql).toContain('clients.cabinet_id = ANY($21::uuid[])')
    expect(maj.sql).not.toContain('courtier_id = $20')
    expect(maj.params[20]).toEqual([CAB_A])
  })

  test('suppression : la portée est dans le DELETE lui-même', async () => {
    simulerAppartenances([{ cabinet_id: CAB_A, role: 'broker' }])
    reponseMetier = () => ({ rows: [], rowCount: 0 })
    const res = await fetch(`${origin}/1234`, { method: 'DELETE' })
    expect(res.status).toBe(404)
    const suppression = requetes.find((r) => r.sql.includes('DELETE FROM clients'))
    expect(suppression.sql).toContain('clients.cabinet_id = ANY($2::uuid[])')
  })

  test('viewer : suppression refusée (403)', async () => {
    simulerAppartenances([{ cabinet_id: CAB_A, role: 'viewer' }])
    const res = await fetch(`${origin}/1234`, { method: 'DELETE' })
    expect(res.status).toBe(403)
    expect(requetes.some((r) => r.sql.includes('DELETE FROM clients'))).toBe(false)
  })
})
