/**
 * validationChamps.js — REFUSER UNE VALEUR TROP LONGUE AVANT LA BASE.
 *
 * POURQUOI (Red Team P1 #4, mesuré en production le 20/09/2026)
 * `POST /api/clients` avec un nom de 2 500 caractères répondait
 * 500 « value too long for type character varying(100) ». Le courtier lisait un
 * message de schéma PostgreSQL là où il fallait lui dire QUEL champ corrige.
 *
 * Les limites ne sont PAS inventées : elles sont recopiées des colonnes réelles
 * (`information_schema.columns`, relevées le 20/09/2026 sur la base de
 * production). Un champ absent du corps de la requête n'est jamais contrôlé, et
 * un champ en `text` (sans limite) n'est pas contrôlé du tout : on ne refuse
 * que ce que la base refuserait de toute façon.
 *
 * Le nom du champ rendu à l'appelant est celui qu'il a ENVOYÉ (« nom »), jamais
 * celui de la colonne (« last_name ») : l'écran parle la langue de l'utilisateur.
 */

/** Limites réelles des colonnes VARCHAR de `clients` (caractères). */
const LIMITES_CLIENTS = Object.freeze({
  nom: 100,        // clients.last_name
  prenom: 100,     // clients.first_name
  email: 255,
  telephone: 20,   // clients.phone
  mobile: 20,
  adresse: 255,    // clients.address
  ville: 100,      // clients.city
  code_postal: 10,
  civility: 10,
  pays: 100,       // clients.country
  statut: 20,      // clients.status
  segment: 20,     // clients.type
  company_name: 255,
  siret: 20,
  preferred_canal: 20,
})

/**
 * Middleware générique : pour chaque champ texte du corps de la requête ayant
 * une limite connue, refuse en 400 avec un message qui nomme le champ et sa
 * limite. Les lectures (GET/HEAD) ne sont pas concernées.
 *
 * @param {Record<string, number>} limites champ envoyé → longueur maximale
 */
function limiterLongueurs(limites = {}) {
  return function validerLongueurs(req, res, next) {
    if (!['POST', 'PUT', 'PATCH'].includes(req.method)) return next()
    const corps = req.body || {}
    for (const [champ, limite] of Object.entries(limites)) {
      const valeur = corps[champ]
      if (typeof valeur !== 'string') continue
      if (valeur.length > limite) {
        return res.status(400).json({
          error: 'champ_trop_long',
          message: `Le champ « ${champ} » ne peut pas dépasser ${limite} caractères (${valeur.length} reçus).`,
          champs: [champ],
          limite,
        })
      }
    }
    return next()
  }
}

module.exports = { limiterLongueurs, LIMITES_CLIENTS }
