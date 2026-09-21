/**
 * claimsService.portee-cabinet.test.js — LES SINISTRES SONT CEUX DU CABINET
 * (défaut P1 « deux vérités pour une même donnée », 21/09/2026).
 *
 * DÉFAUT MESURÉ : toutes les requêtes filtraient `courtier_id = $n`. Un
 * collaborateur (`broker`) du même cabinet voyait 0 sinistre, recevait 404 sur le
 * détail d'un sinistre que le CRM lui affiche, et ne pouvait pas en ouvrir un
 * pour un client du cabinet — alors que la fiche client lui était servie.
 *
 * `claims` ne porte pas `cabinet_id` : son ancre est celle de son CLIENT
 * (`cl.cabinet_id` via la jointure). CONTRAT TESTÉ : (a) membre de cabinet →
 * clause CABINET et sinistres du cabinet ; (b) compte sans cabinet → clause
 * historique `c.courtier_id = $n` ; (c) compte révoqué → rien.
 */
const {
  createClaim,
  listClaims,
  getClaimById,
  updateClaim,
} = require('./claimsService')

const CAB_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const CAB_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
const PROPRIETAIRE = 140
const COLLABORATEUR = 146

const CABINET = [{ cabinet_id: CAB_A, role: 'broker', retire: false }]
const REVOQUE = [{ cabinet_id: CAB_A, role: 'broker', retire: true }]

// Le client du dossier appartient au cabinet A et a été créé par le PROPRIÉTAIRE.
const CLIENTS = { 148: { id: 148, cabinet_id: CAB_A, courtier_id: PROPRIETAIRE } }
// Sinistre 55 : client du cabinet A créé par le propriétaire (vu par le cabinet).
// Sinistre 56 : client du cabinet A créé par le collaborateur.
// Sinistre 57 : client d'un AUTRE cabinet.
const CLAIMS = [
  { id: 55, client_id: 148, courtier_id: PROPRIETAIRE, status: 'opened', type: 'auto_vol' },
  { id: 56, client_id: 149, courtier_id: COLLABORATEUR, status: 'opened', type: 'sante' },
  { id: 57, client_id: 150, courtier_id: 141, status: 'opened', type: 'auto_vol' },
]
const CABINET_DU_CLIENT = { 148: CAB_A, 149: CAB_A, 150: CAB_B }

const porteeDe = (params) => {
  const i = (params || []).findIndex((p) => Array.isArray(p))
  return { cabinetIds: i >= 0 ? params[i] : [], userId: i >= 0 ? params[i + 1] : (params || [])[0] }
}

function creerPool(appartenances) {
  const requetes = []
  return {
    requetes,
    query: async (sql, params) => {
      const s = String(sql)
      const p = params || []
      requetes.push({ sql: s, params: p })
      if (/cabinet_members/.test(s)) return { rows: appartenances }
      const fausse = /AND FALSE/.test(s)
      const { cabinetIds, userId } = porteeDe(p)
      const sinistreVisible = (l) => !fausse
        && (cabinetIds.includes(CABINET_DU_CLIENT[l.client_id]) || l.courtier_id === userId)
      if (/FROM claims c JOIN clients cl/.test(s)) {
        const id = /c\.id = \$1/.test(s) ? p[0] : null
        return { rows: CLAIMS.filter(sinistreVisible).filter((l) => (id === null || l.id === id)) }
      }
      if (/INSERT INTO claims/.test(s)) return { rows: [{ id: 99, ...{} }] }
      if (/UPDATE claims/.test(s)) {
        return { rows: CLAIMS.filter(sinistreVisible).filter((l) => l.id === p[0]) }
      }
      if (/FROM clients/.test(s)) {
        const client = CLIENTS[p[0]]
        const dedans = !fausse && client
          && (cabinetIds.includes(client.cabinet_id) || client.courtier_id === userId)
        return { rows: dedans ? [client] : [] }
      }
      return { rows: [] }
    },
  }
}

const requeteDe = (pool, motif) => pool.requetes.find((r) => motif.test(r.sql))

describe('claimsService — portée cabinet des sinistres (P1)', () => {
  test('(a) membre du cabinet : clause cabinet et sinistres du cabinet', async () => {
    const pool = creerPool(CABINET)
    const claims = await listClaims({ courtierId: COLLABORATEUR }, pool)

    const requete = requeteDe(pool, /FROM claims c JOIN clients cl/)
    expect(requete.sql).toContain('cl.cabinet_id = ANY($1::uuid[])')
    expect(requete.sql).toContain('c.courtier_id = $2')
    expect(requete.params[0]).toEqual([CAB_A])
    expect(requete.params[1]).toBe(COLLABORATEUR)
    // Les deux sinistres du cabinet (dont celui créé par le collègue), pas
    // seulement le sien : même chiffre pour les deux membres du cabinet.
    expect(claims.map((c) => c.id).sort()).toEqual([55, 56])
  })

  test('(b) compte SANS cabinet : clause historique `c.courtier_id = $1`', async () => {
    const pool = creerPool([])
    const claims = await listClaims({ courtierId: PROPRIETAIRE }, pool)

    const requete = requeteDe(pool, /FROM claims c JOIN clients cl/)
    expect(requete.sql).not.toContain('= ANY(')
    expect(requete.sql).toContain('c.courtier_id = $1')
    expect(requete.params[0]).toBe(PROPRIETAIRE)
    expect(claims.map((c) => c.id)).toEqual([55])
  })

  test('(c) appartenance révoquée : aucun sinistre, aucun détail', async () => {
    const pool = creerPool(REVOQUE)
    expect(await listClaims({ courtierId: COLLABORATEUR }, pool)).toEqual([])
    expect(requeteDe(pool, /FROM claims c JOIN clients cl/).sql).toContain('AND FALSE')

    expect(await getClaimById(55, COLLABORATEUR, pool)).toBeNull()
  })

  test('détail : clause cabinet en $2 (a) / historique (b)', async () => {
    const poolCabinet = creerPool(CABINET)
    const claim = await getClaimById(55, COLLABORATEUR, poolCabinet)
    const requete = requeteDe(poolCabinet, /FROM claims c JOIN clients cl/)
    expect(requete.sql).toContain('cl.cabinet_id = ANY($2::uuid[])')
    expect(requete.params).toEqual([55, [CAB_A], COLLABORATEUR])
    expect(claim.id).toBe(55)

    const poolMono = creerPool([])
    await getClaimById(55, PROPRIETAIRE, poolMono)
    expect(requeteDe(poolMono, /FROM claims c JOIN clients cl/).sql).toContain('c.courtier_id = $2')

    // Sinistre d'un AUTRE cabinet : refusé dans les deux régimes.
    const poolEtranger = creerPool(CABINET)
    expect(await getClaimById(57, COLLABORATEUR, poolEtranger)).toBeNull()
  })

  test('création : le client d’un collègue du cabinet est accepté, celui d’un autre cabinet refusé', async () => {
    const poolCabinet = creerPool(CABINET)
    const claim = await createClaim({ courtierId: COLLABORATEUR, clientId: 148, type: 'auto_vol' }, poolCabinet)
    expect(claim.id).toBe(99)
    const controle = requeteDe(poolCabinet, /FROM clients/)
    expect(controle.sql).toContain('clients.cabinet_id = ANY($2::uuid[])')
    expect(controle.params).toEqual([148, [CAB_A], COLLABORATEUR])

    // Sans cabinet : le dossier du propriétaire n'est pas « le sien ».
    const poolMono = creerPool([])
    await expect(createClaim({ courtierId: COLLABORATEUR, clientId: 148, type: 'auto_vol' }, poolMono))
      .rejects.toThrow('Client non autorise')

    // Client d'un autre cabinet : refusé aussi.
    const poolEtranger = creerPool(CABINET)
    await expect(createClaim({ courtierId: COLLABORATEUR, clientId: 1500, type: 'auto_vol' }, poolEtranger))
      .rejects.toThrow('Client non autorise')
  })

  test('mise à jour : la portée est portée par la jointure `FROM clients cl`', async () => {
    const pool = creerPool(CABINET)
    const maj = await updateClaim(55, COLLABORATEUR, { status: 'settled' }, pool)
    const requete = requeteDe(pool, /UPDATE claims/)
    expect(requete.sql).toContain('FROM clients cl')
    expect(requete.sql).toContain('cl.cabinet_id = ANY($2::uuid[])')
    expect(requete.sql).toContain('c.courtier_id = $3')
    expect(maj).toBeDefined()

    // Sinistre d'un autre cabinet : aucune ligne mise à jour.
    const poolEtranger = creerPool(CABINET)
    expect(await updateClaim(57, COLLABORATEUR, { status: 'settled' }, poolEtranger)).toBeNull()

    // Compte révoqué : clause fausse, rien n'est écrit.
    const poolRevoque = creerPool(REVOQUE)
    expect(await updateClaim(55, COLLABORATEUR, { status: 'settled' }, poolRevoque)).toBeNull()
    expect(requeteDe(poolRevoque, /UPDATE claims/).sql).toContain('AND FALSE')
  })
})
