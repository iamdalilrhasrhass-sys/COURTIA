/**
 * motDePasseInitial.js — normalisation du mot de passe initial d'un cabinet.
 *
 * RÈGLE MÉTIER (décision du 20/09/2026) : le mot de passe initial remis à un
 * cabinet est le NOM DU CABINET, première lettre en majuscule, sans espace ni
 * caractère spécial — « Century Finance » → « CenturyFinance », « Spondeo Sàrl »
 * → « Spondeo ».
 *
 * POURQUOI UNE FONCTION ET PAS UNE CHAÎNE EN DUR : les cabinets à venir doivent
 * obtenir la même convention sans qu'on y pense à chaque fois, et les cas sales
 * (« Cabinet Dupont & Fils », « L'Assurance », « SARL MARTIN ») doivent être
 * traités de façon prévisible. La valeur exacte peut toujours être imposée par
 * l'appelant : la dérivation n'est qu'un défaut.
 */

// Formes juridiques retirées du nom : elles ne font pas partie du nom usuel du
// cabinet (« Spondeo Sàrl » se dit « Spondeo »).
const FORMES_JURIDIQUES = [
  'sarl', 'sàrl', 's.a.r.l', 's.a.r.l.', 'sa', 's.a', 's.a.',
  'gmbh', 'ag', 'sas', 'sasu', 'eurl', 'snc', 'sci', 'scs', 'sca',
  'ltd', 'limited', 'llc', 'inc', 'corp', 'plc', 'sagl', 'holding',
];

// Longueur minimale exigée par le produit pour un mot de passe CHOISI par un
// client (register / reset). Le mot de passe initial remis par l'exploitant n'y
// est pas soumis — « Spondeo » ne fait que 7 caractères — mais l'écart est
// signalé pour ne pas le découvrir après coup.
const LONGUEUR_MINIMALE = 8;

function echapperPourRegex(texte) {
  return texte.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Dérive le mot de passe initial depuis le nom du cabinet.
 * @param {string} nomCabinet
 * @returns {string|null} null si aucun nom exploitable n'est fourni.
 */
function motDePasseInitialDepuisCabinet(nomCabinet) {
  if (typeof nomCabinet !== 'string') return null;
  let nom = nomCabinet.normalize('NFC').trim();
  if (!nom) return null;

  // Retrait des formes juridiques, en mot entier et insensible à la casse,
  // avec les séparateurs qui peuvent les entourer (« , SARL », « - SA »).
  for (const forme of FORMES_JURIDIQUES) {
    const motif = new RegExp(
      `(^|[\\s,.\\-–—()])${echapperPourRegex(forme)}(?=$|[\\s,.\\-–—()])`,
      'gi'
    );
    nom = nom.replace(motif, ' ');
  }

  // Ne garder que les lettres et les chiffres : espaces, apostrophes, tirets,
  // « & », points… disparaissent (« Cabinet Dupont & Fils » → CabinetDupontFils).
  nom = nom.replace(/[^\p{L}\p{N}]+/gu, '');
  if (!nom) return null;

  return nom.charAt(0).toUpperCase() + nom.slice(1);
}

/**
 * Le mot de passe respecte-t-il la longueur exigée des mots de passe CHOISIS ?
 * @param {string} motDePasse
 * @returns {boolean}
 */
function longueurSuffisante(motDePasse) {
  return typeof motDePasse === 'string' && motDePasse.length >= LONGUEUR_MINIMALE;
}

module.exports = {
  motDePasseInitialDepuisCabinet,
  longueurSuffisante,
  LONGUEUR_MINIMALE,
};
