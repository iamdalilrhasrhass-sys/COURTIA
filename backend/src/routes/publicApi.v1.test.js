/**
 * publicApi.v1.test.js — L'API PUBLIQUE v1 RÉPOND JUSTE.
 *
 * POURQUOI CE TEST : mesuré en production le 20/09/2026 (Red Team P2 #5) :
 *   * GET /api/v1/me        → `cabinet_name: null` ;
 *   * GET /api/v1/clients   → `total: 0` alors que le cabinet a des clients
 *     (filtre sur `clients.user_id`, colonne jamais renseignée) ;
 *   * GET /api/v1/contracts → 500 `column ct.product_type does not exist` ;
 *   * GET /api/v1/commissions → 500 `column cm.amount_cents does not exist`.
 *
 * Ce test n'appelle pas une base : il inspecte les requêtes réellement émises.
 * Il fige trois propriétés :
 *   1. la portée est celle du CABINET (`courtier_id` / `cabinet_id`), jamais
 *      `user_id` ;
 *   2. aucune colonne imaginaire n'est citée (`product_type`, `amount_cents`,
 *      `period_start`, `ct.company`…) ;
 *   3. les réponses portent les données réellement renvoyées par la base, et un
 *      cabinet sans donnée reçoit 200 avec des listes vides (pas un 500).
 */
jest.mock('../db', () => ({ query: jest.fn() }))
// L'authentification par clé d'API est remplacée : ce test porte sur la REQUÊTE
// et la RÉPONSE, pas sur la validation de clé (déjà éprouvée en production).
jest.mock('../middleware/apiKeyAuth', () => ({
  apiKeyAuth: () => (req, _res, next) => {
    req.user = { id: 7, userId: 7, email: 'audit@courtia-qa.test' }
    req.apiKey = { id: 1, name: 'test', scopes: ['read:clients', 'read:contracts', 'read:commissions', 'write:webhooks'] }
    next()
  },
  requireScope: () => (_req, _res, next) => next(),
}))

const express = require('express')
const pool = require('../db')
const router = require('./publicApi')

const CAB_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'

describe('API publique v1', () => {
  let server
  let origin
  const requetes = []
  let appartenances = [{ cabinet_id: CAB_A, role: 'owner' }]
  let repondre = () => ({ rows: [] })

  beforeAll(async () => {
    const app = express()
    app.use(express.json())
    app.use('/api/v1', router)
    await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve) })
    origin = `http://127.0.0.1:${server.address().port}`
  })

  afterAll(async () => { await new Promise((r) => server.close(r)) })

  beforeEach(() => {
    requetes.length = 0
    appartenances = [{ cabinet_id: CAB_A, role: 'owner' }]
    repondre = () => ({ rows: [] })
    pool.query.mockReset()
    pool.query.mockImplementation(async (sql, params) => {
      const texte = String(sql)
      requetes.push({ sql: texte, params })
      // La requête de PORTÉE est reconnue précisément : la route /me cite elle
      // aussi `cabinet_members` (pour retrouver le nom du cabinet).
      if (/SELECT cm\.cabinet_id, cm\.role/.test(texte)) return { rows: appartenances }
      return repondre(texte, params)
    })
  })

  const dernier = (motif) => requetes.filter(({ sql }) => motif.test(sql)).pop()

  test('GET /clients filtre sur le CABINET et renvoie les clients réellement lus', async () => {
    repondre = (texte) => {
      if (/COUNT\(\*\)/i.test(texte)) return { rows: [{ total: 2 }] }
      return { rows: [{ id: 1, first_name: 'Élise', last_name: "Müller-d'Arc" }] }
    }
    const res = await fetch(`${origin}/api/v1/clients`)
    const corps = await res.json()
    expect(res.status).toBe(200)
    expect(corps.pagination.total).toBe(2)
    expect(corps.data).toHaveLength(1)
    expect(corps.scope).toBe('cabinet')

    const liste = dernier(/FROM clients/)
    expect(liste.sql).not.toMatch(/clients\.user_id/)
    expect(liste.sql).toMatch(/clients\.cabinet_id/)
    // Le fragment de portée passe le tableau des cabinets du porteur.
    expect(JSON.stringify(liste.params)).toContain(CAB_A)
  })

  test('GET /clients/:id : identifiant non numérique = 404 sans requête SQL', async () => {
    const avant = requetes.length
    const res = await fetch(`${origin}/api/v1/clients/abc`)
    expect(res.status).toBe(404)
    expect(requetes.length).toBe(avant)
  })

  test('GET /contracts lit `quotes.quote_data` — jamais une colonne imaginaire', async () => {
    repondre = (texte) => (/COUNT\(\*\)/i.test(texte) ? { rows: [{ total: 3 }] } : { rows: [{ id: 9, contract_number: 'POL-1' }] })
    const res = await fetch(`${origin}/api/v1/contracts`)
    const corps = await res.json()
    expect(res.status).toBe(200)
    expect(corps.pagination.total).toBe(3)

    const sql = dernier(/q\.quote_data->>'numero' AS contract_number/)
    expect(sql).toBeDefined()
    expect(sql.sql).not.toMatch(/product_type|contracts ct|ct\.company/)
    expect(sql.sql).toMatch(/q\.quote_data->>'numero'/)
    expect(sql.sql).toMatch(/q\.quote_data->>'prime_annuelle'/)
    expect(sql.sql).toMatch(/c\.courtier_id/)
  })

  test('GET /commissions utilise les colonnes réelles (pas `amount_cents`)', async () => {
    repondre = (texte) => (/COUNT\(\*\)|SUM\(/i.test(texte)
      ? { rows: [{ expected_cents: 18131, received_cents: 0, total: 1 }] }
      : { rows: [{ id: 4, expected_amount_cents: 18131, received_amount_cents: 0, period_year: 2026, period_month: 9 }] })
    const res = await fetch(`${origin}/api/v1/commissions`)
    const corps = await res.json()
    expect(res.status).toBe(200)
    // La valeur servie est celle de la base, convertie en unité monétaire.
    expect(corps.data[0].expected_amount).toBeCloseTo(181.31)
    expect(corps.summary.received_amount).toBe(0)

    const sql = dernier(/FROM commissions cm/)
    // `amount_cents` seule (sans préfixe) n'existe pas : \b ne matche pas
    // « expected_amount_cents » (underscore = caractère de mot).
    expect(sql.sql).not.toMatch(/\bamount_cents\b/)
    expect(sql.sql).not.toMatch(/period_start|period_end/)
    expect(sql.sql).toMatch(/expected_amount_cents/)
    expect(sql.sql).toMatch(/cm\.cabinet_id/)
  })

  test('GET /me renvoie le nom du cabinet depuis la source réellement remplie', async () => {
    repondre = (texte) => (/FROM users u/i.test(texte)
      ? { rows: [{ id: 7, email: 'audit@courtia-qa.test', cabinet_name: 'Cabinet Audit', pays: 'FR', registre_type: 'ORIAS', registre_numero: '07000000' }] }
      : { rows: [] })
    const res = await fetch(`${origin}/api/v1/me`)
    const corps = await res.json()
    expect(res.status).toBe(200)
    expect(corps.cabinet_name).toBe('Cabinet Audit')
    expect(corps.registre_type).toBe('ORIAS')

    const sql = dernier(/FROM users u/)
    // Le nom est cherché dans TOUTES les sources réelles, pas seulement dans
    // `users.cabinet_name` (colonne vide pour la plupart des comptes).
    expect(sql.sql).toMatch(/broker_profiles/)
    expect(sql.sql).toMatch(/cabinets/)
    expect(sql.sql).toMatch(/COALESCE/)
  })

  test('un cabinet sans donnée reçoit 200 avec des listes vides (jamais un 500)', async () => {
    const res = await fetch(`${origin}/api/v1/commissions`)
    expect(res.status).toBe(200)
    const corps = await res.json()
    expect(corps.data).toEqual([])
    expect(corps.summary.expected_amount).toBe(0)
  })
})
