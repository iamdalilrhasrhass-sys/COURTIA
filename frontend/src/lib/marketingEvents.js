/* ============================================================================
   COURTIA — Événements marketing : UNE seule nomenclature, celle du service.

   BUG MESURÉ ET CORRIGÉ (18/09/2026)
   ----------------------------------
   Ce module envoyait quatre noms qui n'existent PAS dans l'ensemble accepté par
   le service de capture (`service_capture.py`, ensemble EVENEMENTS) :
       click_demo_cta · submit_demo_request · click_pricing · open_video
   Le service refuse un nom inconnu : ces quatre événements étaient donc perdus
   en silence. Vérifié en base : aucune ligne pour ces quatre noms, alors que
   les boutons correspondants sont réellement cliqués.

   RÈGLE APPLIQUÉE : le service de capture est la source de vérité des
   événements. On ne lui envoie QUE des noms qu'il accepte, en réutilisant la
   mesure existante (`lib/analytics.js`) — une seule session anonyme, un seul
   environnement (production / qa / internal), une seule file d'envoi, et
   toujours aucune donnée personnelle.

   `open_video` n'a AUCUN équivalent accepté : l'événement reste NON MESURÉ et
   ne part plus sous un nom que le service refuserait. C'est écrit noir sur
   blanc plutôt que maquillé en fausse mesure.
   ========================================================================== */

import { evenement } from './analytics'

/* Anciens noms (appelants existants) -> noms réellement acceptés par le service. */
const CORRESPONDANCE = Object.freeze({
  click_demo_cta: 'demo_cta_click',
  submit_demo_request: 'demo_form_submit',
  click_pricing: 'pricing_view',
})

/* Noms volontairement NON mesurés : le service n'accepte aucun équivalent. */
const NON_MESURES = Object.freeze({
  open_video: "aucun événement accepté par le service ne correspond à l'ouverture d'une vidéo",
})

export const EVENEMENTS_MARKETING = Object.freeze(Object.values(CORRESPONDANCE))

/**
 * Enregistre un événement marketing sous son nom réellement accepté.
 *
 * @param {string} eventName nom d'appel (vocabulaire marketing historique)
 * @param {object} [payload] propriétés scalaires libres
 * @returns {object|null} la charge transmise, ou `null` si rien n'a été envoyé
 */
export async function trackMarketingEvent(eventName, payload = {}) {
  const nomReel = CORRESPONDANCE[eventName]
  if (!nomReel) {
    if (NON_MESURES[eventName] && typeof window !== 'undefined') {
      /* Trace locale seulement : aucune requête, aucun faux compteur côté service. */
      window.__courtiaNonMesure = [
        { evenement: eventName, raison: NON_MESURES[eventName], at: new Date().toISOString() },
        ...(window.__courtiaNonMesure || []),
      ].slice(0, 20)
    }
    return null
  }
  return evenement(nomReel, payload)
}

export default trackMarketingEvent
