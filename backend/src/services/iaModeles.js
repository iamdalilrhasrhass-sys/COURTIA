/**
 * iaModeles.js — SOURCE UNIQUE des identifiants de modèles IA du produit.
 *
 * RÈGLE ABSOLUE : « un modèle retiré = un chemin IA cassé ».
 * Un identifiant de modèle qui n'existe pas (ou qui a été retiré du catalogue
 * du fournisseur) ne provoque PAS un repli silencieux : il fait échouer l'appel
 * avec une erreur d'authentification ou « model not found » incompréhensible
 * pour l'utilisateur, et la fonctionnalité concernée devient morte sans que
 * personne ne le voie. On ne code donc JAMAIS un identifiant de modèle dans un
 * service : tout passe par les constantes ci-dessous, et toute surcharge par
 * variable d'environnement est VALIDÉE avant usage (voir modeleDepuisEnv).
 *
 * Historique des identifiants morts remplacés ici (audit IA-006) :
 *   - claude-haiku-4-5-20250514  → n'a jamais existé (Haiku 4.5 = 2025-10-01)
 *   - claude-3-5-opus-20241022   → n'a jamais existé (Opus 3.5 jamais publié)
 *   - claude-3-haiku-20240307    → retiré le 20/04/2026
 *   - claude-3-5-haiku-20241022  → retiré le 19/02/2026
 *
 * @module iaModeles
 */

const logger = require('../lib/logger')

/**
 * Modèles courants et valides, avec leur tarif (USD par million de tokens).
 * Toute entrée ajoutée ici doit être vérifiée auprès du fournisseur AVANT.
 */
const MODELES = {
  // Texte / analyse
  'claude-sonnet-5': { input: 2.00, output: 10.00 },
  'claude-opus-5': { input: 5.00, output: 25.00 },
  'claude-haiku-4-5-20251001': { input: 1.00, output: 5.00 },
  // Génération précédente, encore prise en charge
  'claude-sonnet-4-5-20250929': { input: 3.00, output: 15.00 },
  'claude-opus-4-5-20251101': { input: 5.00, output: 25.00 },
  'claude-opus-4-1-20250805': { input: 15.00, output: 75.00 },
}

/**
 * Alias officiels acceptés en entrée : un alias est résolu vers un identifiant
 * daté avant tout enregistrement en base (les KPI de coût restent cohérents).
 */
const ALIASES = {
  'claude-haiku-4-5': 'claude-haiku-4-5-20251001',
  'claude-sonnet-4-5': 'claude-sonnet-4-5-20250929',
  'claude-opus-4-5': 'claude-opus-4-5-20251101',
  'claude-opus-4-1': 'claude-opus-4-1-20250805',
}

/** Modèle par défaut (tâches rédactionnelles et d'analyse courantes). */
const MODELE_DEFAUT = 'claude-sonnet-5'
/** Secours quand le modèle principal est surchargé ou en limite de débit. */
const MODELE_SECOURS = 'claude-haiku-4-5-20251001'
/** Tâches légères / courtes (briefs, résumés, classification). */
const MODELE_LEGER = 'claude-haiku-4-5-20251001'
/** Analyse d'images et de documents. */
const MODELE_VISION = 'claude-sonnet-5'
/** Requêtes lourdes (plans payants) — jamais un modèle inexistant. */
const MODELE_ANALYSE = 'claude-opus-5'

/** Résout un alias vers son identifiant daté (sans validation d'existence). */
function resoudreAlias(modele) {
  if (typeof modele !== 'string') return modele
  const propre = modele.trim()
  return ALIASES[propre] || propre
}

/** Vrai si l'identifiant (ou son alias) correspond à un modèle connu et valide. */
function estModeleValide(modele) {
  const resolu = resoudreAlias(modele)
  return Object.prototype.hasOwnProperty.call(MODELES, resolu)
}

/** Tarif { input, output } en USD / million de tokens, ou null si inconnu. */
function tarifModele(modele) {
  const resolu = resoudreAlias(modele)
  return MODELES[resolu] || null
}

/** Liste des identifiants valides (datés). */
function listerModeles() {
  return Object.keys(MODELES)
}

/**
 * Lit une variable d'environnement de surcharge de modèle en la VALIDANT.
 * Un identifiant inconnu ou retiré est refusé et remplacé par le défaut :
 * on ne laisse jamais une variable d'environnement périmée casser un chemin IA.
 */
function modeleDepuisEnv(nomVariable, defaut = MODELE_DEFAUT) {
  const brut = process.env[nomVariable]
  if (!brut) return defaut
  if (estModeleValide(brut)) return resoudreAlias(brut)
  logger.warn(
    { variable: nomVariable, modele_demande: brut, modele_applique: defaut },
    'Modèle IA inconnu ou retiré : surcharge ignorée (un modèle retiré = un chemin IA cassé)'
  )
  return defaut
}

/** Coût en USD d'un appel, 0 si le modèle n'est pas dans la table tarifaire. */
function coutAppelUsd(modele, inputTokens = 0, outputTokens = 0) {
  const tarif = tarifModele(modele)
  if (!tarif) return 0
  const cout = (Number(inputTokens) / 1000000) * tarif.input + (Number(outputTokens) / 1000000) * tarif.output
  return parseFloat(cout.toFixed(6))
}

module.exports = {
  MODELES,
  ALIASES,
  MODELE_DEFAUT,
  MODELE_SECOURS,
  MODELE_LEGER,
  MODELE_VISION,
  MODELE_ANALYSE,
  resoudreAlias,
  estModeleValide,
  tarifModele,
  listerModeles,
  modeleDepuisEnv,
  coutAppelUsd,
}
