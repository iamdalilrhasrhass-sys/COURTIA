/**
 * gardeEcritureRole.billing.test.js — LA FACTURATION N'EST PLUS UNE ZONE FRANCHE.
 *
 * POURQUOI CE TEST (P1, mesuré en production le 20/09/2026 — deuxième QA adverse)
 * Un compte de cabinet en LECTURE SEULE (`assistant`) modifiait l'IDENTITÉ DE
 * FACTURATION du cabinet : `POST /api/billing/onboarding` répondait 200 et
 * `organization_profiles` était réécrit (nom, forme juridique, SIRET, ORIAS,
 * adresse, signataire légal). Cause : `/api/billing` ET `/api/stripe` figuraient
 * EN ENTIER dans `PREFIXES_PUBLICS` — et `/api/stripe` est le MÊME routeur que
 * `/api/billing` (`routes/stripe.js` réexporte `routes/billing.js`).
 *
 * Ce test fige la règle :
 *   1. les QUATRE chemins de webhook de facturation restent publics (Stripe les
 *      appelle sans jeton utilisateur) ;
 *   2. AUCUN autre chemin de facturation n'est public — la liste est vérifiée
 *      par énumération de `PREFIXES_PUBLICS`, donc une réintroduction de
 *      `/api/billing` ferait échouer le test ;
 *   3. un `assistant` reçoit 403 `lecture_seule` sur les écritures de facturation
 *      et la requête n'atteint JAMAIS la route (aucune écriture en base) ;
 *   4. un `owner` passe (le parcours de paiement du cabinet reste possible).
 */
jest.mock('../db', () => ({ query: jest.fn() }))

const express = require('express')
const jwt = require('jsonwebtoken')
const { getJwtSecret } = require('../utils/jwtSecret')
const {
  creerGardeEcritureRole,
  estPrefixePublic,
  PREFIXES_PUBLICS,
} = require('./gardeEcritureRole')

const CAB_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'

function poolAvec(appartenances) {
  return {
    async query(sql) {
      if (String(sql).includes('cabinet_members')) return { rows: appartenances }
      return { rows: [] }
    },
  }
}

function jeton(payload) {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '1h' })
}

/** Écritures de facturation relevées en production (dont celle qui a fuité). */
const ECRITURES_FACTURATION = [
  '/api/billing/onboarding',
  '/api/billing/legal-acceptance',
  '/api/billing/checkout',
  '/api/billing/checkout-session',
  '/api/billing/create-checkout-session',
  '/api/billing/portal',
  '/api/billing/portal-session',
  '/api/billing/create-portal-session',
  '/api/billing/cancel-trial',
  '/api/stripe/create-checkout-session',
]

const WEBHOOKS_PUBLICS = [
  '/api/billing/webhook',
  '/api/billing/stripe-webhook',
  '/api/stripe/webhook',
  '/api/stripe/stripe-webhook',
]

describe('PREFIXES_PUBLICS — la facturation n’est plus exemptée en bloc', () => {
  test('les quatre webhooks de facturation sont publics', () => {
    for (const chemin of WEBHOOKS_PUBLICS) {
      expect(estPrefixePublic(chemin)).toBe(true)
    }
  })

  test('aucune FAMILLE de facturation n’est publique', () => {
    expect(PREFIXES_PUBLICS).not.toContain('/api/billing')
    expect(PREFIXES_PUBLICS).not.toContain('/api/stripe')
    expect(estPrefixePublic('/api/billing')).toBe(false)
    expect(estPrefixePublic('/api/stripe')).toBe(false)
  })

  test.each(ECRITURES_FACTURATION)('%s n’est PAS un point d’entrée public', (chemin) => {
    expect(estPrefixePublic(chemin)).toBe(false)
  })
})

describe('garde d’écriture — facturation', () => {
  let server
  let origin
  let appartenances = []
  let routesAtteintes = []

  beforeAll(async () => {
    const app = express()
    app.use(express.json())
    app.use('/api', (req, _res, next) => { req.__pool = poolAvec(appartenances); next() })
    app.use('/api', (req, res, next) => creerGardeEcritureRole(req.__pool)(req, res, next))
    app.use('/api', (req, res) => {
      routesAtteintes.push(`${req.method} ${req.path}`)
      res.json({ ok: true, atteint: true })
    })
    await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve) })
    origin = `http://127.0.0.1:${server.address().port}`
  })

  afterAll(async () => { await new Promise((r) => server.close(r)) })

  beforeEach(() => {
    routesAtteintes = []
    appartenances = []
  })

  const appeler = (methode, chemin, corps, entete) => fetch(`${origin}${chemin}`, {
    method: methode,
    headers: {
      'Content-Type': 'application/json',
      ...(entete ? { Authorization: `Bearer ${entete}` } : {}),
    },
    body: corps ? JSON.stringify(corps) : undefined,
  })

  test.each(ECRITURES_FACTURATION)(
    'assistant : POST %s → 403 lecture_seule, et RIEN n’est écrit',
    async (chemin) => {
      appartenances = [{ cabinet_id: CAB_A, role: 'assistant' }]
      const res = await appeler('POST', chemin, { cabinet_name: 'PIRATE SARL' },
        jeton({ id: 7, userId: 7, role: 'broker' }))
      const corps = await res.json()
      expect(res.status).toBe(403)
      expect(corps.error).toBe('lecture_seule')
      expect(corps.message).toMatch(/lecture/i)
      // La route de facturation n'a JAMAIS été atteinte : aucune écriture possible.
      expect(routesAtteintes).toHaveLength(0)
    }
  )

  test.each([
    ['assistant'],
    ['viewer'],
  ])('rôle %s : /api/billing/onboarding reste refusé', async (role) => {
    appartenances = [{ cabinet_id: CAB_A, role }]
    const res = await appeler('POST', '/api/billing/onboarding', {}, jeton({ id: 7, userId: 7 }))
    expect(res.status).toBe(403)
    expect(routesAtteintes).toHaveLength(0)
  })

  test('owner : le parcours de facturation du cabinet reste accessible', async () => {
    appartenances = [{ cabinet_id: CAB_A, role: 'owner' }]
    const res = await appeler('POST', '/api/billing/onboarding', { cabinet_name: 'Helvetia' },
      jeton({ id: 7, userId: 7 }))
    expect(res.status).toBe(200)
    // `req.path` est relatif au point de montage ('/api').
    expect(routesAtteintes).toEqual(['POST /billing/onboarding'])
  })

  test('compte SANS cabinet : comportement historique inchangé (il écrit)', async () => {
    appartenances = []
    const res = await appeler('POST', '/api/billing/onboarding', {}, jeton({ id: 9, userId: 9 }))
    expect(res.status).toBe(200)
  })

  test('le webhook Stripe n’est jamais bloqué par un rôle de cabinet', async () => {
    appartenances = [{ cabinet_id: CAB_A, role: 'assistant' }]
    const res = await appeler('POST', '/api/stripe/webhook', { type: 'invoice.paid' })
    expect(res.status).toBe(200)
    expect(routesAtteintes).toEqual(['POST /stripe/webhook'])
  })

  test('la lecture de la grille d’abonnement reste ouverte au rôle en lecture seule', async () => {
    appartenances = [{ cabinet_id: CAB_A, role: 'assistant' }]
    const res = await appeler('GET', '/api/billing/plans', null, jeton({ id: 7, userId: 7 }))
    expect(res.status).toBe(200)
  })
})
