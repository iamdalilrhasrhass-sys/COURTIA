/**
 * compose.fuite-chemin.test.js — AUCUN CHEMIN DE STOCKAGE SERVEUR DANS UNE
 * RÉPONSE D'API.
 *
 * DÉFAUT MESURÉ EN PRODUCTION (Red Team, 4e passe — 21/09/2026, P2)
 * `GET /api/compose/documents` (jeton d'un cabinet suisse) répondait 200 avec
 *   documents[0].storage_path =
 *     "/opt/render/project/src/storage/compliance/165/187/dda_187_1789977893068.pdf"
 * — l'arborescence du serveur de production, l'identifiant interne du cabinet et
 * la convention de nommage des fichiers, servis à tout client authentifié.
 *
 * CE QUE CE TEST VERROUILLE (la CLASSE, pas seulement la route mesurée)
 *   1. ni la LISTE ni le DÉTAIL ne contiennent `storage_path` (ni aucun autre
 *      champ d'emplacement : file_path, pdf_path, signed_storage_path,
 *      absolutePath) — quel que soit ce que la base contient ;
 *   2. le document reste téléchargeable par son IDENTIFIANT PUBLIC : le chemin
 *      est conservé CÔTÉ SERVEUR pour lire le fichier.
 */
jest.mock('../db', () => ({ query: jest.fn() }))

const express = require('express')
const fs = require('fs')
const os = require('os')
const path = require('path')
const pool = require('../db')
const router = require('./compose')
const { champsPublics } = require('../services/compose/composer')

const CHEMIN_SERVEUR = '/opt/render/project/src/storage/compliance/165/187/dda_187_1789977893068.pdf'
const CHEMIN_PDF_REEL = path.join(os.tmpdir(), 'courtia-test-compose-fuite.pdf')
const LIGNE = {
  id: 187,
  broker_id: 165,
  client_id: 187,
  document_type: 'dda',
  status: 'generated',
  version: 1,
  storage_path: CHEMIN_SERVEUR,
  file_path: CHEMIN_SERVEUR,
  pdf_path: CHEMIN_SERVEUR,
  signed_storage_path: null,
  absolutePath: CHEMIN_SERVEUR,
  pdf_hash: 'abc',
  generated_at: '2026-09-21T10:00:00.000Z',
  client_nom: 'Dupont',
  client_prenom: 'Léa',
}

describe('GET /api/compose/documents — aucune fuite de chemin de stockage', () => {
  let server
  let origin

  beforeAll(async () => {
    fs.writeFileSync(CHEMIN_PDF_REEL, Buffer.from('%PDF-1.4\n% test\n'))
    pool.query.mockImplementation(async (sql) => {
      const texte = String(sql)
      if (/COUNT\(\*\)/.test(texte)) return { rows: [{ count: '1' }] }
      if (texte.includes('FROM compliance_documents')) return { rows: [LIGNE] }
      return { rows: [] }
    })

    const app = express()
    app.locals.pool = pool
    app.use((req, _res, next) => { req.user = { id: 165, userId: 165 }; next() })
    app.use('/api/compose', router)
    await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve) })
    origin = `http://127.0.0.1:${server.address().port}`
  })

  afterAll(async () => {
    await new Promise((r) => server.close(r))
    try { fs.unlinkSync(CHEMIN_PDF_REEL) } catch (_) { /* déjà retiré */ }
  })

  test('la LISTE ne contient aucun emplacement de stockage', async () => {
    const res = await fetch(`${origin}/api/compose/documents`)
    expect(res.status).toBe(200)
    const texte = await res.text()
    const corps = JSON.parse(texte)

    expect(corps.documents).toHaveLength(1)
    expect(corps.total).toBe(1)
    for (const champ of ['storage_path', 'signed_storage_path', 'file_path', 'pdf_path', 'absolutePath']) {
      expect(texte).not.toContain(champ)
    }
    expect(texte).not.toContain('/opt/render')
    expect(texte).not.toContain('storage/compliance')
    // Ce qui reste : l'identifiant public et le lien de téléchargement.
    expect(corps.documents[0]).toMatchObject({
      id: 187,
      document_type: 'dda',
      download_url: '/api/compose/documents/187/download',
    })
  })

  test('le DÉTAIL ne contient aucun emplacement de stockage', async () => {
    const res = await fetch(`${origin}/api/compose/documents/187`)
    expect(res.status).toBe(200)
    const texte = await res.text()
    const corps = JSON.parse(texte)

    expect(corps).not.toHaveProperty('storage_path')
    expect(corps).not.toHaveProperty('file_path')
    expect(texte).not.toContain('/opt/render')
    expect(corps.download_url).toBe('/api/compose/documents/187/download')
  })

  test('le téléchargement continue de fonctionner par l’identifiant public', async () => {
    // Le chemin reste CÔTÉ SERVEUR : c'est lui qui permet de lire le fichier.
    pool.query.mockImplementation(async (sql) => {
      if (String(sql).includes('FROM compliance_documents')) {
        return { rows: [{ ...LIGNE, storage_path: CHEMIN_PDF_REEL }] }
      }
      return { rows: [] }
    })

    const res = await fetch(`${origin}/api/compose/documents/187/download`)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('application/pdf')
    expect(res.headers.get('content-disposition')).toContain('Document_Information_Distributeur_187_v1.pdf')
    // Le nom de fichier remis au client est lisible et ne révèle PAS la
    // convention de nommage du stockage serveur.
    expect(res.headers.get('content-disposition')).not.toContain('dda_187_')
    const corps = Buffer.from(await res.arrayBuffer())
    expect(corps.subarray(0, 4).toString()).toBe('%PDF')
  })

  test('`champsPublics` retire la classe entière des champs d’emplacement', () => {
    const nettoyee = champsPublics(LIGNE)
    expect(Object.keys(nettoyee).sort()).toEqual([
      'broker_id', 'client_id', 'client_nom', 'client_prenom', 'document_type',
      'generated_at', 'id', 'pdf_hash', 'status', 'version',
    ])
    // La lecture du fichier n'est pas cassée : la ligne source reste intacte.
    expect(LIGNE.storage_path).toBe(CHEMIN_SERVEUR)
  })
})
