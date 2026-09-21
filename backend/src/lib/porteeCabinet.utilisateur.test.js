/**
 * porteeCabinet.utilisateur.test.js — la portée résolue SANS requête HTTP doit
 * être identique à celle résolue pour une route.
 *
 * POURQUOI ce test : les services (contexte ARK, veille, portail, quote-intel)
 * ne reçoivent qu'un `userId`. S'ils filtraient `courtier_id = $1`, un
 * collaborateur d'un cabinet à plusieurs commerciaux voyait un portefeuille
 * VIDE alors que le CRM lui montrait tout le cabinet. La règle doit être la
 * même sur les deux chemins — c'est ce que vérifie ce fichier.
 */
const porteeCabinet = require('./porteeCabinet')

const CABINET = '11111111-1111-1111-1111-111111111111'

function poolSimule(lignes) {
  return {
    query: jest.fn(async () => ({ rows: lignes })),
    _lignes: lignes,
  }
}

describe('resoudrePorteeUtilisateur', () => {
  it('donne la portée cabinet à un membre actif', async () => {
    const portee = await porteeCabinet.resoudrePorteeUtilisateur(
      poolSimule([{ cabinet_id: CABINET, role: 'broker', retire: false }]),
      42
    )
    expect(portee.mode).toBe('cabinet')
    expect(portee.cabinetIds).toEqual([CABINET])
    expect(portee.peutEcrire).toBe(true)
  })

  it('reste mono-utilisateur sans appartenance', async () => {
    const portee = await porteeCabinet.resoudrePorteeUtilisateur(poolSimule([]), 42)
    expect(portee.mode).toBe('mono')
    const f = porteeCabinet.fragment(portee, { cabinet: 'c.cabinet_id', proprietaire: 'c.courtier_id' })
    expect(f.sql).toBe('c.courtier_id = $1')
  })

  it('ne donne AUCUN droit à un membre révoqué', async () => {
    const portee = await porteeCabinet.resoudrePorteeUtilisateur(
      poolSimule([{ cabinet_id: CABINET, role: 'broker', retire: true }]),
      42
    )
    expect(portee.mode).toBe('revoquee')
    expect(portee.peutEcrire).toBe(false)
    const f = porteeCabinet.fragment(portee, { cabinet: 'c.cabinet_id', proprietaire: 'c.courtier_id' })
    expect(f.sql).toMatch(/FALSE/)
  })

  it('retombe sur la portée mono si la table est illisible (jamais plus de droits)', async () => {
    const pool = { query: jest.fn(async () => { throw new Error('relation "cabinet_members" does not exist') }) }
    const portee = await porteeCabinet.resoudrePorteeUtilisateur(pool, 42)
    expect(portee.mode).toBe('mono')
    expect(portee.peutEcrire).toBe(true)
  })

  it('réutilise la portée déjà résolue par la route (aucune requête en plus)', async () => {
    const pool = poolSimule([])
    const connue = porteeCabinet.porteeMono(42)
    const portee = await porteeCabinet.resoudrePorteeUtilisateur(pool, 42, { portee: connue })
    expect(portee).toBe(connue)
    expect(pool.query).not.toHaveBeenCalled()
  })

  it('ignore une portée fournie pour un AUTRE utilisateur', async () => {
    const pool = poolSimule([{ cabinet_id: CABINET, role: 'owner', retire: false }])
    const etrangere = porteeCabinet.porteeMono(999)
    const portee = await porteeCabinet.resoudrePorteeUtilisateur(pool, 42, { portee: etrangere })
    expect(portee.userId).toBe(42)
    expect(portee.mode).toBe('cabinet')
  })

  it('la clause de Cabinet EST identique à celle d’une route (mêmes paramètres)', async () => {
    const lignes = [{ cabinet_id: CABINET, role: 'owner', retire: false }]
    const parService = await porteeCabinet.resoudrePorteeUtilisateur(poolSimule(lignes), 42)
    const parRoute = await porteeCabinet.resoudrePortee(poolSimule(lignes), { user: { id: 42 } })
    const opts = { cabinet: 'c.cabinet_id', proprietaire: 'c.courtier_id' }
    expect(porteeCabinet.fragment(parService, opts)).toEqual(porteeCabinet.fragment(parRoute, opts))
  })
})
