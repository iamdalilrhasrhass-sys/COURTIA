/**
 * donneesReelles.js — Garde-fous de provenance des données.
 *
 * Deux règles produit, non négociables :
 *
 * 1. UNE OFFRE SANS PROVENANCE EST UNE OFFRE SIMULÉE.
 *    Seules trois provenances sont réelles : 'manual' (saisie par le courtier),
 *    'imported' (import de devis existants), 'api' (retour d'un connecteur
 *    assureur réel). Tout le reste — champ absent, `null`, 'simulation',
 *    'connector_stub', 'demo'… — est simulé et ne doit JAMAIS produire un
 *    document client (PDF) ni un e-mail client.
 *
 * 2. UNE PROJECTION N'EST PAS UN MONTANT RÉEL.
 *    Un « revenu potentiel » estimé par un LLM est une invention : il n'est
 *    jamais stocké ni sommé dans un KPI. Le potentiel reste NULL et
 *    l'interface n'affiche rien (« — ») jusqu'à ce qu'il soit recalculable
 *    depuis des enregistrements réels (quotes / quote_results).
 *
 * @module donneesReelles
 */

/** Provenances considérées comme réelles. */
const SOURCES_REELLES = Object.freeze(['manual', 'imported', 'api'])

/** Libellé utilisateur expliquant un refus d'offre simulée. */
const MESSAGE_OFFRES_SIMULEES =
  'Ces offres sont des simulations : aucun tarif réel n\'a été obtenu auprès d\'un assureur. '
  + 'Elles ne peuvent pas être transformées en document ou en e-mail destiné au client. '
  + 'Rattachez un devis réel (saisie manuelle, import ou retour d\'API assureur) pour continuer.'

/** Vrai si la provenance transmise est une provenance réelle. */
function sourceEstReelle(source) {
  return typeof source === 'string' && SOURCES_REELLES.includes(source.trim().toLowerCase())
}

/** Vrai si l'offre porte une provenance réelle explicite. */
function estOffreReelle(offre) {
  return Boolean(offre) && typeof offre === 'object' && sourceEstReelle(offre.source)
}

/**
 * Sépare des offres en { reelles, refusees }.
 * Une offre non-objet ou sans provenance est refusée.
 */
function partitionnerOffres(offres) {
  const reelles = []
  const refusees = []
  for (const offre of Array.isArray(offres) ? offres : []) {
    if (estOffreReelle(offre)) reelles.push(offre)
    else refusees.push(offre)
  }
  return { reelles, refusees }
}

/**
 * Valide une sélection d'offres destinée à un document client.
 * @returns {{ok: boolean, reelles: Array, refusees: Array, fournisseurs_refuses: string[]}}
 */
function validerOffresPourClient(offres) {
  const { reelles, refusees } = partitionnerOffres(offres)
  return {
    ok: refusees.length === 0 && reelles.length > 0,
    reelles,
    refusees,
    fournisseurs_refuses: refusees
      .map((o) => (o && (o.provider || o.libelle || o.insurer)) || 'offre sans provenance')
      .filter(Boolean),
  }
}

/**
 * Potentiel commercial monétaire.
 *
 * Un « revenu potentiel » est une PROJECTION : il ne peut être affiché que
 * s'il se recalcule depuis des montants réellement enregistrés. Sans données
 * réelles transmises, la fonction renvoie `null` (l'écran affiche « — »), et
 * jamais le chiffre proposé par un modèle de langage.
 *
 * @param {Object} donnees { quotes: [...], quote_results: [...] }
 * @returns {number|null}
 */
function potentielDepuisDonneesReelles(donnees = null) {
  if (!donnees || typeof donnees !== 'object') return null
  const montants = []
  const ajouter = (valeur) => {
    const n = Number(valeur)
    if (Number.isFinite(n) && n > 0) montants.push(n)
  }
  for (const q of Array.isArray(donnees.quotes) ? donnees.quotes : []) {
    ajouter(q && (q.prime_annuelle ?? q.premium ?? q.prime_ttc))
  }
  for (const r of Array.isArray(donnees.quote_results) ? donnees.quote_results : []) {
    ajouter(r && (r.premium_annual ?? r.premium_annuelle ?? r.premium))
  }
  if (montants.length === 0) return null
  const moyenne = montants.reduce((s, v) => s + v, 0) / montants.length
  return Math.round(moyenne * 100) / 100
}

module.exports = {
  SOURCES_REELLES,
  MESSAGE_OFFRES_SIMULEES,
  sourceEstReelle,
  estOffreReelle,
  partitionnerOffres,
  validerOffresPourClient,
  potentielDepuisDonneesReelles,
}
