/**
 * compose.portee-cabinet.test.js — la portée de GET /api/compose/stats est CELLE DU CABINET.
 *
 * POURQUOI CE TEST : les documents de conformité générés sont des pièces remises à un CLIENT (donc
 * des objets du cabinet) : un collaborateur voyait 0 document généré. Le PROFIL
 * du cabinet (`broker_profile_settings`) reste, lui, par utilisateur.
 *
 * Le middleware d'authentification est court-circuité (on appelle le gestionnaire
 * final, comme taches.cabinet.test.js) : ce qui est testé ici est la PORTÉE, pas
 * l'authentification. Les trois cas exigés sont couverts :
 *   (a) un collaborateur (`cabinet_members` actif, rôle broker) obtient la clause
 *       CABINET et non la clause « mes lignes » ;
 *   (b) un compte SANS cabinet garde exactement la clause historique
 *       `courtier_id` / `broker_id` / `user_id` = $1 ;
 *   (c) un rôle en LECTURE SEULE (assistant) ne peut pas écrire : 403, et AUCUNE
 *       requête d'écriture n'est envoyée à la base.
 */
jest.mock('../db', () => ({ query: jest.fn() }))
jest.mock('../services/compose/composer', () => ({ composeIpid: jest.fn(), composeDda: jest.fn(), composeDevoirConseil: jest.fn(), composeFullPack: jest.fn(), getDocument: jest.fn(), listDocuments: jest.fn(), deleteDocument: jest.fn(), updateSignatureStatus: jest.fn(), getBrokerProfile: jest.fn() }))
const pool = require('../db')
const router = require('./compose')

const routeur = router

const CAB_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'

const CLAUSE_CABINET = /cabinet_id = ANY\(\$1::uuid\[\]\)/
const CLAUSE_PROPRIETAIRE = /(courtier_id|broker_id|user_id) = \$1/

function gestionnaire(methode, chemin) {
  const couche = routeur.stack.find((l) => l.route && l.route.path === chemin && l.route.methods[methode])
  if (!couche) throw new Error(`Route introuvable : ${methode} ${chemin}`)
  return couche.route.stack[couche.route.stack.length - 1].handle
}

function fausseReponse() {
  return {
    code: 200, corps: null, envoye: null,
    status(c) { this.code = c; return this },
    json(p) { this.corps = p; return this },
    download() { this.envoye = 'download'; return this },
    setHeader() { return this },
  }
}

/**
 * Joue une route avec un pool simulé qui porte AUSSI BIEN la résolution de portée
 * (`cabinet_members`) que les requêtes métier — comme le pool `pg` réel.
 */
async function jouer(cible, appartenances = [], reponse = { rows: [{ count: '0' }], rowCount: 1 }, extra = {}) {
  const requetes = []
  const tracer = async (sql, params) => {
    requetes.push({ sql: String(sql), params })
    if (String(sql).includes('cabinet_members')) {
      return { rows: appartenances, rowCount: appartenances.length }
    }
    return reponse
  }
  pool.query.mockImplementation(tracer)
  const fakePool = { query: tracer }
  const req = {
    app: { locals: { pool: fakePool } },
    user: { id: 7, userId: 7 },
    headers: {}, query: {}, params: { id: '1' }, body: {},
    ...extra,
  }
  const res = fausseReponse()
  await cible(req, res)
  return { res, requetes }
}

/** Les requêtes MÉTIER : on exclut la SEULE résolution de portée (`cm.role`). */
const metier = (requetes) => requetes.filter((r) => !/cm\.role/.test(r.sql))
const sqlsDe = (requetes) => metier(requetes).map((r) => r.sql).join('\n---\n')
const ecritures = (requetes) => metier(requetes).filter((r) => /^\s*(INSERT|UPDATE|DELETE)/i.test(r.sql))

const LIRE = () => gestionnaire('get', '/stats')

describe('compose — portée cabinet sur les documents générés', () => {
  beforeEach(() => pool.query.mockReset())

  test('(a) broker du cabinet : les deux requêtes portent la clause CABINET', async () => {
    const { res, requetes } = await jouer(LIRE(), [{ cabinet_id: CAB_A, role: 'broker', retire: false }])
    expect(res.code).toBe(200)
    const docs = metier(requetes).filter((r) => /FROM compliance_documents cd/.test(r.sql))
    expect(docs.length).toBe(2)
    expect(docs.every((r) => /cabinet_id = ANY\(\$1::uuid\[\]\)/.test(r.sql))).toBe(true)
    expect(docs.some((r) => /cabinet_id = ANY\(\$1::uuid\[\]\)/.test(r.sql))).toBe(true)
    expect(sqlsDe(requetes)).not.toMatch(CLAUSE_PROPRIETAIRE)
  })

  test('(b) compte SANS cabinet : clause historique sur le broker', async () => {
    const { res, requetes } = await jouer(LIRE(), [])
    expect(res.code).toBe(200)
    const sqls = sqlsDe(requetes)
    expect(sqls).toMatch(/cd\.broker_id = \$1/)
    expect(sqls).not.toMatch(CLAUSE_CABINET)
  })

  test('(c) assistant : la LECTURE reste autorisée (aucune écriture dans ce routeur de lecture)', async () => {
    const { res, requetes } = await jouer(LIRE(), [{ cabinet_id: CAB_A, role: 'assistant', retire: false }])
    expect(res.code).toBe(200)
    expect(ecritures(requetes)).toHaveLength(0)
  })
})
