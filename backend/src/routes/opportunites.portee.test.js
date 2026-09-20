/**
 * opportunites.portee.test.js — L'ÉCRAN DE DÉTAIL D'UNE OPPORTUNITÉ FONCTIONNE
 * DANS SON PROPRE CABINET, ET NULLE PART AILLEURS (défaut D3-03, P2 — troisième
 * QA adverse, mesuré le 20/09/2026).
 *
 * DÉFAUT MESURÉ : la portée était construite sur `clients.cabinet_id` /
 * `clients.courtier_id` alors que la requête joint `clients c`. PostgreSQL
 * refusait la requête et le cabinet PROPRIÉTAIRE recevait
 *   500 {"error":"Erreur serveur","details":"invalid reference to FROM-clause
 *        entry for table \"clients\""}
 * soit (1) un écran de détail cassé POUR TOUT LE MONDE, (2) le message brut du
 * moteur SQL recopié au navigateur.
 *
 * CE QUE CE TEST FIGE
 *   1. cabinet propriétaire (oui), collaborateur du cabinet (oui) → 200 ;
 *   2. cabinet ÉTRANGER → 404, aucune donnée métier ;
 *   3. la clause de portée vise l'ALIAS réellement joint (`c`) — jamais le nom
 *      de table quand la requête l'alias ;
 *   4. aucune réponse ne contient le message du moteur, un nom de table ou un
 *      fragment SQL (`details` a disparu) ;
 *   5. une panne de base répond 500 avec un message PRODUIT.
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

const express = require('express')
const pool = require('../db')
const router = require('./opportunites')

const CAB_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const CAB_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'

const OPPORTUNITE = {
  id: 1,
  client_id: 148,
  type: 'cross_sell',
  product_target: 'MRH',
  score: 80,
  status: 'detected',
  reasoning: 'analyse',
  metadata: {},
}

describe('GET /api/opportunites/:id — portée cabinet et aucune erreur de moteur (D3-03)', () => {
  let server
  let origin
  let requetes
  let appartenances
  let cabinetDeLOpportunite

  function brancherPool() {
    pool.query.mockImplementation(async (sql, params) => {
      requetes.push({ sql: String(sql), params })
      const s = String(sql)
      if (s.includes('cabinet_members')) return { rows: appartenances }
      if (/FROM opportunites o/.test(s)) {
        // Portée révoquée : la clause est FAUSSE par construction (aucune ligne).
        if (s.includes('AND FALSE')) return { rows: [] }
        const dansLaPortee = s.includes('o.cabinet_id = ANY($2::uuid[])')
          ? (params[1] || []).includes(cabinetDeLOpportunite)
          : true
        return { rows: dansLaPortee ? [OPPORTUNITE] : [] }
      }
      if (/FROM quotes q/.test(s)) {
        if (s.includes('AND FALSE')) return { rows: [] }
        return { rows: [] }
      }
      return { rows: [] }
    })
  }

  beforeAll(async () => {
    const app = express()
    app.locals.pool = pool
    app.use(express.json())
    // `opportunites.js` ne porte PAS ses gardes d'authentification : c'est
    // `server.js` qui monte `verifyToken` sur le préfixe. On le reproduit ici.
    app.use('/api/opportunites', (req, _res, next) => {
      const id = Number(req.headers['x-test-user'] || 140)
      req.user = { id, userId: id }
      next()
    }, router)
    await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve) })
    origin = `http://127.0.0.1:${server.address().port}`
  })
  afterAll(async () => { await new Promise((r) => server.close(r)) })

  beforeEach(() => {
    requetes = []
    appartenances = [{ cabinet_id: CAB_A, role: 'broker', retire: false }]
    cabinetDeLOpportunite = CAB_A
    pool.query.mockReset()
    brancherPool()
  })

  const appeler = (id = 1, userId = 140) => fetch(`${origin}/api/opportunites/${id}`, {
    headers: { 'x-test-user': String(userId) },
  })

  test('le cabinet propriétaire obtient 200 (l’écran de détail fonctionne)', async () => {
    const res = await appeler()
    expect(res.status).toBe(200)
    const corps = await res.json()
    expect(corps.opportunite.id).toBe(1)
    expect(corps.opportunite.client_id).toBe(148)
  })

  test('un COLLABORATEUR du même cabinet obtient 200 (portée cabinet, pas mono)', async () => {
    const res = await appeler(1, 146)
    expect(res.status).toBe(200)
  })

  test('la portée vise l’ALIAS joint (`c`), jamais `clients.` sur une table aliasée', async () => {
    await appeler()
    const jointures = requetes.filter((r) => /FROM quotes q/.test(r.sql))
    expect(jointures.length).toBeGreaterThan(0)
    for (const requete of jointures) {
      // C'est le défaut D3-03 : `clients.cabinet_id` alors que la requête joint
      // `clients c` => PostgreSQL refuse la requête (500 pour tout le monde).
      expect(requete.sql).toContain('c.cabinet_id = ANY(')
      expect(requete.sql).not.toMatch(/JOIN clients c[\s\S]*clients\.cabinet_id/)
    }
    const principale = requetes.find((r) => /FROM opportunites o/.test(r.sql))
    expect(principale.sql).toContain('o.cabinet_id = ANY(')
  })

  test('cabinet ÉTRANGER : 404, sans contenu métier', async () => {
    cabinetDeLOpportunite = CAB_B
    const res = await appeler()
    expect(res.status).toBe(404)
    const texte = await res.text()
    expect(texte).not.toContain('cross_sell')
    expect(texte).not.toContain('MRH')
  })

  test('aucune réponse ne contient de message de moteur ni de `details`', async () => {
    for (const cab of [CAB_A, CAB_B]) {
      cabinetDeLOpportunite = cab
      const res = await appeler()
      const texte = await res.text()
      for (const interdit of ['details', 'FROM-clause', 'SELECT', 'relation', 'from opportunites']) {
        expect({ cab, interdit, present: texte.includes(interdit) }).toEqual({ cab, interdit, present: false })
      }
    }
  })

  test('panne de base : 500 avec message PRODUIT, jamais le message du moteur', async () => {
    pool.query.mockImplementation(async (sql) => {
      if (String(sql).includes('cabinet_members')) return { rows: appartenances }
      if (/FROM opportunites o/.test(String(sql))) {
        throw new Error('invalid reference to FROM-clause entry for table "clients"')
      }
      return { rows: [] }
    })
    const res = await appeler()
    expect(res.status).toBe(500)
    const texte = await res.text()
    expect(texte).not.toMatch(/FROM-clause/i)
    expect(texte).not.toContain('clients')
    expect(texte).not.toContain('details')
  })

  test('un compte sans droit (appartenance révoquée) ne voit AUCUNE opportunité', async () => {
    appartenances = [{ cabinet_id: CAB_A, role: 'broker', retire: true }]
    const res = await appeler()
    expect(res.status).toBe(404)
  })
})
