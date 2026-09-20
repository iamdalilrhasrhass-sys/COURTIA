import { describe, expect, it } from 'vitest'
import { lireReponseArk, messageErreurArk, MESSAGE_REPONSE_VIDE } from './reponseArk'

/**
 * Le contrat réel du backend est `{ reply }` (backend/src/routes/ark.js).
 * Ces tests figent la correspondance statut HTTP → ce que voit le courtier.
 */
describe('lireReponseArk — contrat bulle ARK / backend', () => {
  it('lit le champ `reply` renvoyé par le backend', () => {
    const r = lireReponseArk(200, { reply: 'Trois contrats arrivent à échéance.' })
    expect(r).toEqual({ texte: 'Trois contrats arrivent à échéance.', erreur: false })
  })

  it('accepte `response` en repli (ancien format) sans le confondre avec une erreur', () => {
    const r = lireReponseArk(200, { response: 'Repli lisible.' })
    expect(r.texte).toBe('Repli lisible.')
    expect(r.erreur).toBe(false)
  })

  it('ne présente jamais un corps vide comme une réponse', () => {
    expect(lireReponseArk(200, {}).texte).toBe(MESSAGE_REPONSE_VIDE)
    expect(lireReponseArk(200, { reply: '   ' }).texte).toBe(MESSAGE_REPONSE_VIDE)
    expect(lireReponseArk(200, null).texte).toBe(MESSAGE_REPONSE_VIDE)
    expect(lireReponseArk(200, { reply: '' }).erreur).toBe(true)
  })

  it('refuse de lire un corps d’erreur comme une réponse', () => {
    for (const statut of [400, 401, 404, 429, 500, 503]) {
      const r = lireReponseArk(statut, { reply: 'contenu qui ne doit pas s’afficher' })
      expect(r.erreur).toBe(true)
      expect(r.texte).not.toContain('contenu qui ne doit pas s’afficher')
    }
  })

  it('donne un message actionnable par statut', () => {
    expect(lireReponseArk(401, null).texte).toMatch(/reconnectez-vous/)
    expect(lireReponseArk(429, null).texte).toMatch(/Patientez/)
    expect(lireReponseArk(500, null).texte).toMatch(/indisponible/)
    expect(lireReponseArk(400, { error: 'message requis' }).texte).toBe('message requis')
    expect(lireReponseArk(404, null).texte).toMatch(/introuvable/)
  })
})

describe('messageErreurArk — pannes réseau', () => {
  it('distingue un dépassement de délai d’une erreur de connexion', () => {
    expect(messageErreurArk({ name: 'AbortError' })).toMatch(/30 secondes/)
    expect(messageErreurArk(new TypeError('Failed to fetch'))).toBe('Erreur de connexion')
  })
})
