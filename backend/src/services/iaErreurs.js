/**
 * iaErreurs.js — Normalisation des erreurs des services IA.
 *
 * RÈGLE ABSOLUE : le client ne voit JAMAIS l'erreur brute du fournisseur.
 * Aujourd'hui un appel IA en échec pouvait renvoyer au navigateur
 *   401 {"type":"error","error":{"type":"authentication_error","message":"invalid x-api-key"}}
 * ou « model not found ». C'est à la fois une fuite d'information (état du
 * compte, configuration interne) et un message inutilisable pour un courtier.
 *
 * Comportement imposé :
 *   - le détail complet est JOURNALISÉ côté serveur (logger) ;
 *   - le client reçoit un message produit stable :
 *       503 { error: 'ia_indisponible', message: '…' }
 *
 * @module iaErreurs
 */

const logger = require('../lib/logger')

const MESSAGE_IA_INDISPONIBLE =
  'Le service IA est temporairement indisponible. Réessayez dans quelques instants.'

const MESSAGE_IA_NON_CONFIGUREE =
  "L'assistant IA n'est pas activé sur cette installation. Contactez votre administrateur."

/** Extrait le détail technique d'une erreur, sans jamais le renvoyer au client. */
function detailTechnique(err) {
  if (!err) return { type: 'UnknownError' }
  let corps = null
  try {
    if (err.error && typeof err.error === 'object') {
      corps = JSON.stringify(err.error).slice(0, 500)
    } else if (typeof err.response?.data === 'string') {
      corps = err.response.data.slice(0, 500)
    } else if (err.response?.data) {
      corps = JSON.stringify(err.response.data).slice(0, 500)
    }
  } catch (_) {
    corps = '[détail non sérialisable]'
  }
  return {
    type: err.name || 'Error',
    statut: err.status ?? err.statusCode ?? null,
    code: err.code || null,
    message: String(err.message || '').slice(0, 500),
    corps,
  }
}

/** Journalise le détail complet (serveur uniquement). */
function journaliserErreurIa(err, contexte = {}) {
  logger.error(
    { contexte, erreur: detailTechnique(err) },
    'Service IA indisponible — détail conservé côté serveur uniquement'
  )
}

/** Charge utile standard renvoyée au client pour une panne IA. */
function chargeIaIndisponible() {
  return { error: 'ia_indisponible', message: MESSAGE_IA_INDISPONIBLE }
}

/** Charge utile standard pour une IA absente / non configurée. */
function chargeIaNonConfiguree(message = MESSAGE_IA_NON_CONFIGUREE) {
  return { error: 'configuration_required', message, configuration_required: true }
}

/** Répond 503 « ia_indisponible » (jamais l'erreur brute). */
function repondreIaIndisponible(res, err, contexte = {}) {
  journaliserErreurIa(err, contexte)
  return res.status(503).json(chargeIaIndisponible())
}

/** Répond 503 « configuration_required » quand aucun moteur IA n'est branché. */
function repondreIaNonConfiguree(res, contexte = {}, message) {
  logger.warn({ contexte }, 'Fonctionnalité IA appelée sans moteur IA configuré')
  return res.status(503).json(chargeIaNonConfiguree(message))
}

/**
 * Erreur normalisée destinée à CIRCULER dans le code serveur sans jamais
 * transporter le message du fournisseur. Utilisée par les services IA pour
 * que tout `catch` aval qui ferait `err.message` ne fuite rien.
 */
function erreurIaNormalisee(err, contexte = {}) {
  journaliserErreurIa(err, contexte)
  const normalisee = new Error(MESSAGE_IA_INDISPONIBLE)
  normalisee.code = 'ia_indisponible'
  normalisee.erreurIa = true
  normalisee.detailServeur = detailTechnique(err)
  return normalisee
}

function estErreurIa(err) {
  return Boolean(err && (err.erreurIa === true || err.code === 'ia_indisponible'))
}

/**
 * Vrai quand le résultat d'un appel IA ne contient AUCUN contenu exploitable :
 * moteur non configuré (`result.error`), réponse vide, ou JSON attendu absent.
 * Sert aux routes pour répondre 503 au lieu d'un `success: true` vide.
 */
function resultatIaVide(result, { jsonAttendu = true } = {}) {
  if (!result) return true
  if (result.error) return true
  if (jsonAttendu) return result.structured === null || result.structured === undefined
  return !result.text
}

module.exports = {
  MESSAGE_IA_INDISPONIBLE,
  MESSAGE_IA_NON_CONFIGUREE,
  detailTechnique,
  journaliserErreurIa,
  chargeIaIndisponible,
  chargeIaNonConfiguree,
  repondreIaIndisponible,
  repondreIaNonConfiguree,
  erreurIaNormalisee,
  estErreurIa,
  resultatIaVide,
}
