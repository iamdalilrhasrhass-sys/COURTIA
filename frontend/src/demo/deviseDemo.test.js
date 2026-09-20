/* ============================================================================
   deviseDemo.test.js — LA DÉMONSTRATION PUBLIQUE N'AFFICHE QUE LA DEVISE DU
   MARCHÉ DU VISITEUR.
   ----------------------------------------------------------------------------
   POURQUOI CES TESTS (défauts P1 CH-020/CH-021, mesurés le 20/09/2026)
   Sur https://courtiark.fr/demo, un cabinet suisse voyait « 39 810 € »,
   « 4 777 € de commissions » et une grille en euros : la démonstration présentait
   la devise du marché français à tout le monde. Ce test vérifie DEUX choses :
     1. la résolution du marché du visiteur (una règle, celle des écrans publics) ;
     2. la NARRATION réellement rendue par le scénario de démonstration : en marché
        suisse, plus aucun euro et des francs suisses ; en marché français, la
        narration d'avant, augmentée mais inchangée.
   ========================================================================== */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { deviseDemo, localeDemo, marcheDemo, montantDemo, symboleDemo } from './deviseDemo'

/** Stockage minimal (localStorage n'existe pas dans l'environnement node). */
function stockage(valeurs = {}) {
  const donnees = { ...valeurs }
  return {
    getItem: (cle) => (cle in donnees ? donnees[cle] : null),
    setItem: (cle, valeur) => { donnees[cle] = String(valeur) },
    removeItem: (cle) => { delete donnees[cle] },
  }
}

/** Navigateur minimal : ce que lit la résolution de marché publique. */
function navigateur({ search = '', country = null, fuseau = null } = {}) {
  return {
    location: { pathname: '/demo', search },
    document: { documentElement: country ? { dataset: { country } } : { dataset: {} } },
  }
}

describe('devise de la démonstration (marché du visiteur)', () => {
  beforeEach(() => {
    vi.stubGlobal('window', navigateur())
    vi.stubGlobal('document', { documentElement: { dataset: {} } })
    vi.stubGlobal('localStorage', stockage())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('sans aucun signal, la démonstration reste en euros (comportement historique)', () => {
    expect(marcheDemo('')).toBe('FR')
    expect(deviseDemo('FR')).toBe('EUR')
    expect(localeDemo('FR')).toBe('fr-FR')
    expect(symboleDemo('FR')).toBe('€')
    expect(montantDemo(39810, 'FR', { maximumFractionDigits: 0 }).replace(/[\u202f\u00a0\u2009]/g, ' '))
      .toBe('39 810 €')
  })

  it('un visiteur suisse reçoit des francs suisses', () => {
    const rendu = montantDemo(39810, 'CH', { maximumFractionDigits: 0 })
    expect(rendu).toContain('CHF')
    expect(rendu).not.toContain('€')
    expect(symboleDemo('CH')).toBe('CHF')
    expect(localeDemo('CH')).toBe('fr-CH')
  })

  it('un override explicite (?market=CH) force le marché suisse', () => {
    expect(marcheDemo('?market=CH')).toBe('CH')
    expect(marcheDemo('?country=CH')).toBe('CH')
    expect(marcheDemo('?market=FR')).toBe('FR')
  })

  it('un override stocké par le produit (courtia_market_override) est respecté', () => {
    vi.stubGlobal('localStorage', stockage({ courtia_market_override: 'CH' }))
    expect(marcheDemo('')).toBe('CH')
  })

  it('un visiteur dont le fuseau est Zurich est traité comme suisse', () => {
    const espion = vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(() => ({
      resolvedOptions: () => ({ timeZone: 'Europe/Zurich' }),
    }))
    try {
      expect(marcheDemo('')).toBe('CH')
      espion.mockImplementation(() => ({ resolvedOptions: () => ({ timeZone: 'Europe/Paris' }) }))
      expect(marcheDemo('')).toBe('FR')
    } finally {
      espion.mockRestore()
    }
  })

  it('la narration du scénario ne contient AUCUN euro pour un visiteur suisse', async () => {
    vi.stubGlobal('localStorage', stockage({ courtia_market_override: 'CH' }))
    vi.stubGlobal('window', navigateur({ search: '?market=CH' }))
    vi.resetModules()

    const { ETAPES } = await import('./scenario9')
    const narration = ETAPES.map((e) => `${e.titre} ${e.texte}`).join(' ')

    expect(narration).not.toContain('€')
    expect(narration).toContain('CHF')
  })

  it('la narration française reste celle d’avant (aucune régression)', async () => {
    vi.stubGlobal('window', navigateur({ search: '' }))
    vi.resetModules()

    const { ETAPES } = await import('./scenario9')
    const narration = ETAPES.map((e) => `${e.titre} ${e.texte}`).join(' ')

    expect(narration).not.toContain('CHF')
    // Les montants du jeu de données restent cités (39 810 de primes gérées).
    expect(narration.replace(/[\u202f\u00a0\u2009]/g, ' ')).toContain('39 810')
  })
})
