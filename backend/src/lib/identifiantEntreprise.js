/**
 * identifiantEntreprise.js — L'IDENTIFIANT D'ENTREPRISE D'UN MARCHÉ, ET SON NOM.
 *
 * POURQUOI CE MODULE (défaut P3 CH-038, mesuré le 21/09/2026)
 * `routes/opportunites.js` injectait dans le prompt d'argumentaire la ligne
 * « SIRET: 123… (professionnel) » pour TOUS les cabinets, y compris suisses. Le
 * SIRET est un identifiant FRANÇAIS : un cabinet suisse n'en a pas, ses clients
 * non plus (le registre suisse est la FINMA, l'identifiant d'entreprise est
 * l'IDE, c'est-à-dire le numéro UID). Servir « SIRET » à un cabinet suisse est
 * une référence étrangère gratuite — et un champ qui n'existe pas.
 *
 * LA RÈGLE
 *   • France : « SIRET », lu dans `clients.siret` ;
 *   • Suisse : « IDE (UID) » — et comme `clients` ne porte AUCUNE colonne pour
 *     l'IDE d'un client (vérifié en production : `clients` n'a que `siret`,
 *     `country` et `cabinet_id`), la ligne est OMISE au lieu d'afficher un
 *     SIRET français ou un champ vide. Aucune valeur n'est inventée : le jour
 *     où la colonne existe, `ligneIdentifiantEntreprise` la servira sous le bon
 *     libellé sans rien changer ailleurs.
 */

const LIBELLES = Object.freeze({
  FR: Object.freeze({ libelle: 'SIRET', colonne: 'siret' }),
  CH: Object.freeze({ libelle: 'IDE (UID)', colonne: 'uid' }),
})

/** Libellé du marché ('SIRET' en France, 'IDE (UID)' en Suisse). */
function libelleIdentifiantEntreprise(marche) {
  return (String(marche || '').toUpperCase() === 'CH' ? LIBELLES.CH : LIBELLES.FR).libelle
}

/** Colonne qui porte l'identifiant d'entreprise du marché. */
function colonneIdentifiantEntreprise(marche) {
  return (String(marche || '').toUpperCase() === 'CH' ? LIBELLES.CH : LIBELLES.FR).colonne
}

/**
 * Ligne d'identification prête à être injectée dans un prompt, ou `''`.
 *
 * @param {'CH'|'FR'} marche marché du CABINET
 * @param {Object} ligne ligne client (ou toute ligne portant la colonne du marché)
 * @returns {string} ex. « SIRET: 123 456 789 00012 (professionnel) », sinon ''
 */
function ligneIdentifiantEntreprise(marche, ligne = {}) {
  const { libelle, colonne } = String(marche || '').toUpperCase() === 'CH' ? LIBELLES.CH : LIBELLES.FR
  const valeur = String((ligne || {})[colonne] ?? '').trim()
  return valeur ? `${libelle}: ${valeur} (professionnel)` : ''
}

module.exports = {
  LIBELLES,
  libelleIdentifiantEntreprise,
  colonneIdentifiantEntreprise,
  ligneIdentifiantEntreprise,
}
