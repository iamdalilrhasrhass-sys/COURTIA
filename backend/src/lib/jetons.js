/**
 * jetons.js — LES JETONS À USAGE UNIQUE NE SONT JAMAIS STOCKÉS EN CLAIR.
 *
 * POURQUOI CE MODULE (défaut P3 SEC-027, mesuré en production le 20/09/2026)
 * `users.password_reset_token` (models/User.js) et `document_requests.token`
 * (routes/documentInbox.js) étaient écrits EN CLAIR dans la base. Une lecture de
 * la base (sauvegarde, dump, accès en lecture d'un prestataire, une injection
 * SQL ailleurs) donnait donc immédiatement le pouvoir de :
 *   * réinitialiser le mot de passe de N'IMPORTE QUEL compte (et donc de s'y
 *     connecter) pendant la fenêtre de validité du jeton ;
 *   * déposer des pièces dans le dossier d'un client via un lien de collecte.
 * Un jeton est un mot de passe : il se stocke haché, comme un mot de passe.
 *
 * POURQUOI SHA-256 SANS SEL NI COÛT (et non bcrypt) : ces jetons sont produits
 * par `crypto.randomBytes` — 256 bits d'entropie réelle, ce qui rend toute
 * attaque par dictionnaire ou par force brute hors de portée. Le hachage n'a
 * donc pas à être lent (le coût de bcrypt n'apporterait rien contre un espace
 * de recherche de 2^256) et il DOIT rester déterministe : on doit pouvoir
 * retrouver la ligne à partir du jeton présenté, en une seule requête indexée.
 * Un sel par ligne rendrait cette recherche impossible sans parcourir la table.
 *
 * PORTÉE : le jeton en clair n'existe qu'à deux endroits — dans la réponse HTTP
 * au moment de sa création, et dans l'e-mail qui le porte. Jamais en base.
 */

const crypto = require('crypto');

/** Longueur minimale d'un jeton pour être considéré comme « à forte entropie ». */
const LONGUEUR_JETON = 32;

/**
 * Hachage déterministe d'un jeton (hexadécimal, 64 caractères).
 * @param {string} jeton le jeton présenté par l'appelant
 * @returns {string|null} le hachage, ou `null` si l'entrée n'est pas un jeton
 */
function hachageJeton(jeton) {
  const brut = String(jeton || '').trim();
  if (brut.length < LONGUEUR_JETON) return null;
  return crypto.createHash('sha256').update(brut, 'utf8').digest('hex');
}

/**
 * Un jeton ressemble-t-il au HACHAGE d'un jeton (64 caractères hexadécimaux) ?
 * Sert uniquement à la TRANSITION : les lignes écrites avant ce correctif
 * contiennent encore un jeton en clair. Les reconnaître permet de continuer à
 * honorer un lien de collecte en cours sans rouvrir la faille pour les nouveaux.
 */
function estHachage(jeton) {
  return /^[0-9a-f]{64}$/i.test(String(jeton || '').trim());
}

/**
 * Clause SQL de recherche d'une demande de pièces par jeton.
 *
 * POURQUOI DEUX VALEURS ET PAS UNE (transition, 20/09/2026) : les lignes écrites
 * AVANT ce correctif contiennent encore le jeton EN CLAIR ; les nouvelles
 * contiennent son hachage. Continuer à reconnaître l'ancienne forme évite de
 * casser un lien de collecte déjà envoyé à un client (qui perdrait son dépôt de
 * pièces en cours), tout en n'écrivant PLUS JAMAIS de jeton en clair. Les
 * colonnes `document_requests.token` des lignes anciennes restent donc lisibles
 * par quiconque lit la base — c'est la raison pour laquelle cette tolérance est
 * bornée aux liens déjà émis et expirés sous 72 h, et qu'aucun nouveau jeton
 * n'est concerné.
 *
 * @param {string} colonne colonne SQL du jeton (ex. `dr.token`)
 * @param {number} depart indice du premier paramètre ($n)
 * @returns {{sql: string, params: Array, suivant: number}}
 */
function clauseJetonRecherche(colonne, jeton, depart = 1) {
  const empreinte = hachageJeton(jeton);
  if (!empreinte) {
    // Jeton non conforme : une seule valeur, qui ne peut PAS correspondre à un
    // jeton en clair (les jetons en clair font au moins LONGUEUR_JETON).
    return { sql: `${colonne} = $${depart}`, params: [jeton], suivant: depart + 1 };
  }
  return {
    sql: `(${colonne} = $${depart} OR ${colonne} = $${depart + 1})`,
    params: [empreinte, String(jeton || '').trim()],
    suivant: depart + 2,
  };
}

module.exports = { hachageJeton, estHachage, clauseJetonRecherche, LONGUEUR_JETON };
