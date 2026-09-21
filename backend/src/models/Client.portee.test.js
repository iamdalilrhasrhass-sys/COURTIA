/**
 * Client.portee.test.js — LE MODÈLE CLIENT NE PEUT PAS ÉCRIRE SANS PORTÉE
 * (défaut P4 SEC-030a, résidu mesuré le 21/09/2026).
 *
 * CE QUE CE TEST FIGE
 *   1. une ÉCRITURE sans portée résolue est REFUSÉE (`portee_requise`) — et
 *      aucune requête n'est envoyée à la base ;
 *   2. quand une portée est fournie, la clause de portée est réellement dans la
 *      requête : `courtier_id` (repli mono) ou `cabinet_id` (cabinet) — et elle
 *      lie le PROPRIÉTAIRE, jamais l'identifiant de la ligne modifiée ;
 *   3. la requête est EXÉCUTABLE : le nombre de paramètres fournis correspond
 *      exactement au plus grand indice `$n` du texte SQL. Un décalage d'un seul
 *      cran (relevé sur `update` : `clausePortee(p, 9)` alors que `$9` est déjà
 *      l'identifiant du client) fait refuser la requête par PostgreSQL
 *      (« bind message supplies N parameters, but prepared statement requires
 *      M ») — ou, pire, compare la portée à l'identifiant de la ligne : un
 *      client dont l'`id` vaut celui de l'appelant passerait.
 */
jest.mock('../db', () => ({ query: jest.fn() }))

const pool = require('../db')
const Client = require('./Client')

const CAB_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const PROPRIETAIRE = 7
const CLIENT_ID = 5

const PORTEE_MONO = PROPRIETAIRE
const PORTEE_CABINET = { userId: PROPRIETAIRE, cabinetIds: [CAB_A] }

/** Plus grand indice `$n` réellement présent dans le texte SQL. */
function plusGrandIndice(sql) {
  const indices = [...String(sql).matchAll(/\$(\d+)/g)].map((m) => Number(m[1]))
  return indices.length ? Math.max(...indices) : 0
}

/** La requête telle qu'elle a été envoyée au pool (texte + paramètres). */
function derniereRequete() {
  const appels = pool.query.mock.calls
  if (appels.length === 0) throw new Error('aucune requête n’a été envoyée à la base')
  const [sql, params] = appels[appels.length - 1]
  return { sql: String(sql), params: params || [] }
}

beforeEach(() => {
  pool.query.mockReset()
  pool.query.mockResolvedValue({ rows: [{ id: CLIENT_ID }], rowCount: 1 })
})

describe('écritures sans portée : REFUSÉES, sans toucher la base', () => {
  test.each([
    ['update', [CLIENT_ID, { first_name: 'X' }]],
    ['update', [CLIENT_ID, { first_name: 'X' }, null]],
    ['update', [CLIENT_ID, { first_name: 'X' }, {}]],
    ['update', [CLIENT_ID, { first_name: 'X' }, '7']],
    ['create', [{ first_name: 'X' }]],
    ['delete', [CLIENT_ID]],
    ['updateScores', [CLIENT_ID, 10, 20]],
    ['findAll', []],
    ['count', []],
  ])('%s(...) refuse sans portée explicite', async (methode, args) => {
    await expect(Client[methode](...args)).rejects.toThrow(/portee_requise/)
    expect(pool.query).not.toHaveBeenCalled()
  })

  test('l’ancienne signature `update(id, data)` est inutilisable par accident', async () => {
    await expect(Client.update(CLIENT_ID, { status: 'client' })).rejects.toThrow(/portee_requise/)
    expect(pool.query).not.toHaveBeenCalled()
  })
})

describe('écritures avec portée : la clause lie le PROPRIÉTAIRE, pas la ligne', () => {
  test('repli mono : `courtier_id` est un paramètre DISTINCT de l’identifiant', async () => {
    await Client.update(CLIENT_ID, { first_name: 'Nadia' }, PORTEE_MONO)
    const { sql, params } = derniereRequete()

    expect(sql).toMatch(/UPDATE clients\s+SET/)
    // La portée porte sur le courtier…
    expect(sql).toMatch(/courtier_id = \$10/)
    // …et l'identifiant de la ligne reste $9 : deux paramètres différents.
    expect(sql).toMatch(/WHERE id = \$9/)
    expect(params[8]).toBe(CLIENT_ID)
    expect(params[9]).toBe(PROPRIETAIRE)
    // Requête EXÉCUTABLE : autant de paramètres que d'indices.
    expect(plusGrandIndice(sql)).toBe(params.length)
  })

  test('portée cabinet : clause cabinet ET propriétaire, paramètres alignés', async () => {
    await Client.update(CLIENT_ID, { first_name: 'Nadia' }, PORTEE_CABINET)
    const { sql, params } = derniereRequete()

    expect(sql).toMatch(/cabinet_id = ANY\(\$10::uuid\[\]\)/)
    expect(sql).toMatch(/courtier_id = \$11/)
    expect(params[8]).toBe(CLIENT_ID)
    expect(params[9]).toEqual([CAB_A])
    expect(params[10]).toBe(PROPRIETAIRE)
    expect(plusGrandIndice(sql)).toBe(params.length)
  })

  test('suppression bornée : la clause de portée est dans le SQL', async () => {
    await Client.delete(CLIENT_ID, PORTEE_MONO)
    const { sql, params } = derniereRequete()
    expect(sql).toMatch(/DELETE FROM clients WHERE id = \$1 AND courtier_id = \$2/)
    expect(params).toEqual([CLIENT_ID, PROPRIETAIRE])
    expect(plusGrandIndice(sql)).toBe(params.length)
  })

  test('création bornée : `courtier_id` est écrit et le cabinet estampillé', async () => {
    await Client.create({ first_name: 'Nadia' }, PORTEE_CABINET)
    const { sql, params } = derniereRequete()
    expect(sql).toMatch(/INSERT INTO clients/)
    expect(sql).toMatch(/courtier_id/)
    expect(params).toContain(PROPRIETAIRE)
    expect(params).toContain(CAB_A)
    expect(plusGrandIndice(sql)).toBe(params.length)
  })

  test('comptage et liste bornés : aucun accès global possible', async () => {
    await Client.count(PORTEE_MONO)
    expect(derniereRequete().sql).toMatch(/WHERE courtier_id = \$1/)
    pool.query.mockClear()
    await Client.findAll(10, 0, PORTEE_CABINET)
    const { sql, params } = derniereRequete()
    expect(sql).toMatch(/cabinet_id = ANY\(\$3::uuid\[\]\) OR courtier_id = \$4/)
    expect(params).toEqual([10, 0, [CAB_A], PROPRIETAIRE])
    expect(plusGrandIndice(sql)).toBe(params.length)
  })

  test('écriture de scores bornée : paramètres alignés dans les deux régimes', async () => {
    await Client.updateScores(CLIENT_ID, 61, 20, PORTEE_MONO)
    let { sql, params } = derniereRequete()
    expect(sql).toMatch(/WHERE id = \$3 AND courtier_id = \$4/)
    expect(params).toEqual([61, 20, CLIENT_ID, PROPRIETAIRE])
    expect(plusGrandIndice(sql)).toBe(params.length)

    pool.query.mockClear()
    await Client.updateScores(CLIENT_ID, 61, 20, PORTEE_CABINET)
    ;({ sql, params } = derniereRequete())
    expect(sql).toMatch(/cabinet_id = ANY\(\$4::uuid\[\]\) OR courtier_id = \$5/)
    expect(params).toEqual([61, 20, CLIENT_ID, [CAB_A], PROPRIETAIRE])
    expect(plusGrandIndice(sql)).toBe(params.length)
  })
})

describe('lecture : portée optionnelle mais appliquée dès qu’elle est fournie', () => {
  test('sans portée, la lecture interne reste possible (usage interne assumé)', async () => {
    await Client.findById(CLIENT_ID)
    expect(derniereRequete().sql).toMatch(/SELECT \* FROM clients WHERE id = \$1/)
  })

  test('avec portée, la lecture est bornée au cabinet', async () => {
    await Client.findById(CLIENT_ID, PORTEE_CABINET)
    const { sql, params } = derniereRequete()
    expect(sql).toMatch(/WHERE id = \$1 AND \(cabinet_id = ANY\(\$2::uuid\[\]\) OR courtier_id = \$3\)/)
    expect(params).toEqual([CLIENT_ID, [CAB_A], PROPRIETAIRE])
    expect(plusGrandIndice(sql)).toBe(params.length)
  })
})
