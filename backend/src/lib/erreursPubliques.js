/**
 * erreursPubliques.js — UNE ERREUR SERVEUR NE SE RACONTE PAS À L'APPELANT.
 *
 * POURQUOI CE FICHIER
 * Mesuré le 20/09/2026 sur le dépôt : 324 réponses d'erreur recopiaient le
 * message brut de l'exception dans le corps JSON (`err.message`), réparties sur
 * une soixantaine de routeurs. Trois conséquences distinctes, toutes observées :
 *   1. FUITE D'INFRASTRUCTURE — le message de PostgreSQL contient le nom de la
 *      table, de la colonne ou de la contrainte (`relation "quotes" does not
 *      exist`, `duplicate key value violates unique constraint
 *      "contrats_reference_key"`). C'est une carte du schéma offerte à
 *      l'appelant, sans même parler du nom interne des objets métier.
 *   2. FUITE DE CHEMIN SERVEUR — les erreurs de fichiers remontent avec
 *      `/opt/render/project/src/backend/...` ou `/srv/courtia/...`, ce qui donne
 *      l'arborescence de la machine de production.
 *   3. FUITE DE FOURNISSEUR — une erreur du fournisseur d'IA recopiait sa réponse
 *      brute (`invalid x-api-key`, `request_id`) dans le corps HTTP servi au
 *      courtier (défaut P1 de la 2ᵉ passe adverse).
 * La correction par route laisse la classe revenir à la première route oubliée :
 * il y avait déjà des dizaines de sites traités à la main et ~300 restants.
 *
 * CE QUE FAIT CE MODULE
 *   `analyserErreurEntree` (déjà écrit dans middleware/erreursEntree.js) sait
 *   reconnaître une erreur d'ENTRÉE invalide ; ce module-ci couvre le reste :
 *     • `estTexteInterne(texte)`  → détecte un texte d'infrastructure (SQL,
 *       chemin de fichier, pile d'appels, chaîne de connexion, secret, réponse
 *       brute d'un fournisseur). Fonction PURE, c'est elle qui est testée.
 *     • `messagePublic(err, defaut)` → le texte que l'appelant a le droit de
 *       lire : message produit pour une entrée invalide, message métier explicite
 *       (`err.expose === true`) sinon, et message générique dès que le texte
 *       ressemble à de l'infrastructure.
 *     • `assainirCorps(corps)` → passe un corps de réponse au filtre et dit ce
 *       qui a été remplacé (pour le journal serveur).
 *     • `assainirErreursInternes` → middleware unique monté avant TOUS les
 *       routeurs : même une route écrite demain qui recopie `err.message` ne peut
 *       pas servir un texte d'infrastructure. C'est le filet, pas la ceinture.
 *
 * CE QU'IL NE FAIT PAS
 *   * il ne remplace JAMAIS un texte métier légitime (« Devis introuvable. »,
 *     « prime invalide ») : seuls les textes reconnus comme internes sont
 *     remplacés — un texte court, sans chemin, sans SQL, sans secret passe tel
 *     quel ;
 *   * il ne touche pas aux réponses < 400 qui ne se présentent pas comme des
 *     erreurs (aucun risque d'altérer une charge utile métier) ;
 *   * il ne journalise aucun secret : le texte d'origine part au journal avec
 *     la rédaction déjà en place dans lib/redaction.js.
 */

const logger = require('./logger')
const { analyserErreurEntree } = require('../middleware/erreursEntree')

/** Message servi quand l'erreur est reconnue comme interne (jamais muet). */
const MESSAGE_INTERNE = "Une erreur interne s'est produite. L'incident a été enregistré ; réessayez dans un instant."

/** Au-delà, aucun message d'erreur légitime : c'est un dump. */
const LONGUEUR_MAXIMALE = 300

/**
 * Motifs qui signent un texte d'INFRASTRUCTURE. Chaque entrée est justifiée par
 * un cas réellement rencontré dans ce dépôt ou par un message natif du moteur.
 */
const MOTIFS_INTERNES = [
  // ── PostgreSQL / SQL ────────────────────────────────────────────────────────
  /\brelation\s+"[^"]+"\s+does not exist/i,
  /\bcolumn\s+"[^"]+"\s+does not exist/i,
  /\bcolumn\s+[a-z_][a-z0-9_.]*\s+does not exist/i,
  /syntax error at or near/i,
  /operator does not exist/i,
  /permission denied for (?:table|relation|sequence|database|schema|function)/i,
  /violates (?:unique|foreign key|check|not-null|exclusion) constraint/i,
  /duplicate key value/i,
  /null value in column/i,
  /\bconstraint\s+"[^"]+"/i,
  /\bpg_[a-z_]+/i,
  /SQLSTATE/i,
  /invalid input syntax for type/i,
  /value too long for type/i,
  /database\s+"[^"]+"\s+does not exist/i,
  /password authentication failed/i,
  /no pg_hba\.conf entry/i,
  /current transaction is aborted/i,
  /deadlock detected/i,
  /too many clients already/i,
  /remaining connection slots/i,
  /terminating connection due to administrator command/i,
  /(?:SELECT|INSERT INTO|UPDATE|DELETE FROM|ALTER TABLE|CREATE TABLE)\b[\s\S]{0,80}\b(?:FROM|SET|WHERE|VALUES|TABLE)\b/i,
  // ── Chemin de fichier / système ─────────────────────────────────────────────
  /(?:\/opt\/|\/srv\/|\/root\/|\/home\/|\/Users\/|\/var\/|\/usr\/|\/app\/|\/tmp\/)[\w.\-/]+\.(?:js|ts|mjs|cjs|json|node|so|sql|log)\b/i,
  /\b[A-Za-z]:\\\\[\w.\\-]+/,
  /\bnode_modules[\\/]/,
  /\b(?:ENOENT|EACCES|EPERM|EISDIR|ENOTDIR|ECONNREFUSED|ECONNRESET|ETIMEDOUT|EADDRINUSE|EHOSTUNREACH|ENETUNREACH)\b/,
  /syscall\s+[a-z]+/i,
  /\n\s*at\s+[\w.<>\[\]$ ]+\(/,
  /\bat\s+(?:Object|Module|process|async)\b[\w\s]*\(/,
  // ── Secrets / chaînes de connexion / fournisseurs ───────────────────────────
  /(?:postgres|postgresql|redis|mysql|mongodb|amqp):\/\//i,
  /DATABASE_URL|JWT_SECRET|API_KEY|ACCESS_TOKEN|CLIENT_SECRET|PRIVATE_KEY/,
  /x-api-key|invalid_api_key|invalid x-api-key|request_id|Bearer\s/,
  /\bsk-[A-Za-z0-9_-]{8,}/,
  /eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/,
  /(?:api\.)?anthropic\.com|api\.openai\.com|api\.stripe\.com|api\.resend\.com|graph\.facebook\.com/i,
  /(?:ECONN|ETIMEDOUT|timeout).{0,40}(?:provider|fournisseur|upstream)/i,
  // ── Échafaudage technique ───────────────────────────────────────────────────
  /\bTypeError\b|\bReferenceError\b|\bSyntaxError\b|\bRangeError\b/,
  /is not a function|is not defined|Cannot read propert/i,
  /cannot find module|module not found/i,
  /\bundefined is not\b|\bnull is not\b/,
  /\{[^{}]*"(?:error|message|code)"\s*:/,
]

/**
 * Détecte un texte d'infrastructure. FONCTION PURE.
 * @param {*} entree texte, Error, ou objet quelconque
 * @returns {{interne: boolean, raison: string|null}}
 */
function estTexteInterne(entree) {
  if (entree == null) return { interne: false, raison: null }
  const texte = typeof entree === 'string'
    ? entree
    : String((entree && entree.message) || '')
  if (!texte) return { interne: false, raison: null }
  if (texte.length > LONGUEUR_MAXIMALE) return { interne: true, raison: 'texte_trop_long' }
  if (texte.includes('\n')) return { interne: true, raison: 'multi_lignes' }
  for (const motif of MOTIFS_INTERNES) {
    if (motif.test(texte)) return { interne: true, raison: String(motif) }
  }
  return { interne: false, raison: null }
}

/**
 * Le texte que l'appelant a le DROIT de lire.
 *
 * Ordre de décision — volontairement dans cet ordre :
 *   1. une erreur d'entrée reconnue → le message produit (utile, français) ;
 *   2. un texte reconnu comme INTERNE → message générique, sans exception ;
 *   3. un 4xx dont le texte n'est pas interne → conservé : un 4xx est, par
 *      construction, un message destiné à la personne qui a fait la demande
 *      (« Devis introuvable. »), et le filtre 2 vient d'établir qu'il ne contient
 *      ni SQL, ni chemin, ni secret ;
 *   4. un 5xx → message générique, même si le texte ne « ressemble » à rien :
 *      le texte d'une exception serveur n'est pas un message produit.
 * L'opt-in explicite (`err.expose === true`) passe AVANT 3 et 4, mais APRÈS 2.
 *
 * @param {*} entree
 * @param {string|{defaut?: string, statut?: number}} [defautOuOptions]
 * @param {{defaut?: string, statut?: number}} [options]
 * @returns {string}
 */
function messagePublic(entree, defautOuOptions = MESSAGE_INTERNE, options = {}) {
  const opts = defautOuOptions !== null && typeof defautOuOptions === 'object' ? defautOuOptions : options
  const defaut = typeof defautOuOptions === 'string' ? defautOuOptions : (opts.defaut || MESSAGE_INTERNE)
  const statut = Number.isFinite(opts.statut) ? Number(opts.statut) : null

  const analyse = analyserErreurEntree(entree)
  if (analyse) return analyse.message

  const texte = typeof entree === 'string'
    ? entree
    : String((entree && entree.message) || '')
  if (!texte) return defaut

  const { interne } = estTexteInterne(texte)
  if (interne) return defaut
  if (entree && typeof entree === 'object' && entree.expose === true) return texte
  // Un CODE MÉTIER (slug minuscule, forme `fonctionnalite_non_souscrite`,
  // `invite_accept_failed`…) est posé à la main dans le code, jamais par un
  // pilote de base : il signe une erreur PRODUIT écrite pour être lue. Les codes
  // de PostgreSQL (`22001`, `22P02`) et de Node (`ENOENT`, `ECONNREFUSED`) sont
  // en majuscules/chiffres et ne passent donc pas ici.
  if (entree && typeof entree === 'object' && /^[a-z][a-z0-9_]{3,}$/.test(String(entree.code || ''))) return texte
  if (statut !== null && statut >= 400 && statut < 500) return texte
  return defaut
}

/** Champs dont le contenu texte d'une réponse d'erreur est contrôlé. */
const CHAMPS_TEXTE = Object.freeze(['error', 'message', 'details', 'erreur', 'detail', 'cause', 'err', 'raison'])

/**
 * Passe un corps de réponse au filtre. FONCTION PURE (hormis le journal côté
 * appelant) : renvoie le corps nettoyé + la liste des remplacements effectués.
 *
 * Le corps est renvoyé IDENTIQUE (même objet) s'il n'y a rien à nettoyer, afin
 * que l'appelant puisse tester l'égalité stricte.
 *
 * @param {object} corps
 * @param {{journaliser?: boolean, chemin?: string}} [options]
 * @returns {{corps: object, remplacements: string[]}}
 */
function assainirCorps(corps, options = {}) {
  if (!corps || typeof corps !== 'object' || Array.isArray(corps)) {
    return { corps, remplacements: [] }
  }
  const remplacements = []
  let copie = null

  for (const champ of CHAMPS_TEXTE) {
    const valeur = corps[champ]
    if (valeur == null) continue
    if (typeof valeur === 'object') {
      // Un sous-objet (`details: { err: ... }`) est exploré récursivement.
      const sousCorps = assainirCorps(valeur, options)
      if (sousCorps.remplacements.length > 0) {
        copie = copie || { ...corps }
        copie[champ] = sousCorps.corps
        remplacements.push(...sousCorps.remplacements.map((r) => `${champ}.${r}`))
      }
      continue
    }
    if (typeof valeur !== 'string' || !valeur) continue
    const { interne, raison } = estTexteInterne(valeur)
    if (!interne) continue
    copie = copie || { ...corps }
    copie[champ] = messagePublic(valeur)
    remplacements.push(`${champ}:${raison}`)
  }

  // Les champs qui ne doivent JAMAIS sortir d'un processus serveur.
  for (const champ of ['stack', 'sql', 'query', 'sqlMessage', 'hint', 'position', 'internalQuery', 'where']) {
    if (corps[champ] === undefined) continue
    copie = copie || { ...corps }
    delete copie[champ]
    remplacements.push(`${champ}:supprime`)
  }

  if (!copie) return { corps, remplacements: [] }
  return { corps: copie, remplacements }
}

/** Vrai si le corps se présente comme une erreur (et non une charge utile). */
function estCorpsDErreur(corps) {
  if (!corps || typeof corps !== 'object' || Array.isArray(corps)) return false
  if (corps.success === false) return true
  if (corps.error !== undefined || corps.erreur !== undefined) return true
  return false
}

/**
 * Middleware : enveloppe `res.json` / `res.send` de TOUTE la requête (monté au
 * niveau application, donc avant chaque routeur). Une réponse d'erreur (code
 * ≥ 400, ou corps qui se présente comme une erreur) ne peut plus transporter un
 * texte d'infrastructure ; le texte d'origine part au journal serveur.
 *
 * Ce middleware est COMPLÉMENTAIRE de `traduireErreursEntree` : celui-ci
 * s'exécute APRÈS (il enveloppe celui d'ici), donc une entrée invalide est
 * d'abord réécrite en 400 avec un message produit, puis le filtre vérifie qu'il
 * ne reste rien d'interne.
 */
function assainirErreursInternes(req, res, next) {
  const jsonOrigine = res.json.bind(res)
  const sendOrigine = res.send.bind(res)

  const traiter = (corps, envoyer) => {
    const estErreur = res.statusCode >= 400 || estCorpsDErreur(corps)
    if (!estErreur) return envoyer(corps)
    const { corps: propre, remplacements } = assainirCorps(corps, { statut: res.statusCode })
    if (remplacements.length > 0) {
      logger.warn({
        type: 'fuite_erreur_bloquee',
        path: req.originalUrl,
        method: req.method,
        status: res.statusCode,
        remplacements,
        // Le texte d'origine reste côté serveur, rédigé par le sérialiseur du
        // journal (aucun secret, aucun jeton, aucun e-mail en clair).
        corps_origine: typeof corps === 'object' ? corps : { valeur: String(corps) },
      }, 'texte d’infrastructure retiré d’une réponse HTTP')
    }
    return envoyer(propre)
  }

  res.json = (corps) => traiter(corps, jsonOrigine)
  res.send = (corps) => {
    if (typeof corps === 'string' && res.statusCode >= 400) {
      const { interne } = estTexteInterne(corps)
      if (interne) {
        logger.warn({
          type: 'fuite_erreur_bloquee',
          path: req.originalUrl,
          status: res.statusCode,
        }, 'texte d’infrastructure retiré d’une réponse HTTP (texte brut)')
        return sendOrigine(messagePublic(corps))
      }
    }
    return traiter(corps, sendOrigine)
  }

  next()
}

/**
 * Réponse d'erreur serveur, une fois pour toutes : journal + message public.
 * À utiliser dans les `catch` plutôt que de recopier `err.message`.
 *
 * @param {import('express').Response} res
 * @param {*} err
 * @param {{statut?: number, code?: string, defaut?: string, contexte?: string}} [options]
 */
function repondreErreur(res, err, options = {}) {
  const statut = options.statut || 500
  const contexte = options.contexte || 'route'
  logger.error({
    type: 'erreur_route',
    contexte,
    path: res.req && res.req.originalUrl,
    method: res.req && res.req.method,
    err,
  }, 'erreur de route')
  const corps = { message: messagePublic(err, options.defaut) }
  if (options.code) corps.error = options.code
  return res.status(statut).json(corps)
}

module.exports = {
  MESSAGE_INTERNE,
  LONGUEUR_MAXIMALE,
  MOTIFS_INTERNES,
  estTexteInterne,
  messagePublic,
  assainirCorps,
  estCorpsDErreur,
  assainirErreursInternes,
  repondreErreur,
}
