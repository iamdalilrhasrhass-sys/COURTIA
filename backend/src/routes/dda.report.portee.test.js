/**
 * dda.report.portee.test.js — LE RAPPORT DDA D'UN DOSSIER : MÊME RÉPONSE POUR
 * TOUS, AUCUN CHEMIN DE SERVEUR (défaut D3-04, P3 — troisième QA adverse,
 * mesuré le 20/09/2026).
 *
 * DÉFAUT MESURÉ : le rapport était servi par `res.download(chemin)`. Fichier
 * absent du disque, le cabinet PROPRIÉTAIRE recevait
 *   404 {"error":"Erreur serveur","details":"ENOENT: no such file or directory,
 *        stat('/opt/render/project/src/backend/<donnée cliente>'"}
 * soit le CHEMIN ABSOLU du serveur et un nom de fichier dérivé d'une donnée
 * cliente — tandis qu'un cabinet ÉTRANGER recevait, pour la même panne, un
 * message propre. La réponse dépendait donc du cabinet appelant.
 *
 * CE QUE CE TEST FIGE
 *   1. dossier hors cabinet → 404 `rapport_indisponible`, corps identique ;
 *   2. dossier du cabinet SANS rapport, ou dont le FICHIER a disparu → 404
 *      `rapport_indisponible`, corps IDENTIQUE (aucun chemin, aucun ENOENT) ;
 *   3. rapport présent sur le disque → 200, fichier servi ;
 *   4. aucune réponse ne contient de chemin absolu ni de message du système.
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
jest.mock('../services/arkVoice', () => ({}))
jest.mock('../services/emailParser', () => ({}))
jest.mock('../services/ddaAudit', () => ({}))

const fs = require('fs')
const os = require('os')
const path = require('path')
const express = require('express')
const pool = require('../db')
const router = require('./killerFeatures2')

const CAB_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const CAB_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'

describe('GET /api/dda/report/:clientId — panne et portée, une seule réponse (D3-04)', () => {
  let server
  let origin
  let rapportReel
  let appartenances
  let cabinetDuClient
  let cheminRapport

  beforeAll(async () => {
    // Un rapport RÉEL sur le disque, pour prouver que le chemin légitime marche
    // toujours (le correctif ne casse pas le téléchargement).
    rapportReel = path.join(os.tmpdir(), `courtia-conformite-${process.pid}.pdf`)
    fs.writeFileSync(rapportReel, '%PDF-1.4 rapport de conformite')

    const app = express()
    app.locals.pool = pool
    app.use(express.json())
    app.use('/api', router)
    await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve) })
    origin = `http://127.0.0.1:${server.address().port}`
  })

  afterAll(async () => {
    await new Promise((r) => server.close(r))
    try { fs.unlinkSync(rapportReel) } catch (_) { /* déjà retiré */ }
  })

  beforeEach(() => {
    appartenances = [{ cabinet_id: CAB_A, role: 'broker', retire: false }]
    cabinetDuClient = CAB_A
    cheminRapport = rapportReel
    pool.query.mockReset()
    pool.query.mockImplementation(async (sql, params) => {
      const s = String(sql)
      if (s.includes('cabinet_members')) return { rows: appartenances }
      if (/FROM dda_audits da/.test(s)) {
        if (s.includes('AND FALSE')) return { rows: [] }
        const dansLaPortee = s.includes('c.cabinet_id = ANY($2::uuid[])')
          ? (params[1] || []).includes(cabinetDuClient)
          : true
        return { rows: dansLaPortee ? [{ report_pdf_path: cheminRapport }] : [] }
      }
      return { rows: [] }
    })
  })

  const appeler = (clientId = 148, userId = 140) => fetch(`${origin}/api/dda/report/${clientId}`, {
    headers: { 'x-test-user': String(userId) },
  })

  test('fichier disparu du disque : 404 rapport_indisponible, AUCUN chemin ni ENOENT', async () => {
    cheminRapport = path.join(os.tmpdir(), 'courtia-rapport-absent-09f3.pdf')
    const res = await appeler()
    expect(res.status).toBe(404)
    const texte = await res.text()
    const corps = JSON.parse(texte)
    expect(corps.error).toBe('rapport_indisponible')
    for (const interdit of ['ENOENT', '/opt/', '/tmp/', 'no such file', 'stat(', 'pdf']) {
      expect({ interdit, present: texte.includes(interdit) }).toEqual({ interdit, present: false })
    }
  })

  test('aucun rapport en base : même 404, même corps', async () => {
    cheminRapport = null
    const res = await appeler()
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({
      success: false,
      error: 'rapport_indisponible',
      message: 'Aucun rapport disponible pour ce dossier.',
    })
  })

  test('dossier d’un AUTRE cabinet : le MÊME corps que la panne (aucune différence observable)', async () => {
    cheminRapport = path.join(os.tmpdir(), 'courtia-rapport-absent-09f3.pdf')
    const panne = await (await appeler()).json()
    cabinetDuClient = CAB_B
    const etranger = await (await appeler()).json()
    expect(etranger).toEqual(panne)
  })

  test('rapport réellement présent : 200, le fichier est servi', async () => {
    const res = await appeler()
    expect(res.status).toBe(200)
    const texte = await res.text()
    expect(texte).toContain('%PDF-1.4')
    expect(String(res.headers.get('content-disposition'))).toContain('conformite_client_148')
  })

  test('une appartenance révoquée n’obtient pas le rapport', async () => {
    appartenances = [{ cabinet_id: CAB_A, role: 'broker', retire: true }]
    const res = await appeler()
    expect(res.status).toBe(404)
    expect((await res.json()).success).toBe(false)
  })
})
