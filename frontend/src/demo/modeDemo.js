/* ============================================================================
   COURTIA — Mode démonstration : plomberie réseau
   ----------------------------------------------------------------------------
   Objectif : faire tourner LES VRAIS COMPOSANTS COURTIA sur des données
   synthétiques, sans jamais toucher à l'API ni à la base de données.

   Deux clients réseau coexistent dans le produit :
     1. l'instance axios de `src/api/index.js`      (la majorité des écrans)
     2. les helpers `fetch` de `src/utils/api.js`   (formulaires marketing, etc.)

   Les deux sont neutralisés ici, et UNIQUEMENT lorsque le chemin courant
   commence par `/demo`. Hors démo, rien n'est modifié : l'application normale
   garde exactement son comportement.

   Garanties :
     - aucun appel réseau réel n'est émis en mode démo ;
     - aucun jeton n'est fabriqué : la route privée est simplement autorisée en
       démo (voir PrivateRoute dans App.jsx) ;
     - la couche se désinstalle proprement à la sortie de la démo.
   ========================================================================== */

import api from '../api'
import { repondre } from './reponsesDemo'

const PREFIXE_DEMO = '/demo'

let installe = false
let fetchOrigine = null
let adaptateurOrigine = null

/** Vrai si la page courante est la démonstration. */
export function estModeDemo() {
  if (typeof window === 'undefined') return false
  const chemin = window.location.pathname || ''
  return chemin === PREFIXE_DEMO || chemin.startsWith(PREFIXE_DEMO + '/')
}

/** Extrait le chemin d'API normalisé d'une URL, quel que soit son hôte. */
export function cheminApi(url = '') {
  const sansHote = String(url).replace(/^https?:\/\/[^/]+/i, '')
  const sansApi = sansHote.replace(/^\/api(?=\/|$)/, '')
  return sansApi.split('?')[0] || '/'
}

function reponseJson(donnees, statut = 200) {
  return new Response(JSON.stringify(donnees), {
    status: statut,
    headers: { 'Content-Type': 'application/json' },
  })
}

/**
 * Active la couche de démonstration.
 * À appeler au démarrage de l'application, avant le premier rendu des écrans.
 */
export function installerDemo() {
  if (installe || typeof window === 'undefined') return
  installe = true

  /* ---------------------------------------------------------------- axios
     On remplace l'adaptateur : la requête n'atteint jamais le réseau, la
     réponse synthétique est renvoyée comme si le serveur avait répondu. */
  adaptateurOrigine = api.defaults.adapter
  api.defaults.adapter = async (config) => {
    const chemin = cheminApi(config.url || '')
    const methode = String(config.method || 'get').toUpperCase()

    let corps = config.data
    if (typeof corps === 'string') {
      try { corps = JSON.parse(corps) } catch { /* corps non JSON : laissé tel quel */ }
    }

    const { statut, donnees } = repondre(methode, chemin, corps)
    if (typeof window !== 'undefined') {
      window.__demoRequetes = window.__demoRequetes || []
      window.__demoRequetes.push(`${methode} ${chemin}`)
    }

    if (statut >= 400) {
      const erreur = new Error(`Requête de démonstration ${statut}`)
      erreur.response = { status: statut, data: donnees, config }
      erreur.config = config
      return Promise.reject(erreur)
    }

    return { data: donnees, status: statut, statusText: 'OK', headers: {}, config }
  }

  /* ----------------------------------------------------------------- fetch
     Les helpers de `utils/api.js` passent par le fetch global : on l'intercepte
     pour les seules URL d'API. Tout le reste (polices, images, chunks) passe. */
  fetchOrigine = window.fetch.bind(window)
  window.fetch = async (ressource, options = {}) => {
    const url = typeof ressource === 'string' ? ressource : ressource?.url || ''
    if (!/\/api(\/|$)/.test(url)) return fetchOrigine(ressource, options)

    const chemin = cheminApi(url)
    const methode = String(options.method || 'GET').toUpperCase()
    let corps = options.body
    if (typeof corps === 'string') {
      try { corps = JSON.parse(corps) } catch { /* corps non JSON */ }
    }

    const { statut, donnees } = repondre(methode, chemin, corps)
    if (typeof window !== 'undefined') {
      window.__demoRequetes = window.__demoRequetes || []
      window.__demoRequetes.push(`${methode} ${chemin}`)
    }
    return reponseJson(donnees, statut)
  }
}

/** Rétablit le comportement normal (utilisé en quittant la démo). */
export function desinstallerDemo() {
  if (!installe) return
  installe = false
  if (adaptateurOrigine) api.defaults.adapter = adaptateurOrigine
  if (fetchOrigine) window.fetch = fetchOrigine
  fetchOrigine = null
  adaptateurOrigine = null
}

/** Le compte de démonstration affiché dans l'interface (fictif). */
export const UTILISATEUR_DEMO = {
  id: 0,
  email: 'demo@cabinet-horizon.invalid',
  firstName: 'A.',
  lastName: 'Rochat',
  first_name: 'A.',
  last_name: 'Rochat',
  role: 'admin',
  cabinetName: 'Cabinet Horizon Assurances',
}

/** Rappel visuel permanent : on est dans une démonstration. */
export const BANDEAU_DEMO = {
  titre: 'Démonstration',
  texte: 'Cabinet Horizon Assurances — cabinet fictif, données synthétiques. Aucun accès au système de production.',
}
