/**
 * arkVoice.portee-cabinet.test.js — L'APPEL CLIENT SE RÉSOUT DANS LE CABINET
 * (défaut P1 « deux vérités pour une même donnée », 21/09/2026).
 *
 * DÉFAUT MESURÉ : `clients ... courtier_id=$2` et `opportunites ... broker_id=$2`.
 * Un collaborateur (`broker`) du même cabinet voyait le dossier dans le CRM,
 * lançait l'appel ARK et recevait « Client introuvable » : la même donnée
 * n'existait pas pour lui.
 *
 * CONTRAT TESTÉ : (a) membre de cabinet → dossier trouvé et appel passé ;
 * (b) compte sans cabinet → clause historique `courtier_id=$2` (le dossier d'un
 * tiers reste introuvable) ; (c) compte révoqué → rien.
 *
 * `axios` est simulé (aucun appel réseau) : Vapi n'est pas joint.
 */
jest.mock('../db', () => ({ query: jest.fn() }))
jest.mock('axios', () => {
  const post = jest.fn(async () => ({ data: { id: 'vapi-call-1' } }))
  return { create: jest.fn(() => ({ post })), __post: post }
})

const pool = require('../db')
const axios = require('axios')
const { placeClientCall } = require('./arkVoice')

const CAB_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const CAB_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
const PROPRIETAIRE = 140
const COLLABORATEUR = 146

const CABINET = [{ cabinet_id: CAB_A, role: 'broker', retire: false }]
const REVOQUE = [{ cabinet_id: CAB_A, role: 'broker', retire: true }]

// Le dossier appartient au PROPRIÉTAIRE du cabinet, pas à l'appelant.
const CLIENT = { id: 148, cabinet_id: CAB_A, courtier_id: PROPRIETAIRE, phone: '+41790000000', last_name: 'Dossier', type: 'particulier' }

let requetes = []

function installerPool(appartenances, client = CLIENT) {
  requetes = []
  pool.query.mockReset()
  axios.__post.mockClear()
  pool.query.mockImplementation(async (sql, params) => {
    const s = String(sql)
    const p = params || []
    requetes.push({ sql: s, params: p })
    if (/cabinet_members/.test(s)) return { rows: appartenances }
    if (/FROM clients|SELECT \* FROM clients/.test(s)) {
      if (/AND FALSE/.test(s)) return { rows: [] }
      const i = p.findIndex((x) => Array.isArray(x))
      const visible = i >= 0
        ? (p[i] || []).includes(client.cabinet_id) || client.courtier_id === p[i + 1]
        : client.courtier_id === p[p.length - 1]
      return { rows: visible ? [client] : [] }
    }
    if (/FROM users/.test(s)) return { rows: [{ first_name: 'Dalil', last_name: 'X' }] }
    if (/FROM opportunites/.test(s)) {
      if (/AND FALSE/.test(s)) return { rows: [] }
      const i = p.findIndex((x) => Array.isArray(x))
      const visible = i >= 0 && (p[i] || []).includes(client.cabinet_id)
      return { rows: visible ? [{ product_current: 'Auto', estimated_revenue: 100, status: 'detected' }] : [] }
    }
    if (/FROM client_documents/.test(s)) return { rows: [{ docs: null }] }
    if (/INSERT INTO voice_calls/.test(s)) return { rows: [{ id: 9, call_type: 'qualification' }] }
    return { rows: [] }
  })
}

const requeteDe = (motif) => requetes.find((r) => motif.test(r.sql))

describe('arkVoice — portée du dossier pour l’appel client (P1)', () => {
  test('(a) membre du cabinet : le dossier d’un collègue est trouvé, l’appel est passé', async () => {
    installerPool(CABINET)
    const call = await placeClientCall(COLLABORATEUR, CLIENT.id, 'qualification')

    const dossier = requeteDe(/FROM clients/)
    expect(dossier.sql).toContain('clients.cabinet_id = ANY($2::uuid[])')
    expect(dossier.sql).toContain('clients.courtier_id = $3')
    expect(dossier.params).toEqual([CLIENT.id, [CAB_A], COLLABORATEUR])

    const oppo = requeteDe(/FROM opportunites/)
    expect(oppo.sql).toContain('opportunites.cabinet_id = ANY($2::uuid[])')
    expect(oppo.params).toEqual([CLIENT.id, [CAB_A], COLLABORATEUR])

    expect(axios.__post).toHaveBeenCalledTimes(1)
    expect(call.id).toBe(9)
  })

  test('(b) compte SANS cabinet : clause historique `courtier_id=$2`, dossier d’un tiers introuvable', async () => {
    installerPool([])
    const dossier = () => requeteDe(/FROM clients/)

    await expect(placeClientCall(PROPRIETAIRE, CLIENT.id, 'relance')).resolves.toBeDefined()
    expect(dossier().sql).not.toContain('= ANY(')
    expect(dossier().sql).toContain('clients.courtier_id = $2')
    expect(dossier().params).toEqual([CLIENT.id, PROPRIETAIRE])

    // Un compte sans cabinet n'est PAS le propriétaire du dossier : refus, et
    // AUCUN appel téléphonique n'est lancé.
    installerPool([])
    await expect(placeClientCall(COLLABORATEUR, CLIENT.id, 'relance'))
      .rejects.toThrow('Client introuvable')
    expect(axios.__post).not.toHaveBeenCalled()
  })

  test('(c) appartenance révoquée : aucun dossier, aucun appel', async () => {
    installerPool(REVOQUE)
    await expect(placeClientCall(COLLABORATEUR, CLIENT.id, 'relance'))
      .rejects.toThrow('Client introuvable')
    expect(requeteDe(/FROM clients/).sql).toContain('AND FALSE')
    expect(axios.__post).not.toHaveBeenCalled()
  })

  test('la portée déjà résolue évite toute requête d’appartenance ("options.portee")', async () => {
    installerPool([])
    await placeClientCall(COLLABORATEUR, CLIENT.id, 'relance', {}, {
      portee: { userId: COLLABORATEUR, mode: 'cabinet', cabinetIds: [CAB_A], cabinetIdsEcriture: [CAB_A] },
    })
    expect(requetes.some((r) => /cabinet_members/.test(r.sql))).toBe(false)
    expect(requeteDe(/FROM clients/).sql).toContain('clients.cabinet_id = ANY($2::uuid[])')
  })

  test('le cabinet ÉTRANGER reste refusé (aucun élargissement)', async () => {
    installerPool(CABINET, { ...CLIENT, cabinet_id: CAB_B })
    await expect(placeClientCall(COLLABORATEUR, CLIENT.id, 'relance'))
      .rejects.toThrow('Client introuvable')
    expect(axios.__post).not.toHaveBeenCalled()
  })
})
