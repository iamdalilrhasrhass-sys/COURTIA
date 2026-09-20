/* ============================================================================
   DeviseIcone.test.jsx — l'icône d'un montant suit la devise du cabinet.
   ----------------------------------------------------------------------------
   POURQUOI CE TEST : les écrans affichant des montants passaient `icon={Euro}`
   en dur. Sur un cabinet suisse, la carte cockpit « PRIMES ANNUELLES » montrait
   donc un symbole euro au-dessus d'une valeur en francs suisses (relevé le
   20/09/2026 sur un cabinet d'audit suisse).

   lucide-react pose une classe stable sur le <svg> (« lucide-euro »,
   « lucide-banknote ») : le rendu serveur suffit à prouver l'icône réellement
   produite, sans navigateur ni jsdom.
   ========================================================================== */

import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { configurerContexte } from '../lib/monnaie'
import DeviseIcone from './DeviseIcone'

describe('DeviseIcone — icône d’un montant', () => {
  it('cabinet français : icône « € »', () => {
    configurerContexte({ pays: 'FR', langue: 'fr' })
    const html = renderToStaticMarkup(<DeviseIcone size={20} />)
    expect(html).toContain('lucide-euro')
    expect(html).not.toContain('lucide-banknote')
  })

  it('cabinet suisse : aucune icône euro, un billet à la place', () => {
    configurerContexte({ pays: 'CH', langue: 'fr' })
    const html = renderToStaticMarkup(<DeviseIcone size={20} />)
    expect(html).toContain('lucide-banknote')
    expect(html).not.toContain('lucide-euro')
  })

  it('profil inconnu : comportement historique (euro)', () => {
    configurerContexte({ pays: null, langue: null })
    expect(renderToStaticMarkup(<DeviseIcone />)).toContain('lucide-euro')
  })
})
