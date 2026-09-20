/**
 * partners.cabinet.test.js — LES PARTENAIRES APPARTIENNENT AU CABINET.
 *
 * POURQUOI CE TEST : `partners` était la dernière entité métier restée en
 * portée MONO-UTILISATEUR (`partners.user_id = req.user.id`) alors que tout le
 * reste du CRM est passé au cabinet (`lib/porteeCabinet`). Défaut mesuré sur un
 * cabinet d'audit à deux membres : le collaborateur invité voyait 0 partenaire
 * quand le propriétaire en voyait 1. Ce test verrouille les quatre points qui
 * font la correction :
 *   1. une LECTURE porte la clause cabinet (cabinet OU ses propres lignes) ;
 *   2. un compte SANS cabinet garde exactement la clause historique ;
 *   3. une ligne d'un AUTRE cabinet est introuvable (404) en modification comme
 *      en suppression, et rien n'est écrit ;
 *   4. la création ESTAMPILLE le cabinet et laisse `user_id` = auteur.
 *
 * Le middleware `verifyToken` est court-circuité en appelant directement le
 * dernier gestionnaire de la pile (même méthode que `taches.cabinet.test.js`) :
 * ce qui est testé ici est la PORTÉE, pas l'authentification.
 */
jest.mock('../db', () => ({ query: jest.fn() }))

const pool = require('../db')
const router = require('./partners')

const CAB_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const CAB_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'

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

describe('partners — portée cabinet', () => {
  const requetes = []
  const fakePool = { async query(sql, params) { requetes.push({ sql, params }); return { rows: [], rowCount: 0 } } }

  function simuler(appartenances, reponse = { rows: [], rowCount: 0 }) {
    fakePool.query = async (sql, params) => {
      requetes.push({ sql, params })
      if (String(sql).includes('cabinet_members')) return { rows: appartenances }
      return reponse
    }
    // La garde d'écriture est construite avec le pool du MODULE (`../db`) :
    // pour qu'elle voie la même appartenance que le gestionnaire, le pool
    // simulé du module délègue au faux pool de la requête.
    pool.query.mockImplementation((sql, params) => fakePool.query(sql, params))
  }

  /** Requête Express minimale : portée cabinet + utilisateur porteur du jeton. */
  function requete(userId, extra = {}) {
    return { app: { locals: { pool: fakePool } }, user: { id: userId, userId }, query: {}, params: {}, body: {}, ...extra }
  }

  beforeEach(() => {
    requetes.length = 0
    pool.query.mockReset()
  })

  test('broker : la liste porte la clause CABINET (cabinet OU ses propres lignes)', async () => {
    simuler([{ cabinet_id: CAB_A, role: 'broker' }])
    const res = fausseReponse()
    await gestionnaire('get', '/')(requete(7), res)

    expect(res.code).toBe(200)
    const liste = requetes.find((r) => r.sql.includes('FROM partners'))
    expect(liste.sql).toContain('(partners.cabinet_id = ANY($1::uuid[]) OR partners.user_id = $2)')
    expect(liste.params).toEqual([[CAB_A], 7])
  })

  test('collaborateur : il VOIT le partenaire créé par son collègue (même cabinet)', async () => {
    simuler([{ cabinet_id: CAB_A, role: 'broker' }], {
      rows: [{ id: 12, nom: 'Helvetia', user_id: 42, cabinet_id: CAB_A }], rowCount: 1,
    })
    const res = fausseReponse()
    await gestionnaire('get', '/')(requete(53), res)

    expect(res.code).toBe(200)
    expect(res.corps.partners).toHaveLength(1)
    expect(res.corps.partners[0].cabinet_id).toBe(CAB_A)
  })

  test('sans cabinet : clause historique inchangée sur l’utilisateur', async () => {
    simuler([])
    const res = fausseReponse()
    await gestionnaire('get', '/')(requete(7), res)

    const liste = requetes.find((r) => r.sql.includes('FROM partners'))
    expect(liste.sql).toContain('partners.user_id = $1')
    expect(liste.sql).not.toContain('ANY(')
    expect(liste.params).toEqual([7])
  })

  test('les statistiques sont calculées sur le même périmètre que la liste', async () => {
    simuler([{ cabinet_id: CAB_A, role: 'assistant' }])
    const res = fausseReponse()
    await gestionnaire('get', '/stats')(requete(55), res)

    expect(res.code).toBe(200)
    const stats = requetes.find((r) => r.sql.includes('GROUP BY statut'))
    expect(stats.sql).toContain('(partners.cabinet_id = ANY($1::uuid[]) OR partners.user_id = $2)')
    expect(stats.params).toEqual([[CAB_A], 55])
  })

  test('lecture seule (assistant) : la lecture reste autorisée', async () => {
    simuler([{ cabinet_id: CAB_A, role: 'assistant' }])
    const res = fausseReponse()
    await gestionnaire('get', '/')(requete(55), res)
    expect(res.code).toBe(200)
  })

  test('création : le cabinet est estampillé et l’auteur conservé', async () => {
    simuler([{ cabinet_id: CAB_A, role: 'broker' }], { rows: [{ id: 1, cabinet_id: CAB_A }], rowCount: 1 })
    const res = fausseReponse()
    await gestionnaire('post', '/')(requete(53, { body: { nom: 'Helvetia' } }), res)

    expect(res.code).toBe(201)
    const insertion = requetes.find((r) => r.sql.includes('INSERT INTO partners'))
    expect(insertion.sql).toContain('cabinet_id')
    expect(insertion.params[0]).toBe(53)      // user_id = AUTEUR
    expect(insertion.params[11]).toBe(CAB_A)  // cabinet_id = TENANT
  })

  test('création sans cabinet : cabinet_id NULL (comportement historique)', async () => {
    simuler([], { rows: [{ id: 2 }], rowCount: 1 })
    const res = fausseReponse()
    await gestionnaire('post', '/')(requete(7, { body: { nom: 'Sans cabinet' } }), res)

    const insertion = requetes.find((r) => r.sql.includes('INSERT INTO partners'))
    expect(insertion.params[11]).toBe(null)
  })

  test('modification d’un partenaire d’un AUTRE cabinet : 404, portée d’écriture', async () => {
    simuler([{ cabinet_id: CAB_A, role: 'broker' }])
    const res = fausseReponse()
    await gestionnaire('put', '/:id')(requete(7, { params: { id: '99' }, body: { nom: 'Piraté' } }), res)

    expect(res.code).toBe(404)
    expect(res.corps.error).toBe('not_found')
    const maj = requetes.find((r) => r.sql.includes('UPDATE partners'))
    expect(maj.sql).toContain('(partners.cabinet_id = ANY($21::uuid[]) OR partners.user_id = $22)')
    expect(maj.params[19]).toBe(99)
    expect(maj.params[20]).toEqual([CAB_A])
    expect(maj.params[21]).toBe(7)
  })

  test('suppression d’un partenaire d’un AUTRE cabinet : 404', async () => {
    simuler([{ cabinet_id: CAB_A, role: 'manager' }])
    const res = fausseReponse()
    await gestionnaire('delete', '/:id')(requete(7, { params: { id: '99' } }), res)

    expect(res.code).toBe(404)
    const suppression = requetes.find((r) => r.sql.includes('DELETE FROM partners'))
    expect(suppression.sql).toContain('(partners.cabinet_id = ANY($2::uuid[]) OR partners.user_id = $3)')
  })

  test('suppression réussie : 200 et une ligne réellement supprimée', async () => {
    simuler([{ cabinet_id: CAB_A, role: 'broker' }], { rows: [{ id: 5 }], rowCount: 1 })
    const res = fausseReponse()
    await gestionnaire('delete', '/:id')(requete(7, { params: { id: '5' } }), res)
    expect(res.code).toBe(200)
    expect(res.corps.deleted).toBe(true)
  })

  test('changement de statut : portée d’écriture, 404 hors cabinet', async () => {
    simuler([{ cabinet_id: CAB_A, role: 'broker' }])
    const res = fausseReponse()
    await gestionnaire('patch', '/:id/statut')(requete(7, { params: { id: '99' }, body: { statut: 'Refuse' } }), res)

    expect(res.code).toBe(404)
    const maj = requetes.find((r) => r.sql.includes('UPDATE partners SET statut'))
    expect(maj.sql).toContain('(partners.cabinet_id = ANY($3::uuid[]) OR partners.user_id = $4)')
  })

  test('un cabinet A ne peut pas être servi par la portée d’un cabinet B', async () => {
    simuler([{ cabinet_id: CAB_B, role: 'broker' }])
    const res = fausseReponse()
    await gestionnaire('get', '/')(requete(43), res)

    const liste = requetes.find((r) => r.sql.includes('FROM partners'))
    expect(liste.params[0]).toEqual([CAB_B])   // jamais CAB_A
    expect(JSON.stringify(liste.params)).not.toContain(CAB_A)
  })

  test('assistant : création refusée en 403 et AUCUNE écriture', async () => {
    simuler([{ cabinet_id: CAB_A, role: 'assistant' }])
    const res = fausseReponse()

    // Le refus vient de la garde de route : elle est dans la pile AVANT le
    // gestionnaire final. On l'exécute telle qu'Express l'enchaîne, et le
    // `next` qui lève prouve que la requête n'a jamais atteint le gestionnaire.
    const couche = router.stack.find((l) => l.route && l.route.path === '/' && l.route.methods.post)
    const garde = couche.route.stack[couche.route.stack.length - 2].handle
    await garde(requete(55, { body: { nom: 'p' } }), res, () => { throw new Error('la garde aurait dû refuser') })

    expect(res.code).toBe(403)
    expect(res.corps.error).toBe('lecture_seule')
    expect(requetes.some((r) => r.sql.includes('INSERT INTO partners'))).toBe(false)
  })

  test('identifiant non numérique : 400 (jamais 500, jamais un message SQL)', async () => {
    simuler([{ cabinet_id: CAB_A, role: 'broker' }])
    for (const chemin of ['put', 'delete']) {
      const res = fausseReponse()
      await gestionnaire(chemin, chemin === 'put' ? '/:id' : '/:id')(requete(7, { params: { id: 'abc' }, body: {} }), res)
      expect(res.code).toBe(400)
      expect(res.corps.error).toBe('identifiant_invalide')
    }
    expect(requetes.some((r) => r.sql.includes('UPDATE partners') || r.sql.includes('DELETE FROM partners'))).toBe(false)
  })

  test('champ trop long : 400 en nommant le champ, la base n’est pas appelée', async () => {
    simuler([{ cabinet_id: CAB_A, role: 'broker' }])
    const res = fausseReponse()
    await gestionnaire('post', '/')(requete(7, { body: { nom: 'x'.repeat(300) } }), res)

    expect(res.code).toBe(400)
    expect(res.corps.error).toBe('champ_trop_long')
    expect(res.corps.message).toContain('nom')
    expect(requetes.some((r) => r.sql.includes('INSERT INTO partners'))).toBe(false)
  })
})
