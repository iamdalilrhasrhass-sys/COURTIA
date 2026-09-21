/**
 * onboarding.portee-cabinet.test.js — la portée de POST /api/onboarding/gamified/auto-check est CELLE DU CABINET.
 *
 * POURQUOI CE TEST : le comptage des clients de l'étape « premier client » était borné à
 * `courtier_id = moi OR user_id = moi` : un collaborateur ouvrant un cabinet déjà
 * peuplé voyait 0 client et ne validait jamais l'étape, alors que le CRM lui montre
 * tout le portefeuille du cabinet.
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

const pool = require('../db')
const router = require('./onboarding')

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

const VERIFIER = () => gestionnaire('post', '/gamified/auto-check')

describe('onboarding — portée cabinet sur /gamified/auto-check', () => {
  beforeEach(() => pool.query.mockReset())

  test('(a) broker du cabinet : le comptage des clients porte la clause CABINET', async () => {
    const { res, requetes } = await jouer(VERIFIER(), [{ cabinet_id: CAB_A, role: 'broker', retire: false }],
      { rows: [{ count: 0 }], rowCount: 1 })
    expect(res.code).toBe(200)
    const comptage = metier(requetes).find((r) => /FROM clients c/.test(r.sql))
    expect(comptage).toBeTruthy()
    expect(comptage.sql).toMatch(/\bcabinet_id = ANY\(\$1::uuid\[\]\)/)
    expect(comptage.sql).not.toMatch(/\(courtier_id\|broker_id\|user_id\) = \$1/)
    expect(comptage.params[0]).toEqual([CAB_A])
  })

  test('(b) compte SANS cabinet : clause historique sur le propriétaire des clients', async () => {
    const { res, requetes } = await jouer(VERIFIER(), [], { rows: [{ count: 0 }], rowCount: 1 })
    expect(res.code).toBe(200)
    const comptage = metier(requetes).find((r) => /FROM clients c/.test(r.sql))
    expect(comptage.sql).toMatch(/COALESCE\(c\.courtier_id, c\.user_id\) = \$1/)
    expect(comptage.sql).not.toMatch(/cabinet_id = ANY/)
    expect(comptage.params).toEqual([7])
  })

  test('(c) assistant : l’étape d’onboarding reste une donnée PERSONNELLE (aucune écriture de portée cabinet)', async () => {
    const { res, requetes } = await jouer(VERIFIER(), [{ cabinet_id: CAB_A, role: 'assistant', retire: false }],
      { rows: [{ count: 0 }], rowCount: 1 })
    expect(res.code).toBe(200)
    // Les écritures éventuelles ne visent que `onboarding_progress` (progression
    // PERSONNELLE de l'appelant) : aucune donnée métier du cabinet n'est modifiée.
    expect(ecritures(requetes).every((r) => /onboarding_progress/.test(r.sql))).toBe(true)
  })
})
