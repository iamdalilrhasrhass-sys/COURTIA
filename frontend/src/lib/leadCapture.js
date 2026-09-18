/**
 * Capture publique des demandes de démo COURTIA.
 *
 * Contrat du service de capture (VPS, exposé en HTTPS) :
 *   POST /api/leads/demo-request  ->  { ok: true, lead_id: 12, redirect: '/demo' }
 *
 * Même convention que la mesure publique (`lib/analytics.js` envoie
 * `/api/leads/events` en même origine) : l'endpoint est RELATIF à l'origine du
 * site public. C'est ce que sert la redirection Vercel / le reverse-proxy vers
 * le service de capture — jamais l'URL du cockpit (l'API du cockpit ne sait pas
 * enregistrer une demande de démo : elle répond 500).
 *
 * Les fonctions de ce module sont PURES ou injectables (`fetchImpl`, `env`) :
 * elles se testent seules, sans DOM et sans réseau.
 */

export const CAPTURE_ERROR_MESSAGE =
  "Votre demande n'a pas pu être enregistrée."

const CHEMIN_CAPTURE = '/api/leads/demo-request'

const EMPTY_CONTEXT = { search: '', referrer: '', pathname: '' }

function readEnv() {
  try {
    return (import.meta && import.meta.env) || {}
  } catch {
    return {}
  }
}

/** Extrait les valeurs utiles de window sans exiger un DOM (testable en node). */
export function readWindowContext(win = typeof window !== 'undefined' ? window : undefined) {
  if (!win) return { ...EMPTY_CONTEXT }
  return {
    search: win.location?.search || '',
    referrer: win.document?.referrer || '',
    pathname: win.location?.pathname || '',
  }
}

/**
 * Paramètres d'acquisition.
 * utm_source -> source (défaut « direct » quand aucun UTM n'est présent)
 * utm_medium -> medium, utm_campaign -> campaign
 * document.referrer -> referrer, window.location.pathname -> landing_page
 */
export function captureAcquisition(context = {}) {
  const { search = '', referrer = '', pathname = '' } = context || {}
  const params = new URLSearchParams(String(search).replace(/^\?/, ''))
  const read = (key) => (params.get(key) || '').trim()

  return {
    source: read('utm_source') || 'direct',
    medium: read('utm_medium'),
    campaign: read('utm_campaign'),
    referrer: String(referrer || '').trim(),
    landing_page: String(pathname || '').trim(),
  }
}

/**
 * Complète le payload SANS écraser une valeur déjà fournie par le formulaire :
 * les paramètres d'acquisition ne sont renseignés que s'ils sont absents.
 */
export function mergeAcquisition(payload = {}, acquisition = {}) {
  const merged = { ...payload }
  Object.entries(acquisition || {}).forEach(([key, value]) => {
    const current = merged[key]
    const absent = current === undefined || current === null || current === ''
    if (absent && value !== undefined && value !== null && value !== '') {
      merged[key] = value
    }
  })
  return merged
}

/** Champ piège : seuls les robots le remplissent. */
export function isHoneypotTripped(values = {}) {
  return String(values?.website ?? '').trim() !== ''
}

/** `https://api.exemple.fr/api/` -> `https://api.exemple.fr` ; `/api` -> ''. */
function normaliserBase(base) {
  const valeur = String(base || '').trim()
  if (!valeur) return ''
  const sansSlash = valeur.replace(/\/+$/, '')
  if (sansSlash === '/api') return ''
  return sansSlash.replace(/\/api$/, '')
}

function joindre(base) {
  return base ? `${base}${CHEMIN_CAPTURE}` : CHEMIN_CAPTURE
}

/**
 * Endpoints candidats, dans l'ordre d'essai.
 *   1. même origine (`/api/leads/demo-request`) — la convention du site public ;
 *   2. base d'API explicite du front (`VITE_API_URL`), seulement si elle est
 *      absolue : elle sert de repli si l'origine ne proxyfie pas encore /api.
 * `VITE_LEADS_API_URL` (facultatif) force une base dédiée à la capture et
 * désactive les autres candidats.
 */
export function resolveLeadEndpoints(env = readEnv()) {
  const dedie = normaliserBase(env?.VITE_LEADS_API_URL)
  if (dedie) return [joindre(dedie)]

  const endpoints = [CHEMIN_CAPTURE]
  const baseFront = normaliserBase(env?.VITE_API_URL)
  if (baseFront && /^https?:\/\//i.test(baseFront)) {
    const candidat = joindre(baseFront)
    if (!endpoints.includes(candidat)) endpoints.push(candidat)
  }
  return endpoints
}

/**
 * Vérifie que la demande est RÉELLEMENT enregistrée.
 * Une réponse sans {ok:true} ni lead_id (page HTML servie par un rewrite, etc.)
 * est traitée comme un échec : on ne fait jamais semblant d'avoir capturé un lead.
 */
export function assertLeadCaptured(data) {
  const isObject = Boolean(data) && typeof data === 'object' && !Array.isArray(data)
  if (isObject && (data.ok === true || data.lead_id)) return data

  throw new Error('Le service de capture n\'a pas confirmé l\'enregistrement.')
}

/** Redirection post-succès : celle du service si elle est interne, sinon /demo. */
export function resolveRedirect(data, fallback = '/demo') {
  const target = data && typeof data.redirect === 'string' ? data.redirect.trim() : ''
  if (target.startsWith('/') && !target.startsWith('//')) return target
  return fallback
}

function detailsErreur(data) {
  if (!data || typeof data !== 'object') return ''
  return String(data.error || data.message || data.details || '')
}

/**
 * Enregistre la demande de démo auprès du service de capture.
 *
 * Repli sur le candidat suivant UNIQUEMENT quand la réponse ne peut pas venir du
 * service : origine qui ne répond pas (erreur réseau), page HTML servie à la
 * place de l'API, ou 404/405. Un service qui répond réellement (4xx/5xx JSON)
 * arrête la boucle : sa réponse est l'erreur réelle à montrer au visiteur.
 *
 * @returns {Promise<object>} la réponse du service `{ok, lead_id, redirect}`
 * @throws {Error} si aucune candidat n'a enregistré la demande
 */
export async function postDemoRequest(payload, options = {}) {
  const { endpoints = resolveLeadEndpoints(), fetchImpl } = options
  const doFetch = fetchImpl || (typeof fetch !== 'undefined' ? fetch.bind(globalThis) : null)
  if (!doFetch) throw new Error('Envoi impossible depuis cet environnement.')

  const cibles = Array.isArray(endpoints) && endpoints.length ? endpoints : [CHEMIN_CAPTURE]
  let derniereErreur = null

  for (const endpoint of cibles) {
    let response
    try {
      response = await doFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    } catch (err) {
      // Origine injoignable (DNS, TLS, proxy absent) : on tente le candidat suivant.
      derniereErreur = err instanceof TypeError
        ? new Error('Le service de capture est injoignable.')
        : err
      continue
    }

    let data = null
    try {
      data = await response.json()
    } catch {
      data = null
    }
    const reponseService = Boolean(data) && typeof data === 'object' && !Array.isArray(data)

    if (response.ok && reponseService) return assertLeadCaptured(data)

    if (response.ok || response.status === 404 || response.status === 405) {
      derniereErreur = new Error(
        response.ok
          ? 'Le service de capture a répondu autre chose qu\'une confirmation.'
          : `Service de capture absent sur cette origine (HTTP ${response.status}).`
      )
      continue
    }

    const detail = detailsErreur(data)
    throw new Error(detail || `Le service de capture a refusé la demande (HTTP ${response.status}).`)
  }

  throw new Error(
    derniereErreur?.message || 'Le service de capture est injoignable. Merci de réessayer.'
  )
}
