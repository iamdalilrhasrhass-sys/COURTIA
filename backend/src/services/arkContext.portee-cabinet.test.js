/**
 * arkContext.portee-cabinet.test.js — LE PORTEFEUILLE ET LE BRIEF SONT CEUX DU
 * CABINET (défaut P1 « deux vérités pour une même donnée », 21/09/2026).
 *
 * DÉFAUT MESURÉ : `getPortfolioContext` et `getMorningBriefContext` filtraient
 * `courtier_id = $1`. Un collaborateur (`broker`) du même cabinet lisait donc
 * « 0 client / 0 échéance » là où le propriétaire lisait 1 : deux chiffres pour
 * la même donnée, dans le même cabinet.
 *
 * CONTRAT TESTÉ (pour chaque lecture convertie)
 *   (a) membre de cabinet → clause `c.cabinet_id = ANY($1::uuid[])` et les lignes
 *       du CABINET sont bien vues (même total que le propriétaire) ;
 *   (b) compte SANS cabinet → clause historique `c.courtier_id = $1` (inchangée) ;
 *   (c) appartenance RÉVOQUÉE → clause fausse par construction, aucune lecture.
 *
 * Le module `../db` est simulé (ces fonctions n'ont pas de paramètre `pool`) : le
 * faux pool joue le rôle de la base pour la SEULE décision qui compte ici, la
 * clause de portée. Une ligne est visible si son `cabinet_id` figure dans la liste
 * passée en `$n::uuid[]`, ou si son propriétaire est l'utilisateur passé en
 * scalaire — exactement la sémantique documentée du fragment.
 */
jest.mock('../db', () => ({ query: jest.fn() }))

const pool = require('../db')
const { getPortfolioContext, getMorningBriefContext } = require('./arkContext')

const CAB_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const CAB_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
const PROPRIETAIRE = 140
const COLLABORATEUR = 146

const LIGNES = [
  { id: 1, cabinet_id: CAB_A, courtier_id: PROPRIETAIRE, status: 'actif', quote: true },
  { id: 2, cabinet_id: CAB_A, courtier_id: COLLABORATEUR, status: 'actif', tache: true },
  { id: 3, cabinet_id: CAB_B, courtier_id: 141, status: 'actif', quote: true },
]

const CABINET = [{ cabinet_id: CAB_A, role: 'broker', retire: false }]
const REVOQUE = [{ cabinet_id: CAB_A, role: 'broker', retire: true }]

let requetes = []

function installerPool({ appartenances, lignes = LIGNES }) {
  requetes = []
  pool.query.mockReset()
  pool.query.mockImplementation(async (sql, params) => {
    const s = String(sql)
    requetes.push({ sql: s, params })
    if (/cabinet_members/.test(s)) return { rows: appartenances, rowCount: appartenances.length }
    if (/total_clients/.test(s)) {
      const vues = visibles(s, params || [], lignes)
      return {
        rows: [{
          total_clients: String(vues.length),
          clients_actifs: String(vues.filter((l) => l.status === 'actif').length),
          contrats_actifs: '0',
          prime_totale_annuelle: '0',
        }],
      }
    }
    if (/FROM broker_profiles|FROM users/.test(s)) {
      return { rows: [{ first_name: 'Dalil', cabinet_name: 'Cabinet' }] }
    }
    if (/FROM taches t/.test(s)) {
      return { rows: visibles(s, params || [], lignes).filter((l) => l.tache).map((l) => ({ id: l.id, titre: 'Relancer' })) }
    }
    if (/FROM quotes q/.test(s)) return { rows: visibles(s, params || [], lignes).filter((l) => l.quote) }
    if (/FROM clients c/.test(s)) return { rows: visibles(s, params || [], lignes) }
    return { rows: [], rowCount: 0 }
  })
}

/**
 * Clause de portée → lignes visibles. C'est ICI que le test vérifie la vérité du
 * SQL : « AND FALSE » ne renvoie rien, `= ANY($n::uuid[])` renvoie le cabinet,
 * `courtier_id = $n` ne renvoie que les lignes de la personne.
 */
function visibles(sql, params, lignes) {
  if (/AND FALSE/.test(sql)) return []
  const i = params.findIndex((p) => Array.isArray(p))
  const cabinetIds = i >= 0 ? params[i] : []
  const userId = i >= 0 ? params[i + 1] : params[0]
  return lignes.filter((l) => cabinetIds.includes(l.cabinet_id) || l.courtier_id === userId)
}

const requeteDe = (motif) => requetes.find((r) => motif.test(r.sql))

describe('arkContext — portée du portefeuille et du brief (P1)', () => {
  test('(a) membre du cabinet : clause cabinet + les lignes du cabinet sont comptées', async () => {
    installerPool({ appartenances: CABINET })
    const ctx = await getPortfolioContext(COLLABORATEUR)

    const kpi = requeteDe(/total_clients/)
    expect(kpi.sql).toContain('c.cabinet_id = ANY($1::uuid[])')
    expect(kpi.sql).toContain('c.courtier_id = $2')
    expect(kpi.params[0]).toEqual([CAB_A])
    expect(kpi.params[1]).toBe(COLLABORATEUR)
    // Le cabinet entier (2 clients), pas les seuls siens (1).
    expect(ctx.kpi.totalClients).toBe(2)

    const contrats = requeteDe(/FROM quotes q\s+JOIN clients c/)
    expect(contrats.sql).toContain('c.cabinet_id = ANY($1::uuid[])')
    expect(contrats.params).toEqual([[CAB_A], COLLABORATEUR])
  })

  test('(a bis) propriétaire et collaborateur lisent LE MÊME portefeuille', async () => {
    installerPool({ appartenances: CABINET })
    const portee = { userId: COLLABORATEUR, mode: 'cabinet', cabinetIds: [CAB_A], cabinetIdsEcriture: [CAB_A] }
    const ctxCollaborateur = await getPortfolioContext(COLLABORATEUR, { portee })
    const ctxProprietaire = await getPortfolioContext(COLLABORATEUR)
    expect(ctxCollaborateur.kpi.totalClients).toBe(2)
    expect(ctxProprietaire.kpi.totalClients).toBe(2)
  })

  test('(b) compte SANS cabinet : clause historique `courtier_id = $1` inchangée', async () => {
    installerPool({ appartenances: [] })
    const ctx = await getPortfolioContext(PROPRIETAIRE)

    for (const motif of [/total_clients/, /FROM quotes q\s+JOIN clients c/, /FROM clients c/]) {
      const r = requeteDe(motif)
      expect(r.sql).not.toContain('= ANY(')
      expect(r.sql).toContain('c.courtier_id = $1')
      expect(r.params).toEqual([PROPRIETAIRE])
    }
    expect(ctx.kpi.totalClients).toBe(1)
  })

  test('(c) appartenance révoquée : aucune ligne du cabinet n’est lue', async () => {
    installerPool({ appartenances: REVOQUE })
    const ctx = await getPortfolioContext(COLLABORATEUR)

    const kpi = requeteDe(/total_clients/)
    expect(kpi.sql).toContain('AND FALSE')
    expect(ctx.kpi.totalClients).toBe(0)
    expect(ctx.alerts.contratsExpiring).toEqual([])
  })

  test('brief matinal : tâches et relances du cabinet, agenda et WhatsApp restent personnels', async () => {
    installerPool({ appartenances: CABINET })
    const brief = await getMorningBriefContext(COLLABORATEUR)

    const taches = requeteDe(/FROM taches t/)
    expect(taches.sql).toContain('t.cabinet_id = ANY($1::uuid[])')
    // L'affectation personnelle reste acceptée (aucune donnée existante ne
    // disparaît) : `t.user_id` devient $3, l'échéance $4.
    expect(taches.sql).toContain('t.user_id = $3')
    expect(taches.params[0]).toEqual([CAB_A])
    expect(taches.params[1]).toBe(COLLABORATEUR)
    expect(brief.todayTasks).toHaveLength(1)

    const relances = requeteDe(/INTERVAL '7 days'/)
    expect(relances.sql).toContain('c.cabinet_id = ANY($1::uuid[])')

    const rdv = requeteDe(/FROM calendar_events/)
    expect(rdv.sql).toContain('ce.user_id = $1')
    expect(rdv.sql).not.toContain('= ANY(')

    const whatsapp = requeteDe(/FROM whatsapp_threads/)
    expect(whatsapp.sql).toContain('wt.user_id = $1')
    expect(whatsapp.sql).not.toContain('= ANY(')
  })

  test('brief matinal d’un compte révoqué : aucune tâche, même affectée à lui', async () => {
    installerPool({ appartenances: REVOQUE })
    const brief = await getMorningBriefContext(COLLABORATEUR)

    const taches = requeteDe(/FROM taches t/)
    expect(taches.sql).toContain('AND FALSE')
    expect(taches.sql).not.toContain('t.user_id')
    expect(brief.todayTasks).toEqual([])
  })
})
