/**
 * portfolioAnalyzer.marche.test.js — LE PROMPT D'ANALYSE DE PORTEFEUILLE PARLE
 * LE RÉFÉRENTIEL ET LA DEVISE DU MARCHÉ DU CABINET (défaut P0 CH-001).
 *
 * DÉFAUT MESURÉ (audit du 21/09/2026, preuve `services/portfolioAnalyzer.js:585`) :
 * le prompt s'ouvrait sur « Tu es ARK, expert en courtage d'assurance français. »
 * et proposait un `estimated_impact` « en euros », y compris pour un cabinet
 * suisse : le modèle conseillait donc un cabinet suisse en droit français
 * (ACPR, ORIAS, DDA) et en euros.
 *
 * CE QUE CE TEST FIGE
 *   • CH : persona FINMA/LSA/nLPD, devise CHF, AUCUN « € », et aucune référence
 *     française présentée comme applicable ;
 *   • FR : persona et référentiels français, devise € (comportement historique
 *     strictement conservé).
 * Le test appelle le constructeur PUR (aucune base, aucun appel IA) : c'est le
 * prompt lui-même qui est vérifié, pas la plomberie.
 */
jest.mock('../db', () => ({ query: jest.fn() }))
jest.mock('@anthropic-ai/sdk', () => jest.fn())

const { construirePromptPortefeuille } = require('./portfolioAnalyzer')

const CONTEXTE = {
  scoreData: {
    health_score: 72,
    grade: 'B',
    breakdown: {
      multi_equipment: { label: 'Multi-équipement', score: 70, weight: 25, detail: { ratio: 1.4 } },
      compliance: { label: 'Conformité DDA', score: 90, weight: 15 },
    },
  },
  clients: [{ id: 1 }, { id: 2 }],
  topClients: [{ id: 1, statut: 'actif', email_ok: true, phone_ok: false }],
  quoteSummary: { actifs: 2, total: 3, companies: ['Helvetia'], products: ['MRH'] },
}

/** Retire la seule phrase d'écart du persona suisse (« … ne s'appliquent pas »). */
function sansConsigneDEcart(prompt) {
  return String(prompt)
    .split('\n')
    .filter((ligne) => !/ne s'appliquent pas/i.test(ligne))
    .join('\n')
}

describe('portfolioAnalyzer — persona et devise du marché (CH-001)', () => {
  test('cabinet SUISSE : FINMA/LSA/nLPD/CHF, jamais un référentiel français applicable', () => {
    const prompt = construirePromptPortefeuille('CH', CONTEXTE)

    expect(prompt).toContain('FINMA')
    expect(prompt).toContain('CHF')
    expect(prompt).toContain('Marché: Suisse (CH)')
    expect(prompt).toContain('Autorité de surveillance: FINMA')
    // Le persona français en dur a disparu.
    expect(prompt).not.toMatch(/expert en courtage d'assurance français/)

    const utile = sansConsigneDEcart(prompt)
    for (const reference of ['ORIAS', 'ACPR', 'RGPD', 'Loi Hamon', 'Loi Châtel']) {
      expect({ reference, present: utile.includes(reference) }).toEqual({ reference, present: false })
    }
    expect(/\bDDA\b/.test(utile)).toBe(false)
    expect(utile).not.toContain('€')
    expect(/\beuros\b/.test(utile)).toBe(false)
    // La conformité du score est renommée pour le marché suisse (LSA), pas DDA.
    expect(utile).toContain('LSA')
  })

  test('cabinet FRANÇAIS : persona et référentiels français, devise € (inchangé)', () => {
    const prompt = construirePromptPortefeuille('FR', CONTEXTE)

    expect(prompt).toMatch(/expert en courtage d'assurance français/)
    expect(prompt).toContain('ORIAS')
    expect(prompt).toContain('ACPR')
    expect(prompt).toContain('€')
    expect(prompt).toContain('Marché: France (FR)')
    expect(prompt).not.toContain('FINMA')
    expect(prompt).toContain('estimated_impact')
  })
})
