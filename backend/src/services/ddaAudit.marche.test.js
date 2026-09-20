/**
 * ddaAudit.marche.test.js — L'AUDIT DE CONFORMITÉ PARLE LA LANGUE DU CABINET
 * ET NE SORT PAS DE SON PÉRIMÈTRE.
 *
 * Deux défauts mesurés le 20/09/2026 sur les routes `/api/dda/*` :
 *   1. le vocabulaire était figé sur la France : prompt « expert conformité DDA
 *      assurance courtage France », clé `risque_acpr` dans le contrat JSON rendu
 *      à l'écran, et mention « Ne se substitue pas à un audit ACPR formel » dans
 *      le PDF — servis à un cabinet suisse ;
 *   2. `loadDossierContext` chargeait `clients WHERE id=…` SANS contrôle
 *      d'appartenance : le dossier d'un client d'un AUTRE cabinet était audité
 *      (et résumé) dès qu'on connaissait son identifiant.
 */
jest.mock('../db', () => ({ query: jest.fn() }))

const pool = require('../db')
const porteeCabinet = require('../lib/porteeCabinet')
const { fuseauDuMarche } = require('../lib/marcheCabinet')
const { vocabulaireAudit, auditClient } = require('./ddaAudit')

describe('ddaAudit — vocabulaire du marché', () => {
  test('cabinet suisse : aucune autorité ni procédure française', () => {
    const v = vocabulaireAudit('CH')
    const brut = JSON.stringify(v)

    expect(v.marche).toBe('CH')
    expect(v.autorite).toBe('FINMA')
    expect(v.cle_risque).toBe('risque_controle')
    expect(brut).not.toMatch(/ACPR/)
    expect(brut).not.toMatch(/\bDDA\b/)
    expect(brut).not.toMatch(/ORIAS/)
    expect(brut).not.toMatch(/SIRET/)
    expect(v.titre_rapport).not.toMatch(/DDA/)
    // Aucune obligation suisse n'est inventée pour autant : le texte reste
    // descriptif du registre du cabinet.
    expect(v.mention_legale).toMatch(/registre du cabinet/)
  })

  test('cabinet français : il conserve son référentiel (ACPR + DDA)', () => {
    const v = vocabulaireAudit('FR')
    expect(v.autorite).toBe('ACPR')
    expect(v.cle_risque).toBe('risque_acpr')
    expect(v.titre_rapport).toMatch(/DDA/)
    expect(v.mention_legale).toMatch(/ACPR/)
  })

  test('marché absent ou inconnu : repli France, jamais un référentiel étranger', () => {
    for (const marche of [undefined, null, '', 'BE', 'ZZ']) {
      expect(vocabulaireAudit(marche).marche).toBe('FR')
    }
  })

  test('le fuseau horaire suit le marché (plus de « Europe/Paris » pour la Suisse)', () => {
    expect(fuseauDuMarche('CH')).toBe('Europe/Zurich')
    expect(fuseauDuMarche('FR')).toBe('Europe/Paris')
    expect(fuseauDuMarche(undefined)).toBe('Europe/Paris')
  })
})

describe('ddaAudit — portée cabinet du dossier audité', () => {
  const CAB_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  const requetes = []

  beforeEach(() => {
    requetes.length = 0
    pool.query.mockReset()
    pool.query.mockImplementation(async (sql, params) => {
      requetes.push({ sql: String(sql), params })
      return { rows: [], rowCount: 0 }
    })
  })

  test('un client hors cabinet n’est pas audité : 404, aucune donnée lue', async () => {
    await expect(
      auditClient(92, 42, { portee: porteeCabinet.porteeMono(42) })
    ).rejects.toMatchObject({ statut: 404, message: 'Client introuvable' })

    const lectureClient = requetes.find((r) => r.sql.includes('FROM clients'))
    // La clause de portée est bien dans la requête : le dossier d'un autre
    // cabinet ne peut pas être chargé.
    expect(lectureClient.sql).toContain('clients.courtier_id = $2')
    expect(lectureClient.params).toEqual([92, 42])
  })

  test('portée cabinet : la lecture du dossier porte le cabinet ET le créateur', async () => {
    // Portée « cabinet » construite à la main : `resoudrePortee` la produit
    // depuis `cabinet_members`, ce que le pool simulé fait ici à l'identique.
    const porteeCabinetDeA = {
      ...porteeCabinet.porteeMono(42),
      mode: 'cabinet',
      cabinetId: CAB_A,
      cabinetIds: Object.freeze([CAB_A]),
      cabinetIdsEcriture: Object.freeze([CAB_A]),
    }
    await expect(auditClient(92, 42, { portee: porteeCabinetDeA })).rejects.toMatchObject({ statut: 404 })

    const lectureClient = requetes.find((r) => r.sql.includes('FROM clients'))
    expect(lectureClient.sql).toContain('(clients.cabinet_id = ANY($2::uuid[]) OR clients.courtier_id = $3)')
    expect(lectureClient.params).toEqual([92, [CAB_A], 42])
  })
})
