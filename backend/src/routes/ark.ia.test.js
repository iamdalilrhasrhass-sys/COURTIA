/**
 * ark.ia.test.js — garde-fou : les routes IA ARK ne répondent jamais
 * `success: true` sans contenu réel, et jamais 500 avec l'erreur du fournisseur.
 *
 * POURQUOI CE TEST (mesuré le 20/09/2026) : quand le moteur IA ne renvoyait pas
 * de JSON exploitable, ces routes répondaient `success: true` avec un objet de
 * repli fabriqué — `{summary: result.text}`, `{actions: []}`,
 * `{overallStatus:'unknown', checks: []}`, `{overallScore:0, metrics:{}}`,
 * `{recommendations: []}`. Le courtier lisait un brief, un audit de conformité
 * ou des actions calculées alors qu'aucune analyse n'avait eu lieu. La route
 * « documents-analysis » annonçait même `success: true` pour une fonctionnalité
 * inexistante (LOT 4).
 */
jest.mock('../db', () => ({ query: jest.fn() }))
jest.mock('../middleware/auth', () => ({
  verifyToken: (req, _res, next) => { req.user = { id: 11, userId: 11 }; next() },
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
  getComplianceContext: jest.fn(async () => ({})),
  getMessageContext: jest.fn(async () => ({ client: { id: 201 } })),
  getMorningBriefContext: jest.fn(async () => ({})),
}))

const express = require('express')
const pool = require('../db')
const arkEngine = require('../services/arkEngine')
const router = require('./ark')

const MOTEUR_ABSENT = {
  text: null,
  error: 'configuration_required',
  message: 'Clé API Anthropic non configurée. Ajoutez ANTHROPIC_API_KEY.',
  usage: { inputTokens: 0, outputTokens: 0 },
  model: null,
}
const REPONSE_INEXPLOITABLE = {
  text: 'Réponse en prose du modèle au lieu du JSON demandé.',
  structured: null,
  usage: { inputTokens: 12, outputTokens: 20 },
  model: 'claude-sonnet-4-5',
  latencyMs: 1200,
}
const REPONSE_STRUCTUREE = {
  text: '{"ok":true}',
  structured: { checks: [{ code: 'DDA', statut: 'conforme' }], overallStatus: 'conforme' },
  usage: { inputTokens: 12, outputTokens: 20 },
  model: 'claude-sonnet-4-5',
  latencyMs: 900,
}

/** Routes IA dont le contrat est un objet JSON structuré. */
const ROUTES_IA = [
  ['GET', '/api/ark/client/201/brief'],
  ['GET', '/api/ark/client/201/next-best-actions'],
  ['POST', '/api/ark/client/201/quote-assistant', { productType: 'MRH' }],
  ['POST', '/api/ark/compliance-check', { clientId: 201 }],
  ['GET', '/api/ark/portfolio-health'],
  ['GET', '/api/ark/client/201/recommendations'],
]

/** Routes IA qui peuvent légitimement répondre du texte (jamais vide, jamais fabriqué). */
const ROUTES_TEXTE = [
  ['POST', '/api/ark/actions', { action: 'resume_client', params: {} }],
  ['POST', '/api/ark/generate', { type: 'email', clientId: 201, intent: 'relance' }],
]

const ROUTES_TOUTES = [...ROUTES_IA, ...ROUTES_TEXTE]

describe('routes IA ARK — jamais de succès sans contenu, jamais d’erreur brute', () => {
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
    pool.query.mockResolvedValue({ rows: [] })
  })

  const appeler = ([methode, chemin, corps]) => fetch(origin + chemin, {
    method: methode,
    headers: { 'Content-Type': 'application/json' },
    ...(corps ? { body: JSON.stringify(corps) } : {}),
  })

  function moteur(motif) {
    arkEngine.callArk.mockResolvedValue(motif)
    arkEngine.callArkLight.mockResolvedValue(motif)
    arkEngine.callArkStructured.mockResolvedValue(motif)
  }

  const MESSAGE_IA_ATTENDU = /assistant IA|service IA|indisponible|activé sur cette installation/i

  test('moteur IA absent : chaque route IA répond 503 avec un message produit, jamais success:true', async () => {
    moteur(MOTEUR_ABSENT)

    for (const route of ROUTES_TOUTES) {
      const res = await appeler(route)
      const corps = await res.json()
      expect({ chemin: route[1], statut: res.status }).toEqual({ chemin: route[1], statut: 503 })
      expect({ chemin: route[1], erreur: corps.error }).toEqual({ chemin: route[1], erreur: 'configuration_required' })
      expect(corps.success).toBeUndefined()
      expect(String(corps.message || '')).toMatch(MESSAGE_IA_ATTENDU)
      // Aucun nom de variable d'environnement ni erreur du fournisseur.
      expect(JSON.stringify(corps)).not.toMatch(/ANTHROPIC|api[-_ ]?key|invalid x-api-key/i)
    }
  })

  test('réponse structurée inexploitable : 503 ia_indisponible, aucune donnée fabriquée', async () => {
    moteur(REPONSE_INEXPLOITABLE)

    for (const route of ROUTES_IA) {
      const res = await appeler(route)
      const corps = await res.json()
      expect({ chemin: route[1], statut: res.status }).toEqual({ chemin: route[1], statut: 503 })
      expect({ chemin: route[1], erreur: corps.error }).toEqual({ chemin: route[1], erreur: 'ia_indisponible' })
      expect(corps.success).toBeUndefined()
      // Les objets de repli fabriqués d'hier ne doivent plus apparaître.
      const texte = JSON.stringify(corps)
      for (const motif of ['overallStatus', 'overallScore', 'actions', 'checks', 'missingProducts', 'questionsToAsk']) {
        expect({ chemin: route[1], motif, present: texte.includes(motif) })
          .toEqual({ chemin: route[1], motif, present: false })
      }
    }
  })

  test('texte vide : 503 plutôt qu’un success:true avec content/summary undefined', async () => {
    moteur({ ...REPONSE_INEXPLOITABLE, text: '   ' })

    for (const route of ROUTES_TEXTE) {
      const res = await appeler(route)
      const corps = await res.json()
      expect({ chemin: route[1], statut: res.status }).toEqual({ chemin: route[1], statut: 503 })
      expect(corps.success).toBeUndefined()
    }
  })

  test('moteur IA opérationnel : le contenu réel est bien renvoyé en succès', async () => {
    moteur(REPONSE_STRUCTUREE)

    const res = await fetch(`${origin}/api/ark/compliance-check`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientId: 201 }),
    })
    expect(res.status).toBe(200)
    const corps = await res.json()
    expect(corps.success).toBe(true)
    expect(corps.data.overallStatus).toBe('conforme')

    // Une réponse texte RÉELLE est un succès légitime (ce n'est pas un repli) :
    // le texte du modèle est transmis tel quel.
    moteur(REPONSE_INEXPLOITABLE)
    const resTexte = await fetch(`${origin}/api/ark/actions`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'resume' }),
    })
    const corpsTexte = await resTexte.json()
    expect(resTexte.status).toBe(200)
    expect(corpsTexte.success).toBe(true)
    expect(corpsTexte.data.summary).toBe(REPONSE_INEXPLOITABLE.text)
  })

  test('documents-analysis : 501 explicite, plus de success:true « pending_implementation »', async () => {
    const res = await fetch(`${origin}/api/ark/client/201/documents-analysis`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ documents: [{ type: 'contrat' }] }),
    })
    const corps = await res.json()
    expect(res.status).toBe(501)
    expect(corps.success).toBeUndefined()
    expect(corps.error).toBe('fonctionnalite_non_implementee')
    expect(JSON.stringify(corps)).not.toMatch(/pending_implementation|LOT 4|expectedCapabilities/)
  })
})
