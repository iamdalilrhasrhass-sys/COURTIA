/**
 * erreursEntree.js — UNE ENTRÉE INVALIDE NE DOIT JAMAIS PRODUIRE UN 500 SQL.
 *
 * POURQUOI CE FICHIER
 * Mesuré en production le 20/09/2026 (Red Team, P1 #4) : quatre appels ordinaires
 * d'utilisateur renvoyaient 500 avec le message brut de PostgreSQL :
 *   POST /api/clients   {nom: "x".repeat(2500)}   → 500 « value too long for type character varying(100) »
 *   GET  /api/clients/abc                          → 500 « invalid input syntax for type integer: "abc" »
 *   POST /api/taches    {echeance: "2026-02-31T99:99:99Z"} → 500
 *   POST /api/accounting/entries                   → 500 « invalid input syntax for type integer: "NaN" »
 * Les trois torts sont distincts et cumulés :
 *   1. le code HTTP est faux — c'est la CLIENT qui a envoyé une valeur invalide,
 *      donc 400 (Bad Request), pas 500 (l'erreur du serveur) ;
 *   2. le message est un message d'infrastructure : « character varying(100) »
 *      ne dit rien à un courtier, et un numéro de ligne SQL interne n'a rien à
 *      faire dans une réponse HTTP ;
 *   3. le NOM d'une contrainte ou d'une colonne interne fuit à l'appelant (aide
 *      directe à un attaquant qui cartographie le schéma).
 *
 * CE QUE FAIT CE MIDDLEWARE
 * Il enveloppe `res.json` / `res.send` de la requête : au moment où une route
 * répond, si le code est ≥ 500 ET que le message est RÉCONNU comme une erreur
 * d'ENTRÉE PostgreSQL, la réponse est réécrite en 400/409 avec un message
 * produit, en français, sans nom de contrainte ni de colonne.
 *
 * POURQUOI ICI ET PAS DANS CHAQUE ROUTE
 * Plus de deux cents routes répondent `res.status(500).json({message: err.message})`
 * dans leur `catch`. Les corriger une par une laisse le défaut revenir à la
 * première route oubliée ; un intercepteur unique ferme la CLASSE entière. Les
 * routes qui valident déjà leurs entrées avant la base restent la première
 * ligne de défense — ce middleware est le filet, pas la validation.
 *
 * CE QU'IL NE FAIT PAS
 *   * il ne touche pas aux 5xx qui ne viennent pas d'une entrée invalide
 *     (colonne inexistante, table absente, panne de connexion) : ce sont de
 *     vraies erreurs serveur et elles restent des 5xx — sinon on masquerait un
 *     bug de code derrière un 400 menteur ;
 *   * il ne transforme jamais un 2xx/3xx/4xx : seul un 5xx déjà choisi par la
 *     route est candidat.
 */

/** Erreurs PostgreSQL qui signent une ENTRÉE invalide (jamais un bug de code). */
const CODES_ENTREE_INVALIDE = Object.freeze(new Set([
  '22001', // string_data_right_truncation  → valeur trop longue pour la colonne
  '22003', // numeric_value_out_of_range
  '22007', // invalid_datetime_format
  '22008', // datetime_field_overflow (2026-02-31T99:99:99Z)
  '2200N', // invalid_character_value_for_cast
  '22012', // division_by_zero
  '22013', // invalid_preceding_or_following_size
  '22018', // invalid_character_value_for_cast
  '22023', // invalid_parameter_value
  '22P02', // invalid_text_representation   → « invalid input syntax for type … »
  '23502', // not_null_violation            → champ obligatoire manquant
  '23514', // check_violation
]))

/** Erreurs de CONFLIT avec des données déjà en base (ni 400 ni 500). */
const CODES_CONFLIT = Object.freeze(new Set([
  '23503', // foreign_key_violation     → la ligne est encore référencée
  '23505', // unique_violation
  '23P01', // exclusion_violation
]))

/**
 * Motifs textuels, utilisés quand l'erreur remonte sans code SQLSTATE
 * (erreur enveloppée par un service, `err.message` recopié dans une promesse
 * rejetée…). Le texte est celui de PostgreSQL en anglais : il est stable et
 * versionné par le moteur.
 */
const MOTIFS = [
  {
    motif: /value too long for type character varying\((\d+)\)/i,
    code: 'champ_trop_long',
    message: (m) => `Un des champs transmis dépasse la longueur maximale autorisée (${m[1]} caractères).`,
  },
  {
    motif: /value too long for type character\((\d+)\)/i,
    code: 'champ_trop_long',
    message: (m) => `Un des champs transmis dépasse la longueur maximale autorisée (${m[1]} caractères).`,
  },
  {
    motif: /invalid input syntax for type (?:integer|bigint|smallint|numeric|decimal|double precision|real)/i,
    code: 'valeur_numerique_invalide',
    message: () => "Une valeur numérique transmise n'est pas un nombre valide.",
  },
  {
    motif: /invalid input syntax for type uuid/i,
    code: 'identifiant_invalide',
    message: () => "Un identifiant transmis n'a pas le format attendu.",
  },
  {
    motif: /invalid input syntax for type (?:json|jsonb)/i,
    code: 'donnee_invalide',
    message: () => 'Une des données transmises est illisible (format attendu : JSON).',
  },
  {
    motif: /invalid input syntax for type (?:timestamp|timestamptz|date|time|interval)/i,
    code: 'date_invalide',
    message: () => "Une date transmise est invalide : vérifiez le jour et le format (AAAA-MM-JJ).",
  },
  {
    motif: /invalid input syntax for type boolean/i,
    code: 'valeur_booleenne_invalide',
    message: () => 'Un des champs transmis doit valoir vrai ou faux.',
  },
  {
    motif: /date\/time field value out of range|timestamp(?: with time zone)? out of range|invalid date/i,
    code: 'date_hors_plage',
    message: () => "La date transmise n'existe pas (ou sort de la plage autorisée).",
  },
  {
    motif: /out of range for type/i,
    code: 'valeur_hors_plage',
    message: () => 'Une des valeurs transmises sort de la plage autorisée.',
  },
  {
    motif: /invalid input value for enum/i,
    code: 'valeur_non_autorisee',
    message: () => 'Une des valeurs transmises ne fait pas partie des valeurs autorisées.',
  },
  {
    motif: /malformed array literal/i,
    code: 'liste_invalide',
    message: () => 'Une des listes transmises est mal formée.',
  },
  {
    motif: /division by zero/i,
    code: 'division_par_zero',
    message: () => 'Un des montants transmis provoque une division par zéro.',
  },
  {
    // Volontairement APRÈS les cas plus précis : on ne cite ni la colonne ni la
    // contrainte, seulement le fait qu'un champ obligatoire manque.
    motif: /null value in column .* violates not-null constraint/i,
    code: 'champ_obligatoire_manquant',
    message: () => 'Un champ obligatoire est manquant.',
  },
  {
    motif: /violates foreign key constraint/i,
    code: 'reference_utilisee',
    message: () => "Cette donnée est encore référencée par d'autres éléments du cabinet.",
  },
  {
    motif: /duplicate key value violates unique constraint|violates exclusion constraint/i,
    code: 'donnee_en_double',
    message: () => 'Cette donnée existe déjà.',
  },
  {
    motif: /violates check constraint/i,
    code: 'valeur_non_autorisee',
    message: () => 'Une ou plusieurs valeurs transmises ne respectent pas les règles attendues.',
  },
]

/** Ces deux familles ne reçoivent pas le même code HTTP : 400 (entrée) / 409 (conflit). */
const CODES_CONFLIT_PRODUITS = Object.freeze(new Set(['reference_utilisee', 'donnee_en_double']))

/**
 * Message par DÉFAUT d'un code SQLSTATE : utilisé quand le code est connu mais
 * que le texte ne correspond à aucun motif (base non anglophone, erreur
 * réécrite par un service intermédiaire). Sans cette table, un code reconnu
 * tombait sur un message générique — moins utile pour corriger la saisie.
 */
const DEFAUTS_PAR_CODE = Object.freeze({
  '22001': ['champ_trop_long', 'Un des champs transmis dépasse la longueur maximale autorisée.'],
  '22003': ['valeur_hors_plage', 'Une des valeurs transmises sort de la plage autorisée.'],
  '22007': ['date_invalide', "Une date transmise est invalide : vérifiez le jour et le format (AAAA-MM-JJ)."],
  '22008': ['date_hors_plage', "La date transmise n'existe pas (ou sort de la plage autorisée)."],
  '2200N': ['valeur_non_autorisee', 'Une des valeurs transmises ne fait pas partie des valeurs autorisées.'],
  '22012': ['division_par_zero', 'Un des montants transmis provoque une division par zéro.'],
  '22013': ['valeur_hors_plage', 'Une des valeurs transmises sort de la plage autorisée.'],
  '22018': ['valeur_non_autorisee', 'Une des valeurs transmises ne fait pas partie des valeurs autorisées.'],
  '22023': ['valeur_hors_plage', 'Une des valeurs transmises sort de la plage autorisée.'],
  '22P02': ['valeur_invalide', "Une des valeurs transmises n'a pas le format attendu (nombre, date, identifiant)."],
  '23502': ['champ_obligatoire_manquant', 'Un champ obligatoire est manquant.'],
  '23514': ['valeur_non_autorisee', 'Une ou plusieurs valeurs transmises ne respectent pas les règles attendues.'],
})

/**
 * Reconnaît une erreur d'entrée. FONCTION PURE (aucun accès réseau, aucune
 * écriture) : c'est elle qui est testée unitairement, et elle est la seule à
 * décider du message montré à l'utilisateur.
 *
 * @param {Error|{code?: string, message?: string}|string} entree
 * @returns {{code: string, message: string, statusHttp: number}|null}
 *          `null` = ce n'est PAS une erreur d'entrée (le 5xx d'origine est
 *          conservé, avec son message).
 */
function analyserErreurEntree(entree) {
  const code = entree && typeof entree === 'object' && entree.code != null ? String(entree.code) : ''
  const message = typeof entree === 'string'
    ? entree
    : String((entree && entree.message) || '')

  if (CODES_CONFLIT.has(code)) {
    const produit = /foreign key/i.test(message) ? 'reference_utilisee' : 'donnee_en_double'
    return produire(produit)
  }
  if (CODES_ENTREE_INVALIDE.has(code)) {
    // Le code SQLSTATE prime : il ne dépend ni de la langue du moteur ni d'un
    // message réécrit par un service intermédiaire.
    const depuisMessage = chercherDansMessage(message)
    if (depuisMessage) return depuisMessage
    const defaut = DEFAUTS_PAR_CODE[code]
    if (defaut) return produire(defaut[0], defaut[1])
    return produire('entree_invalide')
  }
  return chercherDansMessage(message)
}

/** Applique les motifs textuels (aucun code SQLSTATE disponible). */
function chercherDansMessage(message) {
  if (!message) return null
  for (const { motif, code, message: produireMessage } of MOTIFS) {
    const trouve = motif.exec(message)
    if (trouve) return produire(code, produireMessage(trouve))
  }
  return null
}

function produire(code, message) {
  return {
    code,
    message: message || 'Les données transmises sont invalides.',
    statusHttp: CODES_CONFLIT_PRODUITS.has(code) ? 409 : 400,
  }
}

/**
 * Réécrit une réponse 5xx en 400/409 quand — et seulement quand — le message
 * est celui d'une erreur d'entrée. Le corps d'origine est conservé (les routes
 * y mettent souvent un champ `error` métier) : seuls `error` et `message` sont
 * remplacés, plus `details` ajouté pour tracer côté client que la cause est
 * l'entrée envoyée.
 */
function reecrireReponse(corps, codeHttp) {
  // Les routes exposent le message SQL tantôt dans `message`, tantôt dans `error`
  // (`res.status(500).json({ error: err.message })` — forme historique de
  // ce dépôt) : les deux champs sont examinés, sinon la moitié du défaut
  // passerait au travers.
  // ── `details` AUSSI (mesure du 21/09/2026, Red Team RT4-08) ────────────────
  // Le handler d'erreur global répond `{ error: 'Erreur serveur', details:
  // err.message }`. Le message d'entrée était donc dans `details`, champ que
  // cette fonction n'examinait pas — et comme `error` contient toujours
  // « Erreur serveur », examiner `error` AVANT `details` ne suffit pas : c'est
  // le premier champ qui RÉPOND à l'analyse qui doit décider, pas le premier
  // champ non vide. `GET /api/devis/abc` répondait donc 500 « invalid input
  // syntax for type integer: \"NaN\" » sur tous les points d'entrée passant par
  // ce handler.
  const candidats = [corps.message, corps.details, corps.error]
    .filter((valeur) => typeof valeur === 'string' && valeur.length > 0)
  let analyse = null
  for (const candidat of candidats) {
    // Un `code` SQLSTATE éventuellement transmis par la route est prioritaire :
    // il ne dépend pas de la langue du moteur.
    analyse = analyserErreurEntree({ code: corps.code, message: candidat })
    if (analyse) break
  }
  if (!analyse) return null
  const corpsReecrit = {
    ...corps,
    error: analyse.code,
    message: analyse.message,
    // Le code HTTP d'origine n'est PAS reproduit dans le corps : il
    // induirait en erreur (« 500 » annoncé alors que la réponse est 400).
    details: {
      cause: 'donnees_invalides',
      correction: "Corrigez la valeur envoyée puis réessayez — aucun changement n'a été enregistré.",
    },
  }
  return { statusHttp: analyse.statusHttp, corps: corpsReecrit }
}

/**
 * Middleware : enveloppe `res.json` / `res.send` de TOUTE la portée '/api'.
 * À monter avant les routeurs.
 */
function traduireErreursEntree(req, res, next) {
  const jsonOrigine = res.json.bind(res)

  res.json = (corps) => {
    if (res.statusCode >= 500 && corps && typeof corps === 'object' && !Array.isArray(corps)) {
      const reecrit = reecrireReponse(corps, res.statusCode)
      if (reecrit) {
        res.status(reecrit.statusHttp)
        return jsonOrigine(reecrit.corps)
      }
    }
    return jsonOrigine(corps)
  }

  const sendOrigine = res.send.bind(res)
  res.send = (corps) => {
    if (res.statusCode >= 500 && corps && typeof corps === 'object' && !Buffer.isBuffer(corps)
        && !Array.isArray(corps) && typeof corps.pipe !== 'function') {
      const reecrit = reecrireReponse(corps, res.statusCode)
      if (reecrit) {
        res.status(reecrit.statusHttp)
        return sendOrigine(reecrit.corps)
      }
    }
    return sendOrigine(corps)
  }

  next()
}

module.exports = {
  traduireErreursEntree,
  analyserErreurEntree,
  CODES_ENTREE_INVALIDE,
  CODES_CONFLIT,
}
