/**
 * conformite.referentiel-marche.test.js — LE RÉFÉRENTIEL SERVI À L'ÉCRAN SUIT LE
 * MARCHÉ DU CABINET (protection des données ET familles de produits).
 *
 * POURQUOI CE TEST : deux constats d'audit portaient sur l'écran /conformite.
 *   • CH-026 — aucune mention de la nLPD n'était servie : le bloc RGPD/CGV/CGU
 *     était écrit en dur dans la page, pour tous les marchés. Un cabinet suisse
 *     lisait donc le RGPD, un règlement de l'Union européenne, comme s'il était
 *     son droit ;
 *   • CH-039 — aucun référentiel de produits par marché n'existait : un cabinet
 *     suisse se voyait proposer des familles françaises (IARD, emprunteur,
 *     habitation) au lieu de ses LAMal, LCA, LAA ou LPP.
 *
 * Ce test fige la réponse HTTP réelle de `GET /api/conformite/dashboard` pour
 * les deux marchés, et vérifie que rien d'un marché n'apparaît chez l'autre.
 */
jest.mock('../db', () => ({ query: jest.fn() }))
jest.mock('../middleware/auth', () => ({
  verifyToken: (req, _res, next) => { req.user = { id: 7, userId: 7 }; next() },
  isSessionRevoked: async () => ({ revoked: false }),
}))

const express = require('express')
const pool = require('../db')
const {
  libellesConformite,
  protectionDonneesDuMarche,
  produitsDuMarche,
} = require('../services/referentielConformite')
const { produitsDuMarche: produitsSource, libellesProduits } = require('../services/referentielProduits')
const router = require('./conformite')

const CAB_SIMULE = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'

describe('referentielProduits — familles par marché', () => {
  test('la Suisse reçoit les familles suisses, jamais les familles françaises', () => {
    const ch = produitsDuMarche('CH')
    const libelles = ch.familles.map((f) => f.libelle).join(' | ')
    expect(ch.marche).toBe('CH')
    expect(ch.pays).toBe('Suisse')
    expect(libelles).toMatch(/LAMal/)
    expect(libelles).toMatch(/LAA/)
    expect(libelles).toMatch(/LCA/)
    expect(libelles).toMatch(/LPP/)
    expect(libelles).toMatch(/pilier 3a/)
    expect(libelles).toMatch(/RC ménage|Responsabilité civile ménage/)
    expect(libelles).toMatch(/voyage/i)
    // Aucune famille du marché français : ce ne sont pas des traductions.
    expect(libelles).not.toMatch(/IARD|emprunteur|habitation|multirisque/i)
    expect(JSON.stringify(ch)).not.toMatch(/ACPR|ORIAS|DDA|RGPD/)
    expect(ch.mots_cles).toContain('LAMal')
    expect(ch.note).toMatch(/Familles de produits/)
  })

  test('la France reçoit les familles françaises, jamais les familles suisses', () => {
    const fr = produitsDuMarche('FR')
    const libelles = fr.familles.map((f) => f.libelle).join(' | ')
    expect(fr.marche).toBe('FR')
    expect(fr.pays).toBe('France')
    expect(libelles).toMatch(/IARD/)
    expect(libelles).toMatch(/emprunteur/)
    expect(libelles).toMatch(/Multirisque habitation|habitation/i)
    expect(libelles).toMatch(/Prévoyance/)
    expect(libelles).toMatch(/automobile/i)
    expect(libelles).not.toMatch(/LAMal|LAA|LPP|LCA|pilier 3a/)
  })

  test('un marché inconnu reste sur la France (comportement historique)', () => {
    expect(produitsDuMarche('XX').marche).toBe('FR')
    expect(produitsDuMarche(undefined).marche).toBe('FR')
  })

  test('chaque famille porte un code stable et un libellé non vide', () => {
    for (const marche of ['FR', 'CH']) {
      const codes = new Set()
      for (const famille of produitsDuMarche(marche).familles) {
        expect(famille.libelle.trim().length).toBeGreaterThan(3)
        expect(famille.code).toMatch(/^[a-z0-9_]+$/)
        expect(codes.has(famille.code)).toBe(false)
        codes.add(famille.code)
      }
      expect(codes.size).toBeGreaterThanOrEqual(8)
    }
  })

  test('la source unique est la même pour les deux appelants', () => {
    expect(libellesProduits('CH')).toEqual(produitsSource('CH').familles.map((f) => f.libelle))
    expect(libellesProduits('FR')).toEqual(produitsSource('FR').familles.map((f) => f.libelle))
  })
})

describe('protectionDonneesDuMarche — mentions par marché', () => {
  test('la Suisse porte la nLPD et le PFPDT, jamais le RGPD', () => {
    const ch = protectionDonneesDuMarche('CH')
    expect(ch.referentiel).toBe('nLPD')
    expect(ch.autorite).toBe('PFPDT')
    expect(ch.referentiel_libelle).toMatch(/loi fédérale sur la protection des données/i)
    // Les éléments qu'un cabinet doit pouvoir documenter sous la nLPD.
    expect(ch.elements.map((e) => e.cle)).toEqual([
      'finalites', 'categories_donnees', 'duree_conservation',
      'droits_personne', 'sous_traitants', 'localisation_donnees',
    ])
    // Chaque élément est rattaché à un texte de loi, jamais à une valeur.
    ch.elements.forEach((element) => {
      expect(element.reference).toMatch(/^LPD/)
      expect(element.valeur).toBeNull()
      expect(element.a_renseigner).toBe(true)
    })
    expect(JSON.stringify(ch)).not.toMatch(/RGPD|CNIL|ACPR/)
    expect(ch.sources.pfpdt).toBe('https://www.edoeb.admin.ch/fr')
  })

  test('la France conserve le RGPD et la CNIL', () => {
    const fr = protectionDonneesDuMarche('FR')
    expect(fr.referentiel).toBe('RGPD')
    expect(fr.autorite).toBe('CNIL')
    expect(fr.libelle_ecran).toBe('📋 RGPD & Mentions légales')
    expect(fr.elements.map((e) => e.cle)).toContain('duree_conservation')
    expect(JSON.stringify(fr)).not.toMatch(/nLPD|PFPDT/)
  })

  test('aucune valeur réglementaire n’est inventée : ce qui manque est marqué à renseigner', () => {
    const ch = protectionDonneesDuMarche('CH')
    const duree = ch.elements.find((e) => e.cle === 'duree_conservation')
    expect(duree.valeur).toBeNull()
    expect(duree.statut).toBe('a_renseigner')
    // Une valeur fournie par le cabinet est reprise telle quelle…
    const avecValeur = protectionDonneesDuMarche('CH', { duree_conservation: '10 ans' })
    expect(avecValeur.elements.find((e) => e.cle === 'duree_conservation').valeur).toBe('10 ans')
    // …et une valeur vide ('') ne remplit rien : elle reste à renseigner.
    const vide = protectionDonneesDuMarche('CH', { duree_conservation: '   ' })
    expect(vide.elements.find((e) => e.cle === 'duree_conservation').a_renseigner).toBe(true)
  })

  test('le bloc de conformité porte les deux référentiels du marché', () => {
    const ch = libellesConformite('CH')
    expect(ch.produits.marche).toBe('CH')
    expect(ch.protection_donnees.referentiel).toBe('nLPD')
    expect(ch.checklist_titre).toBe('Checklist de conformité du cabinet')
    const fr = libellesConformite('FR')
    expect(fr.produits.marche).toBe('FR')
    expect(fr.protection_donnees.referentiel).toBe('RGPD')
    // Comportement français inchangé.
    expect(fr.chapeau).toBe('DDA · KYC · Mandats · Audit logs · Export ACPR')
    expect(fr.export.libelle).toBe('Export ACPR')
  })
})

describe('GET /api/conformite/dashboard — référentiel servi par marché', () => {
  let server
  let origin
  let profil = {}

  beforeAll(async () => {
    const app = express()
    app.use(express.json())
    app.use((req, _res, next) => { req.user = { id: 7, userId: 7 }; next() })
    app.use('/api/conformite', router)
    await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve) })
    origin = `http://127.0.0.1:${server.address().port}`
  })

  afterAll(async () => { await new Promise((r) => server.close(r)) })

  beforeEach(() => {
    pool.query.mockReset()
    pool.query.mockImplementation(async (sql) => {
      const texte = String(sql)
      if (/SELECT cm\.cabinet_id, cm\.role/.test(texte)) return { rows: [{ cabinet_id: CAB_SIMULE, role: 'owner' }] }
      if (/FROM cabinets/.test(texte)) return { rows: [{ id: CAB_SIMULE, country: profil ? profil.pays : null, name: 'Cabinet test' }] }
      if (texte.includes('broker_profiles')) return { rows: profil ? [profil] : [] }
      if (/COUNT\(\*\)/i.test(texte)) return { rows: [{ count: 0, total: 2 }] }
      return { rows: [] }
    })
  })

  const tableauDeBord = async () => {
    const res = await fetch(`${origin}/api/conformite/dashboard`)
    expect(res.status).toBe(200)
    return res.json()
  }

  test('cabinet suisse : nLPD + familles suisses, rien du marché français', async () => {
    profil = { pays: 'CH', langue: 'fr', registre_type: 'FINMA', tutelle_authority: null }
    const corps = await tableauDeBord()
    const referentiel = corps.conformite

    expect(referentiel.marche).toBe('CH')
    expect(referentiel.protection_donnees.referentiel).toBe('nLPD')
    expect(referentiel.protection_donnees.autorite).toBe('PFPDT')
    expect(referentiel.protection_donnees.libelle_ecran).toMatch(/nLPD/)

    const produits = referentiel.produits.familles.map((f) => f.libelle).join(' | ')
    expect(produits).toMatch(/LAMal/)
    expect(produits).toMatch(/LAA/)
    expect(produits).toMatch(/LPP/)
    expect(produits).not.toMatch(/IARD|emprunteur|multirisque/i)

    // Rien de français (ni RGPD, ni ACPR, ni ORIAS, ni DDA) dans TOUT le bloc
    // servi à l'écran d'un cabinet suisse.
    const entier = JSON.stringify(referentiel)
    expect(entier).not.toMatch(/RGPD/)
    expect(entier).not.toMatch(/ACPR/)
    expect(entier).not.toMatch(/ORIAS/)
    expect(entier).not.toMatch(/DDA/)
    expect(entier).not.toMatch(/CNIL/)
  })

  test('cabinet français : RGPD/CNIL et familles françaises, sans changement', async () => {
    profil = { pays: 'FR', langue: 'fr', registre_type: 'ORIAS', tutelle_authority: null }
    const corps = await tableauDeBord()
    const referentiel = corps.conformite

    expect(referentiel.marche).toBe('FR')
    expect(referentiel.protection_donnees.referentiel).toBe('RGPD')
    expect(referentiel.protection_donnees.autorite).toBe('CNIL')
    expect(referentiel.protection_donnees.libelle_ecran).toBe('📋 RGPD & Mentions légales')
    expect(referentiel.protection_donnees.pages_legales).toContain('RGPD')
    expect(referentiel.export.libelle).toBe('Export ACPR')
    expect(referentiel.chapeau).toBe('DDA · KYC · Mandats · Audit logs · Export ACPR')

    const produits = referentiel.produits.familles.map((f) => f.libelle).join(' | ')
    expect(produits).toMatch(/IARD/)
    expect(produits).toMatch(/emprunteur/)
    expect(JSON.stringify(referentiel)).not.toMatch(/LAMal|PFPDT|nLPD/)
  })

  test('profil illisible : le bloc reste celui de la France, jamais un mélange', async () => {
    profil = null
    const corps = await tableauDeBord()
    expect(corps.conformite.marche).toBe('FR')
    expect(corps.conformite.protection_donnees.referentiel).toBe('RGPD')
    expect(JSON.stringify(corps.conformite)).not.toMatch(/LAMal|PFPDT/)
  })
})
