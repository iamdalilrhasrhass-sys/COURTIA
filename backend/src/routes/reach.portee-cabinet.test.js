/**
 * reach.portee-cabinet.test.js — la portée de POST /api/reach/convert-to-client et /prospects/:id/create-task est CELLE DU CABINET.
 *
 * POURQUOI CE TEST : les PROSPECTS de Reach sont la liste personnelle du courtier (rien à changer),
 * mais les objets CRÉÉS dans le CRM — `clients` et `taches` — appartiennent au
 * CABINET : ils étaient écrits sans `cabinet_id` (donc invisibles pour le reste du
 * cabinet) et un client déjà présent chez un collègue y était recréé en doublon.
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
const router = require('./reach')

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

const PROSPECT = {
  id: 1, contact_first_name: 'Ada', contact_last_name: 'Lovelace',
  email: 'ada@example.invalid', phone: '0600000000', company_name: 'Analytical', city: 'Paris',
}
const CONVERTIR = () => gestionnaire('post', '/convert-to-client')
const TACHE = () => gestionnaire('post', '/prospects/:id/create-task')

describe('reach — portée cabinet', () => {
  beforeEach(() => pool.query.mockReset())

  test('(a) broker du cabinet : le client créé est estampillé du CABINET et cherché dans le cabinet', async () => {
    const { res, requetes } = await jouer(CONVERTIR(), [{ cabinet_id: CAB_A, role: 'broker', retire: false }],
      { rows: [PROSPECT], rowCount: 1 }, { body: { prospect: { id: 1 } } })
    expect(res.code).toBe(201)
    const insertion = metier(requetes).find((r) => /INSERT INTO clients/.test(r.sql))
    expect(insertion.sql).toContain('cabinet_id')
    expect(insertion.params[1]).toBe(CAB_A)      // cabinet_id = tenant
    expect(insertion.params[0]).toBe(7)          // courtier_id = créateur
  })

  test('(b) compte SANS cabinet : aucune estampille de cabinet (comportement historique)', async () => {
    const { res, requetes } = await jouer(CONVERTIR(), [], { rows: [PROSPECT], rowCount: 1 },
      { body: { prospect: { id: 1 } } })
    expect(res.code).toBe(201)
    const insertion = metier(requetes).find((r) => /INSERT INTO clients/.test(r.sql))
    expect(insertion.params[1]).toBe(null)
    // La recherche du client existant retombe sur le créateur.
    const recherche = metier(requetes).find((r) => /SELECT c\.\* FROM clients c/.test(r.sql))
    if (recherche) expect(recherche.sql).toMatch(CLAUSE_PROPRIETAIRE)
  })

  test('(c) assistant : conversion prospect → client refusée (403), aucune écriture', async () => {
    const { res, requetes } = await jouer(CONVERTIR(), [{ cabinet_id: CAB_A, role: 'assistant', retire: false }],
      { rows: [PROSPECT], rowCount: 1 }, { body: { prospect: { id: 1 } } })
    expect(res.code).toBe(403)
    expect(res.corps.error).toBe('lecture_seule')
    expect(ecritures(requetes)).toHaveLength(0)

    const tache = await jouer(TACHE(), [{ cabinet_id: CAB_A, role: 'assistant', retire: false }],
      { rows: [], rowCount: 0 }, { body: { title: 'Rappeler' }, params: { id: '1' } })
    expect(tache.res.code).toBe(403)
    expect(ecritures(tache.requetes)).toHaveLength(0)
  })
})
