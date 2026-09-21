/**
 * commissionsAutoService.devise.test.js — LA COMMISSION CALCULÉE AUTOMATIQUEMENT
 * PORTE LA DEVISE DU CABINET, PAS UN NOM DE CHAMP « _eur » (défaut P1 CH-013).
 *
 * DÉFAUT MESURÉ (audit du 21/09/2026, preuve `commissionsAutoService.js:186`) :
 * `calculateCommission` rendait le montant attendu UNIQUEMENT sous
 * `expected_amount_eur`, sans devise et sans nom neutre. Un écran qui lit ce nom
 * affiche donc un montant en francs suisses sous une étiquette euro ; pour un
 * cabinet suisse, c'est faux deux fois (nom du champ ET colonne `currency`
 * laissée au défaut de colonne).
 *
 * CE QUE CE TEST FIGE
 *   1. un cabinet suisse reçoit `devise: 'CHF'` et `expected_amount` (nom
 *      neutre) — la colonne `currency` écrite vaut CHF ;
 *   2. `expected_amount_eur` reste servi, DÉPRÉCIÉ, à la MÊME valeur (aucune
 *      conversion de montant : seul l'exposition change) ;
 *   3. le montant calculé est identique dans les deux noms.
 */
jest.mock('../db', () => ({ query: jest.fn() }))
// `uuid` est distribué en ESM : Node le `require()`, Jest non. On le remplace
// par un générateur déterministe (aucun impact sur les montants testés).
jest.mock('uuid', () => ({ v4: () => '00000000-0000-4000-8000-000000000000' }))

const poolDb = require('../db')
const { calculateCommission } = require('./commissionsAutoService')

const CAB_CH = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
const CAB_FR = 'dddddddd-dddd-dddd-dddd-dddddddddddd'

/** Pool simulé : répond au marché du cabinet, puis sert la file fournie. */
function makePool(reponses = [], cabinet = null) {
  const calls = []
  return {
    calls,
    query: jest.fn(async (sql, params) => {
      const requete = String(sql)
      calls.push({ sql: requete, params })
      if (cabinet) {
        if (requete.includes('cabinet_members')) return { rows: [{ cabinet_id: cabinet.id, role: 'owner' }], rowCount: 1 }
        if (requete.includes('FROM cabinets')) return { rows: [{ ...cabinet }], rowCount: 1 }
        if (requete.includes('broker_profiles')) {
          return { rows: [{ user_id: 99, pays: cabinet.country, registre_type: cabinet.registre_type }], rowCount: 1 }
        }
      }
      const suivante = reponses.shift()
      if (suivante instanceof Error) throw suivante
      return suivante || { rows: [], rowCount: 0 }
    }),
  }
}

const CONTRAT = {
  rows: [{
    id: 42,
    client_id: 7,
    quote_data: { type_contrat: 'MRH', compagnie: 'Helvetia', prime_annuelle: 1813.10 },
    first_name: 'Élise',
    last_name: 'Muller',
  }],
  rowCount: 1,
}

const REGLE_CHF = { rows: [{ id: 7, rate_percent: 10, flat_fee_cents: 500 }], rowCount: 1 }

describe('commissionsAutoService — devise et noms de champs (CH-013)', () => {
  beforeEach(() => poolDb.query.mockReset())

  test('cabinet SUISSE : `devise` = CHF, nom neutre servi, alias `_eur` à la même valeur', async () => {
    const pool = makePool([
      CONTRAT,
      REGLE_CHF,
      // RETURNING * de l'INSERT : la colonne `currency` est écrite par le service.
      { rows: [{ id: 3, expected_amount_cents: 18181, received_amount_cents: 0, currency: 'CHF' }], rowCount: 1 },
    ], { id: CAB_CH, name: 'Cabinet Suisse QA', country: 'CH', registre_type: 'FINMA' })

    const row = await calculateCommission(pool, 99, 42, '2026-09')

    // La devise RÉELLE du cabinet, écrite en base…
    const insertion = pool.calls.find((c) => c.sql.includes('INSERT INTO commissions'))
    expect(insertion).toBeTruthy()
    expect(insertion.params).toContain('CHF')
    // …et servie sous un nom de champ qui n'affirme pas l'euro.
    expect(row.devise).toBe('CHF')
    // 1813,10 × 10 % + 5,00 de frais fixes = 186,31 (aucun montant inventé).
    expect(row.expected_amount).toBe(186.31)
    // Alias historique DÉPRÉCIÉ : présent, mais identique (aucune conversion).
    expect(row.expected_amount_eur).toBe(row.expected_amount)
  })

  test('cabinet FRANÇAIS : devise EUR, mêmes noms (le nom neutre n’est pas « suisse »)', async () => {
    const pool = makePool([
      CONTRAT,
      REGLE_CHF,
      { rows: [{ id: 4, expected_amount_cents: 18181, received_amount_cents: 0, currency: 'EUR' }], rowCount: 1 },
    ], { id: CAB_FR, name: 'Cabinet France QA', country: 'FR', registre_type: null })

    const row = await calculateCommission(pool, 99, 42, '2026-09')

    const insertion = pool.calls.find((c) => c.sql.includes('INSERT INTO commissions'))
    expect(insertion.params).toContain('EUR')
    expect(row.devise).toBe('EUR')
    expect(row.expected_amount).toBe(row.expected_amount_eur)
  })
})
