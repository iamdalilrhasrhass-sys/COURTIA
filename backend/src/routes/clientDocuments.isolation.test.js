/**
 * clientDocuments.isolation.test.js — UN DOCUMENT APPARTIENT AU CABINET DU CLIENT.
 *
 * POURQUOI CE TEST (P3 SEC-023, mesuré en production le 20/09/2026)
 * Les quatre routes de ce fichier filtraient sur `clients.user_id` — colonne de
 * propriété CONCURRENTE de `clients.courtier_id`, jamais renseignée par la
 * création d'un client. La comparaison était donc TOUJOURS fausse :
 *   * l'upload documentaire d'un client répondait 403 au cabinet PROPRIÉTAIRE
 *     (la fonction était morte) ;
 *   * et un 403 (au lieu d'un 404) confirmait au passage l'existence du dossier.
 *
 * La portée vient désormais de `lib/porteeCabinet` : appartenance par
 * `clients.cabinet_id`, repli sur `clients.courtier_id` pour les lignes créées
 * avant le rattachement. Hors cabinet ⇒ 404.
 */
jest.mock('../db', () => ({ query: jest.fn() }))

const poolModule = require('../db')
const router = require('./clientDocuments')

const CAB_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const CAB_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'

/** Gestionnaire et middlewares d'une route, dans l'ordre de la pile. */
function pile(methode, chemin) {
  const couche = router.stack.find((l) => l.route && l.route.path === chemin && l.route.methods[methode])
  if (!couche) throw new Error(`Route introuvable : ${methode} ${chemin}`)
  return couche.route.stack.map((l) => l.handle)
}

function fausseReponse() {
  return {
    code: 200, corps: null,
    status(c) { this.code = c; return this },
    json(p) { this.corps = p; return this },
    setHeader() { return this },
  }
}

/** Pool simulé : `cabinet_members` sert la portée, le reste est piloté par le test. */
function poolSimule(appartenances, reponseMetier = { rows: [], rowCount: 0 }) {
  const requetes = []
  const pool = {
    requetes,
    async query(sql, params) {
      const texte = String(sql)
      requetes.push({ sql: texte, params })
      if (texte.includes('cabinet_members')) return { rows: appartenances }
      return reponseMetier
    },
  }
  // Le routeur utilise le pool du MODULE (`../db`) : on lui délègue le même
  // compteur, sinon la preuve « aucune requête » ne porterait sur rien.
  poolModule.query.mockImplementation((sql, params) => pool.query(sql, params))
  return pool
}

function requete(pool, { id, userId }) {
  return { app: { locals: { pool } }, user: { id: userId, userId }, params: { id }, body: {}, query: {} }
}

/** Exécute une pile de middlewares en s'arrêtant à la première réponse partie. */
async function executer(middlewares, req, res) {
  for (const middleware of middlewares) {
    let passe = false
    await middleware(req, res, () => { passe = true })
    if (!passe) return false
  }
  return true
}

describe('clientDocuments — la portée vient du CABINET, plus d’une colonne morte', () => {
  beforeEach(() => poolModule.query.mockReset())

  // verifyClientOwnership : 2e middleware de la route d'upload. On l'appelle
  // directement — ce qui est testé est la PORTÉE, pas l'authentification.
  const verifierPropriete = () => pile('post', '/clients/:id/documents')[1]
  const dernier = (methode, chemin) => pile(methode, chemin).slice(-1)[0]

  test('l’appartenance du client est vérifiée par cabinet_id OU courtier_id, jamais par user_id', async () => {
    const pool = poolSimule([{ cabinet_id: CAB_A, role: 'owner' }], { rows: [{ id: 42, courtier_id: 7, cabinet_id: CAB_A }], rowCount: 1 })
    const req = requete(pool, { id: 42, userId: 7 })
    const res = fausseReponse()
    let suivant = false
    await verifierPropriete()(req, res, () => { suivant = true })

    const verification = pool.requetes.find((r) => r.sql.includes('FROM clients'))
    expect(verification).toBeTruthy()
    expect(verification.sql).toMatch(/cabinet_id = ANY/)
    expect(verification.sql).toMatch(/courtier_id = \$/)
    // La colonne qui rendait la fonction morte ne doit plus apparaître.
    expect(verification.sql).not.toMatch(/user_id\s*=/)
    expect(suivant).toBe(true)
    expect(req.cabinetId).toBe(CAB_A)
  })

  test('client du cabinet : le contrôle de propriété laisse passer (aucun 403)', async () => {
    const pool = poolSimule([{ cabinet_id: CAB_A, role: 'broker' }], { rows: [{ id: 42, courtier_id: 7, cabinet_id: CAB_A }], rowCount: 1 })
    const req = requete(pool, { id: 42, userId: 9 })
    const res = fausseReponse()
    let suivant = false
    await verifierPropriete()(req, res, () => { suivant = true })
    expect(suivant).toBe(true)
    expect(res.code).toBe(200)
    expect(req.clientId).toBe(42)
  })

  test('client d’un AUTRE cabinet : 404, jamais 403 (la ressource n’existe pas pour l’appelant)', async () => {
    const pool = poolSimule([{ cabinet_id: CAB_A, role: 'owner' }], { rows: [], rowCount: 0 })
    const req = requete(pool, { id: 99, userId: 7 })
    const res = fausseReponse()
    let suivant = false
    await verifierPropriete()(req, res, () => { suivant = true })
    expect(suivant).toBe(false)
    expect(res.code).toBe(404)
    expect(res.corps.error).toBe('not_found')
    expect(pool.requetes.some((r) => r.sql.includes('INSERT INTO client_documents'))).toBe(false)
  })

  test('téléchargement d’un document : la requête porte la portée du cabinet', async () => {
    const pool = poolSimule([{ cabinet_id: CAB_A, role: 'owner' }], { rows: [], rowCount: 0 })
    const req = requete(pool, { id: 5, userId: 7 })
    const res = fausseReponse()
    await dernier('get', '/documents/:id')(req, res)

    const lecture = pool.requetes.find((r) => r.sql.includes('client_documents'))
    expect(lecture).toBeTruthy()
    expect(lecture.sql).toMatch(/JOIN clients c/)
    expect(lecture.sql).toMatch(/c\.cabinet_id = ANY/)
    expect(lecture.sql).not.toMatch(/c\.user_id/)
    expect(res.code).toBe(404) // aucune ligne : introuvable
  })

  test('suppression d’un document d’un autre cabinet : 404 et AUCUN update', async () => {
    const pool = poolSimule([{ cabinet_id: CAB_B, role: 'owner' }], { rows: [], rowCount: 0 })
    const req = requete(pool, { id: 5, userId: 202 })
    const res = fausseReponse()
    await dernier('delete', '/documents/:id')(req, res)
    expect(res.code).toBe(404)
    expect(pool.requetes.some((r) => r.sql.includes('UPDATE client_documents SET deleted_at'))).toBe(false)
  })

  test('aucune requête de ce routeur ne filtre plus sur clients.user_id', () => {
    const fs = require('fs')
    const path = require('path')
    const source = fs.readFileSync(path.join(__dirname, 'clientDocuments.js'), 'utf8')
    const occurrences = [...source.matchAll(/c\.user_id/g)]
    expect(occurrences).toEqual([])
  })
})
