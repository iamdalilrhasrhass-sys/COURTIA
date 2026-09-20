/**
 * ark.conversations.portee.test.js — LA CONVERSATION ARK APPARTIENT AU CABINET DU CLIENT.
 *
 * POURQUOI CE TEST (P0, mesuré en production le 20/09/2026 — deuxième QA adverse)
 * `GET /api/ark/history/:clientId` et `GET /api/ark/conversations/:clientId`
 * lisaient la conversation avec
 *     SELECT messages FROM ark_conversations WHERE client_id = $1
 * — AUCUN filtre de cabinet, AUCUN filtre d'utilisateur. Quatre comptes de trois
 * cabinets différents relisaient la conversation ARK d'un client suisse (nom,
 * situation familiale, contrats, primes et réponses de l'assistant).
 *
 * Ce test fige le comportement attendu :
 *   1. le cabinet PROPRIÉTAIRE lit la conversation (200) ;
 *   2. un AUTRE cabinet reçoit 404 — et la requête `ark_conversations` n'est
 *      MÊME PAS émise (aucune ligne hors portée n'est atteignable) ;
 *   3. un compte SANS cabinet ne lit pas la conversation d'un client de cabinet ;
 *   4. un identifiant inexistant répond 404 (jamais un tableau vide trompeur) ;
 *   5. une panne de lecture répond 503, jamais « aucune conversation ».
 */
jest.mock('../db', () => ({ query: jest.fn() }))
jest.mock('../middleware/planGuard', () => ({
  requireUnderLimit: () => (_req, _res, next) => next(),
  requireFeature: () => (_req, _res, next) => next(),
}))
jest.mock('../middleware/cabinetAccess', () => ({
  requireCabinetFeature: () => (_req, _res, next) => next(),
}))
jest.mock('../middleware/auth', () => ({
  // Deux comptes simulés dans le MÊME serveur : l'en-tête choisit l'appelant.
  verifyToken: (req, _res, next) => {
    const id = Number(req.headers['x-test-user'] || 7)
    req.user = { id, userId: id }
    next()
  },
  isSessionRevoked: async () => ({ revoked: false }),
}))
jest.mock('../services/arkEngine', () => ({
  callArk: jest.fn(), callArkLight: jest.fn(), callArkStructured: jest.fn(),
  checkRateLimit: () => ({ allowed: true }),
}))
jest.mock('../services/arkContext', () => ({
  getClientContext: jest.fn(), getPortfolioContext: jest.fn(), getMorningBriefContext: jest.fn(),
  getMessageContext: jest.fn(), getComplianceContext: jest.fn(),
}))

const express = require('express')
const router = require('./ark')

const CAB_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const CAB_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
const MARQUEUR = 'MARQUEUR-AUDIT-RT2-CONFIDENTIEL-HELVETIA-42'

/** Appartenances par utilisateur (rôle et cabinet). */
const APPARTENANCES = {
  7: [{ cabinet_id: CAB_A, role: 'owner' }],     // cabinet A
  9: [{ cabinet_id: CAB_B, role: 'owner' }],     // cabinet B — étape étrangère
  11: [],                                        // compte SANS cabinet
}

/** Cabinet de chaque client. */
const CABINET_DU_CLIENT = { 148: CAB_A, 1: CAB_A, 200: CAB_B }
/** Propriétaire (mode mono) de chaque client. */
const PROPRIETAIRE_DU_CLIENT = { 148: 7, 900: 11 }

describe('GET /api/ark/history|conversations/:clientId — portée cabinet', () => {
  let server
  let origin
  let requetes = []
  let lectureConversation = false
  let echecLecture = false

  const fakePool = {
    async query(sql, params) {
      requetes.push({ sql: String(sql), params })
      const s = String(sql)
      if (s.includes('FROM cabinet_members')) return { rows: APPARTENANCES[params[0]] || [] }
      if (s.includes('FROM clients c')) {
        const clientId = Number(params[0])
        const dansLeCabinet = s.includes('c.cabinet_id = ANY($2::uuid[])')
          ? (params[1] || []).includes(CABINET_DU_CLIENT[clientId])
          : PROPRIETAIRE_DU_CLIENT[clientId] === params[1]
        return { rows: dansLeCabinet ? [{ id: clientId }] : [] }
      }
      if (s.includes('FROM ark_conversations')) {
        lectureConversation = true
        if (echecLecture) throw new Error('ark_conversations indisponible')
        return { rows: [{ messages: [{ role: 'user', content: MARQUEUR }] }] }
      }
      return { rows: [] }
    },
  }

  beforeAll(async () => {
    const app = express()
    app.locals.pool = fakePool
    app.use(express.json())
    app.use('/api/ark', router)
    await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve) })
    origin = `http://127.0.0.1:${server.address().port}`
  })
  afterAll(async () => { await new Promise((r) => server.close(r)) })

  beforeEach(() => {
    requetes = []
    lectureConversation = false
    echecLecture = false
  })

  const appeler = (chemin, userId = 7) => fetch(`${origin}${chemin}`, {
    headers: { 'x-test-user': String(userId) },
  })

  test.each(['/api/ark/history/148', '/api/ark/conversations/148'])(
    '%s : le cabinet propriétaire lit SA conversation (200 + messages)',
    async (chemin) => {
      const res = await appeler(chemin, 7)
      expect(res.status).toBe(200)
      const corps = await res.json()
      expect(corps.messages).toEqual([{ role: 'user', content: MARQUEUR }])
      expect(lectureConversation).toBe(true)
      // La lecture porte bien sur le dossier RÉSOLU en portée.
      const dossier = requetes.find((r) => r.sql.includes('FROM clients c'))
      expect(dossier.sql).toContain('c.cabinet_id = ANY($2::uuid[])')
      expect(dossier.params).toEqual([148, [CAB_A], 7])
    }
  )

  test.each(['/api/ark/history/148', '/api/ark/conversations/148'])(
    '%s : un AUTRE cabinet reçoit 404 et AUCUNE lecture de conversation',
    async (chemin) => {
      const res = await appeler(chemin, 9)
      expect(res.status).toBe(404)
      const texte = await res.text()
      expect(texte).not.toContain(MARQUEUR)
      expect(JSON.parse(texte).error).toBe('client_introuvable')
      // Preuve de non-fuite : la requête ark_conversations n'a jamais été émise.
      expect(lectureConversation).toBe(false)
      expect(requetes.some((r) => r.sql.includes('ark_conversations'))).toBe(false)
    }
  )

  test.each(['/api/ark/history/148', '/api/ark/conversations/148'])(
    '%s : un compte SANS cabinet ne lit pas la conversation d’un cabinet (404)',
    async (chemin) => {
      const res = await appeler(chemin, 11)
      expect(res.status).toBe(404)
      expect(lectureConversation).toBe(false)
    }
  )

  test('un compte sans cabinet lit bien SA propre conversation (comportement historique)', async () => {
    const res = await appeler('/api/ark/history/900', 11)
    expect(res.status).toBe(200)
    expect((await res.json()).messages[0].content).toBe(MARQUEUR)
  })

  test('client inexistant : 404, jamais un historique vide qui ferait croire à zéro échange', async () => {
    const res = await appeler('/api/ark/history/999999', 7)
    expect(res.status).toBe(404)
    expect(lectureConversation).toBe(false)
  })

  test('identifiant non numérique : 400 (jamais un 404 silencieux ni un 500 SQL)', async () => {
    const res = await appeler('/api/ark/history/abc', 7)
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('invalid_client_id')
  })

  test('panne de lecture : 503 explicite, jamais « aucune conversation »', async () => {
    echecLecture = true
    const res = await appeler('/api/ark/history/148', 7)
    expect(res.status).toBe(503)
    const corps = await res.json()
    expect(corps.error).toBe('conversations_indisponibles')
    expect(corps.messages).toBeUndefined()
  })

  test('documents-analysis : un client ÉTRANGER répond 404 (plus de 501 pour tous)', async () => {
    const arkContext = require('../services/arkContext')
    arkContext.getClientContext.mockResolvedValue({ error: "client_not_found", message: "Client non trouvé ou non autorisé" })
    const res = await appeler('/api/ark/client/148/documents-analysis', 9).then((r) => r)
    expect(res.status).toBe(404)
  })

  test('documents-analysis : dossier EN PORTÉE → 403 « non souscrite », message produit, aucun succès', async () => {
    const arkContext = require('../services/arkContext')
    arkContext.getClientContext.mockResolvedValue({ client: { id: 148 } })
    const res = await fetch(`${origin}/api/ark/client/148/documents-analysis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-test-user': '7' },
      body: JSON.stringify({ documents: [{ type: 'contrat' }] }),
    })
    const corps = await res.json()
    expect(res.status).toBe(403)
    expect(corps.error).toBe('fonctionnalite_non_souscrite')
    expect(corps.success).toBeUndefined()
  })

  test('la route de lecture ne contient plus de second gestionnaire divergent', () => {
    const routesHistory = router.stack.filter((l) => l.route && l.route.path === '/history/:clientId')
    expect(routesHistory).toHaveLength(1)
    const routesConversations = router.stack.filter((l) => l.route && l.route.path === '/conversations/:clientId')
    expect(routesConversations).toHaveLength(1)
  })
})
