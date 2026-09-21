/**
 * quotesComparator.portee-cabinet.test.js — la portée de GET /api/comparator/quote-requests et POST /api/comparator/quote-request est CELLE DU CABINET.
 *
 * POURQUOI CE TEST : `quote_requests` porte sa PROPRE colonne `cabinet_id` (migration 113) : la
 * demande de tarification appartient au CABINET, `broker_id` restant le créateur.
 * Un collaborateur voyait 0 demande et recevait 404 sur celle d'un collègue.
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
jest.mock('../middleware/authMiddleware', () => (req, _res, next) => { req.user = req.user || { id: 7, userId: 7 }; next() })
const pool = require('../db')
const router = require('./quotesComparator')

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

const LISTER = () => gestionnaire('get', '/quote-requests')
const CREER = () => gestionnaire('post', '/quote-request')

describe('quotesComparator — portée cabinet', () => {
  beforeEach(() => pool.query.mockReset())

  test('(a) broker du cabinet : la liste porte la clause CABINET sur qr.cabinet_id', async () => {
    const { res, requetes } = await jouer(LISTER(), [{ cabinet_id: CAB_A, role: 'broker', retire: false }])
    expect(res.code).toBe(200)
    const sqls = sqlsDe(requetes)
    expect(sqls).toMatch(/\(qr\.cabinet_id = ANY\(\$1::uuid\[\]\) OR qr\.broker_id = \$2\)/)
    expect(sqls).not.toMatch(CLAUSE_PROPRIETAIRE)
    const liste = metier(requetes).find((r) => /FROM quote_requests qr/.test(r.sql))
    expect(liste.params[0]).toEqual([CAB_A])
  })

  test('(b) compte SANS cabinet : clause historique sur qr.broker_id', async () => {
    const { res, requetes } = await jouer(LISTER(), [])
    expect(res.code).toBe(200)
    const sqls = sqlsDe(requetes)
    expect(sqls).toMatch(/qr\.broker_id = \$1/)
    expect(sqls).not.toMatch(CLAUSE_CABINET)
  })

  test('(c) assistant : création de demande de tarification refusée (403), aucune écriture', async () => {
    const { res, requetes } = await jouer(CREER(), [{ cabinet_id: CAB_A, role: 'assistant', retire: false }],
      { rows: [], rowCount: 0 }, { body: { normalized_data: { nb_pieces: 3 } } })
    expect(res.code).toBe(403)
    expect(res.corps.error).toBe('lecture_seule')
    expect(ecritures(requetes)).toHaveLength(0)
  })

  test('(a bis) broker : la demande créée porte le cabinet et le créateur', async () => {
    const { res, requetes } = await jouer(CREER(), [{ cabinet_id: CAB_A, role: 'broker', retire: false }],
      { rows: [{ id: 1 }], rowCount: 1 }, { body: { normalized_data: { nb_pieces: 3 } } })
    expect(res.code).toBe(201)
    const insertion = metier(requetes).find((r) => /INSERT INTO quote_requests/.test(r.sql))
    expect(insertion.sql).toContain('cabinet_id')
    expect(insertion.params[2]).toBe(CAB_A)
    expect(insertion.params[1]).toBe(7)
  })
})
