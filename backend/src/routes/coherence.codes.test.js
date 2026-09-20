/**
 * coherence.codes.test.js — LES CODES DE RÉPONSE SONT COHÉRENTS D'UN BOUT À
 * L'AUTRE DU PRODUIT (défauts D3-06 et D3-07, troisième QA adverse, 20/09/2026).
 *
 *   * D3-06 — `GET /api/accounting/fec` répondait 501 à un cabinet suisse, alors
 *     que DEUX autres routes du même genre avaient été ramenées à 403
 *     `fonctionnalite_non_souscrite`. Un 501 sur un point d'entrée du produit
 *     compte comme une erreur serveur : ici la fonctionnalité existe, elle n'est
 *     pas souscrite pour ce marché. (Le contrat FEC lui-même est figé par
 *     `accounting.marche.test.js` ; ce fichier vérifie qu'AUCUN corps d'erreur ne
 *     fuit de détail technique au passage.)
 *
 *   * D3-07 — `POST /api/billing/webhook` (et ses trois alias) répondait
 *     200 `{"received":true,"note":"stripe_not_configured"}` sans RIEN traiter :
 *     un « succès » pour une opération qui n'a pas eu lieu, et Stripe ne
 *     réessaiera jamais. Règle tenue : tant que le secret n'est pas configuré,
 *     le point d'entrée est FERMÉ → 503 `secret_non_configure`, comme les autres
 *     webhooks du produit (WhatsApp, messagerie entrante, signatures).
 */
jest.mock('../db', () => ({ query: jest.fn() }))
jest.mock('../middleware/auth', () => ({
  verifyToken: (req, _res, next) => { req.user = { id: 140, userId: 140 }; next() },
  isSessionRevoked: async () => ({ revoked: false }),
}))
jest.mock('../services/stripeService', () => ({
  isConfigured: jest.fn(() => false),
  constructWebhookEvent: jest.fn(),
  createCheckoutSession: jest.fn(),
  createPortalSession: jest.fn(),
}))
jest.mock('../services/billingService', () => ({
  ensureBillingFoundation: jest.fn(async () => ({})),
  TRIAL_DAYS: 14,
}))
jest.mock('../services/billingWebhookService', () => ({
  insertStripePaymentEventIfNew: jest.fn(async () => ({})),
  handleStripeEvent: jest.fn(async () => ({})),
}))
jest.mock('../services/emailService', () => ({ sendBillingEmail: jest.fn(async () => ({})) }))
jest.mock('../services/analyticsService', () => ({ trackEvent: jest.fn(async () => ({})) }))
jest.mock('../services/legalAcceptanceService', () => ({ recordAcceptance: jest.fn(async () => ({})) }))
jest.mock('../services/planService', () => ({ getUserPlanInfo: jest.fn(async () => ({ plan: 'elite' })) }))

const express = require('express')
const stripeService = require('../services/stripeService')
const billingService = require('../services/billingService')
const router = require('./billing')

describe('webhook de facturation non configuré : 503, jamais un faux succès (D3-07)', () => {
  let server
  let origin

  beforeAll(async () => {
    const app = express()
    app.locals.pool = require('../db')
    app.use(express.json({ verify: (req, _res, buf) => { req.rawBody = buf } }))
    app.use('/api/billing', router)
    app.use('/api/stripe', router) // alias historiques : le MÊME routeur
    await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve) })
    origin = `http://127.0.0.1:${server.address().port}`
  })
  afterAll(async () => { await new Promise((r) => server.close(r)) })

  beforeEach(() => {
    stripeService.isConfigured.mockReturnValue(false)
    billingService.ensureBillingFoundation.mockClear()
  })

  const CHEMINS = [
    '/api/billing/webhook',
    '/api/billing/stripe-webhook',
    '/api/stripe/webhook',
    '/api/stripe/stripe-webhook',
  ]

  test('les quatre chemins répondent 503 secret_non_configure, sans « received: true »', async () => {
    for (const chemin of CHEMINS) {
      const res = await fetch(origin + chemin, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'stripe-signature': 't=1,v1=bidon' },
        body: JSON.stringify({ id: 'evt_test', type: 'invoice.paid' }),
      })
      expect({ chemin, code: res.status }).toEqual({ chemin, code: 503 })
      const corps = await res.json()
      expect(corps.error).toBe('secret_non_configure')
      expect(corps.code).toBe('stripe_webhook_secret')
      expect(corps.received).toBeUndefined()
      expect(JSON.stringify(corps)).not.toContain('stripe_not_configured')
      // Message produit, aucun détail de fournisseur ni de configuration interne.
      expect(String(corps.message)).toMatch(/n’est pas configurée|n'est pas configurée/)
      for (const interdit of ['sk_', 'whsec_', 'stack', 'ENOENT', '/opt/']) {
        expect({ chemin, interdit, present: JSON.stringify(corps).includes(interdit) })
          .toEqual({ chemin, interdit, present: false })
      }
    }
  })

  test('aucune signature, aucun jeton : le webhook reste fermé (pas de contournement)', async () => {
    const res = await fetch(`${origin}/api/billing/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(503)
  })

  test('webhook CONFIGURÉ : la route reprend son cours (signature manquante → 400)', async () => {
    stripeService.isConfigured.mockReturnValue(true)
    const res = await fetch(`${origin}/api/billing/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'evt_test' }),
    })
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('missing_signature')
  })
})
