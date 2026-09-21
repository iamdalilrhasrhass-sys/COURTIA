/**
 * arkBrief.portee-cabinet.test.js — LE BRIEF MATINAL EST CELUI DU CABINET
 * (défaut P1 « deux vérités pour une même donnée », 21/09/2026).
 *
 * DÉFAUT MESURÉ : les trois lectures filtraient `r.broker_id = $1` /
 * `c.courtier_id = $1`. Un collaborateur (`broker`) recevait donc un brief VIDE
 * (« Journée calme : aucune action urgente détectée ») là où le propriétaire du
 * même cabinet recevait six actions : le brief affirmait une absence d'activité
 * qui n'existait pas.
 *
 * CONTRAT TESTÉ : (a) membre de cabinet → clause CABINET et actions du cabinet ;
 * (b) compte sans cabinet → clause historique inchangée ; (c) compte révoqué →
 * rien.
 */
const { generateMorningBrief } = require('./arkBrief')

const CAB_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const CAB_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
const PROPRIETAIRE = 140
const COLLABORATEUR = 146

const CABINET = [{ cabinet_id: CAB_A, role: 'broker', retire: false }]
const REVOQUE = [{ cabinet_id: CAB_A, role: 'broker', retire: true }]

const RELANCES = [
  { id: 1, cabinet_id: CAB_A, broker_id: PROPRIETAIRE, subject: 'Relance auto', channel: 'email' },
  { id: 3, cabinet_id: CAB_B, broker_id: 141, subject: 'Relance étrangère', channel: 'email' },
]
const ECHEANCES = [
  { id: 1, cabinet_id: CAB_A, courtier_id: PROPRIETAIRE, jours: 12, prime: 800, type_contrat: 'Auto', client_name: 'Marta' },
  { id: 3, cabinet_id: CAB_B, courtier_id: 141, jours: 12, prime: 800, type_contrat: 'Auto', client_name: 'Étranger' },
]

/**
 * Pool simulé : évalue la clause de portée réellement présente dans le SQL.
 * `AND FALSE` ne renvoie rien ; `= ANY($n::uuid[])` renvoie le cabinet ;
 * `courtier_id = $n` / `broker_id = $n` ne renvoient que les lignes de la personne.
 */
function creerPool(appartenances) {
  const requetes = []
  const visibles = (sql, params, lignes) => {
    if (/AND FALSE/.test(sql)) return []
    const i = params.findIndex((p) => Array.isArray(p))
    const cabinetIds = i >= 0 ? params[i] : []
    const userId = i >= 0 ? params[i + 1] : params[0]
    return lignes.filter((l) => cabinetIds.includes(l.cabinet_id)
      || l.courtier_id === userId || l.broker_id === userId)
  }
  return {
    requetes,
    query: async (sql, params) => {
      const s = String(sql)
      requetes.push({ sql: s, params })
      if (/cabinet_members/.test(s)) return { rows: appartenances }
      if (/FROM relances r/.test(s)) return { rows: visibles(s, params || [], RELANCES) }
      if (/FROM quotes q/.test(s)) return { rows: visibles(s, params || [], ECHEANCES) }
      if (/FROM clients c/.test(s)) return { rows: visibles(s, params || [], ECHEANCES) }
      return { rows: [] }
    },
  }
}

const requeteDe = (pool, motif) => pool.requetes.find((r) => motif.test(r.sql))

describe('arkBrief — portée du brief matinal (P1)', () => {
  test('(a) membre du cabinet : clause cabinet, le brief décrit le cabinet', async () => {
    const pool = creerPool(CABINET)
    const brief = await generateMorningBrief(COLLABORATEUR, pool)

    const relances = requeteDe(pool, /FROM relances r/)
    expect(relances.sql).toContain('r.cabinet_id = ANY($1::uuid[])')
    expect(relances.sql).toContain('r.broker_id = $2')
    expect(relances.params).toEqual([[CAB_A], COLLABORATEUR])

    const echeances = requeteDe(pool, /FROM quotes q/)
    expect(echeances.sql).toContain('c.cabinet_id = ANY($1::uuid[])')
    expect(echeances.params).toEqual([[CAB_A], COLLABORATEUR])

    const sansContrat = requeteDe(pool, /NOT EXISTS/)
    expect(sansContrat.sql).toContain('c.cabinet_id = ANY($1::uuid[])')

    // Les lignes du cabinet produisent des actions : plus de « journée calme ».
    expect(brief.actions.length).toBeGreaterThan(0)
    expect(brief.headline).not.toMatch(/Journée calme/)
    expect(brief.actions.map((a) => a.client_name)).toContain('Marta')
  })

  test('(b) compte SANS cabinet : les trois clauses historiques sont intactes', async () => {
    const pool = creerPool([])
    const brief = await generateMorningBrief(PROPRIETAIRE, pool)

    for (const [motif, clause] of [
      [/FROM relances r/, 'r.broker_id = $1'],
      [/FROM quotes q/, 'c.courtier_id = $1'],
      [/NOT EXISTS/, 'c.courtier_id = $1'],
    ]) {
      const r = requeteDe(pool, motif)
      expect(r.sql).not.toContain('= ANY(')
      expect(r.sql).toContain(clause)
      expect(r.params).toEqual([PROPRIETAIRE])
    }
    expect(brief.actions.map((a) => a.client_name)).toContain('Marta')
  })

  test('(c) appartenance révoquée : le brief ne lit plus rien', async () => {
    const pool = creerPool(REVOQUE)
    const brief = await generateMorningBrief(COLLABORATEUR, pool)

    for (const motif of [/FROM relances r/, /FROM quotes q/, /NOT EXISTS/]) {
      expect(requeteDe(pool, motif).sql).toContain('AND FALSE')
    }
    expect(brief.actions).toEqual([])
    expect(brief.headline).toMatch(/Journée calme/)
  })

  test('la portée déjà résolue évite toute requête d’appartenance (« options.portee »)', async () => {
    const pool = creerPool([])
    await generateMorningBrief(COLLABORATEUR, pool, {
      portee: { userId: COLLABORATEUR, mode: 'cabinet', cabinetIds: [CAB_A], cabinetIdsEcriture: [CAB_A] },
    })
    expect(pool.requetes.some((r) => /cabinet_members/.test(r.sql))).toBe(false)
    expect(requeteDe(pool, /FROM relances r/).sql).toContain('r.cabinet_id = ANY($1::uuid[])')
  })
})
