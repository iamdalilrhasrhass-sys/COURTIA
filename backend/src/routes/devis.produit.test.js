/**
 * devis.produit.test.js — LE PRODUIT D'UN DEVIS EST UN NOM, PAS UNE STRUCTURE.
 *
 * DÉFAUT MESURÉ (Red Team, 4e passe — 21/09/2026, P3) :
 *   POST /api/devis {"product_type": {"a": 1}}
 *   → 201, et la colonne `quote_requests.product_type` recevait « [object Object] ».
 * Le produit est ensuite affiché dans la liste, les filtres et les exports : une
 * donnée illisible fabriquée par l'API elle-même.
 *
 * CE QUE CE TEST VERROUILLE
 *   1. une structure (objet, tableau, booléen) → 400 `product_type_invalide` ;
 *   2. chaîne vide ou trop longue → 400 ;
 *   3. une chaîne valide (ou un nombre) passe, et c'est bien le texte qui part en
 *      base (jamais « [object Object] ») ;
 *   4. le refus a lieu AVANT toute requête (aucune connexion ouverte pour rien).
 */
jest.mock('../db', () => ({ query: jest.fn() }))
jest.mock('../services/devisRelanceService', () => ({
  scheduleRelancesForDevis: jest.fn(async () => {}),
  cancelPendingRelancesForDevis: jest.fn(async () => {}),
  processDueRelances: jest.fn(async () => ({ sent: 0, not_sent: 0, scanned: 0 })),
}))
jest.mock('../services/emailService', () => ({
  sendCommercialEmail: jest.fn(async () => ({ success: false, skipped: true })),
  sendEmail: jest.fn(async () => ({ success: false, skipped: true })),
}))

const express = require('express')
const pool = require('../db')
const router = require('./devis')

const CAB = 'b723b44c-5a31-4de8-b30c-dd1c76705147'

describe('POST /api/devis — validation du produit', () => {
  let server
  let origin
  /** dernier lot de paramètres envoyé à l'INSERT */
  let dernierInsert = null

  beforeAll(async () => {
    const app = express()
    app.locals.pool = pool
    app.use(express.json())
    app.use((req, _res, next) => { req.user = { id: 165, userId: 165, role: 'owner' }; next() })
    app.use('/api/devis', router)
    await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve) })
    origin = `http://127.0.0.1:${server.address().port}`
  })
  afterAll(async () => { await new Promise((r) => server.close(r)) })

  beforeEach(() => {
    dernierInsert = null
    pool.query.mockReset()
    pool.query.mockImplementation(async (sql, params) => {
      const texte = String(sql)
      if (texte.includes('cabinet_members')) {
        return { rows: [{ cabinet_id: CAB, role: 'owner', retire: false }], rowCount: 1 }
      }
      if (texte.includes('FROM cabinets')) {
        return { rows: [{ id: CAB, name: 'Cabinet QA', country: 'CH', registre_type: 'FINMA' }], rowCount: 1 }
      }
      if (texte.includes('INSERT INTO quote_requests')) {
        dernierInsert = params
        return { rows: [{ id: 4242, product_type: params[3], status: 'draft' }], rowCount: 1 }
      }
      return { rows: [], rowCount: 0 }
    })
  })

  const creer = (charge) => fetch(`${origin}/api/devis`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(charge),
  })

  test.each([
    [{ a: 1 }],
    [[{ a: 1 }]],
    [true],
    ['   '],
    ['x'.repeat(121)],
  ])('produit non exploitable %j → 400, aucune requête émise', async (produit) => {
    const res = await creer({ product_type: produit })
    const corps = await res.json()
    expect(res.status).toBe(400)
    expect(corps.error).toBe('product_type_invalide')
    expect(JSON.stringify(corps)).not.toMatch(/object Object|SQL|syntax/i)
    expect(pool.query).not.toHaveBeenCalled()
    expect(dernierInsert).toBeNull()
  })

  test('produit vide → 400 (refus historique « product_type requis », conservé)', async () => {
    const res = await creer({ product_type: '' })
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('product_type requis')
    expect(pool.query).not.toHaveBeenCalled()
  })

  test('produit absent → 400 (inchangé)', async () => {
    const res = await creer({})
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('product_type requis')
    expect(pool.query).not.toHaveBeenCalled()
  })

  test('produit texte valide → 201 et c’est le TEXTE qui part en base', async () => {
    const res = await creer({ product_type: '  prévoyance  ' })
    expect(res.status).toBe(201)
    expect(dernierInsert[3]).toBe('prévoyance')      // espaces retirés, jamais « [object Object] »
  })
})
