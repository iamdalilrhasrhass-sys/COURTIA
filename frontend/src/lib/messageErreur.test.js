/* ============================================================================
   messageErreur.test.js — un refus s'affiche en FRANÇAIS, jamais en code.
   ----------------------------------------------------------------------------
   POURQUOI CE TEST (défaut P3 de la QA adverse n° 2) : l'écran affichait
   `lecture_seule` — l'identifiant technique — pendant plusieurs secondes, alors
   que l'API rédigeait la phrase complète dans `message`. Ces cas sont ceux
   mesurés en production, rejoués tels quels.
   ========================================================================== */

import { describe, expect, it } from 'vitest'
import { erreurLectureSeule, erreurNonDisponible, messageErreurApi } from './messageErreur'

/** Faux refus mesuré le 20/09/2026 : POST /api/clients → 403. */
const REFUS_ASSISTANT = {
  response: {
    status: 403,
    data: {
      error: 'lecture_seule',
      role: 'assistant',
      message: "Votre rôle (assistant) donne accès à tout le cabinet en lecture, mais pas le droit de modifier les données du cabinet.",
    },
  },
}

describe('message d’une erreur d’API', () => {
  it('affiche le message rédigé, jamais le code `lecture_seule`', () => {
    const texte = messageErreurApi(REFUS_ASSISTANT, 'Erreur lors de la création')
    expect(texte).toBe(REFUS_ASSISTANT.response.data.message)
    expect(texte).not.toBe('lecture_seule')
    expect(texte).not.toContain('lecture_seule')
    expect(erreurLectureSeule(REFUS_ASSISTANT)).toBe(true)
  })

  it('un `error` qui n’est qu’un identifiant n’est JAMAIS montré', () => {
    const err = { response: { status: 403, data: { error: 'lecture_seule', role: 'assistant' } } }
    expect(messageErreurApi(err, 'Création refusée par le serveur.')).toBe('Création refusée par le serveur.')
  })

  it('un `error` rédigé (phrase) reste affiché', () => {
    const err = { response: { status: 400, data: { error: 'Le nom du client est obligatoire.' } } }
    expect(messageErreurApi(err, 'Défaut')).toBe('Le nom du client est obligatoire.')
  })

  it('erreur imbriquée `{ error: { code, message } }`', () => {
    const err = { response: { status: 502, data: { error: { code: 'ARK_ERROR', message: 'ARK est momentanément indisponible.' } } } }
    expect(messageErreurApi(err, 'Défaut')).toBe('ARK est momentanément indisponible.')
  })

  it('fonctions annoncées mais non installées (501) : l’état honnête est dit', () => {
    const doc = {
      response: {
        status: 501,
        data: {
          error: 'fonctionnalite_non_implementee',
          message: "L'analyse documentaire ARK (OCR et lecture des contrats) n'est pas encore disponible sur cette installation.",
        },
      },
    }
    expect(messageErreurApi(doc, 'Défaut')).toContain('analyse documentaire ARK')
    expect(erreurNonDisponible(doc)).toBe(true)

    // Sans phrase : « fonctionnalité non disponible », jamais le code.
    const releve = { response: { status: 501, data: { error: 'statement_pdf_unavailable' } } }
    const texte = messageErreurApi(releve, 'Défaut')
    expect(texte).toContain('Fonctionnalité non disponible')
    expect(texte).not.toContain('statement_pdf_unavailable')
  })

  it('sans aucune information exploitable : la phrase de l’écran', () => {
    expect(messageErreurApi(new Error('réseau'), 'Impossible de créer le client.')).toBe('Impossible de créer le client.')
    expect(messageErreurApi(undefined, 'Défaut')).toBe('Défaut')
  })
})
