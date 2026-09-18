import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { origineTrafic } from './analytics'

/* ============================================================================
   Origine du trafic : premier maillon du tunnel d'acquisition.

   MESURE DU 18/09/2026 : le funnel commençait à `site_visit` et ne pouvait donc
   pas répondre à « d'où viennent les visiteurs ». Aucun code ne distinguait
   l'organique du payant, du direct ou d'un référent externe : les 14 événements
   instrumentés mesuraient le parcours, pas son entrée.

   `origineTrafic()` classe l'entrée SANS jamais maquiller une source en
   organique : un accès direct n'est pas de l'organique, un accès payant non
   plus. Ces tests le vérifient cas par cas, sur les seules variables réelles
   lues par la fonction (document.referrer et les paramètres utm).
   ========================================================================== */

const vrai = { document: globalThis.document, window: globalThis.window }

/** Installe un faux navigateur : référent + chaîne de requête. */
function naviguer({ referrer = '', search = '' } = {}) {
  globalThis.document = { referrer }
  globalThis.window = { location: { search, pathname: '/' } }
}

beforeEach(() => naviguer())
afterEach(() => {
  globalThis.document = vrai.document
  globalThis.window = vrai.window
})

describe('origineTrafic', () => {
  it('classe un référent Google comme organique et nomme le moteur', () => {
    naviguer({ referrer: 'https://www.google.ch/search?q=logiciel+courtier' })
    const o = origineTrafic()
    expect(o.origine).toBe('organique')
    expect(o.moteur).toBe('google')
  })

  it('reconnaît les autres moteurs', () => {
    for (const [ref, attendu] of [
      ['https://www.bing.com/search?q=x', 'bing'],
      ['https://duckduckgo.com/', 'duckduckgo'],
      ['https://search.brave.com/search?q=x', 'brave'],
      ['https://www.ecosia.org/search?q=x', 'ecosia'],
      ['https://www.qwant.com/?q=x', 'qwant'],
    ]) {
      naviguer({ referrer: ref })
      expect(origineTrafic().moteur).toBe(attendu)
    }
  })

  it("n'appelle PAS organique une visite directe (aucun référent, aucun utm)", () => {
    naviguer({})
    expect(origineTrafic().origine).toBe('direct')
  })

  it("n'appelle PAS organique une visite payante", () => {
    for (const medium of ['cpc', 'ppc', 'paid', 'display']) {
      naviguer({ search: `?utm_source=google&utm_medium=${medium}` })
      expect(origineTrafic().origine).toBe('payant')
    }
  })

  it("n'appelle PAS organique un référent externe quelconque", () => {
    naviguer({ referrer: 'https://www.un-blog-quelconque.ch/article' })
    const o = origineTrafic()
    expect(o.origine).toBe('referent')
    expect(o.moteur).toBe('www.un-blog-quelconque.ch')
  })

  it('classe une campagne utm non payante comme campagne', () => {
    naviguer({ search: '?utm_source=newsletter&utm_medium=email' })
    expect(origineTrafic().origine).toBe('campagne')
  })

  it('un utm payant prime sur un référent de moteur', () => {
    naviguer({
      referrer: 'https://www.google.ch/',
      search: '?utm_source=google&utm_medium=cpc',
    })
    expect(origineTrafic().origine).toBe('payant')
  })

  it('ne plante pas si le référent est illisible (origine inconnue)', () => {
    globalThis.document = {
      get referrer() {
        throw new Error('référent illisible')
      },
    }
    globalThis.window = { location: { search: '', pathname: '/' } }
    expect(origineTrafic().origine).toBe('inconnu')
  })
})
