/**
 * taches.cabinet.test.js — la portée des tâches/rendez-vous est CELLE DU CABINET.
 *
 * POURQUOI CE TEST : `appointments` est une entité métier de PREMIER NIVEAU —
 * elle peut exister sans client (relance interne, action commerciale). Elle
 * portait donc son propre rattachement : `COALESCE(user_id, organizer_id)`, lu
 * comme « les tâches de MON utilisateur ». Un collaborateur du cabinet ne
 * voyait aucune des tâches de ses collègues.
 *
 * Le middle `verifyToken` est court-circuité (on appelle le gestionnaire final,
 * comme devis.wizardFinalize.test.js) : ce qui est testé ici est la PORTÉE, pas
 * l'authentification.
 */
jest.mock('../db', () => ({ query: jest.fn() }))

const pool = require('../db')
const router = require('./taches')

const CAB_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'

function gestionnaire(methode, chemin) {
  const couche = router.stack.find((l) => l.route && l.route.path === chemin && l.route.methods[methode])
  if (!couche) throw new Error(`Route introuvable : ${methode} ${chemin}`)
  return couche.route.stack[couche.route.stack.length - 1].handle
}

function fausseReponse() {
  return {
    code: 200, corps: null,
    status(c) { this.code = c; return this },
    json(p) { this.corps = p; return this },
  }
}

describe('taches — portée cabinet', () => {
  const requetes = []
  const fakePool = { async query(sql, params) { requetes.push({ sql, params }); return { rows: [], rowCount: 0 } } }

  function simuler(appartenances, reponse = { rows: [], rowCount: 0 }) {
    // En production `req.app.locals.pool` EST le pool `pg` : c'est lui qui porte
    // aussi bien la résolution de portée (`cabinet_members`) que les requêtes
    // métier. Le faux pool rejoue donc les deux.
    fakePool.query = async (sql, params) => {
      requetes.push({ sql, params })
      if (String(sql).includes('cabinet_members')) return { rows: appartenances }
      return reponse
    }
  }

  beforeEach(() => {
    requetes.length = 0
    pool.query.mockReset()
  })

  test('broker : la liste porte la clause CABINET (cabinet OU ses propres lignes)', async () => {
    simuler([{ cabinet_id: CAB_A, role: 'broker' }])
    const res = fausseReponse()
    await gestionnaire('get', '/')({ app: { locals: { pool: fakePool } }, user: { id: 7, userId: 7 }, query: {} }, res)

    expect(res.code).toBe(200)
    const liste = requetes.find((r) => r.sql.includes('FROM appointments'))
    expect(liste.sql).toContain('(a.cabinet_id = ANY($1::uuid[]) OR COALESCE(a.user_id, a.organizer_id) = $2)')
    expect(liste.params).toEqual([[CAB_A], 7])
  })

  test('sans cabinet : clause historique sur l’utilisateur', async () => {
    simuler([])
    const res = fausseReponse()
    await gestionnaire('get', '/')({ app: { locals: { pool: fakePool } }, user: { id: 7, userId: 7 }, query: {} }, res)

    const liste = requetes.find((r) => r.sql.includes('FROM appointments'))
    expect(liste.sql).toContain('COALESCE(a.user_id, a.organizer_id) = $1')
    expect(liste.params).toEqual([7])
  })

  test('assistant : création refusée (403) et aucune écriture', async () => {
    simuler([{ cabinet_id: CAB_A, role: 'assistant' }])
    const res = fausseReponse()
    await gestionnaire('post', '/')({
      app: { locals: { pool: fakePool } },
      user: { id: 7, userId: 7 },
      body: { titre: 'Rappeler le client', echeance: '2026-10-01T09:00:00Z' },
    }, res)

    expect(res.code).toBe(403)
    expect(res.corps.error).toBe('lecture_seule')
    expect(requetes.some((r) => r.sql.includes('INSERT INTO appointments'))).toBe(false)
  })

  test('broker : la tâche créée porte le cabinet et l’affectation du créateur', async () => {
    simuler([{ cabinet_id: CAB_A, role: 'broker' }], { rows: [{ id: 1 }], rowCount: 1 })
    const res = fausseReponse()
    await gestionnaire('post', '/')({
      app: { locals: { pool: fakePool } },
      user: { id: 7, userId: 7 },
      body: { titre: 'Rappeler le client', echeance: '2026-10-01T09:00:00Z' },
    }, res)

    expect(res.code).toBe(201)
    const insertion = requetes.find((r) => r.sql.includes('INSERT INTO appointments'))
    expect(insertion.sql).toContain('cabinet_id')
    expect(insertion.params[5]).toBe(7)       // user_id/organizer_id = affectation
    expect(insertion.params[6]).toBe(CAB_A)   // cabinet_id = tenant
  })

  test('modification d’une tâche d’un autre cabinet : 404', async () => {
    simuler([{ cabinet_id: CAB_A, role: 'broker' }])
    const res = fausseReponse()
    await gestionnaire('put', '/:id')({
      app: { locals: { pool: fakePool } },
      user: { id: 7, userId: 7 },
      params: { id: '999' },
      body: { statut: 'terminee' },
    }, res)

    expect(res.code).toBe(404)
    const maj = requetes.find((r) => r.sql.includes('UPDATE appointments'))
    expect(maj.sql).toContain('a.cabinet_id = ANY($6::uuid[])')
  })
})
