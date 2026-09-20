/**
 * commissionService.devise.test.js — LA DEVISE D'UNE COMMISSION EST CELLE DU
 * CABINET, JAMAIS CELLE DU DÉVELOPPEUR NI UN DÉFAUT DE COLONNE.
 *
 * Défaut mesuré le 20/09/2026 (P1 CH-013) : `commissions.currency` portait
 * `DEFAULT 'eur'` et l'INSERT écrivait `'eur'` en dur ; l'API servait en outre
 * les montants sous les seuls noms `expected_amount_eur` / `received_amount_eur`
 * à un cabinet suisse. Un cabinet établi en Suisse avait donc des commissions
 * stockées et servies en euros.
 *
 * Correctif : la colonne est écrite depuis le marché du CABINET
 * (lib/marcheCabinet → CHF en Suisse, EUR en France), l'API sert des noms NEUTRES
 * (`expected_amount`, `received_amount`) EN PLUS des noms historiques, et la
 * valeur n'est jamais convertie. Le pool est simulé module `../db` compris, car
 * c'est lui que traverse `lib/marcheCabinet`.
 */
jest.mock('../db', () => ({ query: jest.fn() }))

const poolDb = require('../db')
const { upsertCommission, listCommissions, mapCommissionRow, deviseEnBase } = require('./commissionService')

const CAB_CH = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
const CAB_FR = 'dddddddd-dddd-dddd-dddd-dddddddddddd'

function makePool(reponses = [], cabinet = null) {
  const calls = []
  return {
    calls,
    query: jest.fn(async (sql, params) => {
      const requete = String(sql)
      calls.push({ sql: requete, params })
      // RÉSOLUTION DU MARCHÉ : `upsertCommission` et `listCommissions` lisent le
      // marché du cabinet par le pool qu'on leur donne (en production, le pool de
      // l'application). Le pool simulé doit donc répondre à ces lectures, sinon
      // il n'y a pas de cabinet ⇒ marché FR par défaut.
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

const CABINET_CH_SIMULE = { id: CAB_CH, name: 'Cabinet Suisse QA', country: 'CH', registre_type: 'FINMA' }
const CABINET_FR_SIMULE = { id: CAB_FR, name: 'Cabinet France QA', country: 'FR', registre_type: null }

describe('commissionService — devise du cabinet', () => {
  beforeEach(() => poolDb.query.mockReset())

  test('un cabinet SUISSE écrit sa devise (CHF) dans la colonne `currency`', async () => {
    const pool = makePool([
      { rows: [{ id: 42, client_id: 7, quote_data: {}, client_nom: 'Muller', client_prenom: 'Élise' }], rowCount: 1 },
      { rows: [{ id: 3, contract_id: 42, expected_amount_cents: 18131, received_amount_cents: 0, currency: 'CHF' }], rowCount: 1 },
    ], CABINET_CH_SIMULE)

    const row = await upsertCommission(pool, { id: 99, role: 'broker' }, 42, {
      period: '2026-09', insurer: 'Helvetia', expected_amount: '181,31',
    })

    const insertion = pool.calls.find((c) => c.sql.includes('INSERT INTO commissions'))
    expect(insertion).toBeTruthy()
    expect(insertion.sql).not.toContain("'eur'")
    expect(insertion.params).toContain('CHF')
    expect(row.devise).toBe('CHF')
    // Noms NEUTRES + noms historiques : la valeur est la même, seule la devise
    // annoncée change (aucune conversion de montant).
    expect(row.expected_amount).toBe(181.31)
    expect(row.expected_amount_eur).toBe(181.31)
  })

  test('un cabinet FRANÇAIS écrit EUR (`currency` n’est plus un défaut de colonne)', async () => {
    const pool = makePool([
      { rows: [{ id: 42, client_id: 7, quote_data: {}, client_nom: 'Dupont', client_prenom: 'Léa' }], rowCount: 1 },
      { rows: [{ id: 3, contract_id: 42, expected_amount_cents: 12050, received_amount_cents: 10000, currency: 'EUR' }], rowCount: 1 },
    ], CABINET_FR_SIMULE)

    const row = await upsertCommission(pool, { id: 99, role: 'broker' }, 42, {
      period: '2026-09', insurer: 'AXA', expected_amount: '120,50', received_amount: '100',
    })

    const insertion = pool.calls.find((c) => c.sql.includes('INSERT INTO commissions'))
    expect(insertion.params).toContain('EUR')
    expect(row.devise).toBe('EUR')
  })

  test('la liste sert `devise` et les noms neutres, jamais un montant converti', async () => {
    const pool = makePool([
      {
        rows: [{
          id: 3, contract_id: 42, insurer: 'Helvetia', period_year: 2026, period_month: 9,
          expected_amount_cents: 18131, received_amount_cents: 0, currency: null,
        }],
        rowCount: 1,
      },
    ], CABINET_CH_SIMULE)

    const lignes = await listCommissions(pool, { id: 99, role: 'owner' }, {}, null)

    expect(lignes).toHaveLength(1)
    expect(lignes[0].devise).toBe('CHF')
    expect(lignes[0].expected_amount).toBe(181.31)
    expect(lignes[0].expected_amount_eur).toBe(181.31)
  })

  test('`mapCommissionRow` laisse la devise du cabinet primer sur une colonne vide', () => {
    const row = mapCommissionRow({ id: 1, expected_amount_cents: 500, received_amount_cents: 0 }, 'CHF')
    expect(row.devise).toBe('CHF')
    expect(row.expected_amount).toBe(5)
  })

  test('aucune devise inventée : un code inconnu retombe sur EUR', () => {
    expect(deviseEnBase('CHF')).toBe('CHF')
    expect(deviseEnBase('eur')).toBe('EUR')
    expect(deviseEnBase(null)).toBe('EUR')
    expect(deviseEnBase('XXX')).toBe('EUR')
  })
})
