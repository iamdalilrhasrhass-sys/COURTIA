/**
 * documents.client.portee.test.js — LES DOCUMENTS D'UN CLIENT SONT CEUX DU CABINET.
 *
 * POURQUOI CE TEST (P2, mesuré en production le 20/09/2026 — deuxième QA adverse)
 * `GET /api/documents/client/:clientId` répondait
 *   500 {"error":"server_error","message":"invalid reference to FROM-clause
 *        entry for table \"clients\""}
 * parce que la portée cabinet était produite avec l'alias PAR DÉFAUT
 * (« clients ») alors que la requête joint `clients c` : PostgreSQL refusait la
 * requête pour TOUT LE MONDE, et le message brut du moteur SQL partait au
 * navigateur. Le même 500 (donc aucune information de portée) était renvoyé à un
 * cabinet ÉTRANGER, qui doit recevoir 404.
 *
 * Ce test fige la règle :
 *   1. propriétaire (et collègue du même cabinet) → 200 avec les index du dossier ;
 *   2. cabinet étranger → 404, et la requête de lecture des index n'est pas émise ;
 *   3. la clause de portée vise l'ALIAS réellement joint (`c`) ;
 *   4. aucune réponse ne contient de fragment SQL, de nom de table ni de message
 *      d'infrastructure.
 */
jest.mock('../db', () => ({ query: jest.fn() }))
jest.mock('../middleware/planGuard', () => ({
  requireUnderLimit: () => (_req, _res, next) => next(),
  requireFeature: () => (_req, _res, next) => next(),
}))
jest.mock('../middleware/auth', () => ({
  verifyToken: (req, _res, next) => {
    req.user = { id: Number(req.headers['x-test-user'] || 11), userId: Number(req.headers['x-test-user'] || 11) }
    next()
  },
}))

const express = require('express')
const pool = require('../db')
const router = require('./documents')

const CAB_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const CAB_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'

describe('GET /api/documents/client/:clientId — portée cabinet', () => {
  let server
  let origin
  let requetes
  let appartenances
  let cabinetDuClient
  let lectureIndex

  function brancherPool() {
    pool.query.mockImplementation(async (sql, params) => {
      requetes.push({ sql: String(sql), params })
      const s = String(sql)
      if (s.includes('cabinet_members')) return { rows: appartenances }
      if (s.includes('FROM clients c')) {
        const dansLaPortee = s.includes('c.cabinet_id = ANY($2::uuid[])')
          ? (params[1] || []).includes(cabinetDuClient)
          : params[1] === 11
        return { rows: dansLaPortee ? [{ id: Number(params[0]) }] : [] }
      }
      if (s.includes('FROM documents_indexes')) {
        lectureIndex = true
        return { rows: [{ id: 5, categorie: 'contrat', fichier_nom: 'contrat.pdf' }] }
      }
      return { rows: [] }
    })
  }

  beforeAll(async () => {
    const app = express()
    app.locals.pool = pool
    app.use(express.json())
    app.use('/api/documents', router)
    await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve) })
    origin = `http://127.0.0.1:${server.address().port}`
  })
  afterAll(async () => { await new Promise((r) => server.close(r)) })

  beforeEach(() => {
    requetes = []
    lectureIndex = false
    appartenances = [{ cabinet_id: CAB_A, role: 'broker' }]
    cabinetDuClient = CAB_A
    pool.query.mockReset()
    brancherPool()
  })

  const appeler = (clientId, userId = 11) => fetch(`${origin}/api/documents/client/${clientId}`, {
    headers: { 'x-test-user': String(userId) },
  })

  test('propriétaire : 200 et les index du dossier sont servis', async () => {
    const res = await appeler(148)
    expect(res.status).toBe(200)
    const corps = await res.json()
    expect(corps.success).toBe(true)
    expect(corps.data).toHaveLength(1)
    expect(lectureIndex).toBe(true)
  })

  test('la clause de portée vise l’ALIAS joint (`c`), jamais le nom de table', async () => {
    await appeler(148)
    const portee = requetes.find((r) => r.sql.includes('FROM clients c'))
    expect(portee.sql).toContain('c.cabinet_id = ANY($2::uuid[]) OR c.courtier_id = $3')
    expect(portee.sql).not.toContain('clients.cabinet_id')
    const index = requetes.find((r) => r.sql.includes('FROM documents_indexes'))
    expect(index.sql).toContain('JOIN clients c ON c.id = di.client_id')
    expect(index.sql).toContain('c.cabinet_id = ANY($2::uuid[])')
  })

  test('cabinet ÉTRANGER : 404 et AUCUNE lecture des index', async () => {
    cabinetDuClient = CAB_B
    const res = await appeler(200)
    expect(res.status).toBe(404)
    const texte = await res.text()
    expect(JSON.parse(texte).message).toBe('Client introuvable.')
    expect(lectureIndex).toBe(false)
    expect(requetes.some((r) => r.sql.includes('documents_indexes'))).toBe(false)
  })

  test('aucune réponse ne contient de fragment SQL ni de message d’infrastructure', async () => {
    for (const [clientId, cab] of [[148, CAB_A], [200, CAB_B]]) {
      cabinetDuClient = cab
      const res = await appeler(clientId)
      const texte = await res.text()
      for (const interdit of ['FROM-clause', 'SELECT', 'relation', 'server_error', 'documents_indexes']) {
        expect({ clientId, interdit, present: texte.includes(interdit) })
          .toEqual({ clientId, interdit, present: false })
      }
    }
  })

  test('panne de base : 500 avec message produit, aucun message SQL', async () => {
    brancherPool()
    const appelerIndex = () => fetch(`${origin}/api/documents/client/148`, { headers: { 'x-test-user': '11' } })
    pool.query.mockImplementation(async (sql) => {
      const s = String(sql)
      if (s.includes('cabinet_members')) return { rows: appartenances }
      if (s.includes('FROM clients c')) return { rows: [{ id: 148 }] }
      throw new Error('invalid reference to FROM-clause entry for table "documents_indexes"')
    })
    const res = await appelerIndex()
    expect(res.status).toBe(500)
    const brut = await res.text()
    expect(brut).not.toMatch(/FROM-clause/i)
    expect(brut).not.toMatch(/documents_indexes/)
  })
})
