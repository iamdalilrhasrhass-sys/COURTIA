/**
 * devise.js — une seule règle de devise pour tout le backend.
 *
 * COURTIA sert deux marchés : la France (euros) et la Suisse (francs suisses).
 * Un montant imprimé sur un document client, dans un e-mail ou une notification
 * doit porter la devise du cabinet — jamais celle du développeur.
 *
 * Règle : le marché se déduit du pays du cabinet ; à défaut, l'euro reste la
 * valeur par défaut (comportement historique pour la France, inchangé).
 */

/** Marché ('CH' ou 'FR') à partir d'un pays, d'un registre ou d'une devise. */
function marcheDepuis(source = {}) {
  const pays = String(source.pays || source.country || source.market || '').trim().toUpperCase()
  if (pays === 'CH' || pays === 'CHE' || pays === 'SUISSE' || pays === 'SWITZERLAND' || pays === 'CHF') return 'CH'
  const registre = String(source.registre_type || '').trim().toUpperCase()
  if (registre.includes('FINMA')) return 'CH'
  const devise = String(source.devise || source.currency || '').trim().toUpperCase()
  if (devise === 'CHF') return 'CH'
  return 'FR'
}

function devise(marche = 'FR') {
  return String(marche).toUpperCase() === 'CH' ? 'CHF' : 'EUR'
}

/** Symbole affiché : « CHF » pour la Suisse, « € » pour la France. */
function symbole(marche = 'FR') {
  return String(marche).toUpperCase() === 'CH' ? 'CHF' : '€'
}

/** Nombre formaté selon la locale du marché (1'234.50 en Suisse, 1 234,50 en France). */
function nombre(valeur, marche = 'FR', decimales = 2) {
  const n = Number(valeur)
  if (!Number.isFinite(n)) return '—'
  const locale = String(marche).toUpperCase() === 'CH' ? 'fr-CH' : 'fr-FR'
  return n.toLocaleString(locale, { minimumFractionDigits: decimales, maximumFractionDigits: decimales })
}

/** « 1'234.50 CHF » ou « 1 234,50 € ». Renvoie « — » si la valeur est absente. */
function fmtMontant(valeur, marche = 'FR', decimales = 2) {
  if (valeur === null || valeur === undefined || valeur === '') return '—'
  const n = Number(valeur)
  if (!Number.isFinite(n)) return '—'
  return `${nombre(n, marche, decimales)} ${symbole(marche)}`
}

module.exports = { marcheDepuis, devise, symbole, nombre, fmtMontant }
