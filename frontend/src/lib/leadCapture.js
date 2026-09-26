/**
 * Capture publique des demandes de démo COURTIARK.
 *
 * Contrat du service de capture (VPS, exposé en HTTPS) :
 *   POST /api/leads/demo-request  ->  { ok: true, lead_id: 12, redirect: '/demo' }
 *
 * Le même endpoint est aussi servi par le backend Courtia
 * (backend/src/routes/leads.js), qui répond :
 *   { success: true, ok: true, lead_id: 12, lead: { id: 12, ... },
 *     notification_interne: {...}, message: '...' }
 * Autrement dit DEUX vocabulaires pour une seule confirmation d'enregistrement :
 * `ok`/`lead_id` (service de capture) et `success`/`lead` (backend Courtia).
 * Les deux sont acceptés, et le backend ajoute `ok`/`lead_id` en plus de
 * `success`/`lead` pour que les deux gardes se comprennent. Une réponse qui ne
 * porte ni l'un ni l'autre n'est PAS une confirmation : elle est refusée (voir
 * `assertLeadCaptured`), et le `message` produit par le serveur est affiché tel
 * quel au prospect (voir `messageConfirmation`) — jamais remplacé par une
 * formule générique.
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

/* --------------------------------------------------------------- lead_id
   Le service de capture n'accepte de faire AVANCER UN LEAD que si l'événement
   porte son `lead_id` (service_capture.py : avancer_lead_sur_evenement lit
   d.get("lead_id") ; sans lui, l'événement est stocké mais le prospect reste au
   statut NEW quoi qu'il fasse dans la démonstration). On conserve donc l'id
   renvoyé par /api/leads/demo-request pour le joindre à tous les événements
   suivants de la même visite. Stockage de session : la visite dure le temps d'un
   onglet, et une erreur de stockage (navigation privée) ne casse rien. */
const CLE_LEAD = 'courtia_demo_lead_id'

function stockageSession() {
  try { return window.sessionStorage } catch { return null }
}

/** Un identifiant de lead exploitable : entier strictement positif.
 *  `'12'` (chaîne JSON) est accepté, `'abc'`, `0`, `null` et `undefined` non —
 *  on ne fabrique jamais un id à partir de rien. */
function estIdentifiant(brut) {
  if (brut === null || brut === undefined || brut === '') return false
  const n = Number(brut)
  return Number.isInteger(n) && n > 0
}

/** Extrait l'identifiant de lead d'une réponse de capture, s'il est exploitable. */
export function identifiantLead(data) {
  if (!data || typeof data !== 'object') return null
  const brut = data.lead_id ?? data.leadId ?? data.lead?.id ?? data.id
  return estIdentifiant(brut) ? Number(brut) : null
}

/** Mémorise l'identifiant de lead de la visite. Renvoie l'id mémorisé, ou null. */
export function memoriserLeadId(data) {
  const id = identifiantLead(data)
  if (!id) return null
  const s = stockageSession()
  if (s) { try { s.setItem(CLE_LEAD, String(id)) } catch { /* stockage refusé */ } }
  return id
}

/** Identifiant de lead de la visite en cours, ou null si la visite n'en a pas. */
export function lireLeadId() {
  const s = stockageSession()
  if (!s) return null
  let brut = null
  try { brut = s.getItem(CLE_LEAD) } catch { return null }
  const n = Number(brut)
  return Number.isInteger(n) && n > 0 ? n : null
}

/** Oublie l'identifiant de lead (utilisé par les tests et la réinitialisation). */
export function oublierLeadId() {
  const s = stockageSession()
  if (s) { try { s.removeItem(CLE_LEAD) } catch { /* sans effet */ } }
}

/**
 * Vérifie que la demande est RÉELLEMENT enregistrée.
 *
 * Deux vocabulaires valent confirmation, parce que le même endpoint est servi
 * par le service de capture (`{ok:true, lead_id}`) ET par le backend Courtia
 * (`{success:true, lead:{id}, ...}`) :
 *   1. `ok === true`                                  — service de capture ;
 *   2. un `lead_id` (ou `leadId`) exploitable          — service de capture ;
 *   3. `success === true` ET un objet `lead` ET un identifiant exploitable
 *      (`lead.id`)                                     — backend Courtia.
 *
 * Tout le reste est un ÉCHEC : page HTML servie par un rewrite, objet vide,
 * `{success:true}` sans lead, un identifiant qui n'en est pas un, ou un refus
 * EXPLICITE du serveur (`ok:false` / `success:false`) même accompagné d'un id.
 * On ne fait jamais semblant d'avoir capturé un lead.
 */
export function assertLeadCaptured(data) {
  const isObject = Boolean(data) && typeof data === 'object' && !Array.isArray(data)
  if (!isObject) {
    throw new Error('Le service de capture n\'a pas confirmé l\'enregistrement.')
  }

  // Un refus explicite prime sur tout identifiant présent.
  const refusExplicite = data.ok === false || data.success === false
  if (!refusExplicite) {
    if (data.ok === true) return data
    if (estIdentifiant(data.lead_id) || estIdentifiant(data.leadId)) return data
    const lead = data.lead
    if (data.success === true && lead && typeof lead === 'object' && identifiantLead(data)) {
      return data
    }
  }

  throw new Error('Le service de capture n\'a pas confirmé l\'enregistrement.')
}

/**
 * Message de confirmation RÉEL produit par le serveur, quand il existe.
 *
 * La réponse du backend distingue « demande enregistrée ET alerte partie » de
 * « demande enregistrée MAIS alerte non partie » : ce message porte cette vérité
 * et ne doit jamais être remplacé par une formule générique (le prospect lirait
 * un état qui n'est pas le sien). `fallback` n'est rendu que si le serveur n'a
 * rien dit ; il reste vide par défaut — aucun texte inventé.
 */
export function messageConfirmation(data, fallback = '') {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return fallback
  const brut = data.message
  if (typeof brut !== 'string') return fallback
  const message = brut.trim()
  return message ? message.slice(0, 500) : fallback
}

/** Redirection post-succès : celle du service si elle est interne, sinon /demo. */
export function resolveRedirect(data, fallback = '/demo') {
  const target = data && typeof data.redirect === 'string' ? data.redirect.trim() : ''
  if (target.startsWith('/') && !target.startsWith('//')) return target
  return fallback
}

/**
 * Faut-il emmener le prospect vers la démonstration SANS attendre ?
 *
 * Oui dans le cas normal. NON quand le serveur signale explicitement que la
 * notification interne n'a pas pu partir (`configuration_required: true` ou
 * `notification_interne.envoye === false`) : le message qu'il produit alors
 * (« Prévenez l'équipe COURTIARK par un autre canal si votre demande est
 * urgente. ») demande une action au prospect. Le rediriger au bout de 1,4 s
 * reviendrait à jeter ce message — c'est exactement ce que corrige ce
 * correctif. La démonstration reste accessible, par un clic explicite.
 */
export function redirectionAutomatique(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return true
  if (data.configuration_required === true) return false
  const notification = data.notification_interne
  if (notification && typeof notification === 'object' && notification.envoye === false) {
    return false
  }
  return true
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

    if (response.ok && reponseService) {
      const confirme = assertLeadCaptured(data)
      // La capture est confirmée : on retient l'id pour que les événements de la
      // visite (demo_started, demo_completed...) fassent réellement avancer le
      // pipeline côté service de capture.
      memoriserLeadId(confirme)
      return confirme
    }

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
