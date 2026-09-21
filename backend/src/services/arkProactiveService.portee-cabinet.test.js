/**
 * arkProactiveService.portee-cabinet.test.js — LE CONTEXTE ARK EST CELUI DU
 * CABINET (défaut P1 « deux vérités pour une même donnée », 21/09/2026).
 *
 * DÉFAUT MESURÉ : `loadArkContext` filtrait `courtier_id = $1` (clients,
 * contrats) et `courtier_id = $1 OR user_id = $1` (tâches). Un collaborateur
 * (`broker`) du cabinet recevait donc un contexte VIDE et ARK lui fabriquait des
 * cartes de repli hors sujet.
 *
 * CONTRAT TESTÉ : (a) membre de cabinet → clause CABINET, contexte du cabinet ;
 * (b) compte sans cabinet → clauses historiques EXACTES ; (c) compte révoqué →
 * rien (pas même les tâches qui lui sont affectées).
 */
jest.mock('@anthropic-ai/sdk', () => {
  const create = jest.fn()
  const Ctor = jest.fn(() => ({ messages: { create } }))
  Ctor.__create = create
  return Ctor
})

const { loadArkContext, computeAndStoreRiskScores, buildAndStoreMorningBrief } = require('./arkProactiveService')

const CAB_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const CAB_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
const PROPRIETAIRE = 140
const COLLABORATEUR = 146

const CABINET = [{ cabinet_id: CAB_A, role: 'broker', retire: false }]
const REVOQUE = [{ cabinet_id: CAB_A, role: 'broker', retire: true }]

const CLIENTS = [
  { id: 1, cabinet_id: CAB_A, courtier_id: PROPRIETAIRE, first_name: 'A', last_name: 'Un', status: 'actif' },
  { id: 2, cabinet_id: CAB_A, courtier_id: COLLABORATEUR, first_name: 'B', last_name: 'Deux', status: 'actif' },
  { id: 3, cabinet_id: CAB_B, courtier_id: 141, first_name: 'C', last_name: 'Trois', status: 'actif' },
]

/** Pool simulé : évalue la clause de portée présente dans le SQL. */
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
      requetes.push({ sql: s, params })
      if (/cabinet_members/.test(s)) return { rows: appartenances }
      if (s.startsWith('SELECT * FROM ark_budgets')) {
        return { rows: [{ user_id: COLLABORATEUR, paused: false, current_spend_micro_eur: 0, hard_cap_micro_eur: 25000000 }] }
      }
      if (/INSERT INTO ark_budgets|FROM ark_budgets/.test(s)) return { rows: [{ id: 1 }] }
      const { cabinetIds, userId } = porteeDe(params)
      const fausse = /AND FALSE/.test(s)
      const visible = (l) => !fausse && (cabinetIds.includes(l.cabinet_id) || l.courtier_id === userId || l.user_id === userId)
      if (/FROM clients c/.test(s)) return { rows: CLIENTS.filter(visible) }
      if (/FROM quotes q/.test(s)) return { rows: [] }
      if (/FROM taches/.test(s)) {
        return {
          rows: CLIENTS.filter(visible).map((l) => ({ id: l.id, client_id: l.id, titre: `Tâche ${l.id}`, statut: 'a_faire' })),
        }
      }
      return { rows: [] }
    },
  }
}

const requeteDe = (pool, motif) => pool.requetes.find((r) => motif.test(r.sql))

describe('arkProactiveService — portée du contexte ARK (P1)', () => {
  test('(a) membre du cabinet : clients et tâches du CABINET', async () => {
    const pool = creerPool(CABINET)
    const ctx = await loadArkContext(pool, COLLABORATEUR)

    const clients = requeteDe(pool, /FROM clients c/)
    expect(clients.sql).toContain('c.cabinet_id = ANY($1::uuid[])')
    expect(clients.params).toEqual([[CAB_A], COLLABORATEUR])

    const taches = requeteDe(pool, /FROM taches/)
    expect(taches.sql).toContain('taches.cabinet_id = ANY($1::uuid[])')
    expect(taches.sql).toContain('taches.user_id = $3')
    expect(taches.params).toEqual([[CAB_A], COLLABORATEUR, COLLABORATEUR])

    expect(ctx.clients.map((c) => c.id)).toEqual([1, 2])
    expect(ctx.tasks.length).toBe(2)
  })

  test('(b) compte SANS cabinet : clauses historiques exactes', async () => {
    const pool = creerPool([])
    const ctx = await loadArkContext(pool, PROPRIETAIRE)

    const clients = requeteDe(pool, /FROM clients c/)
    expect(clients.sql).toContain('c.courtier_id = $1')
    expect(clients.sql).not.toContain('= ANY(')
    expect(clients.params).toEqual([PROPRIETAIRE])

    const taches = requeteDe(pool, /FROM taches/)
    expect(taches.sql).toContain('taches.courtier_id = $1 OR taches.user_id = $2')
    expect(taches.sql).not.toContain('= ANY(')
    expect(taches.params).toEqual([PROPRIETAIRE, PROPRIETAIRE])

    expect(ctx.clients.map((c) => c.id)).toEqual([1])
  })

  test('(c) appartenance révoquée : aucune lecture, même des tâches affectées', async () => {
    const pool = creerPool(REVOQUE)
    const ctx = await loadArkContext(pool, COLLABORATEUR)

    expect(requeteDe(pool, /FROM clients c/).sql).toContain('AND FALSE')
    const taches = requeteDe(pool, /FROM taches/)
    expect(taches.sql).toContain('AND FALSE')
    expect(taches.sql).not.toContain('taches.user_id')
    expect(ctx.clients).toEqual([])
    expect(ctx.tasks).toEqual([])
  })

  test('les écritures de score et le brief matinal passent la même portée', async () => {
    const pool = creerPool(CABINET)
    await computeAndStoreRiskScores(pool, COLLABORATEUR, new Date('2026-09-21T08:00:00Z'))
    expect(requeteDe(pool, /FROM clients c/).sql).toContain('c.cabinet_id = ANY($1::uuid[])')

    delete process.env.ANTHROPIC_API_KEY
    const poolBrief = creerPool(CABINET)
    const resultat = await buildAndStoreMorningBrief(poolBrief, COLLABORATEUR)
    expect(resultat.source).toBe('deterministic_fallback')
    expect(requeteDe(poolBrief, /FROM clients c/).sql).toContain('c.cabinet_id = ANY($1::uuid[])')
    // Le contexte du cabinet alimente bien des cartes (2 clients du cabinet).
    expect(resultat.cards.length).toBeGreaterThan(0)
  })
})
