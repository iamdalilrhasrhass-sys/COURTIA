/**
 * gardeEcritureRole.js — AUCUNE ÉCRITURE POUR UN RÔLE EN LECTURE SEULE.
 *
 * POURQUOI CE FICHIER (P1 #3 de la Red Team, mesuré en production le 20/09/2026)
 * Un compte de cabinet dont le rôle est `assistant` (lecture seule) ÉCRIVAIT
 * réellement en base, sans aucun refus :
 *   POST /api/objectifs/set   → 200, ligne `objectifs` créée
 *   POST /api/partners        → 201, ligne `partners` créée
 *   POST /api/developer/keys  → 201, clés d'API PERMANENTES émises (api_keys id 1 et 2)
 * Douze autres routes métier refusaient correctement (403 `lecture_seule`) parce
 * qu'elles appellent `porteeCabinet.refuserEcriture`. Ces trois-là ne portaient
 * aucune garde : la politique existait, son application dépendait du zèle de
 * chaque auteur de route. C'est exactement la forme de trou qui se rouvre à la
 * prochaine route ajoutée.
 *
 * LA RÈGLE, ÉCRITE UNE SEULE FOIS
 * Toute requête d'ÉCRITURE (POST/PUT/PATCH/DELETE) sous `/api` portant un jeton
 * utilisateur valide est soumise à la portée cabinet (lib/porteeCabinet, seule
 * autorité) AVANT d'atteindre la route. Si le rôle de l'appelant dans son
 * cabinet n'autorise pas l'écriture (`assistant`, `viewer`), la réponse est
 * 403 `lecture_seule` avec le message déjà utilisé par les routes gardées : une
 * seule formulation pour tout le produit.
 *
 * CE QUE LA GARDE LAISSE PASSER — ET POURQUOI (précisément)
 *   * les lectures (GET/HEAD/OPTIONS) : le rôle assistant lit tout le cabinet ;
 *   * les requêtes SANS jeton Bearer : ce sont les points d'entrée publics
 *     (dépôt de pièces client, webhooks entrants, inscription, paiement) ou la
 *     clé d'API publique `/api/v1` — ils n'ont pas de rôle cabinet à évaluer, et
 *     chacun porte sa propre authentification ;
 *   * les requêtes dont le jeton est invalide : le middleware d'authentification
 *     de la route répondra 401 (on n'anticipe pas un verdict d'authentification) ;
 *   * l'exploitant de la plateforme (rôle global `super_admin`) et tout
 *     utilisateur SANS appartenance cabinet (portée « mono-utilisateur ») : la
 *     politique de portée les déclare capables d'écrire — rien ne change pour
 *     les trois quarts des comptes réels, qui n'ont pas de cabinet ;
 *   * certains préfixes publics explicites ci-dessous (voir PREFIXES_PUBLICS).
 *
 * COÛT : la portée est mémoïsée sur la requête par `resoudrePortee` — une route
 * qui appelle ensuite `porteeCabinet.resoudrePortee(pool, req)` ne refait AUCUNE
 * requête SQL. La garde ne coûte donc rien aux routes déjà protégées.
 */

const jwt = require('jsonwebtoken')
const porteeCabinet = require('../lib/porteeCabinet')
const { getJwtSecret } = require('../utils/jwtSecret')

/** Méthodes qui modifient l'état. Tout le reste est laissé intact. */
const METHODES_ECRITURE = Object.freeze(['POST', 'PUT', 'PATCH', 'DELETE'])

/**
 * Préfixes PUBLICS (ou authentifiés autrement qu'par un jeton utilisateur) :
 * la garde de rôle ne s'y applique pas.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * CORRECTION DU 20/09/2026 (P3 SEC-022, mesuré en production)
 * Un compte de cabinet en LECTURE SEULE créait un ÉVÉNEMENT via
 * `POST /api/calendar/events` → 200, alors que 20 autres routes d'écriture lui
 * répondaient 403. La cause n'était pas la garde globale — elle était bien
 * « on refuse par défaut » — mais cette liste : `/api/calendar` y figurait en
 * entier, pour une seule route réellement publique (le callback OAuth Google).
 * Un préfixe de deux segments exemptait donc TOUT l'agenda du contrôle de rôle.
 *
 * RÈGLE TENUE ICI : chaque entrée ne couvre QUE ce qui est réellement appelé par
 * un tiers non authentifié. Un point d'entrée public est désormais nommé jusqu'à
 * la route (`/api/calendar/callback`, `/api/whatsapp/webhook`…), jamais par
 * famille (`/api/calendar`). Une route d'écriture ajoutée demain dans une famille
 * existante est donc protégée sans que personne n'y pense.
 * ────────────────────────────────────────────────────────────────────────────
 *   * /api/auth, /api/invite, /api/beta, /api/leads  → inscription, invitation,
 *     demande de démo : aucun cabinet n'existe encore au moment de l'appel ;
 *   * les WEBHOOKS de facturation (et eux seuls) → un tiers non authentifié
 *     appelle ces points d'entrée (Stripe) ; ils portent leur propre
 *     vérification de signature. Voir la correction P1 ci-dessous ;
 *   * /api/portal, /api/ark-chat                     → espace CLIENT (jeton de
 *     portail, pas de cabinet) ;
 *   * les liens et callbacks destinés à des tiers non authentifiés : dépôt
 *     public de pièces, webhook de signature, callback OAuth de l'agenda,
 *     webhooks WhatsApp / téléphonie / messagerie.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * CORRECTION DU 20/09/2026 (P1, mesuré en production — deuxième QA adverse)
 * Un compte de cabinet en LECTURE SEULE (`assistant`) modifiait l'IDENTITÉ DE
 * FACTURATION du cabinet :
 *   POST /api/billing/onboarding  → 200, `organization_profiles` réécrit
 *   (nom, forme juridique, SIRET, ORIAS, adresse, signataire légal).
 * Cause : `/api/billing` ET `/api/stripe` étaient exemptés EN ENTIER — même
 * faute que `/api/calendar` avant elle : un préfixe de famille ouvrait toutes
 * les routes d'écriture de la famille. `/api/stripe` est le MÊME routeur que
 * `/api/billing` (`routes/stripe.js` réexporte `routes/billing.js`) : les deux
 * exemptions devaient donc tomber ensemble.
 *
 * RÈGLE TENUE : seules les routes réellement appelées par un tiers NON
 * AUTHENTIFIÉ sont exemptées, nommées jusqu'à la route. Pour la facturation, ce
 * sont exactement les quatre chemins de webhook (`/api/billing/webhook`,
 * `/api/billing/stripe-webhook` et leurs alias `/api/stripe/...`), qui
 * vérifient la signature Stripe. Tout le reste de `/api/billing`
 * (`onboarding`, `legal-acceptance`, `checkout`, `portal`, `cancel-trial`…)
 * repasse sous la garde de rôle : un `assistant`/`viewer` reçoit 403
 * `lecture_seule`, sans aucune écriture.
 * ────────────────────────────────────────────────────────────────────────────
 */
const PREFIXES_PUBLICS = Object.freeze([
  '/api/auth',
  '/api/invite',
  '/api/beta',
  '/api/leads',
  '/api/webhooks',
  // Webhooks de facturation — appelés par Stripe, jamais par un utilisateur :
  // signature vérifiée par le routeur. Aucun autre chemin de facturation n'est
  // exempté (voir la correction P1 ci-dessus).
  '/api/billing/webhook',
  '/api/billing/stripe-webhook',
  '/api/stripe/webhook',
  '/api/stripe/stripe-webhook',
  '/api/portal',
  '/api/ark-chat',
  '/api/document-inbox/public',
  '/api/signatures/webhook',
  // L'agenda n'est PLUS exempté en bloc : seule sa route de retour OAuth l'est
  // (c'est Google qui l'appelle, sans jeton d'utilisateur).
  '/api/calendar/callback',
  '/api/whatsapp/webhook',
  // Webhook d'appels (Vapi) : appelé par l'opérateur, secret en en-tête.
  '/api/voice/webhook',
  '/api/messaging/webhook',
  '/api/public',
])

/** Chemin normalisé (sans chaîne de requête) — mêmes règles pour tous les appels. */
function cheminNormalise(req) {
  const brut = String((req && (req.originalUrl || req.url)) || '').split('?')[0]
  return brut.replace(/\/+$/, '') || '/'
}

function estPrefixePublic(chemin) {
  return PREFIXES_PUBLICS.some((prefixe) => chemin === prefixe || chemin.startsWith(prefixe + '/'))
}

/** Jeton utilisateur lisible ? Sinon la garde s'efface (401 par la route). */
function decoderJeton(req) {
  const entete = req.headers && req.headers.authorization
  if (!entete || !String(entete).startsWith('Bearer ')) return null
  try {
    return jwt.verify(String(entete).slice(7), getJwtSecret())
  } catch (_) {
    return null
  }
}

/**
 * Construit la garde. `pool` est le pool réellement utilisé (app.locals.pool) ;
 * à défaut le module `../db`. Les tests peuvent injecter un pool simulé.
 */
function creerGardeEcritureRole(pool) {
  return async function gardeEcritureRole(req, res, next) {
    try {
      if (!METHODES_ECRITURE.includes(req.method)) return next()
      const chemin = cheminNormalise(req)
      if (estPrefixePublic(chemin)) return next()

      const decode = decoderJeton(req)
      if (!decode) return next()
      if (String(decode.role || '') === 'super_admin') return next()

      // `req.user` n'est pas encore posé par les routeurs : on le pose ici pour
      // que resoudrePortee voie l'utilisateur porteur du jeton (les middlewares
      // d'authentification des routes le reposeront à l'identique).
      if (!req.user) req.user = { id: decode.id || decode.userId, userId: decode.userId || decode.id, role: decode.role }

      const ressource = pool || req.app?.locals?.pool || require('../db')
      const portee = await porteeCabinet.resoudrePortee(ressource, req)
      if (porteeCabinet.refuserEcriture(portee, res, 'modifier les données du cabinet')) return
      return next()
    } catch (err) {
      // Une panne de la garde ne doit jamais donner PLUS de droits : on refuse
      // l'écriture et on le dit. (resoudrePortee ne lève pas — ce chemin couvre
      // une panne inattendue, pas une indisponibilité de la base.)
      return res.status(503).json({
        error: 'controle_role_indisponible',
        message: "Le contrôle du rôle est momentanément indisponible : aucune écriture n'a été effectuée.",
      })
    }
  }
}

/**
 * Garde d'ÉCRITURE réutilisable, à poser route par route quand on veut le refus
 * AU PLUS PRÈS de la route (défense en profondeur en plus de la garde globale).
 * S'utilise tel quel : `router.post('/', verifyToken, exigerEcritureCabinet(pool), handler)`.
 *
 * Elle est volontairement BRUYANTE dans son refus : 403 `lecture_seule`, le
 * rôle de l'appelant et l'action refusée — le collaborateur comprend qu'il voit
 * bien la donnée mais qu'il ne peut pas la modifier, au lieu de croire à une
 * panne (« erreur serveur ») ou à un problème de droits d'accès global.
 */
function exigerEcritureCabinet(pool, action = 'modifier les données du cabinet') {
  return async function gardeEcritureRoute(req, res, next) {
    try {
      const ressource = pool || req.app?.locals?.pool || require('../db')
      const portee = await porteeCabinet.resoudrePortee(ressource, req)
      if (porteeCabinet.refuserEcriture(portee, res, action)) return
      return next()
    } catch (err) {
      return res.status(503).json({
        error: 'controle_role_indisponible',
        message: "Le contrôle du rôle est momentanément indisponible : aucune écriture n'a été effectuée.",
      })
    }
  }
}

module.exports = {
  creerGardeEcritureRole,
  exigerEcritureCabinet,
  METHODES_ECRITURE,
  PREFIXES_PUBLICS,
  estPrefixePublic,
  cheminNormalise,
  decoderJeton,
}
