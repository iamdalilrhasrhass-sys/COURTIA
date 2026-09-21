/**
 * integrations.portee-cabinet.test.js — la portée de GET /api/integrations/client/:clientId/interactions est CELLE DU CABINET.
 *
 * POURQUOI CE TEST : l'accès à la fiche client reposait sur `courtier_id = moi` : un collaborateur
 * recevait 404 sur un client de son cabinet. Les INTÉGRATIONS elles-mêmes
 * (`broker_integrations`, secrets) restent par utilisateur — hors périmètre.
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
jest.mock('../services/integrationsStore', () => {
  const reel = jest.requireActual('../services/integrationsStore')
  return { ...reel, listClientInteractions: jest.fn(async () => []) }
})
const pool = require('../db')
const router = require('./integrations')

const routeur = router.router

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

const LIRE = () => gestionnaire('get', '/client/:clientId/interactions')

describe('integrations — portée cabinet sur l’accès au CLIENT', () => {
  beforeEach(() => pool.query.mockReset())

  test('(a) broker du cabinet : le contrôle du client porte la clause CABINET', async () => {
    const { res, requetes } = await jouer(LIRE(), [{ cabinet_id: CAB_A, role: 'broker', retire: false }],
      { rows: [], rowCount: 0 }, { params: { clientId: '5' } })
    const sqls = sqlsDe(requetes)
    expect(sqls).toMatch(CLAUSE_CABINET)
    expect(sqls).not.toMatch(CLAUSE_PROPRIETAIRE)
    // Le cabinet est passé en PARAMÈTRE (`$1::uuid[]`), jamais recopié dans le SQL.
    const controle = metier(requetes).find((r) => /SELECT c\.id FROM clients c/.test(r.sql))
    expect(controle.params[0]).toEqual([CAB_A])
    // Aucune ligne renvoyée par le pool simulé → 404 « client introuvable ».
    expect(res.code).toBe(404)
  })

  test('(b) compte SANS cabinet : clause historique sur le courtier', async () => {
    const { requetes } = await jouer(LIRE(), [], { rows: [], rowCount: 0 }, { params: { clientId: '5' } })
    const sqls = sqlsDe(requetes)
    expect(sqls).toMatch(/c\.courtier_id = \$1/)
    expect(sqls).not.toMatch(CLAUSE_CABINET)
  })

  test('(c) assistant : la LECTURE de la fiche client reste autorisée (aucune écriture)', async () => {
    const { res, requetes } = await jouer(LIRE(), [{ cabinet_id: CAB_A, role: 'assistant', retire: false }],
      { rows: [], rowCount: 0 }, { params: { clientId: '5' } })
    expect(res.code).toBe(404)
    expect(ecritures(requetes)).toHaveLength(0)
  })
})
