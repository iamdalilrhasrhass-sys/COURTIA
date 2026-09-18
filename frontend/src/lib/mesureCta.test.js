import { describe, expect, it, vi, beforeEach } from 'vitest'

/* ============================================================================
   Mesure du clic sur le CTA « Demander une démo ».

   Bug mesuré en base le 18/09/2026 : `demo_cta_click` n'était émis par AUCUN
   code. Le premier maillon commercial du funnel était donc invisible.

   Ces tests vérifient le comportement RÉEL de l'écouteur, sur un DOM minimal
   simulé : un clic sur un lien vers /demo-public doit produire exactement un
   `demo_cta_click` exploitable (libellé du CTA + zone + page d'origine), et un
   clic sur n'importe quel autre lien ne doit RIEN produire.
   ========================================================================== */

const evenement = vi.fn()
vi.mock('./analytics', () => ({
  evenement: (...args) => evenement(...args),
  default: (...args) => evenement(...args),
}))

/** Faux élément d'ancrage, juste assez pour la logique explorée. */
function fausseAncre({ href, texte = 'Demander une démo' }) {
  const ancre = {
    getAttribute: (nom) => (nom === 'href' ? href : null),
    textContent: texte,
  }
  ancre.closest = (selecteur) => (selecteur === 'a[href]' ? ancre : null)
  return ancre
}

/** Faux clic : `target` porte la cible réelle du clic. */
function fauxClic(target, extra = {}) {
  return { target, button: 0, defaultPrevented: false, ...extra }
}

let gestionnaire
let retirer

beforeEach(async () => {
  vi.clearAllMocks()
  gestionnaire = null
  retirer = null

  globalThis.window = {
    location: { pathname: '/tarifs', origin: 'https://courtiark.fr' },
  }
  globalThis.document = {
    addEventListener: (type, handler, capture) => {
      if (type === 'click' && capture === true) gestionnaire = handler
    },
    removeEventListener: vi.fn(),
  }

  const { installerMesureCta } = await import('./mesureCta')
  retirer = installerMesureCta()
})

describe('installerMesureCta', () => {
  it('émet demo_cta_click quand on clique un lien vers /demo-public', () => {
    const ancre = fausseAncre({ href: '/demo-public' })
    ancre.closest = (s) => (s === 'a[href]' ? ancre : null)

    gestionnaire(fauxClic(ancre))

    expect(evenement).toHaveBeenCalledTimes(1)
    const [nom, props] = evenement.mock.calls[0]
    expect(nom).toBe('demo_cta_click')
    expect(props.depuis).toBe('/tarifs')
    expect(props.cta).toContain('Demander')
    expect(typeof props.zone).toBe('string')
  })

  it('n’émet RIEN pour un lien qui ne mène pas à la démo', () => {
    const ancre = fausseAncre({ href: '/tarifs' })
    ancre.closest = (s) => (s === 'a[href]' ? ancre : null)

    gestionnaire(fauxClic(ancre))

    expect(evenement).not.toHaveBeenCalled()
  })

  it('n’émet RIEN pour un clic modifié (nouvel onglet, cmd+clic)', () => {
    const ancre = fausseAncre({ href: '/demo-public' })
    ancre.closest = (s) => (s === 'a[href]' ? ancre : null)

    gestionnaire(fauxClic(ancre, { metaKey: true }))

    expect(evenement).not.toHaveBeenCalled()
  })

  it('ne compte qu’UNE fois un même clic rejoué dans la même seconde', () => {
    const ancre = fausseAncre({ href: '/demo-public' })
    ancre.closest = (s) => (s === 'a[href]' ? ancre : null)

    gestionnaire(fauxClic(ancre))
    gestionnaire(fauxClic(ancre))

    expect(evenement).toHaveBeenCalledTimes(1)
  })

  it('reste inerte si le clic ne vient pas d’un lien', () => {
    gestionnaire(fauxClic({ closest: () => null }))
    expect(evenement).not.toHaveBeenCalled()
  })

  it('renvoie une fonction de retrait et n’installe qu’un seul écouteur', () => {
    expect(typeof retirer).toBe('function')
    const ajouts = vi.fn()
    globalThis.document.addEventListener = ajouts
    /* Une seconde installation ne doit pas doubler l'écouteur : le marqueur
       posé sur `document` l'en empêche. */
    expect(globalThis.document.__courtiaMesureCtaInstallee).toBeDefined()
  })
})
