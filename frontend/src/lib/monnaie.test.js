import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  configurerContexte,
  contexteCourant,
  deviseCourante,
  fmtMontant,
  fmtMontantCourt,
  fmtNombre,
  localeCourante,
  symboleCourant,
} from './monnaie'

/* Les espaces Insécables d'Intl (U+00A0 étroite U+202F) varient selon la
   version d'ICU : on les normalise pour que l'assertion porte sur le FORMAT,
   pas sur le caractère d'espace. */
const norm = (valeur) => String(valeur).replace(/[\u00a0\u202f]/g, ' ')

describe('monnaie — devise centrale', () => {
  beforeEach(() => {
    // Contexte explicite = contexte déterministe (pas d'héritage entre tests).
    configurerContexte({ pays: null, langue: null })
  })

  it('retombe sur EUR / fr-FR sans profil connu', () => {
    expect(deviseCourante()).toBe('EUR')
    expect(localeCourante()).toBe('fr-FR')
    expect(norm(fmtMontant(1234.5))).toBe('1 234,50 €')
    expect(norm(fmtMontant(1234.5, { maximumFractionDigits: 0 }))).toBe('1 235 €')
    expect(norm(fmtNombre(12400))).toBe('12 400')
    expect(norm(fmtMontantCourt(12400))).toBe('12,4 k €')
  })

  it('bascule en CHF / fr-CH pour un cabinet suisse', () => {
    configurerContexte({ pays: 'CH', langue: 'fr' })
    expect(deviseCourante()).toBe('CHF')
    expect(localeCourante()).toBe('fr-CH')
    // Séparateur d'apostrophe suisse + suffixe CHF.
    expect(norm(fmtMontant(1234.5))).toBe("1'234.50 CHF")
    expect(norm(fmtMontant(1234.5, { maximumFractionDigits: 0 }))).toBe("1'235 CHF")
    expect(norm(fmtNombre(12400))).toBe("12'400")
    expect(norm(fmtMontantCourt(12400))).toBe('12.4 k CHF')
  })

  it('accepte les libellés longs et la casse du pays', () => {
    expect(configurerContexte({ pays: ' ch ' }).devise).toBe('CHF')
    expect(configurerContexte({ pays: 'Suisse' }).devise).toBe('CHF')
    expect(configurerContexte({ pays: 'FR' }).devise).toBe('EUR')
    expect(configurerContexte({ pays: 'France' }).devise).toBe('EUR')
    expect(configurerContexte({}).devise).toBe('EUR')
    expect(contexteCourant().pays).toBeNull()
  })

  it("n'invente jamais 0 ni NaN pour une valeur absente ou non numérique", () => {
    configurerContexte({ pays: 'CH' })
    for (const absente of [null, undefined, '', '   ', NaN, Infinity, -Infinity, 'abc', {}, [], true]) {
      expect(fmtMontant(absente)).toBe('—')
      expect(fmtMontantCourt(absente)).toBe('—')
      expect(fmtNombre(absente)).toBe('—')
    }
    // Zéro reste un montant : il s'affiche.
    expect(norm(fmtMontant(0))).toBe("0.00 CHF")
    expect(norm(fmtNombre(0))).toBe('0')
  })

  it('accepte un montant numérique sous forme de chaîne', () => {
    configurerContexte({ pays: 'FR' })
    expect(norm(fmtMontant('1234.5', { maximumFractionDigits: 0 }))).toBe('1 235 €')
  })

  it('relit le profil persisté avant toute configuration explicite', async () => {
    vi.resetModules()
    globalThis.localStorage = {
      getItem: (cle) => (cle === 'courtia_user' ? JSON.stringify({ pays: 'CH', langue: 'fr' }) : null),
      setItem: () => {},
      removeItem: () => {},
    }
    try {
      const frais = await import('./monnaie')
      expect(frais.deviseCourante()).toBe('CHF')
      expect(norm(frais.fmtMontant(1234.5))).toBe("1'234.50 CHF")
    } finally {
      delete globalThis.localStorage
    }
  })

  /* ─────────────────────────────────────────────────────────────────────────
     Montants des écrans « pipeline » et « cockpit » (20/09/2026).
     Ces écrans passaient un formateur écrit à la main
     (`Intl.NumberFormat('fr-FR', { currency: 'EUR' })`) : un cabinet suisse y
     lisait « Potentiel total 0 € », « POTENTIEL 0 € », « LTV : 0 € »,
     « TOTAL €/AN », ou encore « Coût session : 0.000 € ». Les cas ci-dessous
     fixent la sortie ATTENDUE de ces montants.
     ───────────────────────────────────────────────────────────────────────── */
  it('cabinet suisse : les montants du pipeline/cockpit sortent en CHF', () => {
    configurerContexte({ pays: 'CH', langue: 'fr' })
    // « Potentiel total » / « POTENTIEL » des colonnes (pipeline)
    expect(norm(fmtMontant(0, { maximumFractionDigits: 0 }))).toBe('0 CHF')
    expect(norm(fmtMontant(840, { maximumFractionDigits: 0 }))).toBe('840 CHF')
    // « LTV » et matrice cross-sell de l'écran ARK
    expect(norm(fmtMontant(800, { maximumFractionDigits: 0 }))).toBe('800 CHF')
    // Aucun euro dans la sortie
    expect(norm(fmtMontant(840, { maximumFractionDigits: 0 }))).not.toContain('€')
  })

  it('cabinet français : la sortie historique en euros est conservée', () => {
    configurerContexte({ pays: 'FR', langue: 'fr' })
    expect(norm(fmtMontant(0, { maximumFractionDigits: 0 }))).toBe('0 €')
    expect(norm(fmtMontant(840, { maximumFractionDigits: 0 }))).toBe('840 €')
  })

  it('symboleCourant : « CHF » en Suisse, « € » en France (coûts déjà formatés)', () => {
    configurerContexte({ pays: 'CH', langue: 'fr' })
    expect(symboleCourant()).toBe('CHF')
    // « Coût session : 0.000 € » devient « 0.000 CHF » (le composant garde son
    // propre arrondi à trois décimales).
    expect(`Coût session : ${(0).toFixed(3)} ${symboleCourant()}`).toBe('Coût session : 0.000 CHF')

    configurerContexte({ pays: 'FR', langue: 'fr' })
    expect(symboleCourant()).toBe('€')
    expect(`Coût session : ${(0).toFixed(3)} ${symboleCourant()}`).toBe('Coût session : 0.000 €')

    configurerContexte({ pays: null, langue: null })
    expect(symboleCourant()).toBe('€')
  })
})
