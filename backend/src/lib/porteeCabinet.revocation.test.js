/**
 * porteeCabinet.revocation.test.js — RETIRER UN COLLABORATEUR DU CABINET LUI
 * RETIRE SES DROITS (défaut D3-09, troisième QA adverse, mesuré le 20/09/2026).
 *
 * DÉFAUT MESURÉ : `UPDATE cabinet_members SET removed_at = NOW()` n'avait AUCUN
 * effet. L'appartenance active disparaissant, la résolution retombait sur le
 * repli « mono-utilisateur », dont `peutEcrire` vaut `true` : le collaborateur
 * écarté créait encore des clients (201), des tâches (201), des partenaires
 * (201) et S'ÉMETTAIT UNE CLÉ D'API PERMANENTE (201). Le retrait d'un membre
 * était un geste sans effet.
 *
 * CE QUE CE TEST FIGE
 *   1. appartenance RETIRÉE et aucune appartenance active ⇒ portée « revoquee » :
 *      ni écriture (403 `acces_revoque`), ni lecture (clause SQL toujours fausse) ;
 *   2. un membre ACTIF garde exactement les droits d'avant (aucune régression) ;
 *   3. un compte SANS aucune ligne `cabinet_members` garde le comportement
 *      historique « mono-utilisateur » (les comptes réels sans cabinet) ;
 *   4. être retiré d'un cabinet alors qu'on est actif dans un autre ne change
 *      rien : le retrait ne se propage pas d'un cabinet à l'autre.
 */
jest.mock('../db', () => ({ query: jest.fn() }))

const pool = require('../db')
const porteeCabinet = require('./porteeCabinet')

const CAB_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const CAB_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'

function fausseRequete(user = { id: 153, userId: 153 }) {
  return { user }
}

function fausseReponse() {
  return {
    statusCode: null,
    corps: null,
    status(c) { this.statusCode = c; return this },
    json(p) { this.corps = p; return this },
  }
}

describe('porteeCabinet — appartenance révoquée (D3-09)', () => {
  beforeEach(() => pool.query.mockReset())

  test('appartenance retirée, aucune appartenance active : zéro droit', async () => {
    pool.query.mockResolvedValue({ rows: [{ cabinet_id: CAB_A, role: 'broker', retire: true }] })
    const portee = await porteeCabinet.resoudrePortee(pool, fausseRequete())

    expect(portee.mode).toBe('revoquee')
    expect(portee.peutLireTout).toBe(false)
    expect(portee.peutEcrire).toBe(false)
    expect(portee.peutSupprimer).toBe(false)
    expect(portee.cabinetIds).toEqual([])
    expect(portee.role).toBe(null)
    expect(portee.motif).toContain('révoquée')
  })

  test('la lecture d’un dossier du cabinet ne peut plus rien retourner', async () => {
    pool.query.mockResolvedValue({ rows: [{ cabinet_id: CAB_A, role: 'broker', retire: true }] })
    const portee = await porteeCabinet.resoudrePortee(pool, fausseRequete())

    const f = porteeCabinet.fragment(portee, {
      cabinet: 'clients.cabinet_id',
      proprietaire: 'clients.courtier_id',
      depart: 1,
    })
    // Forme identique au repli mono (mêmes indices de paramètres), vérité
    // inverse : la clause ne peut correspondre à AUCUNE ligne.
    expect(f.sql).toBe('(clients.courtier_id = $1 AND FALSE)')
    expect(f.params).toEqual([153])
    expect(f.suivant).toBe(2)

    // Même en écriture, la clause reste fermée.
    const fe = porteeCabinet.fragment(portee, {
      cabinet: 'clients.cabinet_id',
      proprietaire: 'clients.courtier_id',
      depart: 2,
      ecriture: true,
    })
    expect(fe.sql).toBe('(clients.courtier_id = $2 AND FALSE)')
    expect(fe.params).toEqual([153])
  })

  test('écriture et suppression refusées : 403 acces_revoque, message produit', async () => {
    pool.query.mockResolvedValue({ rows: [{ cabinet_id: CAB_A, role: 'broker', retire: true }] })
    const portee = await porteeCabinet.resoudrePortee(pool, fausseRequete())

    const resEcriture = fausseReponse()
    expect(porteeCabinet.refuserEcriture(portee, resEcriture, 'créer un client')).toBe(true)
    expect(resEcriture.statusCode).toBe(403)
    expect(resEcriture.corps.error).toBe('acces_revoque')
    expect(resEcriture.corps.message).toMatch(/invitation/i)
    // Aucun identifiant interne, aucun rôle prétendu, aucun détail technique.
    expect(JSON.stringify(resEcriture.corps)).not.toMatch(/courtier_id|removed_at|SELECT/)

    const resSuppression = fausseReponse()
    expect(porteeCabinet.refuserSuppression(portee, resSuppression)).toBe(true)
    expect(resSuppression.statusCode).toBe(403)
    expect(resSuppression.corps.error).toBe('acces_revoque')
  })

  test('la forme brute de la base (`removed_at` renseigné) est traitée à l’identique', async () => {
    pool.query.mockResolvedValue({
      rows: [{ cabinet_id: CAB_A, role: 'broker', removed_at: '2026-09-20T23:18:25.311Z' }],
    })
    const portee = await porteeCabinet.resoudrePortee(pool, fausseRequete())
    expect(portee.mode).toBe('revoquee')
    expect(portee.peutEcrire).toBe(false)
  })

  test('le compte n’est PAS déconnecté : la réponse reste 403, jamais 401', async () => {
    // Un 401 ferait croire à une session perdue : la personne se reconnecterait
    // pour rien, son jeton est parfaitement valide. Le droit, lui, est retiré.
    pool.query.mockResolvedValue({ rows: [{ cabinet_id: CAB_A, role: 'broker', retire: true }] })
    const portee = await porteeCabinet.resoudrePortee(pool, fausseRequete())
    expect(portee.estAuthentifie).toBe(true)
    const res = fausseReponse()
    porteeCabinet.refuserEcriture(portee, res)
    expect(res.statusCode).toBe(403)
  })

  test('un membre ACTIF garde tous ses droits (aucune régression)', async () => {
    pool.query.mockResolvedValue({ rows: [{ cabinet_id: CAB_A, role: 'broker', retire: false }] })
    const portee = await porteeCabinet.resoudrePortee(pool, fausseRequete())
    expect(portee.mode).toBe('cabinet')
    expect(portee.role).toBe('broker')
    expect(portee.peutEcrire).toBe(true)
    expect(portee.cabinetIds).toEqual([CAB_A])
  })

  test('un assistant actif reste en lecture seule (403 lecture_seule, pas acces_revoque)', async () => {
    pool.query.mockResolvedValue({ rows: [{ cabinet_id: CAB_A, role: 'assistant', retire: false }] })
    const portee = await porteeCabinet.resoudrePortee(pool, fausseRequete())
    const res = fausseReponse()
    expect(porteeCabinet.refuserEcriture(portee, res)).toBe(true)
    expect(res.corps.error).toBe('lecture_seule')
  })

  test('un compte SANS aucune ligne cabinet_members garde la portée mono historique', async () => {
    pool.query.mockResolvedValue({ rows: [] })
    const portee = await porteeCabinet.resoudrePortee(pool, fausseRequete({ id: 7, userId: 7 }))
    expect(portee.mode).toBe('mono')
    expect(portee.peutEcrire).toBe(true)
  })

  test('retiré d’un cabinet mais ACTIF dans un autre : rien ne change pour lui', async () => {
    pool.query.mockResolvedValue({
      rows: [
        { cabinet_id: CAB_A, role: 'broker', retire: true },
        { cabinet_id: CAB_B, role: 'broker', retire: false },
      ],
    })
    const portee = await porteeCabinet.resoudrePortee(pool, fausseRequete())
    expect(portee.mode).toBe('cabinet')
    expect(portee.cabinetIds).toEqual([CAB_B])
    expect(portee.peutEcrire).toBe(true)
  })

  test('une panne de lecture des appartenances ne donne jamais plus de droits qu’avant', async () => {
    pool.query.mockRejectedValue(new Error('base indisponible'))
    const portee = await porteeCabinet.resoudrePortee(pool, fausseRequete({ id: 7, userId: 7 }))
    expect(portee.mode).toBe('mono')
  })

  test('la portée révoquée est mémoïsée : une seule lecture de cabinet_members', async () => {
    pool.query.mockResolvedValue({ rows: [{ cabinet_id: CAB_A, role: 'broker', retire: true }] })
    const req = fausseRequete()
    await porteeCabinet.resoudrePortee(pool, req)
    await porteeCabinet.resoudrePortee(pool, req)
    expect(pool.query).toHaveBeenCalledTimes(1)
  })

  test('la requête lit l’état de retrait (sinon « rien » et « retiré » seraient confondus)', async () => {
    pool.query.mockResolvedValue({ rows: [] })
    await porteeCabinet.resoudrePortee(pool, fausseRequete())
    const sql = String(pool.query.mock.calls[0][0])
    expect(sql).toContain('cm.removed_at IS NOT NULL')
    expect(sql).toContain('FROM cabinet_members cm')
  })
})
