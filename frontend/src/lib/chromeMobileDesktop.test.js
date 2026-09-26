/* ============================================================================
   chromeMobileDesktop.test.js — garde-fou du DÉFAUT 2 : la barre d'interface
   mobile ne s'affiche pas sur desktop.
   ----------------------------------------------------------------------------
   POURQUOI CE TEST : `AppPrivateLayout` montait `AuroraMobileTopbar` sans
   condition. Sur desktop, on voyait donc en permanence un second logo COURTIARK,
   un hamburger et une cloche rognée au-dessus du cockpit (relevé en production
   le 21/09/2026). La condition doit rester la règle de viewport du produit —
   « max-width: 768px », celle du CSS de la barre basse et du hook partagé —
   jamais une détection réinventée localement.
   ========================================================================== */

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const RACINE_SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const lire = (chemin) => readFileSync(resolve(RACINE_SRC, chemin), 'utf8')

const LAYOUT = 'AppPrivateLayout.jsx'
const CSS_MOBILE = 'styles/aurora-mobile.css'

describe('2. La barre d’interface mobile n’est montée que sur mobile', () => {
  it('utilise la règle de viewport du reste de l’application, pas une nouvelle', () => {
    const source = lire(LAYOUT)
    expect(source).toContain("useMediaQuery('(max-width: 768px)')")
    expect(source).toContain("from './components/aurora/AuroraMobileLayout'")
  })

  it('la barre supérieure et la barre basse sont derrière la condition', () => {
    const compact = lire(LAYOUT).replace(/\s+/g, ' ')
    const iCondition = compact.indexOf('{isMobile &&')
    const iTopbar = compact.indexOf('<AuroraMobileTopbar')
    const iBottom = compact.indexOf('<AuroraBottomNav')

    expect(iCondition).toBeGreaterThan(-1)
    expect(iTopbar).toBeGreaterThan(iCondition)
    expect(iBottom).toBeGreaterThan(iCondition)
    // Une seule occurrence de chacune : aucun montage inconditionnel à côté.
    expect(compact.split('<AuroraMobileTopbar').length - 1).toBe(1)
    expect(compact.split('<AuroraBottomNav').length - 1).toBe(1)
  })

  it('le seuil JS est celui du CSS qui masque déjà la barre basse sur desktop', () => {
    const css = lire(CSS_MOBILE)
    expect(css).toMatch(/@media \(max-width: 768px\)[\s\S]*\.aurora-bottom-nav/)
  })
})
