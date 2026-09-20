/**
 * conformite.marche.test.js — LE VOCABULAIRE DE CONFORMITÉ SUIT LE PAYS.
 *
 * POURQUOI CE TEST : mesuré en production le 20/09/2026 (Red Team P2 #6),
 * l'écran /conformite d'un cabinet SUISSE affichait « DDA · KYC · Mandats ·
 * Audit logs · Export ACPR » et un bouton « Export ACPR ». L'ACPR est
 * l'autorité française : elle n'a aucune compétence en Suisse.
 *
 * Ce test fige les deux moitiés de la règle :
 *   1. cabinet suisse → FINMA, aucun « ACPR » nulle part dans la réponse, et
 *      l'export s'appelle « Export du registre de conformité » (aucun format
 *      réglementaire suisse n'est prétendu) ;
 *   2. cabinet français → le libellé EXISTANT est conservé à l'identique
 *      (« Export ACPR »), aucune régression de vocabulaire.
 */
jest.mock('../db', () => ({ query: jest.fn() }))
// L'authentification est remplacée : ce test porte sur le VOCABULAIRE du
// marché, pas sur la vérification du jeton.
jest.mock('../middleware/auth', () => ({
  verifyToken: (req, _res, next) => { req.user = { id: 7, userId: 7 }; next() },
  isSessionRevoked: async () => ({ revoked: false }),
}))

const express = require('express')
const pool = require('../db')
const { libellesConformite, marcheDuProfil } = require('../services/referentielConformite')
const router = require('./conformite')

describe('referentielConformite — libellés par marché', () => {
  test('la Suisse nomme la FINMA et jamais l’ACPR', () => {
    const ch = libellesConformite('CH')
    expect(ch.marche).toBe('CH')
    expect(ch.autorite).toBe('FINMA')
    expect(ch.export.libelle).toBe('Export du registre de conformité')
    expect(JSON.stringify(ch)).not.toMatch(/ACPR/)
    expect(JSON.stringify(ch)).not.toMatch(/ORIAS/)
    expect(JSON.stringify(ch)).not.toMatch(/DDA/)
    // Aucun format d'export suisse n'est inventé : le nom reste descriptif.
    expect(ch.export.route).toBe('/conformite/export-registre')
    expect(ch.export.fichier).toMatch(/^registre-conformite-\d{4}\.json$/)
  })

  test('la France conserve son libellé historique à l’identique', () => {
    const fr = libellesConformite('FR')
    expect(fr.autorite).toBe('ACPR')
    expect(fr.export.libelle).toBe('Export ACPR')
    expect(fr.chapeau).toBe('DDA · KYC · Mandats · Audit logs · Export ACPR')
    expect(fr.export.route).toBe('/conformite/export-acpr')
    expect(fr.export.fichier).toMatch(/^rapport-acpr-\d{4}\.json$/)
  })

  test('un cabinet français peut imposer son libellé de tutelle', () => {
    const fr = libellesConformite('FR', { tutelle_authority: 'ACPR — autorité de tutelle déclarée' })
    expect(fr.autorite_libelle).toBe('ACPR — autorité de tutelle déclarée')
  })

  test('le libellé de tutelle libre ne s’applique JAMAIS à la Suisse', () => {
    const ch = libellesConformite('CH', { tutelle_authority: 'ACPR (champ libre)' })
    expect(ch.autorite).toBe('FINMA')
    expect(JSON.stringify(ch)).not.toMatch(/ACPR/)
  })

  test.each([
    [{ pays: 'CH' }, 'CH'],
    [{ pays: 'Suisse' }, 'CH'],
    [{ langue: 'de' }, 'CH'],
    [{ langue: 'it-CH' }, 'CH'],
    [{ registre_type: 'FINMA' }, 'CH'],
    [{ pays: 'FR' }, 'FR'],
    [{ pays: 'France' }, 'FR'],
    [{}, 'FR'],
    [{ pays: 'inconnu' }, 'FR'],
  ])('marcheDuProfil(%j) → %s', (profil, attendu) => {
    expect(marcheDuProfil(profil)).toBe(attendu)
  })
})

const CAB_SIMULE = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'

describe('GET /api/conformite/dashboard — écran d’un cabinet suisse', () => {
  let server
  let origin
  let profil = {}
  // Les tests ci-dessous passent par le VRAI pool simulé plus bas ; le cas
  // « this » ci-dessous vérifie en plus que la résolution du marché survit à un
  // pool dont la méthode `query` dépend de son instance (comme `pg.Pool`).


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
    // Le marché est désormais résolu par la RÈGLE UNIQUE du produit
    // (`lib/marcheCabinet` : le cabinet d'abord, puis le profil du référent).
    // Le pool simulé répond donc aussi à ces lectures-là.
    const repondrePool = async (sql) => {
      const texte = String(sql)
      if (/SELECT cm\.cabinet_id, cm\.role/.test(texte)) {
        return { rows: [{ cabinet_id: CAB_SIMULE, role: 'owner' }] }
      }
      if (/FROM cabinets/.test(texte)) {
        return { rows: [{ id: CAB_SIMULE, country: profil ? profil.pays : null, name: 'Cabinet test' }] }
      }
      if (texte.includes('broker_profiles')) return { rows: profil ? [profil] : [] }
      if (/COUNT\(\*\)/i.test(texte)) return { rows: [{ count: 0, total: 2 }] }
      return { rows: [] }
    }
    pool.query.mockReset()
    pool.query.mockImplementation(repondrePool)
  })

  const tableauDeBord = async () => {
    const res = await fetch(`${origin}/api/conformite/dashboard`)
    expect(res.status).toBe(200)
    return res.json()
  }

  test('cabinet suisse : FINMA, et pas un mot d’autorité française', async () => {
    profil = { pays: 'CH', langue: 'fr', registre_type: 'FINMA', tutelle_authority: null }
    const corps = await tableauDeBord()
    expect(corps.conformite.marche).toBe('CH')
    expect(corps.conformite.autorite).toBe('FINMA')
    expect(corps.conformite.chapeau).not.toMatch(/ACPR/)
    expect(corps.conformite.export.libelle).toBe('Export du registre de conformité')
    // Le chapeau ET le bouton viennent du même bloc : plus d'incohérence entre
    // l'en-tête de page et le bouton principal.
    expect(corps.conformite.chapeau).toContain(corps.conformite.export.libelle)
    expect(JSON.stringify(corps.conformite)).not.toMatch(/ACPR/)
  })

  test('un pool dont `query` dépend de son instance est correctement lu', async () => {
    // RÉGRESSION GARDÉE : `lib/marcheCabinet` appelle `source.query` détaché
    // quand on lui passe un pool. Une méthode qui utilise `this` (comme
    // `pg.Pool.prototype.query`) levait alors un TypeError absorbé, et un
    // cabinet suisse s'affichait en ACPR. On passe donc ici un OBJET dont la
    // méthode exige `this` : le marché doit rester CH.
    // Le SEUL chemin capable de rendre 'CH' est ici la lecture du RÉFÉRENT DU
    // CABINET (`lib/marcheCabinet`, jointure sur `referent_user_id`). Le repli
    // « profil de l'appelant » ne rend RIEN : si la résolution du cabinet échoue
    // (pool détaché), le résultat devient FR — ce que ce test interdit.
    class PoolAvecThis {
      constructor() { this.appels = 0 }
      async query(sql) {
        this.appels += 1
        const texte = String(sql)
        if (/SELECT cm\.cabinet_id, cm\.role/.test(texte)) {
          return { rows: [{ cabinet_id: CAB_SIMULE, role: 'owner' }] }
        }
        if (/referent_user_id/.test(texte) || /JOIN broker_profiles/.test(texte)) {
          return { rows: [{ pays: 'CH', langue: 'fr', registre_type: 'FINMA', referent_user_id: 7 }] }
        }
        if (/SELECT bp\.pays/.test(texte)) return { rows: [] } // repli appelant : muet
        if (/FROM cabinets/.test(texte)) {
          // Domiciliation jamais renseignée sur le cabinet (défaut de colonne).
          return { rows: [{ id: CAB_SIMULE, country: 'France', name: 'Cabinet test' }] }
        }
        if (/COUNT\(\*\)/i.test(texte)) return { rows: [{ count: 0, total: 0 }] }
        return { rows: [] }
      }
    }
    const poolThis = new PoolAvecThis()
    const { libellesDeLaRequete } = require('../services/referentielConformite')
    const libelles = await libellesDeLaRequete(
      { user: { id: 7, userId: 7 } }, { pool: poolThis, userId: 7 }
    )
    expect(poolThis.appels).toBeGreaterThan(0)
    expect(libelles.marche).toBe('CH')
    expect(libelles.autorite).toBe('FINMA')
    expect(JSON.stringify(libelles)).not.toMatch(/ACPR/)
  })

  test('cabinet français : libellé conservé', async () => {
    profil = { pays: 'FR', langue: 'fr', registre_type: 'ORIAS', tutelle_authority: null }
    const corps = await tableauDeBord()
    expect(corps.conformite.marche).toBe('FR')
    expect(corps.conformite.autorite).toBe('ACPR')
    expect(corps.conformite.export.libelle).toBe('Export ACPR')
  })

  test('cabinet suisse + profil du membre vide : le CABINET décide (FINMA, jamais ACPR)', async () => {
    // C'est le cas réel d'un cabinet suisse : le propriétaire a un profil CH,
    // ses collaborateurs ont un profil vierge (ou français). Le marché est une
    // propriété du CABINET : tous voient le même écran.
    profil = { pays: 'FR', langue: 'fr', registre_type: 'ORIAS', tutelle_authority: null }
    pool.query.mockImplementation(async (sql) => {
      const texte = String(sql)
      if (/SELECT cm\.cabinet_id, cm\.role/.test(texte)) {
        return { rows: [{ cabinet_id: CAB_SIMULE, role: 'broker' }] }
      }
      if (/FROM cabinets/.test(texte)) {
        // Cabinet réellement domicilié en Suisse.
        return { rows: [{ id: CAB_SIMULE, country: 'CH', name: 'Cabinet Q101 Suisse' }] }
      }
      if (texte.includes('broker_profiles')) return { rows: [profil] }
      if (/COUNT\(\*\)/i.test(texte)) return { rows: [{ count: 0, total: 0 }] }
      return { rows: [] }
    })
    const corps = await tableauDeBord()
    expect(corps.conformite.marche).toBe('CH')
    expect(corps.conformite.autorite).toBe('FINMA')
    expect(JSON.stringify(corps.conformite)).not.toMatch(/ACPR/)
  })

  test('profil illisible : on reste en France (jamais un référentiel étranger par accident)', async () => {
    profil = null
    pool.query.mockImplementation(async (sql) => {
      const texte = String(sql)
      if (/SELECT cm\.cabinet_id, cm\.role/.test(texte)) return { rows: [] }
      if (/FROM cabinets/.test(texte)) return { rows: [] }
      if (texte.includes('broker_profiles')) return { rows: [] }
      if (/COUNT\(\*\)/i.test(texte)) return { rows: [{ count: 0, total: 0 }] }
      return { rows: [] }
    })
    const corps = await tableauDeBord()
    expect(corps.conformite.marche).toBe('FR')
  })

  test('l’export suisse ne cite ni l’ACPR ni l’ORIAS', async () => {
    profil = { pays: 'CH', langue: 'fr', registre_type: 'FINMA', tutelle_authority: null }
    pool.query.mockImplementation(async (sql) => {
      const texte = String(sql)
      if (texte.includes('FROM users')) return { rows: [{ email: 'audit@courtia-qa.test' }] }
      if (/SELECT cm\.cabinet_id, cm\.role/.test(texte)) {
        return { rows: [{ cabinet_id: CAB_SIMULE, role: 'owner' }] }
      }
      if (/FROM cabinets/.test(texte)) {
        return { rows: [{ id: CAB_SIMULE, country: profil ? profil.pays : null, name: 'Cabinet test' }] }
      }
      if (texte.includes('broker_profiles')) return { rows: profil ? [profil] : [] }
      if (/COUNT\(\*\)/i.test(texte)) return { rows: [{ count: 0, ca: 0 }] }
      return { rows: [] }
    })
    const res = await fetch(`${origin}/api/conformite/export-registre`)
    expect(res.status).toBe(200)
    const corps = await res.json()
    expect(corps.marche).toBe('CH')
    expect(corps.rapport.libelle).toBe('Export du registre de conformité')
    expect(JSON.stringify(corps.rapport)).not.toMatch(/ACPR|ORIAS/)
    expect(corps.rapport.sources).toEqual({ finma: 'https://www.finma.ch' })
  })

  test('l’export français conserve ses sources ACPR / ORIAS', async () => {
    profil = { pays: 'FR', langue: 'fr', registre_type: 'ORIAS', tutelle_authority: null }
    pool.query.mockImplementation(async (sql) => {
      const texte = String(sql)
      if (texte.includes('FROM users')) return { rows: [{ email: 'audit@courtia-qa.test' }] }
      if (/SELECT cm\.cabinet_id, cm\.role/.test(texte)) {
        return { rows: [{ cabinet_id: CAB_SIMULE, role: 'owner' }] }
      }
      if (/FROM cabinets/.test(texte)) {
        return { rows: [{ id: CAB_SIMULE, country: profil ? profil.pays : null, name: 'Cabinet test' }] }
      }
      if (texte.includes('broker_profiles')) return { rows: profil ? [profil] : [] }
      if (/COUNT\(\*\)/i.test(texte)) return { rows: [{ count: 0, ca: 0 }] }
      return { rows: [] }
    })
    const res = await fetch(`${origin}/api/conformite/export-acpr`)
    const corps = await res.json()
    expect(corps.marche).toBe('FR')
    expect(corps.rapport.sources.acpr).toBe('https://acpr.banque-france.fr')
    expect(corps.rapport.legal).toMatch(/ACPR/)
  })
})
