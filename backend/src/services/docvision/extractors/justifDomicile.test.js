/**
 * justifDomicile.test.js — un justificatif de domicile SUISSE doit être accepté.
 *
 * POURQUOI CE TEST : défaut reproduit le 20/09/2026 — `validateCodePostal`
 * n'acceptait que 5 chiffres. Un cabinet suisse ne pouvait valider aucun de ses
 * justificatifs réels (« 1844 Villeneuve », « 1201 Genève ») : le document était
 * classé invalide alors qu'il était parfaitement lisible.
 *
 * Contrepartie obligatoire : la France n'est PAS assouplie (un code à 4 chiffres
 * reste refusé pour un document français, un code à 6 chiffres reste refusé
 * partout).
 */

const { validateCodePostal, validateAndNormalize } = require('./justifDomicile')

describe('validateCodePostal — NPA suisse (4 chiffres)', () => {
  test.each([
    ['1844', 'Villeneuve (VD)'],
    ['1201', 'Genève'],
    ['3003', 'Berne'],
    ['9999', 'limite haute'],
    ['1000', 'limite basse'],
  ])('accepte le NPA %s (%s)', (npa) => {
    const res = validateCodePostal(npa)
    expect(res.valid).toBe(true)
    expect(res.pays).toBe('CH')
  })

  test('le NPA collé à la ville est isolé (« 1844Villeneuve »)', () => {
    const res = validateCodePostal('1844Villeneuve')
    expect(res.valid).toBe(true)
    expect(res.extrait).toBe('1844')
  })
})

describe('validateCodePostal — code postal français (5 chiffres)', () => {
  test.each(['75002', '13001', '98999'])('accepte %s', (cp) => {
    const res = validateCodePostal(cp)
    expect(res.valid).toBe(true)
    expect(res.pays).toBe('FR')
  })

  test('refuse toujours un code français hors plage', () => {
    expect(validateCodePostal('00000').valid).toBe(false)
  })
})

describe('validateCodePostal — refus inchangés (aucun assouplissement)', () => {
  test.each(['', null, undefined, '123', '123456', 'ABCDEF', '12a45'])('refuse « %s »', (valeur) => {
    const res = validateCodePostal(valeur)
    expect(res.valid).toBe(false)
    expect(res.error).toBeTruthy()
  })
})

describe('validateAndNormalize — dossier suisse complet', () => {
  const extrait = {
    type_justif: 'facture_energie',
    fournisseur: 'Romande Energie',
    nom_titulaire: 'dupont',
    prenom_titulaire: 'Léa',
    adresse_ligne1: 'Rue du Lac 12',
    code_postal: '1844',
    ville: 'villeneuve',
    pays: 'Suisse',
    date_emission: new Date().toISOString().slice(0, 10),
  }

  test('un justificatif suisse est valide et sans avertissement de code postal', () => {
    const res = validateAndNormalize(extrait)
    // `isValid` doit être un booléen STRICT : l'ancien `a && b && c && d`
    // renvoyait la dernière valeur trouvée (la chaîne « VILLENEUVE »).
    expect(res.isValid).toBe(true)
    expect(typeof res.isValid).toBe('boolean')
    expect(res.warnings.filter((w) => w.includes('Code postal'))).toEqual([])
    expect(res.fields.code_postal).toBe('1844')
    expect(res.fields.adresse_complete).toContain('1844')
  })

  test('un justificatif incomplet renvoie isValid = false (jamais une chaîne)', () => {
    const res = validateAndNormalize({ ...extrait, ville: '' })
    expect(res.isValid).toBe(false)
    expect(typeof res.isValid).toBe('boolean')
  })

  test('« 1844 Villeneuve » collé est normalisé en « 1844 »', () => {
    const res = validateAndNormalize({ ...extrait, code_postal: '1844 Villeneuve' })
    expect(res.fields.code_postal).toBe('1844')
    expect(res.isValid).toBeTruthy()
  })
})
