/**
 * erreursEntree.test.js — une entrée invalide ne produit plus un 500 SQL.
 *
 * POURQUOI CE TEST : quatre appels ordinaires mesurés en production le
 * 20/09/2026 (Red Team P1 #4) répondaient 500 avec le message brut de
 * PostgreSQL. Ce test fige trois propriétés :
 *   1. les quatre messages mesurés sont reconnus et traduits en 400 avec un
 *      message PRODUIT (aucun nom de colonne, de type ou de contrainte) ;
 *   2. le middleware réécrit réellement une réponse 5xx en 400 sur le fil HTTP ;
 *   3. une VRAIE erreur serveur (colonne inexistante, panne) reste un 500 : le
 *      filet ne doit pas transformer un bug en « faute de l'utilisateur ».
 */
const express = require('express')
const { analyserErreurEntree, traduireErreursEntree } = require('./erreursEntree')

const MESSAGES_MESURES = [
  // POST /api/clients avec un nom de 2 500 caractères
  'value too long for type character varying(100)',
  // GET /api/clients/abc
  'invalid input syntax for type integer: "abc"',
  // POST /api/taches {"echeance":"2026-02-31T99:99:99Z"}
  'date/time field value out of range: "2026-02-31T99:99:99Z"',
  // POST /api/accounting/entries (montant NaN)
  'invalid input syntax for type integer: "NaN"',
]

const FUITE_INTERDITE = /character varying|invalid input syntax|violates |constraint|column "|does not exist|NaN/i

describe('analyserErreurEntree — reconnaissance des erreurs d’entrée', () => {
  test.each(MESSAGES_MESURES)('« %s » devient un 400 avec un message produit', (message) => {
    const analyse = analyserErreurEntree({ message })
    expect(analyse).not.toBeNull()
    expect(analyse.statusHttp).toBe(400)
    expect(analyse.message.length).toBeGreaterThan(10)
    expect(analyse.message).not.toMatch(FUITE_INTERDITE)
  })

  test('le code SQLSTATE prime sur le texte (base non anglophone, message enveloppé)', () => {
    const analyse = analyserErreurEntree({ code: '22001', message: 'erreur traduite côté service' })
    expect(analyse.statusHttp).toBe(400)
    expect(analyse.message).toMatch(/longueur/i)
  })

  test('une violation d’unicité ou de clé étrangère est un CONFLIT (409), jamais un 500', () => {
    const unique = analyserErreurEntree({ code: '23505', message: 'duplicate key value violates unique constraint "clients_email_key"' })
    expect(unique.statusHttp).toBe(409)
    expect(unique.message).not.toMatch(/clients_email_key/)

    const fk = analyserErreurEntree({ code: '23503', message: 'insert or update on table "x" violates foreign key constraint "y_fkey"' })
    expect(fk.statusHttp).toBe(409)
    expect(fk.message).not.toMatch(/y_fkey/)
  })

  test('un champ obligatoire manquant ne cite jamais la colonne', () => {
    const analyse = analyserErreurEntree({ message: 'null value in column "commission_amount" violates not-null constraint' })
    expect(analyse.statusHttp).toBe(400)
    expect(analyse.message).not.toMatch(/commission_amount/)
    expect(analyse.message).not.toMatch(/null/i)
  })

  test('une VRAIE erreur serveur n’est pas prise pour une entrée invalide', () => {
    expect(analyserErreurEntree({ code: '42703', message: 'column ct.product_type does not exist' })).toBeNull()
    expect(analyserErreurEntree({ code: '42P01', message: 'relation "contracts_x" does not exist' })).toBeNull()
    expect(analyserErreurEntree({ message: 'connect ECONNREFUSED 127.0.0.1:5432' })).toBeNull()
    expect(analyserErreurEntree({ message: 'contract_not_found' })).toBeNull()
    expect(analyserErreurEntree(null)).toBeNull()
  })
})

describe('traduireErreursEntree — comportement HTTP', () => {
  let server
  let origin

  beforeAll(async () => {
    const app = express()
    app.use(express.json())
    app.use('/api', traduireErreursEntree)
    app.post('/api/mesure', (req, res) => {
      if (req.body.cas === 'entree') return res.status(500).json({ error: req.body.message })
      if (req.body.cas === 'serveur') return res.status(500).json({ error: 'column ct.product_type does not exist' })
      return res.status(200).json({ ok: true })
    })
    await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve) })
    origin = `http://127.0.0.1:${server.address().port}`
  })

  afterAll(async () => { await new Promise((r) => server.close(r)) })

  test('un 500 portant un message SQL d’ENTRÉE devient un 400 lisible', async () => {
    const res = await fetch(`${origin}/api/mesure`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cas: 'entree', message: 'value too long for type character varying(100)' }),
    })
    const corps = await res.json()
    expect(res.status).toBe(400)
    expect(JSON.stringify(corps)).not.toMatch(FUITE_INTERDITE)
    expect(corps.error).toBe('champ_trop_long')
    expect(corps.details.correction).toMatch(/réessayez/i)
  })

  test('un 500 de VRAIE erreur serveur reste un 500', async () => {
    const res = await fetch(`${origin}/api/mesure`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cas: 'serveur' }),
    })
    expect(res.status).toBe(500)
  })

  test('une réponse de succès n’est jamais touchée', async () => {
    const res = await fetch(`${origin}/api/mesure`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cas: 'succes' }),
    })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
  })
})
