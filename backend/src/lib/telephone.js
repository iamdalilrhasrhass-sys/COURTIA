/**
 * telephone.js — UNE SEULE RÈGLE DE NORMALISATION DES NUMÉROS DE TÉLÉPHONE.
 *
 * POURQUOI CE MODULE EXISTE (défaut P0 CH-008, mesuré le 21/09/2026)
 * Deux services normalisaient chacun de leur côté, et tous deux convertissaient
 * tout numéro commençant par `0` vers `+33` :
 *     sanitizePhone('078 123 45 67')  →  '+33781234567'
 * Un mobile suisse (10 chiffres, `0XX XXX XX XX`) devenait donc un numéro
 * FRANÇAIS inexistant : les SMS et WhatsApp de relance partaient vers un tiers
 * ou échouaient. La règle fautive « suisse = 9 caractères » (`/^0\d{8}$/`)
 * décrivait un plan de numérotation qui n'existe pas : un numéro suisse
 * s'écrit sur **10 caractères**, exactement comme un numéro français
 * (`0X XX XX XX XX`).
 *
 * LA RÈGLE, ET POURQUOI ELLE NE DEVINE JAMAIS
 *   • `+41…`, `+33…`, `0041…`, `0033…` : le pays est DANS le numéro — il est
 *     conservé tel quel (normalisé en E.164), quelle que soit la fiche client ;
 *   • `33XXXXXXXXX` / `41XXXXXXXXX` sans `+` : l'indicatif EST le pays — pas une
 *     supposition, c'est la forme composée à l'international ;
 *   • `0XXXXXXXXX` (national, 10 chiffres) : cette forme est **ambiguë**. Un
 *     mobile français `06 12 34 56 78` et un mobile suisse `078 123 45 67` ont
 *     la même longueur et le même préfixe de tranche ; aucun préfixe ne permet
 *     de trancher (`078…` se lit aussi `07 81…` en France, `061…` se lit aussi
 *     `061 234…` à Bâle). Sans pays connu, la fonction REFUSE de normaliser :
 *     mieux vaut ne rien normaliser (l'envoi est refusé avec un motif clair)
 *     que de faire partir un message vers un numéro faux — c'est exactement le
 *     défaut mesuré. Le pays vient donc de l'APPELANT : `pays` du client
 *     (`clients.country`) ou, à défaut, marché du CABINET
 *     (`lib/marcheCabinet`), jamais d'une supposition sur les chiffres.
 *
 * Utilisé par `services/smsService.js` et
 * `services/whatsappBusinessService.js` (une seule règle pour les deux canaux).
 */

/** Plans de numérotation servis par le produit. */
const INDICATIFS = Object.freeze({
  FR: Object.freeze({
    code: 'FR',
    pays: 'France',
    indicatif: '+33',
    national: '0X XX XX XX XX',
    exemple: '06 12 34 56 78',
  }),
  CH: Object.freeze({
    code: 'CH',
    pays: 'Suisse',
    indicatif: '+41',
    national: '0XX XXX XX XX',
    exemple: '078 123 45 67',
  }),
})

/** `'CH' | 'FR' | null` — accepte « Suisse », « CH », « switzerland », « chf »… */
function normaliserPays(valeur) {
  const v = String(valeur ?? '').trim().toLowerCase()
  if (!v) return null
  if (['ch', 'che', 'sui', 'suisse', 'switzerland', 'swiss', 'sz', 'chf'].includes(v)) return 'CH'
  if (['fr', 'fra', 'france', 'français', 'francais', 'eur', 'euro', 'euros'].includes(v)) return 'FR'
  if (v.startsWith('ch') || v.startsWith('suisse') || v.startsWith('switz') || v.startsWith('schweiz')) return 'CH'
  if (v.startsWith('fr') || v.startsWith('france')) return 'FR'
  return null
}

/** Plan de numérotation d'un pays (`'CH'` par défaut si le pays est inconnu ? non : FR). */
function planTelephone(pays) {
  return INDICATIFS[normaliserPays(pays) || 'FR']
}

/**
 * Aide de prompt : le format attendu du marché, pour qu'un prompt IA ne demande
 * jamais « au format français » à un cabinet suisse.
 */
function formatsTelephone(pays) {
  const plan = planTelephone(pays)
  const adjectif = plan.code === 'CH' ? 'suisse' : 'français'
  return `E.164 (${plan.indicatif}…) ou national ${adjectif} (${plan.national})`
}

/**
 * Numéro E.164 (`'+41 78 123 45 67'` saisi → `'+41781234567'`), ou `null`
 * quand le numéro n'est pas exploitable EN TOUTE SÉCURITÉ.
 *
 * @param {string} telephone numéro saisi (espaces, points, tirets, parenthèses acceptés)
 * @param {{pays?: string, country?: string, marche?: string}} [options] pays du
 *        CLIENT (`clients.country`) ou, à défaut, marché de son cabinet.
 * @returns {string|null} E.164, ou `null` : vide, trop court, invalide, ou
 *        national SANS pays connu (ambigu — jamais deviné).
 */
function normaliserTelephone(telephone, options = {}) {
  if (telephone === null || telephone === undefined) return null
  const brut = String(telephone).trim()
  if (!brut) return null

  const pays = normaliserPays(options.pays ?? options.country ?? options.marche ?? options.market)

  // Séparateurs de saisie uniquement (espaces — y compris insécables — points,
  // tirets, parenthèses, barres obliques). Aucun chiffre n'est retiré.
  const chiffres = brut.replace(/[\s.\-()/\\'’]/g, '').replace(/[^\d+]/g, '')
  if (!chiffres) return null

  // « 0041… » / « 0033… » : préfixe international de composition.
  let nettoye = chiffres.startsWith('00') ? `+${chiffres.slice(2)}` : chiffres

  // « +33 (0)6 12 34 56 78 » : le 0 de transit intercalé après l'indicatif ne
  // fait pas partie du numéro. Il était conservé (`+330612345678`) et le numéro
  // partait invalide.
  nettoye = nettoye.replace(/^\+(\d{2})0/, '+$1')

  // Déjà international : le pays du numéro fait foi, on ne le réécrit JAMAIS.
  if (nettoye.startsWith('+')) {
    return /^\+[1-9]\d{7,14}$/.test(nettoye) ? nettoye : null
  }

  // Numéro national : 0 + 9 chiffres, en France COMME en Suisse (10 caractères).
  if (nettoye.startsWith('0')) {
    // Ni 9 ni 11 chiffres : ce n'est pas un numéro national français ou suisse.
    if (!/^0\d{9}$/.test(nettoye)) return null
    // Ambigu (voir l'en-tête) : sans pays, on refuse explicitement.
    if (!pays) return null
    return `${INDICATIFS[pays].indicatif}${nettoye.slice(1)}`
  }

  // Forme composée à l'international sans « + » : « 41… » est le pays du numéro,
  // pas une devinette (un mobile suisse `41 78 123 45 67`).
  if (/^(33|41)[1-9]\d{8}$/.test(nettoye)) return `+${nettoye}`

  // Tout le reste (chiffres sans indicatif ni 0 national) serait une supposition
  // de pays : refusé.
  return null
}

module.exports = {
  INDICATIFS,
  normaliserPays,
  planTelephone,
  formatsTelephone,
  normaliserTelephone,
}
