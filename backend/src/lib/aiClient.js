/**
 * Fabrique de clients IA TOLÉRANTE À UNE CLÉ ABSENTE.
 *
 * Motif corrigé (mesuré le 19/09/2026 sur ce dépôt) : un `new Anthropic()` ou
 * `new OpenAI()` exécuté au CHARGEMENT d'un module lève « Missing credentials »
 * dès que la variable d'environnement manque. Le serveur ENTIER refusait alors
 * de démarrer — y compris les routes qui n'utilisent aucune IA (santé, clients,
 * contrats, capture). Une clé absente doit dégrader la seule fonction qui en a
 * besoin, jamais l'API complète.
 *
 * Le client est construit avec une clé de remplacement quand la vraie manque :
 * l'application démarre, l'avertissement est écrit au démarrage, et les appels
 * concernés échouent à l'usage (erreur du fournisseur). Aucune réponse IA n'est
 * inventée, aucune clé n'est écrite dans les journaux.
 */

/** Identifiants de remplacement : jamais une vraie valeur, jamais un secret. */
const CLE_ABSENTE = 'cle-absente-voir-avertissement-demarrage'

const dejaSignale = new Set()

/**
 * @param {Function} Constructeur  `OpenAI` ou `Anthropic`
 * @param {Object} options
 * @param {string} options.apiKeyVar  nom de la variable d'environnement attendue
 * @param {string} [options.baseURL]  base URL (DeepSeek, proxy interne…)
 * @returns {Object} un client utilisable ; les appels échouent si la clé manque
 */
function clientIA(Constructeur, { apiKeyVar, baseURL } = {}) {
  const cle = apiKeyVar ? String(process.env[apiKeyVar] || '').trim() : ''
  if (!cle && apiKeyVar && !dejaSignale.has(apiKeyVar)) {
    dejaSignale.add(apiKeyVar)
    // Nom de la variable uniquement : aucune valeur, aucun secret.
    console.warn(
      `[ai-client] ${apiKeyVar} absente — l'application demarre, ` +
      'les fonctions IA associees echoueront a l\'appel (aucune reponse inventee).'
    )
  }
  const options = { apiKey: cle || CLE_ABSENTE }
  if (baseURL) options.baseURL = baseURL
  return new Constructeur(options)
}

/** Vrai si la clé attendue est réellement présente. À lire avant de promettre
 *  une capacité IA à l'utilisateur. */
function iaConfiguree(apiKeyVar) {
  return Boolean(String(process.env[apiKeyVar] || '').trim())
}

module.exports = { clientIA, iaConfiguree }
