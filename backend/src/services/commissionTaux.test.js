/**
 * Tests des taux de commission (point IA-016 §16).
 *
 * Règle testée : AUCUN TAUX ARBITRAIRE CACHÉ. La fonction de calcul de
 * commission ne doit produire AUCUN montant sans barème configuré — ni 12 %,
 * ni 15 %, ni une prime par défaut de 600 €.
 */
const {
  BAREMES_EXEMPLE,
  resoudreTauxCommission,
  calculerCommission,
  tauxExemple,
} = require('./commissionTaux')

describe('commissionTaux — pas de taux arbitraire', () => {
  test('sans barème configuré, aucun taux n\'est résolu', () => {
    expect(resoudreTauxCommission({ compagnie: 'Axa', produit: 'Auto' })).toBeNull()
    expect(resoudreTauxCommission({ compagnie: 'Aurora', produit: 'Auto' })).toBeNull()
    expect(resoudreTauxCommission()).toBeNull()
  })

  test('sans taux, aucun montant de commission n\'est produit', () => {
    expect(calculerCommission({ prime_annuelle: 1200, rate_percent: null })).toBeNull()
    expect(calculerCommission({ prime_annuelle: 1200 })).toBeNull()
    expect(calculerCommission({ prime_annuelle: 1200, rate_percent: 0 })).toBeNull()
    expect(calculerCommission({ prime_annuelle: 1200, rate_percent: NaN })).toBeNull()
  })

  test('le catalogue d\'exemple n\'est jamais appliqué sans demande explicite', () => {
    const taux = resoudreTauxCommission({
      compagnie: 'Aurora',
      produit: 'Auto',
      exempleDemande: false,
    })
    expect(taux).toBeNull()
  })

  test('le taux d\'exemple est étiqueté exemple quand il est explicitement demandé', () => {
    const taux = resoudreTauxCommission({
      compagnie: 'Aurora',
      produit: 'Auto',
      exempleDemande: true,
    })
    expect(taux).toEqual({ rate_percent: 12, source: 'exemple', compagnie: 'Aurora', produit: 'Auto' })
  })

  test('un barème du cabinet prime toujours sur le catalogue d\'exemple', () => {
    const taux = resoudreTauxCommission({
      baremeCabinet: { rate_percent: 7.5 },
      compagnie: 'Aurora',
      produit: 'Auto',
      exempleDemande: true,
    })
    expect(taux).toEqual({ rate_percent: 7.5, source: 'cabinet', compagnie: 'Aurora', produit: 'Auto' })
  })

  test('une règle du cabinet est utilisée si aucun barème n\'existe', () => {
    const taux = resoudreTauxCommission({
      regleCabinet: { rate_percent: 9 },
      compagnie: 'Axa',
      produit: 'Auto',
    })
    expect(taux.source).toBe('cabinet')
    expect(taux.rate_percent).toBe(9)
  })

  test('un barème à 0 % n\'est pas considéré comme configuré', () => {
    expect(resoudreTauxCommission({ baremeCabinet: { rate_percent: 0 }, compagnie: 'Axa', produit: 'Auto' })).toBeNull()
  })

  test('le calcul applique le taux configuré, en annuel et en mensuel', () => {
    const montants = calculerCommission({ prime_annuelle: 1200, rate_percent: 10 })
    expect(montants.commission_annuelle).toBe(120)
    expect(montants.commission_mensuelle).toBe(10)
    expect(montants.effective_rate_percent).toBe(10)
  })

  test('un barème récurrent applique la part récurrente documentée', () => {
    const montants = calculerCommission({ prime_annuelle: 1000, rate_percent: 10, recurrent: true })
    expect(montants.effective_rate_percent).toBe(6)
    expect(montants.commission_annuelle).toBe(60)
  })

  test('une prime absente ne produit pas un montant à partir de 600 € inventé', () => {
    expect(calculerCommission({ prim: 0, rate_percent: 10 })).toBeNull()
    expect(calculerCommission({ prime_annuelle: 'inconnue', rate_percent: 10 })).toBeNull()
  })

  test('le catalogue d\'exemple reste explicitement mentionné comme exemple', () => {
    expect(tauxExemple('Solenys', 'PJ')).toBe(18)
    expect(tauxExemple('Axa', 'Auto')).toBeNull()
    expect(Object.keys(BAREMES_EXEMPLE)).toHaveLength(8)
  })
})
