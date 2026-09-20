/**
 * portees.manquantes.test.js — AUCUNE DONNÉE D'AUTRUI N'EST CONFIRMÉE PAR UN
 * SUCCÈS VIDE (défauts D3-05, P3 — troisième QA adverse, mesuré le 20/09/2026).
 *
 * DÉFAUTS MESURÉS
 *   * `GET /api/clients/:id/contrats` d'un client d'un cabinet ÉTRANGER
 *     répondait 200 `[]` au lieu de 404 : la ressource inexistante était
 *     annoncée comme existante et vide.
 *   * `GET /api/developer/keys/:id/usage` d'une clé d'un cabinet ÉTRANGER
 *     répondait 200 `{"stats":[]}` : même faux succès.
 *
 * RÈGLE FIGÉE ICI : hors cabinet = 404. Un succès vide n'est pas une réponse.
 */
jest.mock('../db', () => ({ query: jest.fn() }))
jest.mock('../middleware/auth', () => ({
  verifyToken: (req, _res, next) => {
    const id = Number(req.headers['x-test-user'] || 140)
    req.user = { id, userId: id }
    next()
  },
  isSessionRevoked: async () => ({ revoked: false }),
}))
jest.mock('../middleware/gardeEcritureRole', () => ({
  exigerEcritureCabinet: () => (_req, _res, next) => next(),
  creerGardeEcritureRole: () => (_req, _res, next) => next(),
}))
jest.mock('../middleware/planGuard', () => ({
  requireFeature: () => (_req, _res, next) => next(),
  requireUnderLimit: () => (_req, _res, next) => next(),
  getUserPlanInfo: async () => ({ plan: 'elite', limits: {} }),
}))
jest.mock('../services/apiKeyService', () => ({
  listApiKeys: jest.fn(async () => []),
  generateApiKey: jest.fn(),
  revokeApiKey: jest.fn(async () => true),
  getUsageStats: jest.fn(async () => [{ jour: '2026-09-20', appels: 3 }]),
  listWebhooks: jest.fn(async () => []),
  registerWebhook: jest.fn(),
  deleteWebhook: jest.fn(async () => true),
}))

const express = require('express')
const pool = require('../db')
const apiKeyService = require('../services/apiKeyService')
const clientsRouter = require('./clients')
const developerRouter = require('./developer')

/** Reproduit la garde d'authentification montée par `server.js` sur le préfixe. */
function fausseAuth(req, _res, next) {
  const id = Number(req.headers['x-test-user'] || 140)
  req.user = { id, userId: id }
  next()
}

const CAB_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const CAB_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'

describe('portées manquantes : contrats d’un client étranger (D3-05)', () => {
  let server
  let origin
  let requetes
  let appartenances
  let cabinetDuClient

  beforeAll(async () => {
    const app = express()
    app.locals.pool = pool
    app.use(express.json())
    // Ces routeurs ne portent PAS leur garde d'authentification : c'est
    // `server.js` qui monte `verifyToken` sur le préfixe (on le reproduit).
    app.use('/api/clients', fausseAuth, clientsRouter)
    await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve) })
    origin = `http://127.0.0.1:${server.address().port}`
  })
  afterAll(async () => { await new Promise((r) => server.close(r)) })

  beforeEach(() => {
    requetes = []
    appartenances = [{ cabinet_id: CAB_A, role: 'broker', retire: false }]
    cabinetDuClient = CAB_A
    pool.query.mockReset()
    pool.query.mockImplementation(async (sql, params) => {
      requetes.push({ sql: String(sql), params })
      const s = String(sql)
      if (s.includes('cabinet_members')) return { rows: appartenances }
      if (/FROM clients c/.test(s)) {
        if (s.includes('AND FALSE')) return { rows: [] }
        const dansLaPortee = s.includes('c.cabinet_id = ANY($2::uuid[])')
          ? (params[1] || []).includes(cabinetDuClient)
          : true
        return { rows: dansLaPortee ? [{ id: Number(params[0]) }] : [] }
      }
      if (/FROM quotes q/.test(s)) return { rows: [{ id: 89 }] }
      return { rows: [] }
    })
  })

  const contrats = (clientId = 148) => fetch(`${origin}/api/clients/${clientId}/contrats`, {
    headers: { 'x-test-user': '140' },
  })

  test('client du cabinet : 200 et les contrats sont servis', async () => {
    const res = await contrats()
    expect(res.status).toBe(200)
    expect(await res.json()).toHaveLength(1)
  })

  test('client d’un cabinet ÉTRANGER : 404, et AUCUNE lecture des contrats', async () => {
    cabinetDuClient = CAB_B
    const res = await contrats()
    expect(res.status).toBe(404)
    const corps = await res.json()
    expect(corps.error).toBe('client_introuvable')
    expect(requetes.some((r) => /FROM quotes q/.test(r.sql))).toBe(false)
  })

  test('aucune réponse ne contient de fragment SQL', async () => {
    for (const cab of [CAB_A, CAB_B]) {
      cabinetDuClient = cab
      const texte = await (await contrats()).text()
      for (const interdit of ['SELECT', 'FROM quotes', 'cabinet_members']) {
        expect({ cab, interdit, present: texte.includes(interdit) }).toEqual({ cab, interdit, present: false })
      }
    }
  })
})

describe('portées manquantes : usage d’une clé d’API étrangère (D3-05)', () => {
  let server
  let origin
  let appartenances
  let cleVisible

  beforeAll(async () => {
    const app = express()
    app.locals.pool = pool
    app.use(express.json())
    app.use('/api/developer', fausseAuth, developerRouter)
    await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve) })
    origin = `http://127.0.0.1:${server.address().port}`
  })
  afterAll(async () => { await new Promise((r) => server.close(r)) })

  beforeEach(() => {
    appartenances = [{ cabinet_id: CAB_A, role: 'broker', retire: false }]
    cleVisible = true
    apiKeyService.getUsageStats.mockClear()
    pool.query.mockReset()
    pool.query.mockImplementation(async (sql, params) => {
      const s = String(sql)
      // ATTENTION À L'ORDRE : la requête de clé contient AUSSI `cabinet_members`
      // (sous-requête EXISTS). On la teste donc AVANT le contrôle d'appartenance,
      // sinon le banc répondrait « clé trouvée » à toutes les clés.
      if (/FROM api_keys ak/.test(s)) {
        const dansLaPortee = params[1] === 140
          || (s.includes('cm.cabinet_id = ANY($3::uuid[])') && (params[2] || []).includes(CAB_A) && cleVisible)
        return { rows: dansLaPortee ? [{ id: Number(params[0]) }] : [] }
      }
      if (s.includes('cabinet_members')) return { rows: appartenances }
      return { rows: [] }
    })
  })

  const usage = (keyId, userId = 140) => fetch(`${origin}/api/developer/keys/${keyId}/usage`, {
    headers: { 'x-test-user': String(userId) },
  })

  test('clé du cabinet (collaborateur du même cabinet) : 200 avec les statistiques', async () => {
    const res = await usage(3, 146)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ stats: [{ jour: '2026-09-20', appels: 3 }] })
  })

  test('clé d’un cabinet ÉTRANGER : 404, et AUCUN calcul de statistiques', async () => {
    cleVisible = false
    const res = await usage(99, 146)
    expect(res.status).toBe(404)
    const corps = await res.json()
    expect(corps.error).toBe('key_not_found')
    expect(apiKeyService.getUsageStats).not.toHaveBeenCalled()
  })

  test('compte sans droit (appartenance révoquée) : 404, aucune statistique', async () => {
    appartenances = [{ cabinet_id: CAB_A, role: 'broker', retire: true }]
    const res = await usage(3)
    expect(res.status).toBe(404)
    expect(apiKeyService.getUsageStats).not.toHaveBeenCalled()
  })
})
