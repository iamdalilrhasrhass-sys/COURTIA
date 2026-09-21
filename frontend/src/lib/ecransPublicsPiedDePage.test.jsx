/* ============================================================================
   ecransPublicsPiedDePage.test.jsx — garde-fou du DÉFAUT 3 : cohérence
   commerciale et légale des pages publiques.
   ----------------------------------------------------------------------------
   POURQUOI CE TEST (relevé en production le 21/09/2026) :
     a) /tarifs n'avait AUCUN pied de page : mentions légales, confidentialité
        et conditions étaient inatteignables depuis la page des prix ;
     b) la landing annonce « essai gratuit » partout, /tarifs n'en parlait pas ;
     c) la landing écrivait à contact@courtia.fr alors que les mentions légales
        publient contact@courtiark.fr — un visiteur qui répond écrivait à une
        boîte qui n'est pas celle servie.
   ========================================================================== */

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import MarketingFooter from '../components/marketing/MarketingFooter'

const RACINE_SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const lire = (chemin) => readFileSync(resolve(RACINE_SRC, chemin), 'utf8')

const sansBalises = (html) => html.replace(/<[^>]*>/g, ' ')

describe('3a. Le pied de page public est présent sur /tarifs', () => {
  it('le pied de page porte les accès légaux', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <MarketingFooter />
      </MemoryRouter>
    )
    expect(sansBalises(html)).toContain('Mentions légales')
    expect(html).toContain('href="/legal/mentions-legales"')
    expect(html).toContain('href="/legal/confidentialite"')
    expect(html).toContain('href="/legal/conditions-utilisation"')
    expect(html).toContain('href="/legal/cookies"')
  })

  it('/tarifs monte ce pied de page', () => {
    const source = lire('pages/Tarifs.jsx')
    expect(source).toContain("import MarketingFooter from '../components/marketing/MarketingFooter'")
    expect(source).toContain('<MarketingFooter />')
  })

  it('les autres pages publiques passent par le MÊME composant (une seule source)', () => {
    const coquille = lire('components/marketing/MarketingShell.jsx')
    expect(coquille).toContain('<MarketingFooter />')
    // Le pied de page n'est plus recopié dans la coquille.
    expect(coquille).not.toContain('mk-footer')
  })
})

describe('3b. /tarifs parle de l’essai gratuit, avec les termes publiés ailleurs', () => {
  it('annonce les 7 jours et les 0 € du jour', () => {
    const source = lire('pages/Tarifs.jsx')
    expect(source).toContain("Essai gratuit 7 jours")
    expect(source).toContain("0 € aujourd'hui, annulation en ligne")
    expect(source).toContain('Y a-t-il un essai gratuit ?')
  })

  it('les termes de l’essai existent bien sur la landing (mêmes mots)', () => {
    const landing = lire('pages/LandingPublic.jsx')
    expect(landing).toContain('Essai gratuit 7 jours')
    expect(landing).toContain("7 jours, 0 € aujourd’hui, annulation en ligne.")
  })
})

describe('3c. Un seul domaine de contact : courtiark.fr', () => {
  it('la landing n’écrit plus à une autre boîte', () => {
    const source = lire('pages/LandingPublic.jsx')
    expect(source).not.toContain('@courtia.fr')
    expect(source).toContain('mailto:contact@courtiark.fr')
  })

  it('les mentions légales publient le même domaine', () => {
    expect(lire('pages/LegalMentionsLegales.jsx')).toContain('contact@courtiark.fr')
  })
})
