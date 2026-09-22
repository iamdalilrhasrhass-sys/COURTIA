/* ============================================================================
   pagesPubliquesGrille.test.jsx — grille publique FR/CH RÉELLEMENT RENDUE.

   POURQUOI : les défauts multi-marché mesurés le 22/09/2026 étaient des défauts
   d'AFFICHAGE — la page des prix et la landing recopiaient les montants et, pour
   la Suisse, des codes inventés côté frontend ('starter'/'pro'/'premium') au lieu
   des codes servis par le backend ('independant'/'cabinet_ch'/'cabinet_ch_sur_devis').
   Ces tests rendent donc les deux pages publiques dans les DEUX marchés et
   vérifient ce qui est réellement écrit à l'écran, y compris les liens
   d'onboarding suisses.

   Les pages lisent le marché détecté (fuseau / pays déclaré / ?market=) : les
   globales sont donc posées explicitement pour le marché suisse.
   ========================================================================== */

import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import Tarifs from './Tarifs'
import LandingPublic from './LandingPublic'

afterEach(() => {
  vi.unstubAllGlobals()
})

/** Visiteur suisse explicite (?market=CH et pays déclaré CH). */
const visiteurSuisse = () => {
  vi.stubGlobal('window', {
    location: { search: '?market=CH', href: 'https://courtiark.fr/?market=CH' },
    localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    history: { state: null, replaceState: () => {} },
  })
  vi.stubGlobal('document', {
    documentElement: { dataset: { country: 'CH' }, setAttribute: () => {} },
    cookie: '',
  })
}

const rendre = (Composant) =>
  renderToStaticMarkup(
    <MemoryRouter>
      <Composant />
    </MemoryRouter>
  )

describe('/tarifs — la grille rendue suit le marché', () => {
  it('France : 89 € / 159 € / Cabinet sur devis', () => {
    const html = rendre(Tarifs)
    expect(html).toContain('Starter')
    expect(html).toContain('89')
    expect(html).toContain('159')
    expect(html).toContain('Sur devis')
    expect(html).toContain('Cabinet')
  })

  it('Suisse : Indépendant 199 CHF, Cabinet 349 CHF, sur-mesure sur devis + setup', () => {
    visiteurSuisse()
    const html = rendre(Tarifs)
    expect(html).toContain('Indépendant')
    expect(html).toContain('199')
    expect(html).toContain('349')
    expect(html).toContain('CHF')
    expect(html).toContain('Sur-Mesure / Fiduciaire')
    // Frais d'installation publiés : information d'affichage, jamais un montant
    // envoyé à l'API (490 / 990 / dès 1'500 CHF).
    expect(html).toContain('490 CHF setup')
    expect(html).toContain('990 CHF setup')
    expect(html).toContain('500 CHF setup')
  })
})

describe('landing publique — la grille rendue suit le marché', () => {
  it('France : les cartes portent les montants publiés et la mention HT', () => {
    const html = rendre(LandingPublic)
    expect(html).toContain('89 € HT')
    expect(html).toContain('159 € HT')
    expect(html).toContain('Sur devis')
  })

  it('Suisse : montants CHF, setup et liens d’onboarding aux CODES BACKEND', () => {
    visiteurSuisse()
    const html = rendre(LandingPublic)
    expect(html).toContain('199 CHF')
    expect(html).toContain('349 CHF')
    expect(html).toContain('Setup 490 CHF')
    expect(html).toContain('500 CHF de setup')
    // Les liens suisses ne doivent plus viser des codes français.
    expect(html).toContain('plan=independant')
    expect(html).toContain('plan=cabinet_ch')
    expect(html).not.toContain('plan=starter&amp;market=CH')
    expect(html).not.toContain('plan=pro&amp;market=CH')
  })
})
