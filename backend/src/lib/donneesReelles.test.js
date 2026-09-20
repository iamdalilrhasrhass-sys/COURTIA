const {
  SOURCES_REELLES,
  sourceEstReelle,
  estOffreReelle,
  partitionnerOffres,
  validerOffresPourClient,
  potentielDepuisDonneesReelles,
} = require('./donneesReelles')

describe('donneesReelles — provenance des offres', () => {
  test('seules manual / imported / api sont des provenances réelles', () => {
    expect(SOURCES_REELLES).toEqual(['manual', 'imported', 'api'])
    expect(sourceEstReelle('manual')).toBe(true)
    expect(sourceEstReelle('IMPORTED')).toBe(true)
    expect(sourceEstReelle(' api ')).toBe(true)
  })

  test('aucune provenance (champ absent) = offre simulée', () => {
    expect(sourceEstReelle(undefined)).toBe(false)
    expect(sourceEstReelle(null)).toBe(false)
    expect(sourceEstReelle('')).toBe(false)
    expect(sourceEstReelle('simulation')).toBe(false)
    expect(sourceEstReelle('connector_stub')).toBe(false)
    expect(sourceEstReelle('demo')).toBe(false)
  })

  test('estOffreReelle exige une provenance explicite sur l\'offre', () => {
    expect(estOffreReelle({ provider: 'Aurora' })).toBe(false)
    expect(estOffreReelle({ provider: 'Aurora', source: 'simulation' })).toBe(false)
    expect(estOffreReelle(null)).toBe(false)
    expect(estOffreReelle({ provider: 'Axa', source: 'manual' })).toBe(true)
  })

  test('validerOffresPourClient refuse une liste contenant une offre simulée', () => {
    const verdict = validerOffresPourClient([
      { provider: 'Assureur réel', source: 'api', prime_annuelle_eur: 600 },
      { provider: 'Aurora', is_simulation: true },
    ])
    expect(verdict.ok).toBe(false)
    expect(verdict.reelles).toHaveLength(1)
    expect(verdict.fournisseurs_refuses).toEqual(['Aurora'])
  })

  test('validerOffresPourClient accepte une sélection 100 % réelle', () => {
    const verdict = validerOffresPourClient([
      { provider: 'Axa', source: 'manual' },
      { provider: 'Générali', source: 'imported' },
    ])
    expect(verdict.ok).toBe(true)
    expect(verdict.fournisseurs_refuses).toEqual([])
  })

  test('une sélection vide n\'est pas validable', () => {
    expect(validerOffresPourClient([]).ok).toBe(false)
  })

  test('partitionnerOffres laisse les entrées non-objet dans les refusées', () => {
    const { reelles, refusees } = partitionnerOffres(['pas un objet', null, { source: 'api' }])
    expect(reelles).toHaveLength(1)
    expect(refusees).toHaveLength(2)
  })
})

describe('donneesReelles — potentiel commercial', () => {
  test('aucune donnée réelle = aucun montant (null, jamais un chiffre inventé)', () => {
    expect(potentielDepuisDonneesReelles()).toBeNull()
    expect(potentielDepuisDonneesReelles({})).toBeNull()
    expect(potentielDepuisDonneesReelles({ quotes: [], quote_results: [] })).toBeNull()
    expect(potentielDepuisDonneesReelles({ quotes: [{ prime_annuelle: null }] })).toBeNull()
  })

  test('un montant n\'est calculé que depuis des enregistrements réels', () => {
    expect(potentielDepuisDonneesReelles({ quotes: [{ prime_annuelle: 600 }, { prime_annuelle: 400 }] }))
      .toBe(500)
    expect(potentielDepuisDonneesReelles({ quote_results: [{ premium_annual: 1000 }] })).toBe(1000)
  })
})
