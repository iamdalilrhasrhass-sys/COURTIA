/**
 * gardeEcritureRole.calendrier.test.js — L'ÉCRITURE EST INTERDITE PAR DÉFAUT
 * SOUS /api, ET LES EXCEPTIONS SONT NOMMÉES JUSQU'À LA ROUTE.
 *
 * POURQUOI CE TEST (défauts P3 SEC-021 et SEC-022, mesurés en production le
 * 20/09/2026)
 *   * SEC-022 : un compte de cabinet en LECTURE SEULE créait un événement —
 *     `POST /api/calendar/events` → 200 — alors que vingt autres routes
 *     d'écriture lui répondaient 403. La cause n'était pas l'absence de garde
 *     (elle refusait bien par défaut) mais la liste d'exceptions :
 *     `'/api/calendar'` y figurait EN ENTIER pour une seule route réellement
 *     publique (le retour OAuth de Google). Idem `'/api/whatsapp'`, qui
 *     exemptait aussi `/api/whatsapp/send`.
 *   * SEC-021 : `POST /api/onboarding/step` n'exigeait AUCUN rôle : un `broker`
 *     écrivait le nom et le numéro ORIAS du cabinet (valeurs modifiées en base).
 *
 * Ce test verrouille les deux, et dans les deux sens : ce qui doit être refusé
 * l'est, et ce qui doit RESTER public le reste (une correction qui ferme tout
 * casserait la connexion Google et les webhooks fournisseurs).
 */
jest.mock('../db', () => ({ query: jest.fn() }))
jest.mock('../middleware/auth', () => ({
  verifyToken: (req, _res, next) => next(),
  verifyTokenMiddleware: (req, _res, next) => next(),
}))
jest.mock('../lib/featureFlags', () => ({
  isFeatureEnabled: jest.fn(async () => true),
  getFeatureFlagsForUser: jest.fn(async () => ({})),
}))
jest.mock('../services/cabinetMembershipService', () => {
  const reel = jest.requireActual('../services/cabinetMembershipService')
  return {
    ...reel,
    ensureUserCabinet: jest.fn(),
    getOnboardingProgress: jest.fn(async () => ({})),
    markOnboardingStep: jest.fn(async () => ({})),
  }
})

const express = require('express')
const jwt = require('jsonwebtoken')
const poolModule = require('../db')
const cabinetMembershipService = require('../services/cabinetMembershipService')
const { getJwtSecret } = require('../utils/jwtSecret')
const { creerGardeEcritureRole, estPrefixePublic, PREFIXES_PUBLICS } = require('./gardeEcritureRole')
const onboardingRouter = require('../routes/onboarding')

const CAB_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'

function jeton(payload) {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '1h' })
}

/** Pool simulé : seule `cabinet_members` est lue (résolution de portée). */
function poolAvec(appartenances) {
  return {
    async query(sql) {
      if (String(sql).includes('cabinet_members')) return { rows: appartenances }
      return { rows: [], rowCount: 0 }
    },
  }
}

describe('garde d’écriture — l’agenda n’est plus exempté en bloc', () => {
  let server
  let origin
  let appartenances = []
  let requetes = []
  let atteintes = []

  beforeAll(async () => {
    const app = express()
    app.use(express.json())
    app.use('/api', (req, _res, next) => { req.__pool = poolAvec(appartenances); next() })
    app.use('/api', (req, res, next) => creerGardeEcritureRole(req.__pool)(req, res, next))
    app.use('/api', (req, res) => {
      atteintes.push(`${req.method} ${req.path}`)
      res.json({ ok: true, atteint: true })
    })
    await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve) })
    origin = `http://127.0.0.1:${server.address().port}`
  })

  afterAll(async () => { await new Promise((r) => server.close(r)) })

  beforeEach(() => {
    appartenances = []
    atteintes = []
    requetes = []
    poolModule.query.mockImplementation(async (sql) => { requetes.push(String(sql)); return { rows: [] } })
  })

  const appeler = (methode, chemin, corps, entete, depuis) => fetch(`${depuis || origin}/api${chemin}`, {
    method: methode,
    headers: {
      'Content-Type': 'application/json',
      ...(entete ? { Authorization: `Bearer ${entete}` } : {}),
    },
    body: corps ? JSON.stringify(corps) : undefined,
  })

  test.each([
    ['assistant'],
    ['viewer'],
  ])('%s : POST /api/calendar/events est refusé en 403 lecture_seule', async (role) => {
    appartenances = [{ cabinet_id: CAB_A, role }]
    const res = await appeler('POST', '/calendar/events',
      { title: 'Refus', date: '2026-10-01T09:00:00Z' }, jeton({ id: 7, userId: 7, role: 'broker' }))
    const corps = await res.json()
    expect(res.status).toBe(403)
    expect(corps.error).toBe('lecture_seule')
    expect(atteintes).toHaveLength(0)
  })

  test('owner : POST /api/calendar/events passe (la correction ne casse pas l’agenda)', async () => {
    appartenances = [{ cabinet_id: CAB_A, role: 'owner' }]
    const res = await appeler('POST', '/calendar/events',
      { title: 'RDV', date: '2026-10-01T09:00:00Z' }, jeton({ id: 7, userId: 7 }))
    expect(res.status).toBe(200)
    expect(atteintes).toEqual(['POST /calendar/events'])
  })

  test.each([
    ['assistant', '/whatsapp/send'],
    ['assistant', '/whatsapp/template'],
  ])('%s : POST /api%s n’est plus exempté (seul le webhook l’est)', async (role, chemin) => {
    appartenances = [{ cabinet_id: CAB_A, role }]
    const res = await appeler('POST', chemin, {}, jeton({ id: 7, userId: 7 }))
    expect(res.status).toBe(403)
    expect((await res.json()).error).toBe('lecture_seule')
    expect(atteintes).toHaveLength(0)
  })

  test('les points d’entrée réellement publics restent ouverts à un rôle lecture seule', async () => {
    appartenances = [{ cabinet_id: CAB_A, role: 'assistant' }]
    const t = jeton({ id: 7, userId: 7 })
    for (const chemin of ['/calendar/callback', '/whatsapp/webhook', '/voice/webhook', '/messaging/webhook/inbound']) {
      const res = await appeler('POST', chemin, {}, t)
      expect(res.status).toBe(200)
    }
  })

  test('estPrefixePublic : l’agenda et WhatsApp ne sont plus exemptés en bloc', () => {
    expect(estPrefixePublic('/api/calendar/events')).toBe(false)
    expect(estPrefixePublic('/api/calendar/callback')).toBe(true)
    expect(estPrefixePublic('/api/whatsapp/send')).toBe(false)
    expect(estPrefixePublic('/api/whatsapp/webhook')).toBe(true)
    expect(estPrefixePublic('/api/onboarding/step')).toBe(false)
    // Les exceptions restantes sont toutes des points d'entrée de tiers.
    expect(PREFIXES_PUBLICS).not.toContain('/api/calendar')
    expect(PREFIXES_PUBLICS).not.toContain('/api/whatsapp')
  })
})

describe('onboarding — l’identité du cabinet n’est pas modifiable par un commercial', () => {
  let server
  let origin
  const requetes = []
  let roleCourant = 'owner'
  let utilisateur = { id: 7, userId: 7, role: 'broker' }

  beforeAll(async () => {
    const app = express()
    app.use(express.json())
    app.use('/api/onboarding', (req, _res, next) => { req.user = utilisateur; next() }, onboardingRouter)
    await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve) })
    origin = `http://127.0.0.1:${server.address().port}`
  })

  afterAll(async () => { await new Promise((r) => server.close(r)) })

  beforeEach(() => {
    requetes.length = 0
    roleCourant = 'owner'
    utilisateur = { id: 7, userId: 7, role: 'broker' }
    cabinetMembershipService.ensureUserCabinet.mockImplementation(async () => ({
      cabinet_id: CAB_A, role: roleCourant, cabinet_name: 'Cabinet A', orias_number: '',
    }))
    // La portée d'écriture lit `cabinet_members` : on sert l'appartenance voulue.
    poolModule.query.mockImplementation(async (sql) => {
      const texte = String(sql)
      requetes.push(texte)
      if (texte.includes('cabinet_members')) return { rows: [{ cabinet_id: CAB_A, role: roleCourant }] }
      return { rows: [], rowCount: 1 }
    })
  })

  async function appeler(corps) {
    const res = await fetch(`${origin}/api/onboarding/step`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(corps),
    })
    return { code: res.status, corps: await res.json() }
  }

  test('broker : POST /api/onboarding/step (étape profil) est refusé 403 et n’écrit RIEN', async () => {
    roleCourant = 'broker'
    const { code, corps } = await appeler({ step: 'profile', payload: { cabinet_name: 'Cabinet piraté', orias_number: '99999999', city: 'Lyon' } })
    expect(code).toBe(403)
    expect(corps.error).toBe('forbidden_role')
    // Preuve d'absence d'écriture : aucune requête n'a touché `cabinets`.
    expect(requetes.some((r) => r.includes('UPDATE cabinets'))).toBe(false)
  })

  test('assistant : refusé 403, sans écriture', async () => {
    roleCourant = 'assistant'
    const { code, corps } = await appeler({ step: 'profile', payload: { cabinet_name: 'X' } })
    expect(code).toBe(403)
    // Deux gardes refusent, et c'est voulu (défense en profondeur) : dans
    // l'application complète c'est la garde globale `/api` qui répond en premier
    // (`lecture_seule`) ; ici, la route seule est montée, donc c'est le contrôle
    // de rôle qui parle (`forbidden_role`). Un refus explicite dans les deux cas.
    expect(['lecture_seule', 'forbidden_role']).toContain(corps.error)
    expect(requetes.some((r) => r.includes('UPDATE cabinets'))).toBe(false)
  })

  test('manager : l’étape profil passe et écrit réellement le cabinet', async () => {
    roleCourant = 'manager'
    const { code } = await appeler({ step: 'profile', payload: { cabinet_name: 'Cabinet A', orias_number: '07012345', city: 'Lyon' } })
    expect(code).toBe(200)
    expect(requetes.some((r) => r.includes('UPDATE cabinets'))).toBe(true)
  })

  test('broker : une étape SANS identité de cabinet reste possible (import, google)', async () => {
    roleCourant = 'broker'
    const { code } = await appeler({ step: 'google', payload: {} })
    expect(code).toBe(200)
    expect(requetes.some((r) => r.includes('UPDATE cabinets'))).toBe(false)
  })
})
