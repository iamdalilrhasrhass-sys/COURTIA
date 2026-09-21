/**
 * searchService.portee-cabinet.test.js — LA RECHERCHE PORTE SUR LE CABINET
 * (défaut P1 « deux vérités pour une même donnée », 21/09/2026).
 *
 * DÉFAUT MESURÉ : la palette filtrait `c.courtier_id = $1` (clients, contrats) et
 * `d.user_id = $1` (documents). Un collaborateur (`broker`) cherchait un client
 * que le CRM lui affiche et obtenait « aucun résultat » : la palette démentait
 * les écrans.
 *
 * CONTRAT TESTÉ : (a) membre de cabinet → clause CABINET et résultats du
 * cabinet ; (b) compte sans cabinet → clauses historiques ; (c) compte révoqué →
 * plus aucun résultat métier (seules les actions statiques restent).
 */
const { searchCourtia } = require('./searchService')

const CAB_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const CAB_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
const PROPRIETAIRE = 140
const COLLABORATEUR = 146

const CABINET = [{ cabinet_id: CAB_A, role: 'broker', retire: false }]
const REVOQUE = [{ cabinet_id: CAB_A, role: 'broker', retire: true }]

const CLIENTS = [
  { id: 1, cabinet_id: CAB_A, courtier_id: PROPRIETAIRE, first_name: 'Sophie', last_name: 'Martin' },
  { id: 2, cabinet_id: CAB_A, courtier_id: COLLABORATEUR, first_name: 'Sophie', last_name: 'Dupont' },
  { id: 3, cabinet_id: CAB_B, courtier_id: 141, first_name: 'Sophie', last_name: 'Étrangère' },
]

function creerPool(appartenances) {
  const requetes = []
  const porteeDe = (params) => {
    const i = (params || []).findIndex((p) => Array.isArray(p))
    return { cabinetIds: i >= 0 ? params[i] : [], userId: i >= 0 ? params[i + 1] : (params || [])[0] }
  }
  return {
    requetes,
    query: async (sql, params) => {
      const s = String(sql)
      const p = params || []
      requetes.push({ sql: s, params: p })
      if (/cabinet_members/.test(s)) return { rows: appartenances }
      const fausse = /AND FALSE/.test(s)
      const { cabinetIds, userId } = porteeDe(p)
      const visibles = CLIENTS.filter((l) => !fausse
        && (cabinetIds.includes(l.cabinet_id) || l.courtier_id === userId))
      if (/FROM clients c/.test(s)) {
        return { rows: visibles.map((l) => ({ type: 'client', id: l.id, title: `${l.first_name} ${l.last_name}`, subtitle: 'Client', path: `/clients/${l.id}` })) }
      }
      if (/FROM quotes q/.test(s)) {
        return { rows: visibles.map((l) => ({ type: 'contrat', id: l.id + 100, title: 'Auto', subtitle: l.last_name, path: `/clients/${l.id}` })) }
      }
      if (/FROM documents d/.test(s)) {
        return { rows: visibles.map((l) => ({ type: 'document', id: l.id + 200, title: 'FIC', subtitle: 'Document', path: `/clients/${l.id}` })) }
      }
      return { rows: [] }
    },
  }
}

const requeteDe = (pool, motif) => pool.requetes.find((r) => motif.test(r.sql))

describe('searchService — portée de la recherche (P1)', () => {
  test('(a) membre du cabinet : clauses CABINET et résultats du cabinet', async () => {
    const pool = creerPool(CABINET)
    const resultats = await searchCourtia(pool, COLLABORATEUR, 'sophie')

    const clients = requeteDe(pool, /FROM clients c/)
    expect(clients.sql).toContain('c.cabinet_id = ANY($1::uuid[])')
    expect(clients.sql).toContain('c.courtier_id = $2')
    expect(clients.params[0]).toEqual([CAB_A])
    expect(clients.params[1]).toBe(COLLABORATEUR)
    // Le motif de recherche suit l'indice rendu par le fragment ($3).
    expect(clients.sql).toContain('ILIKE $3')
    expect(clients.params[2]).toBe('%sophie%')

    const contrats = requeteDe(pool, /FROM quotes q/)
    expect(contrats.sql).toContain('c.cabinet_id = ANY($1::uuid[])')

    const documents = requeteDe(pool, /FROM documents d/)
    expect(documents.sql).toContain('d.cabinet_id = ANY($1::uuid[])')
    expect(documents.sql).toContain('d.user_id = $2')

    // Les deux clients du cabinet, pas le seul sien.
    expect(resultats.filter((r) => r.type === 'client')).toHaveLength(2)
  })

  test('(b) compte SANS cabinet : clauses historiques intactes', async () => {
    const pool = creerPool([])
    const resultats = await searchCourtia(pool, PROPRIETAIRE, 'sophie')

    const clients = requeteDe(pool, /FROM clients c/)
    expect(clients.sql).not.toContain('= ANY(')
    expect(clients.sql).toContain('c.courtier_id = $1')
    expect(clients.params).toEqual([PROPRIETAIRE, '%sophie%'])

    const documents = requeteDe(pool, /FROM documents d/)
    expect(documents.sql).toContain('d.user_id = $1')
    expect(documents.params).toEqual([PROPRIETAIRE, '%sophie%'])

    expect(resultats.filter((r) => r.type === 'client')).toHaveLength(1)
  })

  test('(c) appartenance révoquée : plus aucun résultat métier', async () => {
    const pool = creerPool(REVOQUE)
    const resultats = await searchCourtia(pool, COLLABORATEUR, 'sophie')

    for (const motif of [/FROM clients c/, /FROM quotes q/, /FROM documents d/]) {
      expect(requeteDe(pool, motif).sql).toContain('AND FALSE')
    }
    expect(resultats.filter((r) => r.type !== 'action')).toEqual([])
  })

  test('la portée déjà résolue évite toute requête d’appartenance ("options.portee")', async () => {
    const pool = creerPool([])
    await searchCourtia(pool, COLLABORATEUR, 'sophie', {
      portee: { userId: COLLABORATEUR, mode: 'cabinet', cabinetIds: [CAB_A], cabinetIdsEcriture: [CAB_A] },
    })
    expect(pool.requetes.some((r) => /cabinet_members/.test(r.sql))).toBe(false)
    expect(requeteDe(pool, /FROM clients c/).sql).toContain('c.cabinet_id = ANY($1::uuid[])')
  })
})
