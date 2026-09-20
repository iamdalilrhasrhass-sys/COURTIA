/* ============================================================================
   roleSession.test.js — garde-fou des droits d'écriture affichés à l'écran.
   ----------------------------------------------------------------------------
   POURQUOI CE TEST (défaut P3 de la QA adverse n° 2, mesuré en production) :
   un compte `assistant` (lecture seule) voyait tous les formulaires d'écriture,
   et son refus s'affichait en code machine `lecture_seule`.

   L'invariant vérifié ici est subtil et c'est le cœur du correctif : la réponse
   de connexion ne dit PAS le rôle de cabinet (un assistant de cabinet y vaut
   « broker »). On ne peut donc pas conclure « écriture autorisée » depuis elle —
   le test verrouille cet état « inconnu », et l'absence de faux positif pour les
   comptes sans cabinet, que l'API autorise réellement à écrire.
   ========================================================================== */

import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  DROITS_ECRITURE, DROITS_INCONNU, DROITS_LECTURE,
  droitsEcriture, lectureSeulePour, messageLectureSeule, profilComplet, lireProfilSession,
} from './roleSession'

function stockage(entrees = {}) {
  const donnees = { ...entrees }
  return {
    getItem: (cle) => (cle in donnees ? donnees[cle] : null),
    setItem: (cle, valeur) => { donnees[cle] = String(valeur) },
    removeItem: (cle) => { delete donnees[cle] },
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('droits d’écriture lus depuis la session', () => {
  it('profil de CONNEXION (sans cabinet_role) : état inconnu, aucune conclusion', () => {
    // C'est exactement ce que renvoie POST /api/auth/login.
    const profil = { id: 12, email: 'assistant.ch@exemple.test', firstName: 'Aline', lastName: 'F', role: 'broker' }
    expect(profilComplet(profil)).toBe(false)
    expect(droitsEcriture(profil)).toBe(DROITS_INCONNU)
    expect(lectureSeulePour(profil)).toBe(false)
  })

  it('cabinet_role assistant / viewer : lecture seule établie', () => {
    expect(droitsEcriture({ cabinet_role: 'assistant' })).toBe(DROITS_LECTURE)
    expect(droitsEcriture({ cabinet_role: 'viewer', role: 'broker' })).toBe(DROITS_LECTURE)
    expect(lectureSeulePour({ cabinet_role: 'assistant' })).toBe(true)
  })

  it('cabinet_role owner / manager / broker : écriture', () => {
    for (const role of ['owner', 'manager', 'broker']) {
      expect(droitsEcriture({ cabinet_role: role, marche: 'CH' })).toBe(DROITS_ECRITURE)
    }
  })

  it('profil complet SANS appartenance : compte mono-utilisateur, écriture autorisée', () => {
    // Trois des quatre comptes réels n'ont aucun cabinet : l'API les autorise à
    // écrire (portée mono-utilisateur). Leur retirer les formulaires serait une
    // régression.
    expect(droitsEcriture({ cabinet_role: null, role: 'broker', marche: 'FR' })).toBe(DROITS_ECRITURE)
    expect(droitsEcriture({ marche: 'CH', role: 'owner' })).toBe(DROITS_ECRITURE)
  })

  it('rôles de plateforme et mode démonstration : écriture', () => {
    expect(droitsEcriture({ role: 'super_admin' })).toBe(DROITS_ECRITURE)
    expect(droitsEcriture(null, { demonstration: true })).toBe(DROITS_ECRITURE)
  })

  it('aucun profil : inconnu (jamais « écriture » par défaut)', () => {
    expect(droitsEcriture(null)).toBe(DROITS_INCONNU)
    expect(droitsEcriture(undefined)).toBe(DROITS_INCONNU)
  })

  it('profil stocké lu depuis localStorage, et profil illisible toléré', () => {
    vi.stubGlobal('localStorage', stockage({ courtia_user: JSON.stringify({ cabinet_role: 'assistant' }) }))
    expect(lireProfilSession()).toEqual({ cabinet_role: 'assistant' })
    expect(lectureSeulePour(lireProfilSession())).toBe(true)

    vi.stubGlobal('localStorage', stockage({ courtia_user: '{invalide' }))
    expect(lireProfilSession()).toBeNull()
  })
})

describe('message du refus d’écriture', () => {
  it('reprend la formulation rédigée par l’API, avec le rôle réel', () => {
    expect(messageLectureSeule('assistant', 'créer un client')).toBe(
      'Votre rôle (assistant) donne accès à tout le cabinet en lecture, mais pas le droit de créer un client.'
    )
    expect(messageLectureSeule('viewer')).toContain('Votre rôle (viewer)')
    // Jamais un code technique à l'écran.
    expect(messageLectureSeule('viewer')).not.toContain('lecture_seule')
  })
})
