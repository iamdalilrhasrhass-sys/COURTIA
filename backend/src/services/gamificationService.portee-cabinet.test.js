/**
 * gamificationService.portee-cabinet.test.js — LES COMPTEURS DE DÉBLOCAGE SONT
 * CEUX DU CABINET (défaut P1 « deux vérités pour une même donnée », 21/09/2026).
 *
 * DÉFAUT MESURÉ : les compteurs filtraient `clients.courtier_id = $1` et
 * `appointments.user_id = $1`. Un collaborateur (`broker`) du même cabinet
 * comptait donc 0 client et 0 rendez-vous : une carte qu'il voyait débloquée
 * chez son collègue ne se débloquait jamais pour lui.
 *
 * CONTRAT TESTÉ : (a) membre de cabinet → clause CABINET et compteur du cabinet
 * (la carte se débloque) ; (b) compte sans cabinet → clause historique ; (c)
 * compte révoqué → compteur nul, aucun déblocage.
 *
 * Le module `../db` est simulé (ces fonctions n'ont pas de paramètre `pool`).
 */
jest.mock('../db', () => ({ query: jest.fn() }))

const pool = require('../db')
const { checkUnlocks } = require('./gamificationService')

const CAB_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const CAB_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
const PROPRIETAIRE = 140
const COLLABORATEUR = 146

const CABINET = [{ cabinet_id: CAB_A, role: 'broker', retire: false }]
const REVOQUE = [{ cabinet_id: CAB_A, role: 'broker', retire: true }]

const CARTE = { id: 10, slug: 'deux-clients', unlock_condition_type: 'client_count', unlock_condition_value: 2, is_published: true, xp_reward: 0 }

const CLIENTS = [
  { id: 1, cabinet_id: CAB_A, courtier_id: PROPRIETAIRE },
  { id: 2, cabinet_id: CAB_A, courtier_id: COLLABORATEUR },
  { id: 3, cabinet_id: CAB_B, courtier_id: 141 },
]

const RENDEZ_VOUS = [
  { id: 1, cabinet_id: CAB_A, user_id: PROPRIETAIRE },
  { id: 2, cabinet_id: CAB_A, user_id: COLLABORATEUR },
  { id: 3, cabinet_id: CAB_B, user_id: 141 },
]

let requetes = []

function installerPool(appartenances) {
  requetes = []
  pool.query.mockReset()
  pool.query.mockImplementation(async (sql, params) => {
    const s = String(sql)
    const p = params || []
    requetes.push({ sql: s, params: p })
    if (/cabinet_members/.test(s)) return { rows: appartenances }
    if (/FROM user_skill_cards/.test(s)) return { rows: [] }
    if (/FROM skill_cards WHERE is_published/.test(s)) return { rows: [CARTE] }
    if (/FROM skill_cards WHERE id/.test(s)) return { rows: [CARTE] }
    if (/INSERT INTO user_skill_cards/.test(s)) return { rows: [{ id: 1 }] }
    if (/COUNT\(\*\) as c FROM (clients|appointments)/.test(s)) {
      const fausse = /AND FALSE/.test(s)
      const i = p.findIndex((x) => Array.isArray(x))
      const cabinetIds = i >= 0 ? p[i] : []
      const userId = i >= 0 ? p[i + 1] : p[0]
      const lignes = /FROM clients/.test(s) ? CLIENTS : RENDEZ_VOUS
      const n = fausse ? 0 : lignes.filter((l) => cabinetIds.includes(l.cabinet_id)
        || l.courtier_id === userId || l.user_id === userId).length
      return { rows: [{ c: String(n) }] }
    }
    return { rows: [] }
  })
}

const requeteDe = (motif) => requetes.find((r) => motif.test(r.sql))

describe('gamificationService — portée des compteurs de déblocage (P1)', () => {
  test('(a) membre du cabinet : le compteur porte sur le CABINET, la carte se débloque', async () => {
    installerPool(CABINET)
    const debloquees = await checkUnlocks(COLLABORATEUR, 'client_count', undefined)

    const compteur = requeteDe(/COUNT\(\*\) as c FROM clients/)
    expect(compteur.sql).toContain('cl.cabinet_id = ANY($1::uuid[])')
    expect(compteur.sql).toContain('cl.courtier_id = $2')
    expect(compteur.params).toEqual([[CAB_A], COLLABORATEUR])
    // 2 clients pour le cabinet : le seuil fédéral de la carte (2) est atteint
    // pour le collaborateur comme pour le propriétaire.
    expect(debloquees).toHaveLength(1)
  })

  test('(b) compte SANS cabinet : clause historique `cl.courtier_id = $1`', async () => {
    installerPool([])
    // Seuil non atteint avec ses seules lignes (1 client) : aucun déblocage.
    const debloquees = await checkUnlocks(PROPRIETAIRE, 'client_count', undefined)

    const compteur = requeteDe(/COUNT\(\*\) as c FROM clients/)
    expect(compteur.sql).not.toContain('= ANY(')
    expect(compteur.sql).toContain('cl.courtier_id = $1')
    expect(compteur.params).toEqual([PROPRIETAIRE])
    expect(debloquees).toHaveLength(0)
  })

  test('(c) appartenance révoquée : compteur nul, aucun déblocage', async () => {
    installerPool(REVOQUE)
    const debloquees = await checkUnlocks(COLLABORATEUR, 'client_count', undefined)

    expect(requeteDe(/COUNT\(\*\) as c FROM clients/).sql).toContain('AND FALSE')
    expect(debloquees).toHaveLength(0)
  })

  test('compteur de rendez-vous : portée cabinet (a) / historique (b)', async () => {
    installerPool(CABINET)
    await checkUnlocks(COLLABORATEUR, 'task_count', undefined)
    const rdv = requeteDe(/COUNT\(\*\) as c FROM appointments/)
    expect(rdv.sql).toContain('a.cabinet_id = ANY($1::uuid[])')
    expect(rdv.params).toEqual([[CAB_A], COLLABORATEUR])

    installerPool([])
    await checkUnlocks(PROPRIETAIRE, 'task_count', undefined)
    const rdvMono = requeteDe(/COUNT\(\*\) as c FROM appointments/)
    expect(rdvMono.sql).toContain('a.user_id = $1')
    expect(rdvMono.sql).not.toContain('= ANY(')
  })
})
