/* ============================================================================
   DemoRequestForm.test.js — garde-fou du TUNNEL DE DÉMO (P0 du 21/09/2026).

   Aucune bibliothèque de rendu (jsdom + testing-library) n'est installée dans ce
   dépôt : ces tests verrouillent le CÂBLAGE réel du composant, sur son source —
   la convention déjà utilisée par defautsQa2Ecrans.test.js, libelles.test.js et
   scenario9.test.js. Le comportement des fonctions pures est vérifié en
   exécution, séparément, dans src/lib/leadCapture.test.js.

   Ce qui est verrouillé ici, exactement ce que le P0 a cassé :
     1. une capture CONFIRMÉE journalise `demo_request_success` — et
        `demo_request_failure` ne peut rester que dans le chemin d'échec (c'est
        lui qui était émis sur un enregistrement réussi) ;
     2. le prospect lit le `message` RÉEL produit par le serveur (demande
        enregistrée, notification interne partie ou non) au lieu d'une formule
        générique qui masquait son état.
   ========================================================================== */

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { EVENEMENTS } from '../../lib/analytics'

const RACINE_SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const SOURCE = readFileSync(resolve(RACINE_SRC, 'components/marketing/DemoRequestForm.jsx'), 'utf8')

describe('1. Un envoi réussi journalise demo_request_success', () => {
  it('demo_request_success est émis dans le chemin de succès', () => {
    expect(SOURCE).toContain("evenement('demo_request_success'")
  })

  it('demo_request_failure n’est émis que dans le chemin d’échec', () => {
    const positionCatch = SOURCE.indexOf('} catch (err) {')
    const positionEchec = SOURCE.indexOf("evenement('demo_request_failure'")

    expect(positionCatch).toBeGreaterThan(-1)
    expect(positionEchec).toBeGreaterThan(positionCatch)
  })

  it('les deux noms appartiennent à la liste close des événements mesurés', () => {
    expect(EVENEMENTS).toContain('demo_request_success')
    expect(EVENEMENTS).toContain('demo_request_failure')
  })
})

describe('2. Le message du serveur est affiché, jamais remplacé', () => {
  it('le succès affiche le message produit par le serveur', () => {
    expect(SOURCE).toContain('messageConfirmation')
  })

  it('aucun message de succès générique n’est affiché inconditionnellement', () => {
    expect(SOURCE).not.toMatch(/setFeedback\(\s*'Votre demande est bien reçue/)
  })

  it('la redirection automatique est retenue quand la notification n’est pas partie', () => {
    expect(SOURCE).toContain('redirectionAutomatique(data)')
    // Le message reste lisible : la démonstration est proposée par un clic.
    expect(SOURCE).toContain('Continuer vers la démonstration')
  })

  it('un échec réel reste un échec, avec le message d’erreur', () => {
    expect(SOURCE).toContain('CAPTURE_ERROR_MESSAGE')
    expect(SOURCE).toContain("setStatus('error')")
  })
})
