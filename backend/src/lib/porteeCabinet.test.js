/**
 * porteeCabinet.test.js — l'autorisation multi-utilisateur a UN SEUL point
 * d'entrée, et il résout la bonne portée pour chaque rôle.
 *
 * POURQUOI CE TEST : le défaut corrigé (un collaborateur `broker` voyait
 * 0 client quand le propriétaire en voyait 1) venait d'une règle implicite
 * répétée dans chaque route : « mes données = courtier_id = mon id ». Ce test
 * fige la règle unique qui la remplace :
 *   owner / manager / broker → tout le cabinet, lecture ET écriture
 *   assistant / viewer       → tout le cabinet en LECTURE seulement
 *   aucun cabinet            → ses propres lignes (comportement historique)
 */
jest.mock('../db', () => ({ query: jest.fn() }))

const pool = require('../db')
const porteeCabinet = require('./porteeCabinet')

const CAB_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const CAB_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'

function fausseRequete(user = { id: 7, userId: 7 }) {
  return { user }
}

describe('porteeCabinet — résolution de la portée', () => {
  beforeEach(() => pool.query.mockReset())

  test('sans appartenance : portée mono-utilisateur (comportement historique)', async () => {
    pool.query.mockResolvedValue({ rows: [] })
    const portee = await porteeCabinet.resoudrePortee(pool, fausseRequete())
    expect(portee.mode).toBe('mono')
    expect(portee.userId).toBe(7)
    expect(portee.cabinetIds).toEqual([])
    expect(portee.peutEcrire).toBe(true)
    const f = porteeCabinet.fragment(portee, { cabinet: 'clients.cabinet_id', proprietaire: 'clients.courtier_id' })
    expect(f.sql).toBe('clients.courtier_id = $1')
    expect(f.params).toEqual([7])
    expect(f.suivant).toBe(2)
  })

  test('owner : tout le cabinet, lecture et écriture', async () => {
    pool.query.mockResolvedValue({ rows: [{ cabinet_id: CAB_A, role: 'owner' }] })
    const portee = await porteeCabinet.resoudrePortee(pool, fausseRequete())
    expect(portee).toMatchObject({ mode: 'cabinet', role: 'owner', cabinetId: CAB_A, peutEcrire: true, peutSupprimer: true })
    expect(portee.cabinetIds).toEqual([CAB_A])
  })

  test('broker : tout le cabinet (le modèle d’un CRM de cabinet à cette taille)', async () => {
    pool.query.mockResolvedValue({ rows: [{ cabinet_id: CAB_A, role: 'broker' }] })
    const portee = await porteeCabinet.resoudrePortee(pool, fausseRequete())
    expect(portee.role).toBe('broker')
    expect(portee.peutEcrire).toBe(true)
    expect(portee.cabinetIds).toEqual([CAB_A])
  })

  test('assistant / viewer : lecture du cabinet, écriture refusée', async () => {
    for (const role of ['assistant', 'viewer']) {
      pool.query.mockReset()
      pool.query.mockResolvedValue({ rows: [{ cabinet_id: CAB_A, role }] })
      const portee = await porteeCabinet.resoudrePortee(pool, fausseRequete())
      expect(portee.peutLireTout).toBe(true)
      expect(portee.cabinetIds).toEqual([CAB_A])
      expect(portee.peutEcrire).toBe(false)
      expect(portee.peutSupprimer).toBe(false)

      const res = { statusCode: null, corps: null, status(c) { this.statusCode = c; return this }, json(p) { this.corps = p; return this } }
      expect(porteeCabinet.refuserEcriture(portee, res)).toBe(true)
      expect(res.statusCode).toBe(403)
      expect(res.corps.error).toBe('lecture_seule')
    }
  })

  test('plusieurs cabinets : le rôle le plus élevé donne le cabinet courant, l’écriture reste par cabinet', async () => {
    pool.query.mockResolvedValue({
      rows: [
        { cabinet_id: CAB_A, role: 'broker' },
        { cabinet_id: CAB_B, role: 'assistant' },
      ],
    })
    const portee = await porteeCabinet.resoudrePortee(pool, fausseRequete())
    expect(portee.role).toBe('broker')
    expect(portee.cabinetId).toBe(CAB_A)
    expect([...portee.cabinetIds].sort()).toEqual([CAB_A, CAB_B])
    // L'écriture ne doit PAS déborder sur le cabinet où l'on est assistant.
    expect([...portee.cabinetIdsEcriture]).toEqual([CAB_A])

    const lecture = porteeCabinet.fragment(portee, { cabinet: 'clients.cabinet_id', proprietaire: 'clients.courtier_id', depart: 1 })
    expect(lecture.sql).toBe('(clients.cabinet_id = ANY($1::uuid[]) OR clients.courtier_id = $2)')
    expect(lecture.params).toEqual([[CAB_A, CAB_B], 7])
    expect(lecture.suivant).toBe(3)

    const ecriture = porteeCabinet.fragment(portee, { cabinet: 'clients.cabinet_id', proprietaire: 'clients.courtier_id', depart: 1, ecriture: true })
    expect(ecriture.params).toEqual([[CAB_A], 7])
  })

  test('une panne de lecture des appartenances ne donne JAMAIS plus de droits', async () => {
    pool.query.mockRejectedValue(new Error('base indisponible'))
    const portee = await porteeCabinet.resoudrePortee(pool, fausseRequete())
    expect(portee.mode).toBe('mono')
    expect(portee.cabinetIds).toEqual([])
    expect(portee.motif).toContain('mono-utilisateur')
  })

  test('des lignes d’appartenance invalides ne fabriquent pas de cabinet', async () => {
    pool.query.mockResolvedValue({ rows: [{ id: 42 }, { cabinet_id: null, role: 'owner' }] })
    const portee = await porteeCabinet.resoudrePortee(pool, fausseRequete())
    expect(portee.mode).toBe('mono')
  })

  test('une requête non authentifiée n’a aucune portée', async () => {
    const portee = await porteeCabinet.resoudrePortee(pool, { user: {} })
    expect(portee.userId).toBe(null)
    expect(portee.estAuthentifie).toBe(false)
  })

  test('la portée est mémoïsée : une seule lecture de cabinet_members par requête', async () => {
    pool.query.mockResolvedValue({ rows: [{ cabinet_id: CAB_A, role: 'owner' }] })
    const req = fausseRequete()
    await porteeCabinet.resoudrePortee(pool, req)
    await porteeCabinet.resoudrePortee(pool, req)
    await porteeCabinet.resoudrePortee(pool, req)
    expect(pool.query).toHaveBeenCalledTimes(1)
  })
})

describe('porteeCabinet — estampillage des créations', () => {
  test('cabinet : la création porte le cabinet courant ; mono : rien (NULL)', async () => {
    expect(porteeCabinet.cabinetPourCreation({ cabinetId: CAB_A })).toBe(CAB_A)
    expect(porteeCabinet.cabinetPourCreation(porteeCabinet.porteeMono(7))).toBe(null)
    expect(porteeCabinet.cabinetPourCreation(null)).toBe(null)
  })
})
