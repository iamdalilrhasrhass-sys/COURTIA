/**
 * devis.signature.test.js — LA SIGNATURE D'UN DEVIS NE MENT PLUS.
 *
 * POURQUOI CE TEST : mesuré en production le 20/09/2026 (Red Team P1 #1),
 * `POST /api/devis/8/sign {}` répondait HTTP 200 `{"ok":true}` alors que
 * `quote_requests.status` restait 'draft', son `metadata` restait `{}` et
 * `signature_requests` ne comptait aucune ligne. La route n'écrivait que dans
 * `devis_wizard` et répondait « ok » sans regarder le nombre de lignes touchées.
 *
 * Ce test fige la règle :
 *   1. aucune ligne signée en base → 404 explicite, JAMAIS un 200 ;
 *   2. devis guidé réellement signé → 200 avec l'état écrit (`status: signed`) ;
 *   3. devis v1 réellement signé → 200, `metadata.signed_at` posé, statut lu
 *      dans la ligne renvoyée par l'UPDATE (`RETURNING`) ;
 *   4. un identifiant non numérique ne part jamais en SQL → 404 (pas de 500) ;
 *   5. un rôle de cabinet en lecture seule → 403 (aucune écriture).
 */
jest.mock('../db', () => ({ query: jest.fn() }))
jest.mock('../services/devisRelanceService', () => ({
  scheduleRelancesForDevis: jest.fn(async () => ({})),
  cancelPendingRelancesForDevis: jest.fn(async () => ({})),
}))

const express = require('express')
const pool = require('../db')
const router = require('./devis')

describe('POST /api/devis/:id/sign', () => {
  let server
  let origin
  let appartenances = []
  let reponsesSql = []
  const requetes = []

  const CAB_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'

  beforeAll(async () => {
    const app = express()
    app.use(express.json())
    app.use((req, _res, next) => { req.user = { id: 7, userId: 7, role: 'broker' }; next() })
    app.use('/api/devis', router)
    await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve) })
    origin = `http://127.0.0.1:${server.address().port}`
  })

  afterAll(async () => { await new Promise((r) => server.close(r)) })

  beforeEach(() => {
    requetes.length = 0
    appartenances = [{ cabinet_id: CAB_A, role: 'broker' }]
    reponsesSql = []
    pool.query.mockReset()
    pool.query.mockImplementation(async (sql) => {
      const texte = String(sql)
      requetes.push(texte)
      if (texte.includes('cabinet_members')) return { rows: appartenances }
      const reponse = reponsesSql.find((r) => r.motif.test(texte))
      return reponse ? { rows: reponse.lignes(sql) } : { rows: [] }
    })
  })

  const signer = (id, corps) => fetch(`${origin}/api/devis/${id}/sign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corps || {}),
  })

  test('aucune ligne signée : 404 explicite, jamais un « ok:true »', async () => {
    reponsesSql = [
      { motif: /UPDATE devis_wizard/, lignes: () => [] },
      { motif: /UPDATE quote_requests/, lignes: () => [] },
    ]
    const res = await signer(8, {})
    const corps = await res.json()
    expect(res.status).toBe(404)
    expect(corps.ok).toBeUndefined()
    expect(corps.error).toBe('devis_not_found')
    expect(corps.message).toMatch(/aucune signature/i)
  })

  test('devis guidé réellement signé : 200 avec l’état ÉCRIT', async () => {
    reponsesSql = [
      { motif: /UPDATE devis_wizard/, lignes: () => [{ id: 12, status: 'signed', signed_at: '2026-09-20T10:00:00.000Z' }] },
    ]
    const res = await signer(12, {})
    const corps = await res.json()
    expect(res.status).toBe(200)
    expect(corps.ok).toBe(true)
    expect(corps.devis_type).toBe('wizard')
    expect(corps.signature.status).toBe('signed')
    // Une seule écriture de devis a été tentée : pas de repli inutile.
    expect(requetes.filter((sql) => /UPDATE quote_requests/.test(sql))).toHaveLength(0)
  })

  test('devis v1 : la signature est datée dans metadata et lue en retour', async () => {
    reponsesSql = [
      { motif: /UPDATE devis_wizard/, lignes: () => [] },
      {
        motif: /UPDATE quote_requests/,
        lignes: () => [{ id: 8, status: 'signed', metadata: { signed_at: '2026-09-20T10:00:00+00', signed_by: 7 } }],
      },
    ]
    const res = await signer(8, {})
    const corps = await res.json()
    expect(res.status).toBe(200)
    expect(corps.devis_type).toBe('v1')
    expect(corps.signature.signed_at).toBe('2026-09-20T10:00:00+00')

    const requete = requetes.find((sql) => /UPDATE quote_requests/.test(sql))
    // La signature porte l'auteur et l'horodatage (aucune valeur inventée côté
    // réponse : elle vient de la ligne renvoyée par l'UPDATE).
    expect(requete).toMatch(/jsonb_build_object/)
    expect(requete).toMatch(/signed_at/)
    expect(requete).toMatch(/signed_by/)
  })

  test('identifiant non numérique : 404 sans jamais interroger la base', async () => {
    const res = await signer('abc', {})
    expect(res.status).toBe(404)
    expect(requetes.filter((sql) => /UPDATE/.test(sql))).toHaveLength(0)
  })

  test('rôle assistant : 403 lecture_seule, aucune écriture tentée', async () => {
    appartenances = [{ cabinet_id: CAB_A, role: 'assistant' }]
    const res = await signer(8, {})
    const corps = await res.json()
    expect(res.status).toBe(403)
    expect(corps.error).toBe('lecture_seule')
    expect(requetes.filter((sql) => /UPDATE/.test(sql))).toHaveLength(0)
  })
})
