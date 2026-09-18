import { describe, expect, it, vi, beforeEach } from 'vitest'
import { EVENEMENTS } from './analytics'

/* ============================================================================
   Ces tests protègent un BUG RÉEL, mesuré en base le 18/09/2026 : ce module
   envoyait quatre noms d'événements que le service de capture refuse
   (click_demo_cta, submit_demo_request, click_pricing, open_video). Aucune ligne
   de ces quatre noms n'existait en base alors que les boutons étaient cliqués :
   la mesure était perdue en silence.

   Règle désormais vérifiée par ces tests : AUCUN nom envoyé ne peut être refusé
   par le service. Toute valeur mappée doit appartenir à l'ensemble `EVENEMENTS`
   réellement accepté.
   ========================================================================== */

const NOMS_ACCEPTES = new Set(EVENEMENTS)

const ANCIENS_NOMS_INVALIDES = [
  'click_demo_cta',
  'submit_demo_request',
  'click_pricing',
  'open_video',
]

beforeEach(() => {
  vi.resetModules()
})

describe('mapping des événements marketing', () => {
  it('ne mappe QUE des noms réellement acceptés par le service de capture', async () => {
    const { EVENEMENTS_MARKETING } = await import('./marketingEvents')
    expect(EVENEMENTS_MARKETING.length).toBeGreaterThan(0)
    for (const nom of EVENEMENTS_MARKETING) {
      expect(NOMS_ACCEPTES.has(nom), `${nom} serait refusé par le service`).toBe(true)
    }
  })

  it('n’envoie plus jamais un ancien nom invalide (le bug mesuré en base)', async () => {
    const { trackMarketingEvent } = await import('./marketingEvents')
    for (const ancien of ANCIENS_NOMS_INVALIDES) {
      const envoi = await trackMarketingEvent(ancien, { section: 'test' })
      expect(envoi, `${ancien} ne doit rien envoyer`).toBeNull()
    }
  })

  it('traduit chaque ancien nom vers son équivalent accepté', async () => {
    const { EVENEMENTS_MARKETING } = await import('./marketingEvents')
    expect(EVENEMENTS_MARKETING).toContain('demo_cta_click')
    expect(EVENEMENTS_MARKETING).toContain('demo_form_submit')
    expect(EVENEMENTS_MARKETING).toContain('pricing_view')
  })

  it('ignore un nom totalement inconnu sans lever d’erreur', async () => {
    const { trackMarketingEvent } = await import('./marketingEvents')
    await expect(trackMarketingEvent('evenement_inexistant')).resolves.toBeNull()
  })
})
