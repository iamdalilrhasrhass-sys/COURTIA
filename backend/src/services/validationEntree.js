/**
 * validationEntree.js — VALIDER UNE ENTRÉE AVANT DE LA DONNER À POSTGRESQL.
 *
 * POURQUOI (Red Team P1 #4, mesuré en production le 20/09/2026)
 *   POST /api/taches {"echeance":"2026-02-31T99:99:99Z"}  → 500
 *   POST /api/accounting/entries (montants NaN)            → 500
 *                     « invalid input syntax for type integer: "NaN" »
 * Ces valeurs sont REFUSÉES par PostgreSQL — mais après avoir traversé le
 * service, avec un message de moteur SQL en guise de diagnostic. Une date qui
 * n'existe pas est une erreur de SAISIE : elle doit être refusée en 400, avec
 * un message qui dit quel champ corriger. Ici, aucune donnée n'est inventée :
 * on refuse, on ne remplace jamais par une valeur par défaut silencieuse.
 */

/** Erreur d'entrée : porte le code HTTP attendu par la route. */
class ErreurEntree extends Error {
  constructor(message, { champ = null, code = 'validation_error' } = {}) {
    super(message)
    this.name = 'ErreurEntree'
    this.statusCode = 400
    this.champ = champ
    this.code = code
  }
}

/**
 * Date réellement existante ?
 *
 * POURQUOI CE N'EST PAS `new Date(valeur)` : JavaScript « rattrape » les jours
 * inexistants — `new Date('2026-02-31')` donne le 3 mars 2026 sans broncher. Le
 * jour est donc vérifié composant par composant. Un horaire impossible
 * (`T99:99:99Z`) rend `Date.parse` invalide, ce qui est détecté ensuite.
 *
 * @param {*} valeur
 * @returns {Date|null|false} Date valide, `null` si la valeur est vide,
 *          `false` si la valeur est présente mais inexistante.
 */
function dateValide(valeur) {
  if (valeur === null || valeur === undefined || valeur === '') return null
  if (valeur instanceof Date) return Number.isFinite(valeur.getTime()) ? valeur : false

  const texte = String(valeur).trim()
  if (!texte) return null

  // Partie date d'un ISO 8601 (AAAA-MM-JJ), suivie ou non d'une heure.
  const partieDate = texte.match(/^(\d{4})-(\d{2})-(\d{2})(?:$|[T ])/)
  if (partieDate) {
    const annee = Number(partieDate[1])
    const mois = Number(partieDate[2])
    const jour = Number(partieDate[3])
    const controle = new Date(Date.UTC(annee, mois - 1, jour))
    if (controle.getUTCFullYear() !== annee || controle.getUTCMonth() !== mois - 1 || controle.getUTCDate() !== jour) {
      return false
    }
  }

  const horodatage = Date.parse(texte)
  return Number.isFinite(horodatage) ? new Date(horodatage) : false
}

/**
 * Entier fini (accepte « 1 200 », « 1200.00 »). `null` si absent.
 * `false` si la valeur est présente mais n'est pas un entier exploitable —
 * `NaN`, « abc » et l'infini sont refusés (PostgreSQL les refuse aussi, mais
 * avec un message SQL que l'utilisateur ne peut pas comprendre).
 */
function entierValide(valeur, { min = null, max = null } = {}) {
  if (valeur === null || valeur === undefined || valeur === '') return null
  if (typeof valeur === 'boolean') return false
  const nombre = typeof valeur === 'number'
    ? valeur
    : Number(String(valeur).replace(/\s/g, '').replace(',', '.'))
  if (!Number.isFinite(nombre) || !Number.isInteger(nombre)) return false
  if (min !== null && nombre < min) return false
  if (max !== null && nombre > max) return false
  return nombre
}

/** Chaîne non vide obligatoire. Renvoie `null` si absente/vide. */
function texteObligatoire(valeur, { max = null } = {}) {
  if (valeur === null || valeur === undefined) return null
  const texte = String(valeur).trim()
  if (!texte) return null
  if (max !== null && texte.length > max) return false
  return texte
}

module.exports = { ErreurEntree, dateValide, entierValide, texteObligatoire }
