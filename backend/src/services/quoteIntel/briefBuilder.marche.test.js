/**
 * briefBuilder.marche.test.js — LE BRIEF ASSUREUR EST RÉDIGÉ SOUS LE RÉFÉRENTIEL
 * DU MARCHÉ DU CABINET (défaut P0 CH-001).
 *
 * DÉFAUT MESURÉ (audit du 21/09/2026, preuve
 * `services/quoteIntel/briefBuilder.js:15`) : le prompt système se présentait
 * comme « expert en courtage d'assurance français » pour tous les cabinets, et
 * le contexte envoyé au modèle portait `courtier.orias`. Un cabinet suisse
 * envoyait donc à ses compagnies des demandes de devis rédigées sous un
 * référentiel français (ORIAS, ACPR, DDA) et sur un registre qu'il n'a pas.
 *
 * CE QUE CE TEST FIGE
 *   • CH : persona FINMA/LSA/nLPD + devise CHF, aucun « € » ni référence
 *     française présentée comme applicable, et le contexte ne contient PAS
 *     d'ORIAS ;
 *   • FR : persona français et `courtier.orias` (comportement historique).
 */
jest.mock('../../db', () => ({ query: jest.fn() }))
jest.mock('../arkEngine', () => ({ callArkStructured: jest.fn() }))

const pool = require('../../db')
const arkEngine = require('../arkEngine')
const { buildBrief, promptSystemeBrief } = require('./briefBuilder')

const CAB_CH = 'cccccccc-cccc-cccc-cccc-cccccccccccc'

const PROVIDER = {
  id: 9,
  code: 'HELV',
  name: 'Helvetia',
  type: 'assurance',
  contact_email: 'contact@assureur.test',
  response_time_hours: 24,
}

const DEMANDE = {
  id: 7,
  client_id: 148,
  broker_id: 11,
  insurance_type: 'MRH',
  first_name: 'Élise',
  last_name: 'Muller',
}

/** Utilisateur 11 : cabinet suisse. Utilisateur 12 : compte français. */
const UTILISATEURS = { 11: 'CH', 12: 'FR' }

function brancherPool() {
  pool.query.mockImplementation(async (sql, params) => {
    const s = String(sql)
    if (s.includes('insurance_providers')) return { rows: [{ ...PROVIDER }] }
    if (s.includes('FROM quote_requests')) return { rows: [{ ...DEMANDE }] }
    if (s.includes('client_documents')) return { rows: [] }
    if (s.includes('cabinet_members')) {
      const uid = Number(params?.[0])
      return UTILISATEURS[uid] === 'CH'
        ? { rows: [{ cabinet_id: CAB_CH, role: 'owner' }] }
        : { rows: [] }
    }
    if (s.includes('FROM cabinets')) {
      return { rows: [{ id: CAB_CH, name: 'Helvetia QA SA', country: 'CH', registre_type: 'FINMA', registre_numero: 'CHE-123.456.789', uid: null }], rowCount: 1 }
    }
    if (s.includes('broker_profiles')) {
      return { rows: [{ user_id: 12, pays: 'France', registre_type: 'ORIAS', orias: '07000000' }] }
    }
    return { rows: [] }
  })
}

/** Retire la seule phrase d'écart du persona suisse (« … ne s'appliquent pas »). */
function sansConsigneDEcart(prompt) {
  return String(prompt)
    .split('\n')
    .filter((ligne) => !/ne s'appliquent pas/i.test(ligne))
    .join('\n')
}

describe('quoteIntel/briefBuilder — brief assureur par marché (CH-001)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    pool.query.mockReset()
    brancherPool()
    arkEngine.callArkStructured.mockResolvedValue({
      structured: { subject: 'Demande MRH', body_html: '<p>x</p>', body_plain: 'x', confidence: 0.9 },
      model: 'test',
      costUsd: 0,
    })
  })

  test('prompt suisse : FINMA/LSA/nLPD/CHF, aucune référence française applicable', () => {
    const prompt = promptSystemeBrief('CH')
    const utile = sansConsigneDEcart(prompt)

    expect(prompt).toContain('FINMA')
    expect(prompt).toContain('CHF')
    expect(utile).not.toContain('€')
    expect(utile).not.toContain('ORIAS')
    expect(utile).not.toContain('ACPR')
    expect(/\bDDA\b/.test(utile)).toBe(false)
    expect(prompt).not.toMatch(/expert en courtage d'assurance français/)
  })

  test('prompt français : comportement historique conservé', () => {
    const prompt = promptSystemeBrief('FR')
    expect(prompt).toMatch(/expert en courtage d'assurance français/)
    expect(prompt).toContain('ORIAS')
    expect(prompt).toContain('€')
  })

  test('buildBrief pour un cabinet SUISSE : persona suisse et AUCUN ORIAS dans le contexte', async () => {
    const brief = await buildBrief({
      quoteRequestId: 7,
      providerId: 9,
      brokerId: 11,
      brokerInfo: { name: 'Marc', cabinet: 'Helvetia QA SA', orias: '07000000' },
    })

    const appel = arkEngine.callArkStructured.mock.calls[0][0]
    expect(String(appel.system)).toContain('FINMA')
    expect(String(appel.system)).not.toMatch(/expert en courtage d'assurance français/)
    // Registre réel du cabinet (FINMA/IDE), jamais l'ORIAS français.
    expect(appel.context.courtier).not.toHaveProperty('orias')
    expect(appel.context.courtier.registre_numero).toBe('CHE-123.456.789')
    expect(appel.context.courtier.registre_type).toBe('FINMA')
    expect(brief.subject).toContain('MRH')
  })

  test('buildBrief pour un compte FRANÇAIS : ORIAS transmis (inchangé)', async () => {
    await buildBrief({
      quoteRequestId: 7,
      providerId: 9,
      brokerId: 12,
      brokerInfo: { name: 'Léa', cabinet: 'Cabinet FR QA', orias: '07000000' },
    })

    const appel = arkEngine.callArkStructured.mock.calls[0][0]
    expect(String(appel.system)).toContain('ORIAS')
    expect(appel.context.courtier.orias).toBe('07000000')
  })
})
