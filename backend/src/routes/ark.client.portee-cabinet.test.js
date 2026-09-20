/**
 * ark.client.portee-cabinet.test.js — LE COLLABORATEUR DU CABINET N'EST PAS UN
 * ÉTRANGER SUR LES ROUTES ARK DU MÊME DOSSIER (défaut D3-02, P2 — troisième QA
 * adverse, mesuré le 20/09/2026).
 *
 * DÉFAUT MESURÉ : `services/arkContext.getClientContext` filtrait
 * `c.courtier_id = $2` (portée MONO-utilisateur) alors que /api/ark/history,
 * /api/ark/conversations, /api/clients/:id et /api/documents/client/:id
 * filtrent le CABINET. Le collaborateur (`broker`) du cabinet lisait donc la
 * conversation ARK du dossier (200) puis recevait 404 « Client non trouvé ou non
 * autorisé » sur /brief, /next-best-actions et /documents-analysis : deux
 * réponses contradictoires pour la même personne et le même dossier.
 *
 * CE QUE CE TEST FIGE
 *   1. collaborateur du cabinet → 200 (le moteur IA est branché : la route va au
 *      bout, elle ne refuse pas le dossier) ;
 *   2. cabinet ÉTRANGER → 404 `client_not_found`, et le moteur IA n'est JAMAIS
 *      appelé (aucune donnée du dossier étranger n'est lue) ;
 *   3. la clause de portée vise l'alias `c` et le CABINET (`c.cabinet_id = ANY`)
 *      — jamais `c.courtier_id = $2` seul ;
 *   4. compte sans droit (appartenance révoquée) → 404.
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
jest.mock('../middleware/planGuard', () => ({
  requireUnderLimit: () => (_req, _res, next) => next(),
  requireFeature: () => (_req, _res, next) => next(),
}))
jest.mock('../middleware/cabinetAccess', () => ({
  requireCabinetFeature: () => (_req, _res, next) => next(),
}))
jest.mock('../services/planService', () => ({
  incrementUsage: jest.fn(async () => ({})),
  getUserPlanInfo: jest.fn(async () => ({ plan: 'elite', limits: { features: {} } })),
}))
jest.mock('../services/analyticsService', () => ({ trackEvent: jest.fn(async () => ({})) }))
jest.mock('../services/arkPrompts', () => ({
  getPrompt: () => ({ system: 'systeme de recette', maxTokens: 512 }),
  chargerMarcheCabinet: async () => 'CH',
  personaDuMarche: () => 'courtier',
  construireBlocMarche: () => '',
  PROMPTS: {},
  MARCHES: ['FR', 'CH'],
}))
jest.mock('../services/arkProactiveService', () => ({
  getProactiveSuggestions: jest.fn(async () => []),
  getClientTimeline: jest.fn(async () => []),
  detectClientSignals: jest.fn(async () => []),
  getPriorityQueue: jest.fn(async () => []),
}))
jest.mock('../services/arkEngine', () => ({
  callArk: jest.fn(),
  callArkLight: jest.fn(),
  callArkStructured: jest.fn(),
  checkRateLimit: () => ({ allowed: true, resetAt: Date.now() }),
}))

const express = require('express')
const pool = require('../db')
const arkEngine = require('../services/arkEngine')
const router = require('./ark')

const CAB_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const CAB_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'

const BRIEF_STRUCTURE = {
  text: '{"resume":"brief"}',
  structured: { resume: 'Synthèse du dossier', points_cles: ['échéance 2026'] },
  usage: { inputTokens: 10, outputTokens: 20 },
  model: 'double-de-recette',
  latencyMs: 12,
}

describe('GET /api/ark/client/:id/brief — portée CABINET (D3-02)', () => {
  let server
  let origin
  let requetes
  let appartenances
  let cabinetDuClient

  beforeAll(async () => {
    const app = express()
    app.locals.pool = pool
    app.use(express.json())
    app.use('/api/ark', router)
    await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve) })
    origin = `http://127.0.0.1:${server.address().port}`
  })
  afterAll(async () => { await new Promise((r) => server.close(r)) })

  beforeEach(() => {
    requetes = []
    appartenances = [{ cabinet_id: CAB_A, role: 'broker', retire: false }]
    cabinetDuClient = CAB_A
    arkEngine.callArkLight.mockReset()
    arkEngine.callArkLight.mockResolvedValue(BRIEF_STRUCTURE)
    arkEngine.callArk.mockReset()
    arkEngine.callArk.mockResolvedValue(BRIEF_STRUCTURE)
    arkEngine.callArkStructured.mockReset()
    arkEngine.callArkStructured.mockResolvedValue(BRIEF_STRUCTURE)
    pool.query.mockReset()
    pool.query.mockImplementation(async (sql, params) => {
      requetes.push({ sql: String(sql), params })
      const s = String(sql)
      // Contexte client : c'est LUI qui porte la portée du dossier.
      if (/FROM clients c\b/.test(s)) {
        if (s.includes('AND FALSE')) return { rows: [] }
        const dansLaPortee = s.includes('c.cabinet_id = ANY($2::uuid[])')
          ? (params[1] || []).includes(cabinetDuClient)
          : params[1] === 140
        return { rows: dansLaPortee ? [{ id: Number(params[0]), first_name: 'Marta', last_name: 'Dossier', courtier_id: 140 }] : [] }
      }
      if (s.includes('cabinet_members')) return { rows: appartenances }
      return { rows: [] }
    })
  })

  const brief = (clientId = 148, userId = 146) => fetch(`${origin}/api/ark/client/${clientId}/brief`, {
    headers: { 'x-test-user': String(userId) },
  })

  test('collaborateur du cabinet : 200 (la route va jusqu’au moteur, elle ne refuse pas le dossier)', async () => {
    const res = await brief()
    expect(res.status).toBe(200)
    const corps = await res.json()
    expect(corps.success).toBe(true)
    expect(corps.data.clientId).toBe(148)
    expect(arkEngine.callArkLight).toHaveBeenCalledTimes(1)
  })

  test('le créateur du dossier obtient le même résultat (aucune régression)', async () => {
    const res = await brief(148, 140)
    expect(res.status).toBe(200)
  })

  test('la portée du dossier est celle du CABINET (jamais `courtier_id = $2` seul)', async () => {
    await brief()
    const contexte = requetes.find((r) => /FROM clients c\b/.test(r.sql))
    expect(contexte).toBeDefined()
    expect(contexte.sql).toContain('c.cabinet_id = ANY($2::uuid[])')
    expect(contexte.params[1]).toEqual([CAB_A])
    expect(contexte.params[2]).toBe(146)
  })

  test('cabinet ÉTRANGER : 404 client_not_found et AUCUN appel au moteur IA', async () => {
    cabinetDuClient = CAB_B
    const res = await brief(148, 140)
    expect(res.status).toBe(404)
    const corps = await res.json()
    expect(corps.error).toBe('client_not_found')
    expect(arkEngine.callArkLight).not.toHaveBeenCalled()
    expect(String(JSON.stringify(corps))).not.toContain('null')
  })

  test('compte sans droit (appartenance révoquée) : dossier introuvable, moteur jamais appelé', async () => {
    appartenances = [{ cabinet_id: CAB_A, role: 'broker', retire: true }]
    const res = await brief()
    expect(res.status).toBe(404)
    expect(arkEngine.callArkLight).not.toHaveBeenCalled()
  })

  test('aucun corps de réponse ne contient de fragment SQL', async () => {
    for (const [cab, utilisateur] of [[CAB_A, 146], [CAB_B, 140]]) {
      cabinetDuClient = cab
      const texte = await (await brief(148, utilisateur)).text()
      for (const interdit of ['SELECT', 'FROM clients', 'cabinet_members', 'courtier_id']) {
        expect({ cab, interdit, present: texte.includes(interdit) }).toEqual({ cab, interdit, present: false })
      }
    }
  })
})
