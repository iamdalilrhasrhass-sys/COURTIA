/**
 * conformite.export-marche.test.js — UN CABINET SUISSE NE REÇOIT AUCUNE
 * AUTORITÉ NI PROCÉDURE FRANÇAISE DE L'EXPORT DE CONFORMITÉ.
 *
 * Défaut mesuré le 20/09/2026 : l'export de conformité d'un cabinet suisse
 * portait la mise en forme française (« Export ACPR », sources `acpr`/`orias`,
 * mention « pour exigences ACPR / DDA ») et exposait un `orias_id` et un montant
 * `ca_total_eur` — trois affirmations fausses pour un cabinet établi en Suisse.
 * Le chemin `/export-acpr` (nommé d'après une autorité française) est désormais
 * INTROUVABLE (404) pour ce cabinet ; le chemin neutre sert un registre sans
 * aucune référence française. Un cabinet français, lui, ne perd rien.
 *
 * Le pool est simulé au niveau du MODULE `../db` : c'est lui que traversent
 * `lib/marcheCabinet` (appartenance → cabinet → référent) et
 * `services/referentielConformite` (libellés du marché).
 */
jest.mock('../db', () => ({ query: jest.fn() }))

const pool = require('../db')
const router = require('./conformite')

const CAB_CH = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
const CAB_FR = 'dddddddd-dddd-dddd-dddd-dddddddddddd'

function gestionnaire(methode, chemin) {
  const couche = router.stack.find((l) => l.route && l.route.path === chemin && l.route.methods[methode])
  if (!couche) throw new Error(`Route introuvable : ${methode} ${chemin}`)
  return couche.route.stack[couche.route.stack.length - 1].handle
}

function fausseReponse() {
  return {
    code: 200, corps: null,
    status(c) { this.code = c; return this },
    json(p) { this.corps = p; return this },
  }
}

/** Pool simulé : appartenance, cabinet et profil du référent selon le cabinet visé. */
function simulerCabinet(cabinet) {
  pool.query.mockImplementation(async (sql) => {
    const requete = String(sql)
    if (requete.includes('cabinet_members')) {
      return { rows: [{ cabinet_id: cabinet.id, role: 'owner' }], rowCount: 1 }
    }
    if (requete.includes('FROM cabinets')) {
      return { rows: [{ ...cabinet, name: cabinet.country === 'CH' ? 'Cabinet Suisse QA' : 'Cabinet France QA' }], rowCount: 1 }
    }
    if (requete.includes('broker_profiles')) {
      return {
        rows: [{
          user_id: 42, pays: cabinet.country, langue: 'fr',
          registre_type: cabinet.registre_type, registre_numero: cabinet.registre_numero,
          uid: cabinet.uid, orias: cabinet.country === 'CH' ? null : '07012345',
          tutelle_authority: null, canton: cabinet.canton || null,
        }],
        rowCount: 1,
      }
    }
    if (requete.includes('COUNT(*)')) return { rows: [{ count: 0 }], rowCount: 1 }
    return { rows: [], rowCount: 0 }
  })
}

function requete(chemin) {
  return {
    user: { id: 42, userId: 42 },
    path: chemin,
    originalUrl: `/api/conformite${chemin}`,
    query: {},
    app: { locals: { pool } },
  }
}

const CABINET_CH = Object.freeze({
  id: CAB_CH, country: 'CH', registre_type: 'FINMA', registre_numero: 'F01234567',
  uid: 'CHE-123.456.789', canton: 'GE', orias_number: null, tutelle_authority: null,
})
const CABINET_FR = Object.freeze({
  id: CAB_FR, country: 'FR', registre_type: null, registre_numero: null,
  uid: null, canton: null, orias_number: '07012345', tutelle_authority: null,
})

describe('conformité — vocabulaire et contenu de l’export selon le marché', () => {
  beforeEach(() => pool.query.mockReset())

  /** L'export est exposé sous deux chemins : le gestionnaire est le même. */
  function handlerExport() {
    const couche = router.stack.find((l) => l.route && Array.isArray(l.route.path) && l.route.methods.get)
    return couche.route.stack.slice(-1)[0].handle
  }

  test('cabinet SUISSE : le chemin « export-acpr » est introuvable (404)', async () => {
    simulerCabinet(CABINET_CH)
    const res = fausseReponse()
    await handlerExport()(requete('/export-acpr'), res)

    expect(res.code).toBe(404)
    expect(res.corps.error).toBe('not_found')
    expect(res.corps.route).toBe('/conformite/export-registre')
  })

  test('cabinet SUISSE : le registre servi ne contient AUCUNE référence française', async () => {
    simulerCabinet(CABINET_CH)
    const res = fausseReponse()
    await handlerExport()(requete('/export-registre'), res)

    expect(res.code).toBe(200)
    const brut = JSON.stringify(res.corps)
    expect(res.corps.marche).toBe('CH')
    expect(res.corps.devise).toBe('CHF')
    expect(res.corps.rapport.autorite).toBe('FINMA')
    expect(brut).not.toMatch(/ACPR/i)
    expect(brut).not.toMatch(/ORIAS/i)
    expect(brut).not.toMatch(/SIRET/i)
    expect(brut).not.toMatch(/ca_total_eur/)
    expect(brut).not.toMatch(/orias_id/)
    expect(res.corps.rapport.ca_total).toBe(0)
  })

  test('cabinet FRANÇAIS : il CONSERVE son export ACPR et son vocabulaire', async () => {
    simulerCabinet(CABINET_FR)
    const res = fausseReponse()
    await handlerExport()(requete('/export-acpr'), res)
    expect(res.code).toBe(200)
    expect(res.corps.marche).toBe('FR')
    expect(res.corps.devise).toBe('EUR')
    expect(res.corps.rapport.autorite).toBe('ACPR')
    expect(res.corps.rapport.libelle).toBe('Export ACPR')
    expect(JSON.stringify(res.corps)).toMatch(/ACPR/)
    expect(res.corps.rapport.ca_total_eur).toBe(0)
  })

  test('la checklist DDA d’un cabinet suisse est intitulée sans directive française', async () => {
    simulerCabinet(CABINET_CH)
    const res = fausseReponse()
    await gestionnaire('get', '/dda/checklist/:client_id')(
      { ...requete('/dda/checklist/92'), params: { client_id: '92' } },
      res
    )

    expect(res.code).toBe(200)
    expect(res.corps.marche).toBe('CH')
    expect(res.corps.checklist_titre).not.toMatch(/DDA/i)
    expect(res.corps.checklist_titre).toBe('Checklist de conformité du cabinet')
  })
})
