/* ============================================================================
   COURTIA — Lecture commerciale (écran ACQUISITION COURTIA / ARK SALES)
   ----------------------------------------------------------------------------
   Source : service de capture COURTIA (routes GET /api/sales/*).

   SÉCURITÉ — le jeton de lecture n'est JAMAIS dans ce fichier ni dans le bundle :
   le navigateur appelle la MÊME ORIGINE (`/api/sales/...`) et c'est le relais
   serveur qui ajoute l'en-tête `Authorization` (serveur_reel.py en local,
   fonction serveur en production). Un secret livré au navigateur n'est plus un
   secret : il serait lisible par n'importe quel visiteur de l'application.

   RÈGLE DE MESURE : le service renvoie pour chaque compteur
   `{ valeur, mesure: "mesuré" | "non mesuré", sources: [...] }`.
   Une valeur `null` avec mesure « non mesuré » ne doit JAMAIS être affichée 0.
   ========================================================================== */

/* IMPORTANT — origine des routes de lecture commerciale.

   `VITE_API_URL` est figé À LA COMPILATION (ici : https://courtia.onrender.com).
   L'utiliser pour /api/sales/* enverrait la lecture commerciale vers l'API
   applicative, qui n'héberge pas ces routes — et surtout, un appel
   inter-origine interdirait au relais serveur d'ajouter le jeton de lecture.

   Ces routes sont donc appelées en MÊME ORIGINE (`/api/sales/...`) : le
   navigateur ne porte aucun secret, et c'est le serveur qui relaie vers le
   service de capture en ajoutant `Authorization`.
   (VITE_SALES_API_URL permet de pointer ailleurs si un jour nécessaire.) */
const BASE_SALES = import.meta.env.VITE_SALES_API_URL || '/api'

export const NON_MESURE = 'non mesuré'
export const HOT_SCORE_DEFAUT = 60

/** Erreur de lecture, avec le code HTTP et la raison renvoyée par le service. */
export class SalesApiError extends Error {
  constructor(message, { status = 0, code = '', details = '' } = {}) {
    super(message)
    this.name = 'SalesApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

function messageFrancais(status, code) {
  if (code === 'jeton_absent' || code === 'jeton_invalide') {
    return "Lecture refusée : le jeton de lecture commerciale est absent ou invalide côté serveur."
  }
  if (code === 'lecture_desactivee' || code === 'jeton_de_lecture_absent') {
    return "Lecture commerciale désactivée : le jeton n'est pas configuré sur le serveur (COURTIA_SALES_TOKEN)."
  }
  if (code === 'capture_injoignable') {
    return "Le service de capture n'a pas répondu : la lecture commerciale est momentanément indisponible."
  }
  if (status === 404) return "Route de lecture commerciale introuvable sur ce serveur."
  return `Lecture commerciale impossible (HTTP ${status || 'inconnu'}).`
}

function urlAvecParametres(chemin, params = {}) {
  const base = BASE_SALES.endsWith('/') ? BASE_SALES.slice(0, -1) : BASE_SALES
  const url = `${base}${chemin.startsWith('/') ? chemin : `/${chemin}`}`
  const recherche = new URLSearchParams()
  Object.entries(params).forEach(([cle, valeur]) => {
    if (valeur === undefined || valeur === null || valeur === '') return
    if (valeur === false) return
    recherche.set(cle, valeur === true ? '1' : String(valeur))
  })
  const requete = recherche.toString()
  return requete ? `${url}?${requete}` : url
}

async function lire(chemin, params = {}, { signal } = {}) {
  let reponse
  try {
    reponse = await fetch(urlAvecParametres(chemin, params), {
      method: 'GET',
      headers: { Accept: 'application/json' },
      credentials: 'same-origin',
      signal,
    })
  } catch (err) {
    if (err?.name === 'AbortError') throw err
    throw new SalesApiError('Le service de capture est injoignable.', { status: 0, code: 'reseau' })
  }

  let charge = null
  try {
    charge = await reponse.json()
  } catch {
    charge = null
  }

  if (!reponse.ok) {
    throw new SalesApiError(messageFrancais(reponse.status, charge?.error), {
      status: reponse.status,
      code: charge?.error || '',
      details: charge?.raison || charge?.details || '',
    })
  }
  return charge
}

/** GET /api/sales/leads — filtrable par statut / environment / source, paginée. */
export function chargerLeads({ statut, environment, source, q, includeQa, limit, offset } = {}, options) {
  return lire('/sales/leads', { statut, environment, source, q, include_qa: includeQa, limit, offset }, options)
}

/** GET /api/sales/funnel — agrégats par étape (0 prouvé ou « non mesuré »). */
export function chargerFunnel({ environment, includeQa } = {}, options) {
  return lire('/sales/funnel', { environment, include_qa: includeQa }, options)
}

/** GET /api/sales/events — événements bruts du funnel. */
export function chargerEvenements({ evenement, environment, leadId, depuis, includeQa, limit, offset } = {}, options) {
  return lire('/sales/events', {
    evenement, environment, lead_id: leadId, depuis, include_qa: includeQa, limit, offset,
  }, options)
}

/** GET /api/sales/summary — bloc COURTIA SALES du Morning Brief. */
export function chargerResume({ heures, environment, includeQa } = {}, options) {
  return lire('/sales/summary', { heures, environment, include_qa: includeQa }, options)
}
