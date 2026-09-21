/**
 * arkIntelligenceService.portee-cabinet.test.js — LES SCANS ARK PORTENT SUR LE
 * CABINET (défaut P1 « deux vérités pour une même donnée », 21/09/2026).
 *
 * DÉFAUT MESURÉ : les trois scans filtraient `c.courtier_id = $1`. Un
 * collaborateur (`broker`) obtenait « 0 client scanné », une matrice cross-sell
 * vide et aucune échéance à optimiser, quand le propriétaire du MÊME cabinet
 * obtenait les vrais chiffres.
 *
 * CONTRAT TESTÉ : (a) membre de cabinet → clause CABINET et clients du cabinet
 * scannés ; (b) compte sans cabinet → clause historique inchangée ; (c) compte
 * révoqué → rien.
 */
jest.mock('../db', () => ({ query: jest.fn() }))

const pool = require('../db')
const {
  computeChurnForUser,
  computeCrossSellMatrix,
  computeRenewalOptimizations,
} = require('./arkIntelligenceService')

const CAB_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const CAB_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
const PROPRIETAIRE = 140
const COLLABORATEUR = 146

const CABINET = [{ cabinet_id: CAB_A, role: 'broker', retire: false }]
const REVOQUE = [{ cabinet_id: CAB_A, role: 'broker', retire: true }]

const CLIENTS = [
  { id: 1, cabinet_id: CAB_A, courtier_id: PROPRIETAIRE, first_name: 'A', last_name: 'Un', status: 'actif', lifetime_value: 1000 },
  { id: 2, cabinet_id: CAB_A, courtier_id: COLLABORATEUR, first_name: 'B', last_name: 'Deux', status: 'actif', lifetime_value: 2000 },
  { id: 3, cabinet_id: CAB_B, courtier_id: 141, first_name: 'C', last_name: 'Trois', status: 'actif', lifetime_value: 3000 },
]

let requetes = []

function installerPool(appartenances) {
  requetes = []
  pool.query.mockReset()
  pool.query.mockImplementation(async (sql, params) => {
    const s = String(sql)
    requetes.push({ sql: s, params })
    if (/cabinet_members/.test(s)) return { rows: appartenances }
    if (/FROM clients c/.test(s) || /FROM quotes q/.test(s)) {
      const p = params || []
      if (/AND FALSE/.test(s)) return { rows: [] }
      const i = p.findIndex((x) => Array.isArray(x))
      const cabinetIds = i >= 0 ? p[i] : []
      const userId = i >= 0 ? p[i + 1] : p[0]
      const visibles = CLIENTS.filter((l) => cabinetIds.includes(l.cabinet_id) || l.courtier_id === userId)
      return { rows: visibles.map((l) => ({ ...l, quote_data: {}, status: 'actif', created_at: new Date() })) }
    }
    return { rows: [] }
  })
}

const requeteDe = (motif) => requetes.find((r) => motif.test(r.sql))

describe('arkIntelligenceService — portée des scans ARK (P1)', () => {
  test('(a) membre du cabinet : clause cabinet et clients du cabinet scannés', async () => {
    installerPool(CABINET)
    const resultat = await computeChurnForUser(COLLABORATEUR)

    const clients = requeteDe(/FROM clients c/)
    expect(clients.sql).toContain('c.cabinet_id = ANY($1::uuid[])')
    expect(clients.sql).toContain('c.courtier_id = $2')
    expect(clients.params).toEqual([[CAB_A], COLLABORATEUR])
    // Les 2 clients du cabinet, pas le seul sien : même chiffre que le propriétaire.
    expect(resultat.total_clients_scanned).toBe(2)
  })

  test('(b) compte SANS cabinet : clause historique `c.courtier_id = $1`', async () => {
    installerPool([])
    const resultat = await computeChurnForUser(PROPRIETAIRE)

    const clients = requeteDe(/FROM clients c/)
    expect(clients.sql).not.toContain('= ANY(')
    expect(clients.sql).toContain('c.courtier_id = $1')
    expect(clients.params).toEqual([PROPRIETAIRE])
    expect(resultat.total_clients_scanned).toBe(1)
  })

  test('(c) appartenance révoquée : aucun client scanné', async () => {
    installerPool(REVOQUE)
    const resultat = await computeChurnForUser(COLLABORATEUR)

    expect(requeteDe(/FROM clients c/).sql).toContain('AND FALSE')
    expect(resultat.total_clients_scanned).toBe(0)
    expect(resultat.top_risks).toEqual([])
  })

  test('matrice cross-sell : portée cabinet (a) / historique (b) / rien (c)', async () => {
    installerPool(CABINET)
    await computeCrossSellMatrix(COLLABORATEUR)
    expect(requeteDe(/FROM clients c/).sql).toContain('c.cabinet_id = ANY($1::uuid[])')
    expect(requeteDe(/FROM clients c/).params).toEqual([[CAB_A], COLLABORATEUR])

    installerPool([])
    await computeCrossSellMatrix(PROPRIETAIRE)
    expect(requeteDe(/FROM clients c/).sql).toContain('c.courtier_id = $1')
    expect(requeteDe(/FROM clients c/).sql).not.toContain('= ANY(')

    installerPool(REVOQUE)
    await computeCrossSellMatrix(COLLABORATEUR)
    expect(requeteDe(/FROM clients c/).sql).toContain('AND FALSE')
  })

  test('optimiseur de renouvellements : portée cabinet (a) / historique (b) / rien (c)', async () => {
    installerPool(CABINET)
    await computeRenewalOptimizations(COLLABORATEUR)
    expect(requeteDe(/FROM quotes q/).sql).toContain('c.cabinet_id = ANY($1::uuid[])')
    expect(requeteDe(/FROM quotes q/).params).toEqual([[CAB_A], COLLABORATEUR])

    installerPool([])
    await computeRenewalOptimizations(PROPRIETAIRE)
    expect(requeteDe(/FROM quotes q/).sql).toContain('c.courtier_id = $1')
    expect(requeteDe(/FROM quotes q/).sql).not.toContain('= ANY(')

    installerPool(REVOQUE)
    await computeRenewalOptimizations(COLLABORATEUR)
    expect(requeteDe(/FROM quotes q/).sql).toContain('AND FALSE')
  })
})
