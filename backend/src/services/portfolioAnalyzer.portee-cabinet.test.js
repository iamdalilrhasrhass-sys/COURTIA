/**
 * portfolioAnalyzer.portee-cabinet.test.js — LE HEALTH SCORE ET LE SCORE D'UN
 * DOSSIER SONT CEUX DU CABINET (défaut P1 « deux vérités pour une même
 * donnée », 21/09/2026).
 *
 * DÉFAUT MESURÉ : `clients ... courtier_id = $1` (portefeuille) et
 * `clients ... courtier_id = $2` (dossier). Un collaborateur (`broker`) du même
 * cabinet obtenait un health score calculé sur un portefeuille VIDE et
 * `getClientScoreBreakdown` renvoyait `null` sur un dossier que le CRM lui
 * affiche.
 *
 * CONTRAT TESTÉ : (a) membre de cabinet → clause CABINET, portefeuille et dossier
 * du cabinet lus ; (b) compte sans cabinet → clauses historiques ; (c) compte
 * révoqué → rien.
 */
jest.mock('../db', () => ({ query: jest.fn() }))
jest.mock('@anthropic-ai/sdk', () => jest.fn())

const pool = require('../db')
const { calculateHealthScore, getClientScoreBreakdown } = require('./portfolioAnalyzer')

const CAB_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const CAB_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
const PROPRIETAIRE = 140
const COLLABORATEUR = 146

const CABINET = [{ cabinet_id: CAB_A, role: 'broker', retire: false }]
const REVOQUE = [{ cabinet_id: CAB_A, role: 'broker', retire: true }]

const CLIENTS = [
  { id: 1, cabinet_id: CAB_A, courtier_id: PROPRIETAIRE, email: 'a@x.ch', phone: '0790000001', address: 'Rue 1', profession: 'x', situation_familiale: 'marie', status: 'actif', created_at: new Date('2020-01-01'), notes: null },
  { id: 2, cabinet_id: CAB_A, courtier_id: COLLABORATEUR, email: 'b@x.ch', phone: '0790000002', address: 'Rue 2', profession: 'y', situation_familiale: 'celibataire', status: 'actif', created_at: new Date('2020-01-01'), notes: null },
  { id: 3, cabinet_id: CAB_B, courtier_id: 141, email: 'c@x.ch', phone: '0790000003', address: 'Rue 3', profession: 'z', situation_familiale: 'marie', status: 'actif', created_at: new Date('2020-01-01'), notes: null },
]

const DOSSIER = { id: 148, cabinet_id: CAB_A, courtier_id: PROPRIETAIRE, email: 'd@x.ch', phone: '0790000004', address: 'Rue 4', profession: 'p', situation_familiale: 'marie', notes: null, status: 'actif', created_at: new Date('2020-01-01') }

let requetes = []

function installerPool(appartenances) {
  requetes = []
  pool.query.mockReset()
  const porteeDe = (params) => {
    const i = (params || []).findIndex((p) => Array.isArray(p))
    return {
      cabinetIds: i >= 0 ? params[i] : [],
      // Repli mono : le fragment occupe les DERNIERS paramètres de la requête
      // (ici `depart: 2` pour le dossier, `depart: 1` pour le portefeuille).
      userId: i >= 0 ? params[i + 1] : (params || [])[params.length - 1],
    }
  }
  pool.query.mockImplementation(async (sql, params) => {
    const s = String(sql)
    requetes.push({ sql: s, params })
    if (/cabinet_members/.test(s)) return { rows: appartenances }
    if (/information_schema/.test(s)) return { rows: [] }
    const fausse = /AND FALSE/.test(s)
    const { cabinetIds, userId } = porteeDe(params)
    if (/FROM clients c WHERE/.test(s)) {
      return { rows: fausse ? [] : CLIENTS.filter((l) => cabinetIds.includes(l.cabinet_id) || l.courtier_id === userId) }
    }
    if (/FROM clients\s+WHERE id = \$1/.test(s)) {
      const dedans = !fausse && (cabinetIds.includes(DOSSIER.cabinet_id) || DOSSIER.courtier_id === userId)
      return { rows: dedans ? [DOSSIER] : [] }
    }
    if (/COUNT\(\*\) FILTER/.test(s)) return { rows: [{ last_30: '0', prev_30: '0' }] }
    if (/FROM quotes q/.test(s)) {
      return { rows: fausse ? [] : [{ id: 1, client_id: 1, status: 'actif', compagnie: 'Aurora', type_contrat: 'Auto', created_at: new Date('2020-01-01'), updated_at: new Date('2020-01-01') }] }
    }
    if (/FROM quotes\s+WHERE client_id/.test(s)) {
      return { rows: [{ id: 1, status: 'actif', compagnie: 'Aurora', type_contrat: 'Auto', prime_annuelle: '1200', created_at: new Date('2020-01-01'), updated_at: new Date('2020-01-01') }] }
    }
    if (/FROM appointments a/.test(s)) {
      if (fausse) return { rows: [] }
      return { rows: [{ client_id: 1, last_appt: new Date('2026-08-01') }] }
    }
    if (/FROM appointments/.test(s)) return { rows: [{ last_appt: fausse ? null : new Date('2026-08-01') }] }
    if (/ark_conversations/.test(s)) return { rows: [] }
    return { rows: [] }
  })
}

const requeteDe = (motif) => requetes.find((r) => motif.test(r.sql))

describe('portfolioAnalyzer — portée du portefeuille et du dossier (P1)', () => {
  test('(a) membre du cabinet : health score calculé sur le portefeuille du CABINET', async () => {
    installerPool(CABINET)
    const score = await calculateHealthScore(COLLABORATEUR)

    const clients = requeteDe(/FROM clients c WHERE/)
    expect(clients.sql).toContain('c.cabinet_id = ANY($1::uuid[])')
    expect(clients.params).toEqual([[CAB_A], COLLABORATEUR])
    expect(score.total_clients).toBe(2)

    const rdv = requeteDe(/FROM appointments a/)
    expect(rdv.sql).toContain('a.cabinet_id = ANY($1::uuid[])')

    const conversations = requeteDe(/ark_conversations/)
    expect(conversations.sql).toContain('cl.cabinet_id = ANY($1::uuid[])')

    const quotes = requeteDe(/FROM quotes q/)
    expect(quotes.sql).toContain('c.cabinet_id = ANY($1::uuid[])')
  })

  test('(b) compte SANS cabinet : clauses historiques exactes', async () => {
    installerPool([])
    const score = await calculateHealthScore(PROPRIETAIRE)

    for (const [motif, clause] of [
      [/FROM clients c WHERE/, 'c.courtier_id = $1'],
      [/FROM quotes q/, 'c.courtier_id = $1'],
      [/FROM appointments a/, 'a.user_id = $1'],
    ]) {
      const r = requeteDe(motif)
      expect(r.sql).not.toContain('= ANY(')
      expect(r.sql).toContain(clause)
    }
    expect(score.total_clients).toBe(1)
  })

  test('(c) appartenance révoquée : portefeuille vide', async () => {
    installerPool(REVOQUE)
    const score = await calculateHealthScore(COLLABORATEUR)

    expect(requeteDe(/FROM clients c WHERE/).sql).toContain('AND FALSE')
    expect(score.total_clients).toBe(0)
  })

  test('score d’un DOSSIER : cabinet (a) / historique (b) / révoqué (c)', async () => {
    installerPool(CABINET)
    const breakdown = await getClientScoreBreakdown(DOSSIER.id, COLLABORATEUR)
    const dossier = requeteDe(/FROM clients\s+WHERE id = \$1/)
    expect(dossier.sql).toContain('clients.cabinet_id = ANY($2::uuid[])')
    expect(dossier.sql).toContain('clients.courtier_id = $3')
    expect(dossier.params).toEqual([DOSSIER.id, [CAB_A], COLLABORATEUR])
    expect(breakdown).not.toBeNull()
    expect(breakdown.client_id).toBe(DOSSIER.id)

    installerPool([])
    expect(await getClientScoreBreakdown(DOSSIER.id, PROPRIETAIRE)).not.toBeNull()
    expect(requeteDe(/FROM clients\s+WHERE id = \$1/).sql).toContain('clients.courtier_id = $2')

    installerPool(REVOQUE)
    expect(await getClientScoreBreakdown(DOSSIER.id, COLLABORATEUR)).toBeNull()
    expect(requeteDe(/FROM clients\s+WHERE id = \$1/).sql).toContain('AND FALSE')
  })
})
