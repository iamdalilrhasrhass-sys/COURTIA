/**
 * accounting.marche.test.js — L'EXPORT COMPTABLE FEC EST UN ARTEFACT FRANÇAIS :
 * IL EST RÉSERVÉ AU MARCHÉ FRANÇAIS, ET REFUSÉ PROPREMENT AUX AUTRES.
 *
 * Défaut mesuré le 20/09/2026 (P1 CH-017) : `GET /api/accounting/fec` répondait
 * 200 AVEC l'en-tête FEC (`JournalCode|JournalLib|EcritureNum|…|Idevise`) à un
 * cabinet établi en Suisse. Le FEC est le « fichier des écritures comptables »
 * normé par l'administration fiscale FRANÇAISE (DGFiP) : aucun logiciel
 * comptable suisse ne l'attend. Un cabinet suisse déposait donc un fichier
 * présenté comme un export valable.
 *
 * Le correctif REFUSE (501, message produit) au lieu d'inventer un équivalent
 * suisse, et le marché français conserve exactement son export.
 *
 * Le pool est simulé au niveau du MODULE `../db` : c'est lui que traverse
 * `lib/marcheCabinet` (appartenance → cabinet → référent).
 */
jest.mock('../db', () => ({ query: jest.fn() }))

const pool = require('../db')
const router = require('./accounting')

const CAB_CH = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
const CAB_FR = 'dddddddd-dddd-dddd-dddd-dddddddddddd'

/** Gestionnaire Express d'une route du routeur (dernier maillon = handler). */
function gestionnaire(methode, chemin) {
  const couche = router.stack.find((l) => l.route && l.route.path === chemin && l.route.methods[methode])
  if (!couche) throw new Error(`Route introuvable : ${methode} ${chemin}`)
  return couche.route.stack[couche.route.stack.length - 1].handle
}

function fausseReponse() {
  return {
    code: 200, corps: null, entetes: {},
    status(c) { this.code = c; return this },
    json(p) { this.corps = p; return this },
    send(p) { this.corps = p; return this },
    setHeader(cle, valeur) { this.entetes[cle] = valeur },
  }
}

/** Pool simulé : appartenance, cabinet et profil du référent selon le marché. */
function simulerCabinet(cabinet) {
  pool.query.mockImplementation(async (sql) => {
    const requete = String(sql)
    if (requete.includes('cabinet_members')) {
      return { rows: [{ cabinet_id: cabinet.id, role: 'owner' }], rowCount: 1 }
    }
    if (requete.includes('FROM cabinets')) {
      return { rows: [{ ...cabinet }], rowCount: 1 }
    }
    if (requete.includes('broker_profiles')) {
      return {
        rows: [{
          user_id: 42, pays: cabinet.country, langue: 'fr',
          registre_type: cabinet.registre_type, registre_numero: cabinet.registre_numero,
          uid: cabinet.uid, orias: null, tutelle_authority: null,
        }],
        rowCount: 1,
      }
    }
    // Écritures comptables : aucune (le test porte sur l'accès, pas sur le contenu).
    return { rows: [], rowCount: 0 }
  })
}

function requete() {
  return {
    user: { id: 42, userId: 42 },
    query: {},
    body: {},
    app: { locals: { pool } },
  }
}

const CABINET_CH = { id: CAB_CH, country: 'CH', registre_type: 'FINMA', registre_numero: 'F01234567', uid: 'CHE-123.456.789' }
const CABINET_FR = { id: CAB_FR, country: 'FR', registre_type: null, registre_numero: null, uid: null }

describe('accounting / FEC — réservé au marché français', () => {
  beforeEach(() => pool.query.mockReset())

  test('cabinet SUISSE : l’export FEC est refusé (501) avec un message produit', async () => {
    simulerCabinet(CABINET_CH)
    const res = fausseReponse()
    await gestionnaire('get', '/fec')(requete(), res)

    expect(res.code).toBe(501)
    expect(res.corps.error).toBe('export_comptable_indisponible_marche')
    expect(res.corps.marche).toBe('CH')
    expect(res.corps.format).toBe('FEC')
    expect(res.corps.message).toMatch(/française/)
    // Rien n'a été produit : aucun en-tête de fichier, aucun attachement.
    expect(res.entetes['Content-Disposition']).toBeUndefined()
    expect(String(res.corps.message)).toMatch(/aucun fichier/i)
  })

  test('cabinet SUISSE : les écritures du plan comptable français ne sont pas générées', async () => {
    simulerCabinet(CABINET_CH)
    const res = fausseReponse()
    await gestionnaire('post', '/generate-from-commissions')(
      { ...requete(), body: { startDate: '2026-01-01', endDate: '2026-12-31' } }, res
    )
    expect(res.code).toBe(501)
    expect(pool.query.mock.calls.map((c) => String(c[0])).some((s) => /INSERT INTO accounting_entries/.test(s))).toBe(false)
  })

  test('cabinet FRANÇAIS : l’export FEC est conservé (200 + en-tête FEC)', async () => {
    simulerCabinet(CABINET_FR)
    const res = fausseReponse()
    await gestionnaire('get', '/fec')({ ...requete(), query: { year: '2026' } }, res)

    expect(res.code).toBe(200)
    expect(res.entetes['Content-Type']).toMatch(/text\/plain/)
    expect(String(res.entetes['Content-Disposition'])).toMatch(/FEC_/)
    // En-tête du format DGFiP : preuve que le fichier français est inchangé.
    expect(String(res.corps)).toContain('JournalCode|JournalLib|EcritureNum')
    expect(String(res.corps)).toContain('Idevise')
  })
})
