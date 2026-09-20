/**
 * clients.validation.test.js — L'IDENTITÉ D'UN CLIENT EST VALIDÉE, ET LE DOUBLON EST DIT.
 *
 * POURQUOI CE TEST (P3, deuxième QA adverse, 20/09/2026)
 *   POST /api/clients {"nom":"X","prenom":"Y","email":"pas-un-email"} -> 201
 *     (l'e-mail invalide était stocké tel quel)
 *   POST /api/clients {"nom":"X","prenom":"Y","statut":"zzz"}         -> 201
 *     (puis /rapports affichait « zzz 1 (11 %) » : une catégorie qu'aucun écran
 *      n'a jamais proposée devenait une statistique)
 *   Deux POST identiques (même e-mail) créaient DEUX clients : 6 -> 8 en base.
 *
 * Ce test fige la règle :
 *   • e-mail non conforme → 400 `email_invalide`, aucune écriture ;
 *   • statut hors nomenclature → 400 `statut_inconnu` avec la liste admise ;
 *   • même cabinet + même e-mail → 409 `client_deja_existant` (réponse
 *     explicite, avec l'identifiant du dossier existant — pas de blocage muet) ;
 *   • l'e-mail du même e-mail dans un AUTRE cabinet n'est pas un doublon ;
 *   • les valeurs légitimes (prospect / actif / résilié) passent toujours.
 */
jest.mock('../db', () => ({ query: jest.fn() }))
jest.mock('../middleware/planGuard', () => ({
  requireUnderLimit: () => (_req, _res, next) => next(),
  requireFeature: () => (_req, _res, next) => next(),
}))
jest.mock('../middleware/auth', () => ({
  verifyToken: (req, _res, next) => { req.user = { id: 7, userId: 7 }; next() },
  isSessionRevoked: async () => ({ revoked: false }),
}))

const express = require('express')
const poolModule = require('../db')
const router = require('./clients')

const CAB_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'

describe('POST /api/clients — validation et double soumission', () => {
  let server
  let origin
  let requetes
  let existant

  function brancherPool() {
    poolModule.query.mockImplementation(async (sql, params) => {
      requetes.push({ sql: String(sql), params })
      const s = String(sql)
      if (s.includes('cabinet_members')) return { rows: [{ cabinet_id: CAB_A, role: 'broker' }] }
      if (s.includes('lower(email)')) return { rows: existant ? [existant] : [] }
      if (s.includes('INSERT INTO clients')) return { rows: [{ id: 900, cabinet_id: CAB_A }], rowCount: 1 }
      return { rows: [], rowCount: 0 }
    })
  }

  beforeAll(async () => {
    const app = express()
    app.locals.pool = poolModule
    app.use(express.json())
    // Le routeur est monté derrière `verifyToken` en production : ici
    // l'utilisateur est posé directement (même convention que
    // clients.cabinet.test.js).
    app.use((req, _res, next) => { req.user = { id: 7, userId: 7 }; next() })
    app.use('/api/clients', router)
    await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve) })
    origin = `http://127.0.0.1:${server.address().port}`
  })
  afterAll(async () => { await new Promise((r) => server.close(r)) })

  beforeEach(() => {
    requetes = []
    existant = null
    poolModule.query.mockReset()
    brancherPool()
  })

  const creer = (corps) => fetch(`${origin}/api/clients/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corps),
  })

  const insertions = () => requetes.filter((r) => r.sql.includes('INSERT INTO clients'))

  test('e-mail invalide : 400 email_invalide, aucune écriture', async () => {
    const res = await creer({ nom: 'X', prenom: 'Y', email: 'pas-un-email' })
    expect(res.status).toBe(400)
    const corps = await res.json()
    expect(corps.error).toBe('email_invalide')
    expect(corps.champs).toEqual(['email'])
    expect(insertions()).toHaveLength(0)
  })

  test('statut inconnu : 400 statut_inconnu avec la nomenclature', async () => {
    const res = await creer({ nom: 'X', prenom: 'Y', statut: 'zzz' })
    expect(res.status).toBe(400)
    const corps = await res.json()
    expect(corps.error).toBe('statut_inconnu')
    expect(corps.statuts_acceptes).toContain('prospect')
    expect(corps.statuts_acceptes).toContain('resilie')
    expect(insertions()).toHaveLength(0)
  })

  test('double soumission identique (même cabinet + même e-mail) : 409 explicite', async () => {
    existant = { id: 157, first_name: 'Test', last_name: 'DoubleSoumission' }
    const res = await creer({ nom: 'DoubleSoumission', prenom: 'Test', email: 'double@rt2.test' })
    expect(res.status).toBe(409)
    const corps = await res.json()
    expect(corps.error).toBe('client_deja_existant')
    expect(corps.client_id).toBe(157)
    expect(corps.message).toContain('double@rt2.test')
    expect(insertions()).toHaveLength(0)
  })

  test('la garde anti-doublon regarde le CABINET (jamais l’adresse seule)', async () => {
    await creer({ nom: 'X', prenom: 'Y', email: 'partage@rt2.test' })
    const garde = requetes.find((r) => r.sql.includes('lower(email)'))
    expect(garde.sql).toContain('cabinet_id IS NOT DISTINCT FROM $2')
    expect(garde.params[1]).toBe(CAB_A)
  })

  test.each([
    ['prospect'],
    ['actif'],
    ['résilié'],
    ['inactif'],
  ])('statut de la nomenclature « %s » : 201', async (statut) => {
    const res = await creer({ nom: 'X', prenom: 'Y', statut })
    expect(res.status).toBe(201)
    expect(insertions()).toHaveLength(1)
  })

  test('e-mail légitime : 201 (aucun faux refus)', async () => {
    const res = await creer({ nom: 'X', prenom: 'Y', email: 'lea.dupont+assurance@courtia-qa.test' })
    expect(res.status).toBe(201)
    expect(insertions()[0].params[2]).toBe('lea.dupont+assurance@courtia-qa.test')
  })

  test('PUT /api/clients/:id : mêmes refus (le défaut ne se rouvre pas par la modification)', async () => {
    const res = await fetch(`${origin}/api/clients/12`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prenom: 'Y', nom: 'X', statut: 'zzz' }),
    })
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('statut_inconnu')
  })
})
