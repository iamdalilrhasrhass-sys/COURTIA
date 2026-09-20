/**
 * validationEntree.test.js — UNE VALEUR QUI N'EXISTE PAS EST REFUSÉE EN 400.
 *
 * POURQUOI CE TEST : mesuré en production le 20/09/2026 (Red Team P1 #4) :
 *   POST /api/taches {"echeance":"2026-02-31T99:99:99Z"} → 500
 *   POST /api/accounting/entries (montant NaN)           → 500
 *                    « invalid input syntax for type integer: "NaN" »
 *
 * Le piège vérifié ici est celui de JavaScript : `new Date('2026-02-31')` ne
 * renvoie PAS une erreur, il donne le 3 mars 2026. Une validation qui se
 * contenterait de `!isNaN(new Date(v).getTime())` laisserait donc passer une
 * date inexistante — jusqu'à ce que PostgreSQL la refuse en 500.
 */
const { dateValide, entierValide, texteObligatoire, ErreurEntree } = require('./validationEntree')
const { createAccountingEntry } = require('./fecService')

describe('dateValide', () => {
  test('une date qui n’existe pas est refusée (31 février, 99 heures)', () => {
    expect(dateValide('2026-02-31T99:99:99Z')).toBe(false)
    expect(dateValide('2026-02-31')).toBe(false)
    expect(dateValide('2026-13-01')).toBe(false)
    expect(dateValide('2026-04-31')).toBe(false)
    expect(dateValide('pas une date')).toBe(false)
  })

  test('une date réelle est acceptée', () => {
    expect(dateValide('2026-02-28')).toBeInstanceOf(Date)
    expect(dateValide('2026-09-20T14:30:00Z')).toBeInstanceOf(Date)
    expect(dateValide('2026-12-31T23:59:59Z')).toBeInstanceOf(Date)
    expect(dateValide(new Date('2026-09-20'))).toBeInstanceOf(Date)
  })

  test('une valeur absente n’est pas une date invalide (c’est une absence)', () => {
    expect(dateValide(null)).toBeNull()
    expect(dateValide(undefined)).toBeNull()
    expect(dateValide('')).toBeNull()
  })
})

describe('entierValide', () => {
  test('NaN, « abc » et l’infini sont refusés', () => {
    expect(entierValide('NaN')).toBe(false)
    expect(entierValide(NaN)).toBe(false)
    expect(entierValide('abc')).toBe(false)
    expect(entierValide(Infinity)).toBe(false)
    expect(entierValide(1.5)).toBe(false)
  })

  test('un entier est accepté, y compris écrit à la française', () => {
    expect(entierValide(0)).toBe(0)
    expect(entierValide('1 200')).toBe(1200)
    expect(entierValide(-10, { min: 0 })).toBe(false)
    expect(entierValide(null)).toBeNull()
  })
})

describe('texteObligatoire', () => {
  test('un texte vide est une absence, un texte trop long est un refus', () => {
    expect(texteObligatoire('   ')).toBeNull()
    expect(texteObligatoire(null)).toBeNull()
    expect(texteObligatoire('Libellé', { max: 3 })).toBe(false)
    expect(texteObligatoire('Libellé', { max: 10 })).toBe('Libellé')
  })
})

describe('createAccountingEntry — refus AVANT la base', () => {
  const poolQuiNeDoitPasEtreAppele = {
    async query() { throw new Error('la base ne doit pas être interrogée sur une entrée invalide') },
  }

  test('montant NaN : 400 nommant le champ, jamais un message SQL', async () => {
    await expect(createAccountingEntry(poolQuiNeDoitPasEtreAppele, 7, {
      ecriture_date: '2026-09-20', compte_num: '411000', ecriture_lib: 'Prime',
      debit_cents: NaN, credit_cents: 0,
    })).rejects.toMatchObject({ statusCode: 400, champ: 'debit_cents' })
  })

  test('date d’écriture inexistante ou absente : 400', async () => {
    await expect(createAccountingEntry(poolQuiNeDoitPasEtreAppele, 7, {
      ecriture_date: '2026-02-31', compte_num: '411000', ecriture_lib: 'Prime', debit_cents: 100,
    })).rejects.toMatchObject({ statusCode: 400, champ: 'ecriture_date' })

    await expect(createAccountingEntry(poolQuiNeDoitPasEtreAppele, 7, {
      compte_num: '411000', ecriture_lib: 'Prime', debit_cents: 100,
    })).rejects.toMatchObject({ statusCode: 400, champ: 'ecriture_date' })
  })

  test('un libellé de 600 caractères est refusé avant la base', async () => {
    await expect(createAccountingEntry(poolQuiNeDoitPasEtreAppele, 7, {
      ecriture_date: '2026-09-20', compte_num: '411000',
      ecriture_lib: 'x'.repeat(600), debit_cents: 100,
    })).rejects.toMatchObject({ statusCode: 400, champ: 'ecriture_lib' })
  })

  test('une écriture manuelle sans débit ni crédit est refusée', async () => {
    await expect(createAccountingEntry(poolQuiNeDoitPasEtreAppele, 7, {
      ecriture_date: '2026-09-20', compte_num: '411000', ecriture_lib: 'Prime',
      debit_cents: 0, credit_cents: 0,
    }, { exigerMontant: true })).rejects.toMatchObject({ statusCode: 400, code: 'montant_nul' })
  })

  test('l’erreur porte le code HTTP 400 (jamais 500)', () => {
    const erreur = new ErreurEntree('message', { champ: 'x' })
    expect(erreur.statusCode).toBe(400)
    expect(erreur instanceof Error).toBe(true)
  })
})
