/**
 * ark.marche.test.js — L'IA ARK PARLE LE RÉFÉRENTIEL DU MARCHÉ DU CABINET.
 *
 * POURQUOI CE TEST (défaut P0 mesuré le 20/09/2026)
 * Les huit routes IA ARK appelaient `getPrompt('…')` sans argument et les deux
 * branches du chat écrivaient en dur « expert en courtage d'assurance français
 * (DDA, ORIAS, Loi Hamon, Loi Châtel) ». Résultat mesuré :
 *     node -e "getPrompt('actions')" → marché FR, ORIAS/ACPR/Hamon présents,
 *     FINMA absent.
 * Un cabinet suisse recevait donc de son propre assistant une réponse fausse au
 * regard de sa réglementation (FINMA, LSA, nLPD) et de sa devise (CHF).
 *
 * Ce test monte les VRAIES routes sur un moteur IA ESPION (il enregistre le
 * prompt système réellement transmis) et vérifie, pour un cabinet suisse et un
 * cabinet français, que le prompt contient le référentiel du marché.
 */
jest.mock('../db', () => ({ query: jest.fn() }))
jest.mock('../middleware/auth', () => ({
  verifyToken: (req, _res, next) => {
    const id = Number(req.headers['x-test-user'] || 11)
    req.user = { id, userId: id }
    next()
  },
  isSessionRevoked: async () => ({ revoked: false }),
}))
jest.mock('../middleware/planGuard', () => ({
  requireFeature: () => (_req, _res, next) => next(),
  requireUnderLimit: () => (_req, _res, next) => next(),
}))
jest.mock('../middleware/cabinetAccess', () => ({
  requireCabinetFeature: () => (_req, _res, next) => next(),
}))
jest.mock('../services/arkEngine', () => ({
  callArk: jest.fn(),
  callArkLight: jest.fn(),
  callArkStructured: jest.fn(),
  checkRateLimit: () => ({ allowed: true, resetAt: Date.now() }),
}))
jest.mock('../services/arkContext', () => ({
  getClientContext: jest.fn(async () => ({ client: { id: 201, nom: 'Dupont' } })),
  getPortfolioContext: jest.fn(async () => ({ clients: 3 })),
  getComplianceContext: jest.fn(async () => ({ client: { id: 201 } })),
  getMessageContext: jest.fn(async () => ({ client: { id: 201 } })),
  getMorningBriefContext: jest.fn(async () => ({}))
}))
jest.mock('../lib/aiClient', () => {
  const create = jest.fn(async () => ({ choices: [{ message: { content: 'Réponse ARK de test' } }] }))
  return {
    clientIA: jest.fn(() => ({ chat: { completions: { create } } })),
    __create: create,
  }
})

const express = require('express')
const pool = require('../db')
const arkEngine = require('../services/arkEngine')
const aiClient = require('../lib/aiClient')
const router = require('./ark')

const REPONSE_OK = {
  text: '{"ok":true}',
  structured: { overallStatus: 'conforme', checks: [] },
  usage: { inputTokens: 10, outputTokens: 10 },
  model: 'claude-sonnet-4-5',
  latencyMs: 12,
}

/** Le prompt système réellement transmis au moteur IA. */
let promptsSysteme = []

const UTILISATEURS = { 11: 'CH', 12: 'FR' }

/** Pool simulé : le marché est résolu par le CABINET (11 = CH, 12 = FR). */
function brancherPool() {
  pool.query.mockImplementation(async (sql, params) => {
    const s = String(sql)
    if (s.includes('FROM cabinet_members')) {
      const uid = Number(params?.[0])
      return UTILISATEURS[uid] === 'CH'
        ? { rows: [{ cabinet_id: 'cab-ch-1', role: 'owner' }] }
        : { rows: [] }
    }
    if (s.includes('FROM cabinets')) {
      return { rows: [{ id: 'cab-ch-1', name: 'Helvetia Audit QA SA', country: 'CH', registre_type: 'FINMA', orias_number: null }] }
    }
    if (s.includes('FROM broker_profiles')) {
      // Utilisateur 12 : compte SANS cabinet, profil français (repli mono-utilisateur).
      return { rows: [{ pays: 'France', cabinet_name: 'Cabinet FR QA', registre_type: 'ORIAS', orias: '07000000' }] }
    }
    return { rows: [{}] }
  })
}

const ROUTES_IA = [
  ['POST', '/api/ark/actions', { action: 'resume_client', params: {} }, 'actions'],
  ['GET', '/api/ark/client/201/brief', null, 'client_brief'],
  ['GET', '/api/ark/client/201/next-best-actions', null, 'next_best_actions'],
  ['POST', '/api/ark/client/201/quote-assistant', { productType: 'MRH' }, 'quote_assistant'],
  ['POST', '/api/ark/compliance-check', { clientId: 201 }, 'compliance_check'],
  ['GET', '/api/ark/portfolio-health', null, 'portfolio_health'],
  ['POST', '/api/ark/generate', { type: 'email', clientId: 201, intent: 'relance' }, 'generate_message'],
  ['GET', '/api/ark/client/201/recommendations', null, 'client_recommendations'],
]

/** Références françaises qui ne doivent pas être servies à un cabinet suisse. */
const REFERENCES_FR = ['ORIAS', 'ACPR', 'Loi Hamon', 'Loi Châtel', 'RGPD']

/** Retire la seule phrase d'écart du persona suisse (« … ne s'appliquent pas »). */
function sansConsigneDEcart(prompt) {
  return String(prompt)
    .split('\n')
    .filter((ligne) => !/ne s'appliquent pas/i.test(ligne))
    .join('\n')
}

describe('routes IA ARK — le prompt système suit le marché du cabinet', () => {
  let server
  let origin

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
    jest.clearAllMocks()
    promptsSysteme = []
    brancherPool()
    const espion = async (args) => { promptsSysteme.push(String(args.system || '')); return REPONSE_OK }
    arkEngine.callArk.mockImplementation(espion)
    arkEngine.callArkLight.mockImplementation(espion)
    arkEngine.callArkStructured.mockImplementation(espion)
  })

  const appeler = ([methode, chemin, corps], utilisateur) => fetch(origin + chemin, {
    method: methode,
    headers: { 'Content-Type': 'application/json', 'x-test-user': String(utilisateur) },
    ...(corps ? { body: JSON.stringify(corps) } : {}),
  })

  test('CHAQUE route IA parle FINMA/LSA/nLPD/CHF à un cabinet suisse', async () => {
    expect(ROUTES_IA).toHaveLength(8)

    for (const route of ROUTES_IA) {
      const res = await appeler(route, 11)
      expect({ route: route[3], statut: res.status }).toEqual({ route: route[3], statut: 200 })

      const prompt = promptsSysteme[promptsSysteme.length - 1]
      for (const reference of ['FINMA', 'LSA', 'nLPD', 'CHF']) {
        expect({ route: route[3], reference, present: prompt.includes(reference) })
          .toEqual({ route: route[3], reference, present: true })
      }
      // Les référentiels français ne doivent PAS être présentés comme applicables.
      const utile = sansConsigneDEcart(prompt)
      for (const reference of REFERENCES_FR) {
        expect({ route: route[3], reference, present: utile.includes(reference) })
          .toEqual({ route: route[3], reference, present: false })
      }
      expect({ route: route[3], euro: utile.includes('€') }).toEqual({ route: route[3], euro: false })
      expect(prompt).toContain('Autorité de surveillance: FINMA')
    }
  })

  test('CHAQUE route IA parle ORIAS/ACPR/€ à un cabinet français', async () => {
    for (const route of ROUTES_IA) {
      const res = await appeler(route, 12)
      expect({ route: route[3], statut: res.status }).toEqual({ route: route[3], statut: 200 })

      const prompt = promptsSysteme[promptsSysteme.length - 1]
      for (const reference of ['ORIAS', 'ACPR', '€']) {
        expect({ route: route[3], reference, present: prompt.includes(reference) })
          .toEqual({ route: route[3], reference, present: true })
      }
      expect(prompt).not.toContain('FINMA')
      expect(prompt).toContain('Marché: France (FR)')
    }
  })

  test('les DEUX branches du chat portent le référentiel du marché, jamais une persona en dur', async () => {
    process.env.DEEPSEEK_API_KEY = 'cle-de-test'
    try {
      // Branche « avec fiche client »
      let res = await fetch(`${origin}/api/ark/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-test-user': '11' },
        body: JSON.stringify({ message: 'Résume ce client', clientData: { id: 201, nom: 'Dupont' } }),
      })
      expect(res.status).toBe(200)
      let systeme = String(aiClient.__create.mock.calls.at(-1)[0].messages[0].content)
      expect(systeme).toContain('FINMA')
      expect(systeme).not.toMatch(/expert en courtage d'assurance français/)
      expect(systeme).toContain('Autorité de surveillance: FINMA')

      // Branche « sans fiche client »
      res = await fetch(`${origin}/api/ark/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-test-user': '12' },
        body: JSON.stringify({ message: 'Bonjour' }),
      })
      expect(res.status).toBe(200)
      systeme = String(aiClient.__create.mock.calls.at(-1)[0].messages[0].content)
      expect(systeme).toContain('ORIAS')
      expect(systeme).not.toContain('FINMA')
      expect(systeme).toContain('Marché: France (FR)')
    } finally {
      delete process.env.DEEPSEEK_API_KEY
    }
  })
})

describe('/api/ark/rewrite — aucune facturation quand l’IA n’est pas appelée', () => {
  let server
  let origin

  beforeAll(async () => {
    const app = express()
    app.locals.pool = pool
    app.use(express.json())
    // Comme dans server.js, le routeur ARK est monté DERRIÈRE l'authentification.
    // /rewrite ne porte pas `verifyToken` en interne : sans ce montage, la route
    // répond 401 (comportement normal, pas un défaut).
    app.use((req, _res, next) => {
      const id = Number(req.headers['x-test-user'] || 12)
      req.user = { id, userId: id }
      next()
    })
    app.use('/api/ark', router)
    await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve) })
    origin = `http://127.0.0.1:${server.address().port}`
  })
  afterAll(async () => { await new Promise((r) => server.close(r)) })

  beforeEach(() => {
    jest.clearAllMocks()
    brancherPool()
  })

  test('le run est journalisé « local » avec 0 jeton et un coût nul', async () => {
    // Clé Anthropic présente : AVANT ce correctif, la route s’annonçait
    // « llm_ready_fallback_text » et facturait des jetons DEVINÉS (length/4).
    process.env.ANTHROPIC_API_KEY = 'cle-de-test'
    try {
      const res = await fetch(`${origin}/api/ark/rewrite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-test-user': '12' },
        body: JSON.stringify({ text: 'Bonjour, je vous relance pour votre contrat auto.', mode: 'rephrase' }),
      })
      expect(res.status).toBe(200)
      const corps = await res.json()
      expect(corps.source).toBe('local_fallback')
      expect(corps.ia_appelee).toBe(false)
      expect(typeof corps.text).toBe('string')

      const insertion = pool.query.mock.calls.find(([sql]) => String(sql).includes('INSERT INTO ark_runs'))
      expect(insertion).toBeDefined()
      const valeurs = insertion[1]
      // [userId, feature, model, inputTokens, outputTokens, cost, latency, status, error]
      expect(valeurs[2]).toBe('local')
      expect(valeurs[3]).toBe(0)
      expect(valeurs[4]).toBe(0)
      expect(valeurs[5]).toBe(0)
      expect(valeurs[7]).toBe('local_fallback')
    } finally {
      delete process.env.ANTHROPIC_API_KEY
    }
  })
})
