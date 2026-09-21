/**
 * import.portee-cabinet.test.js — la portée de POST /api/import/execute et POST /api/import/clean est CELLE DU CABINET.
 *
 * POURQUOI CE TEST : les clients importés étaient écrits sans `cabinet_id` (donc invisibles pour
 * le reste du cabinet) et le doublon n'était cherché que chez l'auteur : le même
 * client était recréé par chaque commercial du cabinet.
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
const router = require('./import')

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

const XLSX = require('xlsx')

const LIGNES = [['nom', 'email'], ['Durand', 'durand@example.invalid']]
function fichier() {
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(LIGNES), 'Feuil1')
  return { buffer: XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }), originalname: 'clients.xlsx' }
}
const EXECUTER = () => gestionnaire('post', '/execute')
const NETTOYER = () => gestionnaire('post', '/clean')

describe('import — portée cabinet', () => {
  beforeEach(() => pool.query.mockReset())

  test('(a) broker du cabinet : le doublon est cherché dans le cabinet et le client créé en porte l’identifiant', async () => {
    const { res, requetes } = await jouer(EXECUTER(), [{ cabinet_id: CAB_A, role: 'broker', retire: false }],
      { rows: [], rowCount: 0 }, { file: fichier(), body: { mapping: { nom: 0, email: 1 } } })
    expect(res.code).toBe(200)

    const recherche = metier(requetes).find((r) => /SELECT c\.id FROM clients c/.test(r.sql))
    expect(recherche.sql).toMatch(/cabinet_id = ANY\(\$1::uuid\[\]\)/)
    expect(recherche.sql).toMatch(/c\.email = \$3/)

    const insertion = metier(requetes).find((r) => /INSERT INTO clients/.test(r.sql))
    expect(insertion.sql).toContain('cabinet_id')
    expect(insertion.params[10]).toBe(CAB_A)   // cabinet_id = tenant
    expect(insertion.params[0]).toBe(7)        // courtier_id = créateur
  })

  test('(b) compte SANS cabinet : clause historique et aucune estampille de cabinet', async () => {
    const { res, requetes } = await jouer(EXECUTER(), [], { rows: [], rowCount: 0 },
      { file: fichier(), body: { mapping: { nom: 0, email: 1 } } })
    expect(res.code).toBe(200)
    const recherche = metier(requetes).find((r) => /SELECT c\.id FROM clients c/.test(r.sql))
    expect(recherche.sql).toMatch(/c\.courtier_id = \$1/)
    expect(recherche.sql).not.toMatch(/cabinet_id = ANY/)
    const insertion = metier(requetes).find((r) => /INSERT INTO clients/.test(r.sql))
    expect(insertion.params[10]).toBe(null)
  })

  test('(c) assistant : import et nettoyage refusés (403), aucune écriture', async () => {
    const assistant = [{ cabinet_id: CAB_A, role: 'assistant', retire: false }]
    const import_ = await jouer(EXECUTER(), assistant, { rows: [], rowCount: 0 },
      { file: fichier(), body: { mapping: { nom: 0, email: 1 } } })
    expect(import_.res.code).toBe(403)
    expect(import_.res.corps.error).toBe('lecture_seule')
    expect(ecritures(import_.requetes)).toHaveLength(0)

    const nettoyage = await jouer(NETTOYER(), assistant)
    expect(nettoyage.res.code).toBe(403)
    expect(ecritures(nettoyage.requetes)).toHaveLength(0)
  })

  test('(d) le nettoyage porte la portée du cabinet', async () => {
    const { res, requetes } = await jouer(NETTOYER(), [{ cabinet_id: CAB_A, role: 'broker', retire: false }])
    expect(res.code).toBe(200)
    const doublons = metier(requetes).find((r) => /FROM clients c1/.test(r.sql))
    expect(doublons.sql).toMatch(/c1\.cabinet_id = ANY\(\$1::uuid\[\]\)/)
  })
})
