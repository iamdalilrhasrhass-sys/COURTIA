/* ============================================================================
   COURTIA — Mesure de trafic et d'usage (anonyme)
   ----------------------------------------------------------------------------
   Point d'entrée UNIQUE : `evenement(nom, props)`.

   Un appel déclenche trois choses :
     (a) l'envoi à la mesure installée (Vercel Web Analytics, `track`) ;
     (b) la capture interne : POST vers /api/leads/events — le service de
         capture COURTIA (service_capture.py, exposé en HTTPS par le site
         public). Un seul chemin, DEUX vocabulaires dans le même corps : le
         service lit `event`, `session_id`, `route`, `device`, `meta`…, tandis
         que le backend historique (backend/src/routes/leads.js, table
         `marketing_events`) lit `event_name`, `page_path`, `payload`. Chacun
         ignore les champs qu'il ne connaît pas — comme le fait déjà
         src/demo/evenementsConversion.js. Sans le champ `event`, le service
         répond 202 mais n'enregistre RIEN (échec silencieux) ;
     (c) l'enrichissement automatique : environnement (qa/production), type
         d'appareil (mobile/tablette/desktop) et identifiant de session
         anonyme persisté dans sessionStorage.

   La liste `EVENEMENTS` est EXACTEMENT l'ensemble accepté par le service de
   capture (service_capture.py, ensemble EVENEMENTS) : envoyer un autre nom ne
   servirait à rien.

   CONFORMITÉ — aucune donnée personnelle n'est transmise :
     • jamais d'IP applicative (le service de capture journalise sans IP et
       classe l'appareil depuis l'en-tête `user-agent`) ;
     • jamais d'email, de nom, de téléphone, d'adresse ni de jeton : les clés
       qui y ressemblent sont ÉCARTÉES avant l'envoi, et une valeur qui
       ressemble à un email ou à un téléphone est supprimée ;
     • l'identifiant de session est un UUID aléatoire créé par le navigateur,
       effacé à la fermeture de l'onglet (sessionStorage). Il ne désigne
       aucune personne et n'est relié à aucun compte.
   Le référent est réduit à son HÔTE (jamais son chemin ni ses paramètres).

   Bornage : la charge est volontairement limitée (MAX_PROPRIETES clés, valeurs
   scalaires, 160 caractères par valeur) — la mesure ne doit jamais pouvoir
   transporter un contenu utilisateur.
   ========================================================================== */

import { inject, track } from '@vercel/analytics'

/* ------------------------------------------------------------- événements */

/** Liste CLOSE des événements mesurés — identique à celle du service de
 *  capture. Un nom hors de cette liste est ignoré (le service, lui, répondrait
 *  202 sans rien enregistrer : un échec silencieux est le pire des cas). */
export const EVENEMENTS = Object.freeze([
  'site_visit',
  'organic_visit',
  'pricing_view',
  'demo_cta_click',
  'demo_form_view',
  'demo_form_submit',
  'demo_request_success',
  'demo_request_failure',
  'demo_started',
  'demo_chapter_view',
  'demo_completed',
  'demo_take_control',
  'trial_requested',
  'meeting_requested',
  'contact_requested',
])

const EVENEMENTS_AUTORISES = new Set(EVENEMENTS)

const CLE_SESSION = 'courtia_session'
/* Session de la démonstration (src/demo/evenementsConversion.js). Réutilisée
   EN LECTURE SEULE quand elle existe : sans cela, la même visite porterait deux
   identifiants et le funnel demo_started → trial_requested serait coupé en
   deux. On ne l'écrit jamais ici. */
const CLE_SESSION_PARTAGEE = 'courtia_demo_session'
const CLE_JOURNAL = 'courtia_mesure_journal'
const ENDPOINT_CAPTURE = '/api/leads/events'
const SOURCE = 'courtia-frontend'
const MAX_PROPRIETES = 16
const MAX_LONGUEUR_VALEUR = 160
const MAX_JOURNAL = 40

/* ---------------------------------------------------- filtre anti-données
   Refus par SEGMENT de clé (`client_email`, `nom_client`, `owner_name`… sont
   attrapés ; `nombre`, qui contient « nom », ne l'est pas). */
const CLES_REFUSEES = new Set([
  'email', 'mail', 'nom', 'name', 'fullname', 'prenom', 'firstname', 'lastname',
  'tel', 'telephone', 'phone', 'mobile', 'gsm', 'ip', 'adresse', 'address',
  'token', 'password', 'secret', 'iban', 'bic', 'siret', 'siren', 'naissance',
  'birth', 'birthday', 'user', 'utilisateur', 'contact',
])

const RESSEMBLE_A_UN_EMAIL = /[^\s@]+@[^\s@]+\.[^\s@]{2,}/
const RESSEMBLE_A_UN_TELEPHONE = /^\+?\d[\d\s().-]{7,}$/

function cleRefusee(cle) {
  const segments = String(cle).toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)
  if (!segments.length) return true
  return segments.some((segment) => CLES_REFUSEES.has(segment))
}

function valeurRefusee(valeur) {
  if (typeof valeur !== 'string') return false
  if (RESSEMBLE_A_UN_EMAIL.test(valeur)) return true
  return RESSEMBLE_A_UN_TELEPHONE.test(valeur.trim())
}

/** Ne garde que des scalaires, sous des clés neutres. */
function nettoyer(props) {
  const propre = {}
  if (!props || typeof props !== 'object') return propre

  for (const [cle, valeur] of Object.entries(props)) {
    if (Object.keys(propre).length >= MAX_PROPRIETES) break
    if (cleRefusee(cle)) continue
    if (valeur === undefined || valeur === null) continue

    if (typeof valeur === 'string') {
      if (valeurRefusee(valeur)) continue
      propre[cle] = valeur.slice(0, MAX_LONGUEUR_VALEUR)
    } else if (typeof valeur === 'number' || typeof valeur === 'boolean') {
      propre[cle] = valeur
    }
    /* Objets et tableaux : ignorés (la mesure n'accepte que des scalaires, et
       un objet libre est le vecteur le plus probable d'une fuite de données). */
  }

  return propre
}

/* -------------------------------------------------------------- contexte */

/** Session anonyme, persistée dans sessionStorage (une par onglet). */
function sessionAnonyme() {
  try {
    const partagee = window.sessionStorage.getItem(CLE_SESSION_PARTAGEE)
    if (partagee) return partagee
    const existante = window.sessionStorage.getItem(CLE_SESSION)
    if (existante) return existante
    const id = window.crypto?.randomUUID
      ? window.crypto.randomUUID()
      : `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
    window.sessionStorage.setItem(CLE_SESSION, id)
    return id
  } catch {
    /* Navigation privée stricte : on ne persiste pas, on ne casse rien. */
    return 'session-indisponible'
  }
}

/** `qa` si l'hôte ou le chemin désigne un environnement de test, ou si le
 *  navigateur est piloté par un automate (navigator.webdriver) ; sinon
 *  `production`. Les frontières `[./-]` évitent les faux positifs du type
 *  « protestation », qui contient « test ». */
function environnement() {
  if (typeof navigator !== 'undefined' && navigator.webdriver) return 'qa'
  try {
    const hote = window.location.hostname.toLowerCase()
    const chemin = window.location.pathname.toLowerCase()
    if (/^(127\.|0\.0\.0\.0$|\[::1\]$)/.test(hote)) return 'qa'
    if (/(^|[.-])(qa|test|localhost|preprod|staging)([.-]|$)/.test(hote)) return 'qa'
    if (/(^|\/)(qa|test)(\/|$)/.test(chemin)) return 'qa'
    return 'production'
  } catch {
    return 'production'
  }
}

/** mobile / tablette / desktop, d'après l'agent utilisateur. */
function appareil() {
  try {
    const ua = navigator.userAgent || ''
    /* iPadOS 13+ se déclare « Macintosh » : on le reconnaît au tactile. */
    if (/Macintosh/.test(ua) && (navigator.maxTouchPoints || 0) > 1) return 'tablette'
    if (/iPad|Tablet|PlayBook|Silk|Kindle/i.test(ua)) return 'tablette'
    if (/Android(?!.*Mobile)/i.test(ua)) return 'tablette'
    if (/Mobi|iPhone|iPod|Android|BlackBerry|IEMobile|Opera Mini|Windows Phone/i.test(ua)) return 'mobile'
    return 'desktop'
  } catch {
    return 'inconnu'
  }
}

/** Hôte du référent uniquement (pas de chemin, pas de paramètre). */
function hoteReferent() {
  try {
    if (!document.referrer) return null
    return new URL(document.referrer).hostname || null
  } catch {
    return null
  }
}

/** Attribution marketing éventuelle — jamais de donnée personnelle. */
function attribution() {
  try {
    const params = new URLSearchParams(window.location.search)
    const garde = {}
    for (const cle of ['utm_source', 'utm_medium', 'utm_campaign']) {
      const valeur = params.get(cle)
      if (valeur) garde[cle] = valeur.slice(0, MAX_LONGUEUR_VALEUR)
    }
    return garde
  } catch {
    return {}
  }
}

/* ------------------------------------------------------------ origine trafic */

/**
 * Nom d'hôte référent, en minuscules, SANS masquer les erreurs de lecture.
 * `hoteReferent()` avale l'exception et renvoie null : utiliser cette variante
 * ici permet de distinguer « aucun référent » (=> direct) de « référent
 * illisible » (=> origine inconnue). Un test a montré que sans cela, une
 * lecture en échec était rapportée à tort comme du trafic direct.
 */
function hoteReferentBrut() {
  const ref = document.referrer        // une exception ici remonte volontairement
  if (!ref) return ''
  try {
    return (new URL(ref).hostname || '').toLowerCase()
  } catch {
    return ''
  }
}

/** Moteurs de recherche reconnus à partir du seul nom d'hôte référent.
 *  Aucune donnée personnelle : on ne lit que le domaine référent. */
const MOTEURS_ORGANIQUES = [
  ['google.', 'google'], ['bing.', 'bing'], ['duckduckgo', 'duckduckgo'],
  ['search.brave', 'brave'], ['ecosia.', 'ecosia'], ['qwant.', 'qwant'],
  ['startpage.', 'startpage'], ['mojeek.', 'mojeek'], ['searx', 'searx'],
  ['yahoo.', 'yahoo'], ['aol.', 'aol'], ['baidu.', 'baidu'],
  ['yandex.', 'yandex'], ['swisscows', 'swisscows'], ['search.ch', 'search.ch'],
  ['bluewin', 'bluewin'], ['web.de', 'web.de'], ['t-online', 't-online'],
]

const MEDIAS_PAYANTS = new Set(['cpc', 'ppc', 'paid', 'paidsearch', 'ads',
                                'display', 'banner', 'retargeting'])

/**
 * Classe l'entrée sur le site. Le but est de pouvoir SÉPARER l'organique du
 * payant et du direct — sans quoi « visite » ne veut rien dire pour l'acquisition.
 *
 * Règles, dans l'ordre :
 *   - utm_medium payant      -> 'payant'
 *   - utm_source présent     -> 'campagne'
 *   - référent = moteur      -> 'organique' (+ nom du moteur)
 *   - référent externe autre -> 'referent'
 *   - aucun référent, aucun utm -> 'direct'
 *
 * MESURE du 18/09/2026 : aucun événement ne distinguait l'origine du trafic.
 * Le tunnel commençait à « site_visit » et ne pouvait donc pas répondre à
 * « d'où viennent les visiteurs ». `organic_visit` comble ce premier maillon.
 * `direct` n'est PAS compté comme organique : c'est une mesure honnête.
 */
export function origineTrafic() {
  try {
    const utm = attribution()
    const medium = (utm.utm_medium || '').toLowerCase()
    if (medium && MEDIAS_PAYANTS.has(medium)) {
      return { origine: 'payant', moteur: null, utm_present: true }
    }
    if (utm.utm_source) {
      return { origine: 'campagne', moteur: null, utm_present: true }
    }
    const hote = hoteReferentBrut()
    if (hote) {
      for (const [motif, nom] of MOTEURS_ORGANIQUES) {
        if (hote.includes(motif)) {
          return { origine: 'organique', moteur: nom, utm_present: false }
        }
      }
      return { origine: 'referent', moteur: hote.slice(0, 60), utm_present: false }
    }
    return { origine: 'direct', moteur: null, utm_present: false }
  } catch {
    return { origine: 'inconnu', moteur: null, utm_present: false }
  }
}

/** Chemin + requête de la page courante, borné à 255 caractères. */
function cheminCourant() {
  try {
    return `${window.location.pathname}${window.location.search}`.slice(0, 255)
  } catch {
    return ''
  }
}

/* --------------------------------------------------------------- envois */

let mesurePrete = false

/**
 * S'assure que la mesure Vercel est initialisée AVANT le premier `track()`.
 *
 * `track()` n'écrit que dans la file `window.vaq`, créée par l'initialisation
 * du SDK : un appel émis plus tôt est purement et simplement perdu. Or
 * `site_visit` part au chargement, avant le premier rendu des composants.
 * `inject` est idempotent (il ne pose le script qu'une fois) : l'appeler ici
 * ne fait que garantir la file ; <Analytics /> reste le point de montage
 * normal.
 */
function assurerMesure() {
  if (mesurePrete) return
  mesurePrete = true
  try {
    inject({ framework: 'react' })
  } catch {
    /* la capture interne reste la voie de secours */
  }
}

/** Vercel n'accepte que des scalaires : on retire ce qui ne l'est pas. */
function aPlat(charge) {
  const plat = {}
  for (const [cle, valeur] of Object.entries(charge)) {
    if (typeof valeur === 'string' || typeof valeur === 'number' || typeof valeur === 'boolean') {
      plat[cle] = valeur
    }
  }
  return plat
}

/** Journal d'onglet : ce qui a été envoyé et ce que le service a répondu.
 *  Aucune donnée personnelle (nom d'événement + code HTTP). Lisible en console
 *  via `window.__courtiaMesure` — c'est la trace de vérification sur le site
 *  réel. */
function journaliser(entree) {
  try {
    const session = window.sessionStorage
    const brut = session.getItem(CLE_JOURNAL)
    const journal = [entree, ...(brut ? JSON.parse(brut) : [])].slice(0, MAX_JOURNAL)
    session.setItem(CLE_JOURNAL, JSON.stringify(journal))
    window.__courtiaMesure = journal
  } catch {
    /* le journal est un confort de vérification, jamais une condition */
  }
}

/**
 * Capture interne — un seul POST, deux vocabulaires (voir l'en-tête du
 * module). `keepalive` permet à l'envoi d'aboutir même si le visiteur quitte
 * la page juste après le clic.
 *
 * Note : en mode démonstration, `src/demo/modeDemo.js` laisse explicitement
 * passer /leads/events (CHEMINS_CAPTURE) ; aucune requête applicative de la
 * démo ne quitte la page pour autant.
 */
function envoyer(nom, charge) {
  if (typeof window === 'undefined' || typeof fetch === 'undefined') return

  const chemin = cheminCourant()
  const corps = {
    /* -------- vocabulaire du service de capture (service_capture.py) ----- */
    event: nom,
    session_id: charge.session_id,
    environment: charge.environment,
    source: SOURCE,
    device: charge.device,
    route: chemin,
    landing_page: chemin,
    referrer: charge.referent || null,
    medium: charge.utm_medium || null,
    campaign: charge.utm_campaign || null,
    chapter: charge.chapitre ?? null,
    meta: { ...charge },
    /* -------- vocabulaire du backend historique (marketing_events) ------ */
    event_name: nom,
    page_path: chemin,
    payload: { ...charge },
  }

  let serie
  try {
    serie = JSON.stringify(corps)
  } catch {
    return
  }

  try {
    fetch(ENDPOINT_CAPTURE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: serie,
      keepalive: true,
    })
      .then((reponse) => {
        journaliser({ evenement: nom, at: new Date().toISOString(), statut: reponse?.status ?? 0 })
      })
      .catch(() => {
        journaliser({ evenement: nom, at: new Date().toISOString(), statut: 0 })
      })
  } catch {
    /* La mesure ne doit jamais casser le parcours visiteur. */
  }
}

/* --------------------------------------------------------------- public */

/**
 * Enregistre un événement mesuré.
 *
 * @param {string} nom  Un nom de `EVENEMENTS` (les autres sont ignorés).
 * @param {object} [props] Propriétés scalaires libres, nettoyées avant envoi.
 * @returns {object|null} la charge réellement transmise (utile aux tests), ou
 *   `null` si l'événement a été refusé.
 */
export function evenement(nom, props = {}) {
  if (typeof window === 'undefined') return null
  if (!EVENEMENTS_AUTORISES.has(nom)) return null

  const env = environnement()
  const charge = {
    session_id: sessionAnonyme(),
    environment: env,
    /* Même valeur sous le nom français : lisibilité du côté mesure interne. */
    environnement: env,
    device: appareil(),
    ...(hoteReferent() ? { referent: hoteReferent() } : {}),
    ...attribution(),
    ...nettoyer(props),
  }

  /* (a) mesure installée — jamais bloquante. */
  try {
    assurerMesure()
    track(nom, aPlat(charge))
  } catch {
    /* la mesure Vercel ne doit pas empêcher la capture interne */
  }

  /* (b) capture interne. */
  envoyer(nom, charge)

  return charge
}

export default evenement
