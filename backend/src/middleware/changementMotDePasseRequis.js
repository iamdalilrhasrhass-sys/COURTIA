/**
 * changementMotDePasseRequis.js — UN MOT DE PASSE TEMPORAIRE N'OUVRE PAS
 * L'APPLICATION (défaut P2 SEC-017, mesuré le 21/09/2026).
 *
 * ────────────────────────────────────────────────────────────────────────────
 * DÉFAUT MESURÉ
 * Le mot de passe initial remis par COURTIA à un cabinet est DÉRIVÉ DU NOM DU
 * CABINET (`lib/motDePasseInitial.js` : « Century Finance » → « CenturyFinance »,
 * « Spondeo Sàrl » → « Spondeo »). Il est donc devinable sans effort par
 * quiconque connaît le nom du cabinet — c'est-à-dire par toute personne qui voit
 * une facture, une signature d'e-mail ou un site web du cabinet.
 *
 * La base sait déjà que ce mot de passe est temporaire : `users.must_change_password`
 * vaut `true` pour les deux cabinets pilotes (utilisateurs 11 et 14, mesurés en
 * production le 21/09/2026), et `GET /api/auth/me` renvoie ce drapeau
 * (`routes/auth.js:147`). Mais AUCUN middleware ne refusait les routes métier :
 * le champ était une INVITATION affichée à l'écran, jamais une contrainte. Un
 * compte d'essai continuait donc d'utiliser l'application entière avec un mot de
 * passe que n'importe qui pouvait deviner.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * RÈGLE TENUE ICI
 * Tant que `must_change_password` est vrai, les routes MÉTIER répondent
 * 403 `changement_mot_de_passe_requis`. Le compte reste utilisable pour se
 * METTRE EN RÈGLE (changer son mot de passe) et rien d'autre.
 *
 * POURQUOI 403 ET NON 401 : le jeton est valide et le compte existe — la session
 * est ouverte. 401 ferait croire à une session expirée et pousserait la personne
 * à se reconnecter… avec le même mot de passe temporaire, en boucle. 403 dit
 * « vous êtes authentifié, cette action n'est pas ouverte » : c'est exactement
 * l'état du compte.
 *
 * POURQUOI UNE GARDE GLOBALE ET UNE LISTE D'EXEMPTIONS EXPLICITE
 * Une garde posée route par route serait recopiée (ou oubliée) sur les
 * 60 routeurs, et la première route ajoutée demain rouvrirait le trou. Montée
 * sur `/api` avant les routeurs, elle ne peut pas être contournée. Les
 * exemptions, elles, sont NOMMÉES jusqu'au chemin (aucun préfixe de famille) :
 * une route métier ajoutée demain sous `/api/auth/...` ou `/api/billing/...`
 * n'est donc PAS exemptée par ricochet.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * EXEMPTIONS — chacune est justifiée, aucune n'est là « au cas où »
 *
 *  1. POST /api/auth/change-password — LE BUT MÊME DE LA GARDE. Sans cette
 *     exemption, le compte ne pourrait jamais sortir de l'état temporaire.
 *  2. POST /api/auth/logout — la déconnexion doit rester possible : c'est le
 *     seul moyen de quitter proprement un poste partagé, et le seul moyen de
 *     faire tomber une session devenue suspecte (révocation, SEC-016).
 *  3. GET|PUT /api/auth/me — le compte doit pouvoir LIRE son propre état
 *     (`must_change_password`) : c'est ce que l'écran utilise pour proposer le
 *     changement de mot de passe. Refuser cette lecture rendrait le blocage
 *     inexplicable et la sortie de l'état temporaire impossible à l'écran.
 *  4. Les points d'entrée d'AUTHENTIFICATION (login, register, google,
 *     forgot-password, reset-password, refresh, verify) — ce ne sont pas des
 *     routes métier. Les refuser créerait un VERROU RÉEL : un client HTTP qui
 *     joint le jeton courant à toutes ses requêtes (c'est ce que fait le
 *     frontal) recevrait 403 en tentant de se reconnecter ou de réinitialiser
 *     son mot de passe oublié — donc plus aucun chemin de retour.
 *  5. /api/billing/* — un compte en essai doit pouvoir SOUSCRIRE (paiement,
 *     portail de facturation, annulation d'essai) sans avoir changé son mot de
 *     passe ; les webhooks de facturation (Stripe) y aboutissent sans jeton
 *     utilisateur. Exemption de PRÉFIXE parce qu'elle est exigée par le produit
 *     et bornée au segment `/api/billing` (ni `/api/billing-x`, ni tout `/api`).
 *  6. GET /api/health et GET /api/status — sondes publiques. Elles ne
 *     transportent aucun jeton d'habitude, mais une sonde qui reçoit un jeton
 *     (supervision, navigateur) doit continuer de répondre : c'est la seule
 *     information dont un client a besoin pour savoir que le service est debout.
 *
 * COÛT : une lecture de la SEULE colonne `must_change_password` par requête
 * authentifiée NON exemptée (les exemptions ci-dessus ne coûtent rien : la
 * décision est prise avant toute requête). La valeur n'est PAS mise en cache
 * entre requêtes : un cache différé bloquerait un compte qui vient de changer
 * son mot de passe, ou laisserait passer un compte qui vient d'être créé
 * temporaire — les deux erreurs coûtent plus cher que la lecture.
 */

const jwt = require('jsonwebtoken')
const { getJwtSecret } = require('../utils/jwtSecret')

/** Code de refus servi à l'appelant (explicite, stable, en minuscules). */
const CODE_REFUS = 'changement_mot_de_passe_requis'

/**
 * Exemptions. `methode: null` = toutes les méthodes sur ce chemin.
 * `prefixe: true` = le chemin et tout ce qui est SOUS lui (borné au segment :
 * `/api/billing/x` oui, `/api/billing-x` non).
 */
const ROUTES_EXEMPTEES = Object.freeze([
  // 1 — le changement de mot de passe lui-même (sortie de l'état temporaire)
  { methode: 'POST', chemin: '/api/auth/change-password' },
  // 2 — la déconnexion (quitter le poste, révoquer la session)
  { methode: 'POST', chemin: '/api/auth/logout' },
  // 3 — son propre état (l'écran lit `must_change_password` ici)
  { methode: null, chemin: '/api/auth/me' },
  // 4 — l'authentification : aucun chemin de retour ne doit être fermé
  { methode: 'POST', chemin: '/api/auth/login' },
  { methode: 'POST', chemin: '/api/auth/register' },
  { methode: 'POST', chemin: '/api/auth/google' },
  { methode: 'POST', chemin: '/api/auth/forgot-password' },
  { methode: 'POST', chemin: '/api/auth/reset-password' },
  { methode: 'POST', chemin: '/api/auth/refresh' },
  { methode: 'POST', chemin: '/api/auth/verify' },
  // 5 — facturation : souscrire reste possible avec un mot de passe temporaire
  { methode: null, chemin: '/api/billing', prefixe: true },
  // 6 — sondes publiques
  { methode: 'GET', chemin: '/api/health' },
  { methode: 'GET', chemin: '/api/status' },
])

/** Chemin normalisé : sans chaîne de requête, sans barre finale. */
function cheminNormalise(chemin) {
  const brut = String(chemin || '').split('?')[0]
  return brut.replace(/\/+$/, '') || '/'
}

/**
 * FONCTION PURE : cette requête est-elle exemptée de la garde ?
 * @param {string} methode
 * @param {string} chemin
 */
function estRouteExemptee(methode, chemin) {
  const m = String(methode || '').toUpperCase()
  const c = cheminNormalise(chemin)
  return ROUTES_EXEMPTEES.some((regle) => {
    if (regle.methode && regle.methode !== m) return false
    if (regle.prefixe) return c === regle.chemin || c.startsWith(regle.chemin + '/')
    return c === regle.chemin
  })
}

/**
 * Jeton utilisateur lisible ? Un jeton de PORTAIL client (`aud: client_portal`,
 * `{ portalAccountId, clientId, brokerId }`) ne porte NI `id` NI `userId` : il
 * ne désigne pas un compte de `users` et n'est donc jamais évalué ici.
 */
function identifiantUtilisateur(entete) {
  if (!entete || !String(entete).startsWith('Bearer ')) return null
  try {
    const decode = jwt.verify(String(entete).slice(7), getJwtSecret())
    const userId = Number(decode && (decode.userId || decode.id))
    if (!Number.isFinite(userId) || userId <= 0) return null
    return { userId, decode }
  } catch (_) {
    return null // jeton invalide/expiré : l'authentification de la route tranchera (401)
  }
}

/**
 * Le compte porte-t-il encore un mot de passe temporaire ?
 * `to_jsonb(u)->>'…'` plutôt qu'une colonne nommée : sur une base où la
 * migration n'a pas encore posé la colonne, la lecture rend `null` au lieu de
 * faire échouer la requête (même précaution que `middleware/auth.js`).
 * @returns {Promise<boolean>} true seulement si la valeur est VRAIE
 */
async function motDePasseTemporaire(resource, userId) {
  const resultat = await resource.query(
    `SELECT to_jsonb(u)->>'must_change_password' AS must_change_password
       FROM users u WHERE u.id = $1`,
    [userId]
  )
  if (!resultat || !resultat.rows || resultat.rows.length === 0) return false
  const valeur = resultat.rows[0].must_change_password
  return valeur === true || String(valeur).toLowerCase() === 'true'
}

/** Réponse de refus — message produit, aucun détail d'infrastructure. */
function chargeRefus() {
  return {
    success: false,
    error: CODE_REFUS,
    code: CODE_REFUS,
    must_change_password: true,
    message:
      'Votre mot de passe temporaire doit être remplacé avant d’utiliser l’application. '
      + 'Rendez-vous dans Paramètres → Sécurité (aucune donnée n’est perdue).',
  }
}

/**
 * Construit la garde. `pool` est le pool réellement utilisé
 * (`app.locals.pool`) ; à défaut le module `../db`. Les tests peuvent injecter
 * un pool simulé.
 */
function creerGardeChangementMotDePasse(pool) {
  return async function gardeChangementMotDePasse(req, res, next) {
    try {
      // Une requête PREFLIGHT (OPTIONS) n'exécute aucune logique métier : elle
      // est répondue plus haut par `cors()`. La refuser transformerait le 403
      // en erreur CORS opaque dans le navigateur — l'utilisateur ne verrait
      // jamais le message qui lui dit quoi faire.
      if (String(req.method || '').toUpperCase() === 'OPTIONS') return next()

      const chemin = cheminNormalise(req.originalUrl || req.url)
      if (!chemin.startsWith('/api')) return next()
      // La décision d'exemption est prise AVANT toute requête base : aucune
      // route exemptée ne paie le contrôle, et aucune ne peut être refusée par
      // une panne de la base.
      if (estRouteExemptee(req.method, chemin)) return next()

      const utilisateur = identifiantUtilisateur(req.headers && req.headers.authorization)
      if (!utilisateur) return next()

      const resource = pool || (req.app && req.app.locals && req.app.locals.pool) || require('../db')
      const temporaire = await motDePasseTemporaire(resource, utilisateur.userId)
      if (!temporaire) return next()

      return res.status(403).json(chargeRefus())
    } catch (err) {
      // Une panne du contrôle ne doit jamais donner PLUS de droits, mais elle ne
      // doit pas non plus fermer l'application entière sur un incident de
      // lecture : 503 explicite, et la route n'est pas atteinte.
      return res.status(503).json({
        success: false,
        error: 'controle_mot_de_passe_indisponible',
        message: 'Le contrôle du mot de passe temporaire est momentanément indisponible ; réessayez dans un instant.',
      })
    }
  }
}

module.exports = {
  creerGardeChangementMotDePasse,
  estRouteExemptee,
  cheminNormalise,
  identifiantUtilisateur,
  motDePasseTemporaire,
  chargeRefus,
  CODE_REFUS,
  ROUTES_EXEMPTEES,
}
