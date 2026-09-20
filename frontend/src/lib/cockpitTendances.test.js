import { describe, expect, it } from 'vitest'
import { libelleSante, variation } from './cockpitTendances'

describe('cockpitTendances — aucune progression inventée', () => {
  it('sans données, aucun libellé de santé', () => {
    expect(libelleSante(0, false)).toBeNull()
    expect(libelleSante(82, false)).toBeNull()
    expect(libelleSante(undefined, false)).toBeNull()
  })

  it('avec des données, le libellé décrit le score réel', () => {
    expect(libelleSante(85, true)).toBe('bon état')
    expect(libelleSante(55, true)).toBe('à surveiller')
    expect(libelleSante(12, true)).toBe('à traiter')
  })

  it('une variation n’existe que si deux mesures existent', () => {
    expect(variation(12, 4)).toBe('+8 ce mois')
    expect(variation(4, 12)).toBe('-8 ce mois')
    expect(variation(7, 7)).toBeNull()   // aucune variation à annoncer
    expect(variation(7, undefined)).toBeNull()
    expect(variation(7, null)).toBeNull()
  })
})
