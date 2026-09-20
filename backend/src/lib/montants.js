/**
 * montants.js — UNE SEULE RÈGLE POUR TOUT MONTANT ÉCRIT OU AGRÉGÉ.
 *
 * POURQUOI CE MODULE (défaut P0 mesuré le 20/09/2026 sur un cabinet d'audit suisse)
 *   • `POST /api/contrats {"prime_annuelle":"abc"}` répondait 201 : la chaîne
 *     était acceptée telle quelle dans `quotes.quote_data`, puis une agrégation
 *     (`quote_data->>'prime_annuelle'` casté en `numeric`) faisait tomber en 500
 *     la liste des clients, le reporting et le cockpit du cabinet ENTIER. Une
 *     seule saisie fautive cassait tous les écrans.
 *   • `prime_annuelle: -2000` était accepté et le total de primes du cockpit
 *     DIMINUAIT : un montant négatif n'est pas une prime.
 *   • `prime_annuelle: 99999999999999` était accepté : une prime de cent mille
 *     milliards rendait les KPI absurdes.
 *
 * DEUX DÉFENSES, PARCE QU'UNE SEULE NE SUFFIT PAS
 *   1. À L'ÉCRITURE — `montantOuNull` refuse explicitement (400) un montant non
 *      numérique, négatif ou au-delà du plafond, à la création COMME à la
 *      modification d'un contrat ou d'un devis.
 *   2. À LA LECTURE — `montantSur` n'caste JAMAIS une valeur dont la forme n'est
 *      pas garantie : les KPI, listes et totaux ignorent la ligne fautive au
 *      lieu de tomber en 500. Défense nécessaire pour les données DÉJÀ écrites
 *      avant la règle (aucune n'est effacée) et pour tout autre chemin d'écriture.
 *
 * PLAFOND RETENU : 10 000 000 (dix millions) en unités de devise, hors taxes.
 * Justification : la prime annuelle la plus élevée plausible pour un particulier
 * ou une PME est de l'ordre de quelques centaines de milliers ; les seuls
 * contrats au-delà (grands risques, flottes, valeurs assurées exceptionnelles)
 * sont saisis au niveau du groupe, pas par une prime annuelle unitaire. Dix
 * millions laisse une marge de deux ordres de grandeur sans laisser passer les
 * valeurs qui font déborder les totaux d'un rapport. Le plafond est exposé dans
 * `PLAFOND_MONTANT` et accepté en paramètre : une exception se documente, elle
 * ne se contourne pas en désactivant la validation.
 */

/** Plafond par défaut d'un montant saisi (10 000 000 HT, unités de devise). */
const PLAFOND_MONTANT = 10_000_000

/** Motifs de refus, nommés : l'appelant peut les tester sans lire un message. */
const MOTIFS = Object.freeze({
  NON_NUMERIQUE: 'montant_non_numerique',
  NEGATIF: 'montant_negatif',
  HORS_PLAFOND: 'montant_hors_plafond',
})

function formaterPlafond(plafond) {
  return Number(plafond).toLocaleString('fr-FR')
}

/**
 * Analyse un montant saisi. Accepte les écritures réelles d'un courtier :
 * `1450.5`, `1450,5`, `1 450.50`, `1'450.50` (séparateur suisse), `+120`. Refuse
 * tout le reste (`abc`, `12abc`, `1e5`, `NaN`, `Infinity`, tableau…).
 *
 * @param {*} valeur valeur brute reçue de l'API
 * @param {{plafond?: number}} [options]
 * @returns {{ok: true, valeur: number|null}
 *          |{ok: false, motif: string, message: string, plafond?: number}}
 */
function montantOuNull(valeur, options = {}) {
  const plafond = Number.isFinite(options.plafond) ? Number(options.plafond) : PLAFOND_MONTANT
  if (valeur === undefined || valeur === null) return { ok: true, valeur: null }
  if (typeof valeur === 'object') {
    return { ok: false, motif: MOTIFS.NON_NUMERIQUE, message: 'Un montant doit être un nombre.' }
  }

  // Espaces (y compris insécables), apostrophes suisses de milliers : nettoyés
  // car ce sont des séparateurs d'écriture, pas des chiffres.
  const brut = String(valeur).trim().replace(/[\s\u00a0\u202f']/g, '')
  if (brut === '') return { ok: true, valeur: null }

  // Une écriture « nombre » STRICTE : aucun symbole de devise, aucun exposant,
  // aucun caractère parasite. `parseFloat` aurait accepté « 12abc » et « 1e5 ».
  if (!/^[+-]?\d+(?:[.,]\d+)?$/.test(brut)) {
    return {
      ok: false,
      motif: MOTIFS.NON_NUMERIQUE,
      message: `« ${String(valeur).trim().slice(0, 40)} » n'est pas un montant : saisissez des chiffres (ex. 1450.50 ou 1'450,50).`,
    }
  }

  const nombre = Number(brut.replace(',', '.'))
  if (!Number.isFinite(nombre)) {
    return { ok: false, motif: MOTIFS.NON_NUMERIQUE, message: "Ce montant n'est pas un nombre exploitable." }
  }
  if (nombre < 0) {
    return {
      ok: false,
      motif: MOTIFS.NEGATIF,
      message: `Un montant négatif (${nombre}) n'a pas de sens ici : une prime ou un total est positif ou nul.`,
    }
  }
  if (nombre > plafond) {
    return {
      ok: false,
      motif: MOTIFS.HORS_PLAFOND,
      plafond,
      message: `Montant au-delà du plafond autorisé (${formaterPlafond(plafond)}) : ${nombre}. Vérifiez la saisie.`,
    }
  }
  // Arrondi au centime : `numeric` en base et les totaux en centimes supposent
  // deux décimales au maximum.
  return { ok: true, valeur: Math.round(nombre * 100) / 100 }
}

/**
 * Même règle, mais un montant est EXIGÉ (non vide) : utilisé là où une absence
 * silencieuse serait un faux succès (ex. total d'un devis à finaliser).
 */
function montantExige(valeur, options = {}) {
  const verdict = montantOuNull(valeur, options)
  if (!verdict.ok) return verdict
  if (verdict.valeur === null) {
    return { ok: false, motif: MOTIFS.NON_NUMERIQUE, message: 'Un montant est requis.' }
  }
  return verdict
}

/**
 * Erreur prête à renvoyer en 400, au format des routes métier.
 * @example res.status(400).json(erreurMontant('prime_annuelle', verdict))
 */
function erreurMontant(champ, verdict) {
  return {
    error: 'montant_invalide',
    motif: verdict && verdict.motif,
    champ,
    message: (verdict && verdict.message) || 'Montant invalide.',
    ...(verdict && verdict.motif === MOTIFS.HORS_PLAFOND ? { plafond: verdict.plafond } : {}),
  }
}

/**
 * Expression SQL qui ne caste un montant JSON QUE s'il a la forme d'un nombre.
 *
 * POURQUOI : `(quote_data->>'prime_annuelle')::numeric` lève
 * « invalid input syntax for type numeric: "abc" » et fait tomber toute la
 * requête — donc l'écran entier. Une valeur illisible doit être IGNORÉE par
 * l'agrégat (NULL), pas interrompre la lecture du cabinet. C'est le seul repli
 * acceptable : il réduit la donnée, il ne l'invente pas.
 *
 * @param {string} alias alias de la table `quotes` (ex. 'q')
 * @param {string} [champ] clé JSON du montant (défaut : prime_annuelle)
 * @returns {string} fragment SQL évalué à `numeric` ou NULL
 */
function montantSur(alias, champ = 'prime_annuelle') {
  const texte = `${alias}.quote_data->>'${champ}'`
  return `(CASE WHEN ${texte} ~ '^[[:space:]]*[+-]?[0-9]+([.,][0-9]+)?[[:space:]]*$'`
    + ` THEN replace(NULLIF(${texte}, ''), ',', '.')::numeric END)`
}

module.exports = {
  PLAFOND_MONTANT,
  MOTIFS,
  montantOuNull,
  montantExige,
  erreurMontant,
  montantSur,
}
