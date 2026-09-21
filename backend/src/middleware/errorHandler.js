const { messagePublic } = require('../lib/erreursPubliques')
/**
 * Error Handler Middleware — DERNIER RECOURS (défaut P4 SEC-030b).
 *
 * ────────────────────────────────────────────────────────────────────────────
 * CE QUI ÉTAIT CONSTATÉ (mesure du 21/09/2026)
 * Ce fichier existait depuis l'origine et n'était monté NULLE PART : aucune
 * erreur ne passait par lui. Le gestionnaire global de `server.js` (monté en
 * dernier avant ce fichier) répond à presque tout ; mais s'il LÈVE à son tour —
 * journal en panne, filtre de messages qui jette, réponse déjà engagée — la
 * requête tombait dans le gestionnaire PAR DÉFAUT d'Express, celui qui renvoie
 * la PILE D'APPELS et les chemins du serveur à l'appelant.
 *
 * CE QUI CHANGE : `server.js` monte désormais ce gestionnaire APRÈS le sien.
 * Express n'exécute un gestionnaire d'erreur que si le précédent a laissé
 * passer (`next(err)`) ou a levé : le comportement actuel (traduction des
 * erreurs d'entrée, message produit, filtrage des textes d'infrastructure) est
 * donc INCHANGÉ, et ce fichier ne sert qu'en cas de défaillance de celui-ci.
 *
 * DEUX PRÉCAUTIONS PROPRES AU RÔLE DE DERNIER RECOURS :
 *   • une réponse DÉJÀ ENGAGÉE n'est jamais réécrite (`res.headersSent`) : une
 *     seconde écriture d'en-têtes lèverait `ERR_HTTP_HEADERS_SENT` et
 *     remplacerait une réponse partielle par une connexion coupée ;
 *   • le filtre `messagePublic` est appelé sous `try/catch` : c'est lui qui
 *     protège l'appelant des textes d'infrastructure, donc s'il échoue on
 *     répond le message générique plutôt que de le laisser lever à son tour.
 * Aucun message servi ici ne contient de pile, de requête SQL ou de chemin.
 */

/** Message de repli si le filtre lui-même est indisponible. */
const MESSAGE_GENERIQUE = "Une erreur interne s'est produite. L'incident a été enregistré ; réessayez dans un instant."

/** Filtre défensif : le message public ne doit jamais faire échouer le repli. */
function messageSur(err, options) {
  try {
    const texte = messagePublic(err, options)
    return texte || MESSAGE_GENERIQUE
  } catch (_) {
    return MESSAGE_GENERIQUE
  }
}

const errorHandler = (err, req, res, next) => {
  console.error('Error:', err)

  // Une réponse déjà engagée ne peut plus porter de corps JSON : on rend la
  // main à Express (fermeture de la connexion) au lieu de lever ici.
  if (res.headersSent) return next(err)

  try {
    // Known errors
    if (err && err.status) {
      return res.status(err.status).json({
        success: false,
        error: err.name,
        message: messageSur(err, { statut: err.status }),
        field: err.field || null
      })
    }

    // Database errors
    if (err && err.code === '23505') {
      const field = err.constraint || ''
      const msg = field.includes('email')
        ? 'Cette adresse email est déjà utilisée.'
        : 'Cette ressource existe déjà.'
      return res.status(409).json({
        success: false,
        error: 'ConflictError',
        message: msg
      })
    }

    // Default server error
    return res.status(500).json({
      success: false,
      error: 'InternalServerError',
      message: process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : messageSur(err, { statut: 500 })
    })
  } catch (erreurDeReponse) {
    // Écrire la réponse a échoué : on ne relance pas une exception depuis le
    // dernier recours (elle finirait au gestionnaire par défaut d'Express, avec
    // la pile d'appels). Le journal serveur garde la cause des deux erreurs.
    console.error('Error handler failed:', erreurDeReponse)
    if (res.headersSent) return next(erreurDeReponse)
    try {
      return res.status(500).json({ success: false, error: 'InternalServerError', message: MESSAGE_GENERIQUE })
    } catch (_) {
      return next(erreurDeReponse)
    }
  }
};

errorHandler.MESSAGE_GENERIQUE = MESSAGE_GENERIQUE
errorHandler.messageSur = messageSur

module.exports = errorHandler;
