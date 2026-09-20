/**
 * documents.generate-offre.test.js — LE MESSAGE D'ERREUR ET L'API DISENT LA MÊME CHOSE.
 *
 * POURQUOI CE TEST (P3 « D2-18 », deuxième QA adverse, 20/09/2026)
 *   POST /api/documents/generate {"type":"proposition_commerciale","client_id":148,
 *                                 "produit":"Habitation","prime_annuelle":1450.5}
 *   -> 400 {"error":"offre_manquante","champs_attendus":["produit","prime_annuelle",…]}
 * Un appel STRICTEMENT conforme au message (« produit », « prime annuelle »…
 * annoncés à la racine) échouait, parce que la route ne lisait ces champs que
 * sous `data`. Le défaut était signalé par les deux QA.
 *
 * Ce test fige la règle :
 *   • les champs d'offre sont acceptés À LA RACINE et SOUS `data` ;
 *   • sans aucun élément d'offre, le refus est explicite et dit où les mettre ;
 *   • ce qui est enregistré et imprimé est l'offre réellement reçue.
 */
jest.mock('../db', () => ({ query: jest.fn() }))
jest.mock('../middleware/auth', () => ({
  verifyToken: (req, _res, next) => { req.user = { id: 11, userId: 11 }; next(); },
}))
jest.mock('../middleware/planGuard', () => ({
  requireUnderLimit: () => (_req, _res, next) => next(),
  requireFeature: () => (_req, _res, next) => next(),
}))

const express = require('express')
const pool = require('../db')
const router = require('./documents')

describe('POST /api/documents/generate — emplacement des champs d’offre', () => {
  let server
  let origin

  function mockSql(demandes = {}) {
    pool.query.mockImplementation(async (sql) => {
      const texte = String(sql)
      for (const [motif, reponse] of Object.entries(demandes)) {
        if (texte.includes(motif)) return typeof reponse === 'function' ? reponse(texte) : reponse
      }
      return { rows: [], rowCount: 0 }
    })
  }

  beforeAll(async () => {
    const app = express()
    app.locals.pool = pool
    app.use(express.json())
    app.use('/api/documents', router)
    await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve) })
    origin = `http://127.0.0.1:${server.address().port}`
  })
  afterAll(async () => { await new Promise((r) => server.close(r)) })
  beforeEach(() => pool.query.mockReset())

  const generer = (corps) => fetch(`${origin}/api/documents/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corps),
  })

  function pretPourGeneration() {
    mockSql({
      cabinet_members: { rows: [] },
      'FROM clients': { rows: [{ id: 20, first_name: 'Léa', last_name: 'Dupont' }] },
      'FROM users': { rows: [{ first_name: 'Dalil', last_name: 'R', orias_number: '07000000' }] },
      'INSERT INTO generated_documents': { rows: [{ id: 7, template_id: 'doc_1', created_at: new Date().toISOString() }] },
    })
  }

  test('offre À LA RACINE (le message d’erreur est honoré) : le document est produit', async () => {
    pretPourGeneration()
    const res = await generer({
      type: 'proposition_commerciale', client_id: 20,
      produit: 'Habitation', prime_annuelle: 1450.5,
    })
    expect(res.status).toBe(201)
    const insert = pool.query.mock.calls.find(([sql]) => String(sql).includes('INSERT INTO generated_documents'))
    expect(insert[1][5]).toContain('Habitation')
    expect(insert[1][5]).toContain('1450.5')
  })

  test('offre SOUS `data` : toujours acceptée (aucune régression)', async () => {
    pretPourGeneration()
    const res = await generer({
      type: 'proposition_commerciale', client_id: 20,
      data: { produit: 'Habitation', prime_annuelle: 1450.5 },
    })
    expect(res.status).toBe(201)
  })

  test('aucune offre : 400 explicite qui nomme les DEUX emplacements acceptés', async () => {
    pretPourGeneration()
    const res = await generer({ type: 'proposition_commerciale', client_id: 20 })
    expect(res.status).toBe(400)
    const corps = await res.json()
    expect(corps.error).toBe('offre_manquante')
    expect(corps.emplacements_acceptes).toEqual(['racine', 'data'])
    expect(corps.message).toMatch(/racine/)
    expect(corps.message).toMatch(/data/)
    // Rien n'est enregistré pour une offre vide.
    expect(pool.query.mock.calls.some(([sql]) => String(sql).includes('INSERT INTO generated_documents'))).toBe(false)
  })

  test('un élément d’offre suffit (racine complète `data`)', async () => {
    pretPourGeneration()
    const res = await generer({
      type: 'proposition_commerciale', client_id: 20,
      data: { garanties: ['Vol', 'Incendie'] },
    })
    expect(res.status).toBe(201)
  })

  test('client hors portée : 404 (jamais un 500)', async () => {
    mockSql({ cabinet_members: { rows: [] }, 'FROM clients': { rows: [] } })
    const res = await generer({
      type: 'proposition_commerciale', client_id: 999999,
      data: { produit: 'Habitation' },
    })
    expect(res.status).toBe(404)
  })
})
