/**
 * documents.liste-generes.test.js — LA BIBLIOTHÈQUE MONTRE LES DOCUMENTS
 * RÉELLEMENT GÉNÉRÉS.
 *
 * DÉFAUT MESURÉ EN PRODUCTION (Red Team, 4e passe — 21/09/2026, P1)
 * `POST /api/documents/generate {"template":"proposition_commerciale","client_id":184,…}`
 * répondait 201 avec un `download_url` fonctionnel (le PDF se téléchargeait en
 * application/pdf), MAIS la bibliothèque répondait
 * `GET /api/documents → {"success":true,"data":[]}` — l'écran /documents
 * affichait « Aucun document trouvé ». En base de production : `documents` = 0
 * ligne, `generated_documents` = 6 lignes. La liste ne lisait QUE la table
 * `documents`, et son repli n'existait que sur l'erreur « table manquante ».
 *
 * CE QUE CE TEST VERROUILLE
 *   1. les documents de `generated_documents` sont dans la liste (libellé,
 *      identifiant public, lien de téléchargement) ;
 *   2. le filtre `?client_id=` s'applique à CETTE source (le filtre mesuré
 *      répondait aussi `[]`) ;
 *   3. la portée CABINET s'applique : un document d'un AUTRE cabinet n'y répond
 *      pas (le fragment de portée vise l'alias réellement joint, `c`) ;
 *   4. un cabinet qui n'a rien généré reçoit `data: []` — aucune ligne inventée ;
 *   5. aucune réponse ne porte d'emplacement de stockage serveur.
 */
jest.mock('../db', () => ({ query: jest.fn() }))
jest.mock('../middleware/auth', () => ({
  verifyToken: (req, _res, next) => {
    req.user = { id: Number(req.headers['x-test-user'] || 11), userId: Number(req.headers['x-test-user'] || 11) }
    next()
  },
}))
jest.mock('../middleware/planGuard', () => ({
  requireUnderLimit: () => (_req, _res, next) => next(),
  requireFeature: () => (_req, _res, next) => next(),
}))

const express = require('express')
const pool = require('../db')
const router = require('./documents')

const CAB_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const CAB_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'

describe('GET /api/documents — les documents générés apparaissent dans la bibliothèque', () => {
  let server
  let origin
  let requetes
  let impressions // lignes de `generated_documents` portées par le pool simulé
  let appartenances

  /**
   * Pool simulé fidèle au comportement SQL attendu : la ligne n'est rendue que
   * si la PORTÉE de la requête l'autorise (c'est la base qui filtre, pas le
   * test) et si le filtre `client_id` la concerne.
   */
  function brancherPool() {
    pool.query.mockImplementation(async (sql, params) => {
      const texte = String(sql)
      requetes.push({ sql: texte, params })
      if (texte.includes('cabinet_members')) return { rows: appartenances }
      if (texte.includes('FROM generated_documents g')) {
        const cabinets = Array.isArray(params[1]) ? params[1] : []
        const proprietaire = params[1] && !Array.isArray(params[1]) ? params[1] : params[2]
        const filtres = params.slice(cabinets.length ? 3 : 2)
        const visibles = impressions.filter((ligne) => (
          ligne.courtier_id === (Array.isArray(params[1]) ? params[2] : params[1])
          || cabinets.includes(ligne.client_cabinet)
          || ligne.client_courtier === proprietaire
        ))
        const avecFiltre = filtres.length
          ? visibles.filter((ligne) => ligne.client_id === filtres[0])
          : visibles
        return { rows: avecFiltre.map((l) => ({
          id: l.id, client_id: l.client_id, document_type: l.document_type,
          template_id: l.template_id, pdf_url: null, created_at: l.created_at,
          client_name: l.client_name,
        })) }
      }
      if (texte.includes('FROM documents d')) return { rows: [] }
      return { rows: [] }
    })
  }

  const appeler = (suffixe = '', userId = 11) => fetch(`${origin}/api/documents${suffixe}`, {
    headers: { 'x-test-user': String(userId) },
  })

  beforeAll(async () => {
    const app = express()
    app.locals.pool = pool
    app.use((req, _res, next) => { req.user = { id: 11, userId: 11 }; next() })
    app.use('/api/documents', router)
    await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve) })
    origin = `http://127.0.0.1:${server.address().port}`
  })
  afterAll(async () => { await new Promise((r) => server.close(r)) })

  beforeEach(() => {
    requetes = []
    appartenances = [{ cabinet_id: CAB_A, role: 'broker', retire: false }]
    impressions = [{
      id: 22, courtier_id: 11, client_id: 184, document_type: 'proposition_commerciale',
      template_id: 'doc_1789977893068_ab12cd', created_at: '2026-09-21T10:00:00.000Z',
      client_cabinet: CAB_A, client_courtier: 11, client_name: 'Léa Dupont',
    }, {
      // Document d'un AUTRE cabinet : il ne doit JAMAIS apparaître ici.
      id: 23, courtier_id: 99, client_id: 200, document_type: 'attestation_assurance',
      template_id: 'doc_1789977893999_zz99yy', created_at: '2026-09-21T11:00:00.000Z',
      client_cabinet: CAB_B, client_courtier: 99, client_name: 'Autre Cabinet',
    }]
    pool.query.mockReset()
    brancherPool()
  })

  test('le document généré apparaît, avec libellé, identifiant public et lien de téléchargement', async () => {
    const res = await appeler()
    expect(res.status).toBe(200)
    const corps = await res.json()

    expect(corps.success).toBe(true)
    expect(corps.data).toHaveLength(1)
    expect(corps.data[0]).toMatchObject({
      id: 22,
      source: 'generated_documents',
      client_id: 184,
      type: 'proposition_commerciale',
      title: 'Proposition commerciale',
      document_id: 'doc_1789977893068_ab12cd',
      download_url: '/api/documents/doc_1789977893068_ab12cd/download',
    })
    // Le libellé affiché par l'écran est celui du fichier généré.
    expect(corps.data[0].file_name).toMatch(/\.pdf$/)
    // La lecture de l'ancien chemin d'impression est dans le CHEMIN NOMINAL
    // (et non plus un repli déclenché par une erreur « table manquante »).
    expect(requetes.some((r) => r.sql.includes('FROM generated_documents g'))).toBe(true)
    // La bibliothèque lit AUSSI la table `documents`.
    expect(requetes.some((r) => r.sql.includes('FROM documents d'))).toBe(true)
  })

  test('?client_id= filtre les documents générés (et le filtre est passé à la base)', async () => {
    const res = await appeler('?client_id=184')
    const corps = await res.json()
    expect(corps.data).toHaveLength(1)
    expect(corps.data[0].client_id).toBe(184)

    const requete = requetes.find((r) => r.sql.includes('FROM generated_documents g'))
    expect(requete.sql).toContain('g.client_id = $')
    expect(requete.params).toContain(184)

    // Un client pour lequel ce cabinet n'a RIEN généré : aucune ligne inventée.
    const vide = await appeler('?client_id=777777')
    expect((await vide.json()).data).toEqual([])
  })

  test('la portée CABINET s’applique : le document d’un autre cabinet n’apparaît pas', async () => {
    const res = await appeler()
    const corps = await res.json()
    expect(corps.data.map((d) => d.id)).toEqual([22])
    expect(corps.data.some((d) => d.id === 23)).toBe(false)

    // La clause de portée vise l'ALIAS réellement joint (`c`), jamais le nom de
    // table — un alias faux ferait répondre 500 « missing FROM-clause entry ».
    const requete = requetes.find((r) => r.sql.includes('FROM generated_documents g'))
    expect(requete.sql).toContain('c.cabinet_id = ANY($2::uuid[]) OR c.courtier_id = $3')
    expect(requete.sql).not.toContain('clients.cabinet_id')
    expect(requete.params[1]).toEqual([CAB_A])
  })

  test('compte SANS cabinet : la clause historique reste `courtier_id` (aucune donnée d’un autre compte)', async () => {
    appartenances = []
    const res = await appeler()
    const corps = await res.json()
    expect(corps.success).toBe(true)
    const requete = requetes.find((r) => r.sql.includes('FROM generated_documents g'))
    expect(requete.sql).toContain('g.courtier_id = $1')
    expect(requete.sql).not.toContain('ANY(')
    // Ses propres impressions restent visibles ; celles d'un autre compte non.
    expect(corps.data.map((d) => d.id)).toEqual([22])
  })

  test('aucune donnée inventée quand rien n’a été généré', async () => {
    impressions = []
    const res = await appeler()
    const corps = await res.json()
    expect(res.status).toBe(200)
    expect(corps).toEqual({ success: true, data: [] })
  })

  test('aucun emplacement de stockage serveur dans la liste', async () => {
    // Même si la base en contient (fichiers déposés), aucun chemin ne sort.
    pool.query.mockImplementation(async (sql) => {
      const texte = String(sql)
      if (texte.includes('cabinet_members')) return { rows: appartenances }
      if (texte.includes('FROM documents d')) {
        return { rows: [{
          id: 3, client_id: 184, type: 'fic', status: 'generated', filename: 'courtia_fic_3.pdf',
          file_name: 'courtia_fic_3.pdf', created_at: '2026-09-21T09:00:00.000Z',
          storage_path: '/opt/render/project/src/storage/compliance/165/184/fic_3.pdf',
          file_path: 'db://documents_blob/3',
          signed_storage_path: null,
        }] }
      }
      return { rows: [] }
    })

    const res = await appeler()
    const texte = await res.text()
    expect(texte).not.toContain('/opt/render')
    expect(texte).not.toContain('db://documents_blob')
    expect(JSON.parse(texte).data[0].storage_path).toBeUndefined()
    expect(JSON.parse(texte).data[0].file_path).toBeUndefined()
    expect(JSON.parse(texte).data[0].download_url).toBe('/api/documents/3/download')
  })
})
