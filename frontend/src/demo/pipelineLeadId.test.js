/**
 * Chaîne LEAD -> DÉMO -> PIPELINE : ce que le frontend doit transmettre.
 *
 * Le service de capture ne fait avancer un lead que si l'événement porte son
 * `lead_id` (`service_capture.py` : `avancer_lead_sur_evenement` lit
 * `d.get("lead_id")`). Or les événements de démonstration partaient SANS cet
 * identifiant : un visiteur qui demandait une démo puis parcourait toute la
 * visite restait au statut NEW, n'était jamais compté comme prospect engagé et
 * ne déclenchait aucune relance. Ces tests verrouillent la correction :
 *  - l'identifiant renvoyé par la capture est mémorisé ;
 *  - tout événement suivant le porte ;
 *  - sans capture, l'événement reste sans lead_id (le pipeline ne doit pas
 *    avancer sur un visiteur inconnu).
 *
 * La chaîne réelle est vérifiée séparément, service et base compris, par
 * `scripts/qa_demo_pipeline.py` (lead NEW -> DEMO_STARTED -> DEMO_COMPLETED ->
 * CONTACT_REQUESTED, transitions tracées dans lead_history).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { lireLeadId, memoriserLeadId, oublierLeadId, postDemoRequest } from '../lib/leadCapture'
import { envoyerEvenement } from './evenementsConversion'

/** sessionStorage en mémoire : l'environnement de test n'a pas de navigateur. */
function fauxStockage() {
  const memoire = new Map()
  return {
    getItem: (cle) => (memoire.has(cle) ? memoire.get(cle) : null),
    setItem: (cle, valeur) => memoire.set(cle, String(valeur)),
    removeItem: (cle) => memoire.delete(cle),
  }
}

beforeEach(() => {
  oublierLeadId()
  globalThis.window = {
    sessionStorage: fauxStockage(),
    location: { pathname: '/demo' },
  }
})

describe('lead_id de la visite', () => {
  it('mémorise l’identifiant renvoyé par la capture', () => {
    expect(lireLeadId()).toBeNull()
    expect(memoriserLeadId({ ok: true, lead_id: 42 })).toBe(42)
    expect(lireLeadId()).toBe(42)
  })

  it('refuse un identifiant absent ou invalide (jamais de lead_id inventé)', () => {
    expect(memoriserLeadId({ ok: true })).toBeNull()
    expect(memoriserLeadId({ lead_id: 'abc' })).toBeNull()
    expect(memoriserLeadId({ lead_id: 0 })).toBeNull()
    expect(memoriserLeadId(null)).toBeNull()
    expect(lireLeadId()).toBeNull()
  })

  it('postDemoRequest mémorise l’identifiant confirmé par le service', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 201,
      json: async () => ({ ok: true, lead_id: 18, redirect: '/demo' }),
    }))
    const reponse = await postDemoRequest({ email: 'qa@courtia.invalid' }, { fetchImpl })
    expect(reponse.lead_id).toBe(18)
    expect(lireLeadId()).toBe(18)
  })
})

describe('événements de démonstration', () => {
  it('joint le lead_id de la visite au corps de l’événement', async () => {
    memoriserLeadId({ lead_id: 18 })
    const appels = []
    globalThis.fetch = vi.fn(async (url, options) => {
      appels.push({ url, corps: JSON.parse(options.body) })
      return { ok: true, status: 202, json: async () => ({ ok: true }) }
    })

    const resultat = await envoyerEvenement('demo_started', { action: 'explorer' })

    expect(resultat.ok).toBe(true)
    expect(appels).toHaveLength(1)
    expect(appels[0].corps.lead_id).toBe(18)
    expect(appels[0].corps.event).toBe('demo_started')
  })

  it('sans capture préalable, aucun lead_id n’est envoyé', async () => {
    const appels = []
    globalThis.fetch = vi.fn(async (url, options) => {
      appels.push(JSON.parse(options.body))
      return { ok: true, status: 202, json: async () => ({ ok: true }) }
    })

    await envoyerEvenement('demo_started')

    expect(appels[0]).not.toHaveProperty('lead_id')
  })

  it('un échec réseau reste visible et ne bloque pas la visite', async () => {
    memoriserLeadId({ lead_id: 18 })
    globalThis.fetch = vi.fn(async () => { throw new TypeError('réseau indisponible') })

    const resultat = await envoyerEvenement('demo_completed')

    expect(resultat).toEqual({ ok: false, statut: 0 })
    expect(lireLeadId()).toBe(18)
  })
})
