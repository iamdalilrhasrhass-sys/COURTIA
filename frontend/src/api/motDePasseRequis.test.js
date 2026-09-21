/**
 * motDePasseRequis.test.js — LE REFUS « MOT DE PASSE TEMPORAIRE » EST TRAITÉ.
 *
 * Mesure du 21/09/2026 (comptes pilotes, production) : chaque route métier
 * répondait 403 `changement_mot_de_passe_requis` et le cockpit se contentait de
 * l'afficher comme une erreur quelconque. Le pilote devait deviner qu'il fallait
 * changer son mot de passe. Le traitement vit désormais dans l'intercepteur :
 * redirection vers l'écran de changement, une seule fois, sans boucle.
 */
import { describe, it, expect, vi } from 'vitest'
import {
  traiterChangementMotDePasseRequis,
  CHEMIN_CHANGEMENT_MOT_DE_PASSE,
} from './index'

describe('traiterChangementMotDePasseRequis', () => {
  it('redirige vers l’écran de changement quand le serveur le demande', () => {
    const rediriger = vi.fn()
    const traite = traiterChangementMotDePasseRequis(
      { code: 'changement_mot_de_passe_requis', must_change_password: true },
      '/clients',
      rediriger
    )
    expect(traite).toBe(true)
    expect(rediriger).toHaveBeenCalledWith(CHEMIN_CHANGEMENT_MOT_DE_PASSE)
  })

  it('ne redirige pas depuis l’écran de changement (pas de boucle)', () => {
    const rediriger = vi.fn()
    const traite = traiterChangementMotDePasseRequis(
      { code: 'changement_mot_de_passe_requis' },
      '/parametres',
      rediriger
    )
    expect(traite).toBe(false)
    expect(rediriger).not.toHaveBeenCalled()
  })

  it.each([
    [{ code: 'trial_expired' }],
    [{ error: 'Accès refusé' }],
    [null],
    [undefined],
    ['changement_mot_de_passe_requis'],   // forme non structurée : ignorée
  ])('ne touche à rien pour une autre réponse 403 (%j)', (donnees) => {
    const rediriger = vi.fn()
    expect(traiterChangementMotDePasseRequis(donnees, '/clients', rediriger)).toBe(false)
    expect(rediriger).not.toHaveBeenCalled()
  })
})
