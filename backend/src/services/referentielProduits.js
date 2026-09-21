/**
 * referentielProduits.js — LES FAMILLES DE PRODUITS SUIVENT LE MARCHÉ DU CABINET.
 *
 * POURQUOI CE FICHIER (constat d'audit CH-039)
 * Les listes de produits et les mots-clés métier du produit étaient FRANÇAIS
 * pour tout le monde : un cabinet suisse se voyait proposer « IARD »,
 * « emprunteur », « multirisque habitation » — des familles de produits du
 * marché français — alors que ses contrats portent des LAMal, des LCA, des LAA
 * ou des LPP. Aucune traduction n'existe entre ces marchés : ce sont des
 * familles de produits DIFFÉRENTES, pas les mêmes mots dans une autre langue.
 *
 * LA RÈGLE
 * Une seule source décide des familles de produits par marché. Le marché vient
 * de `lib/marcheCabinet` (le cabinet, jamais l'utilisateur connecté) via
 * `services/referentielConformite`, qui l'expose dans le référentiel déjà servi
 * par `GET /api/conformite/dashboard` — aucune route en double n'est ajoutée.
 *
 * CE QU'ON N'INVENTE PAS
 * Les libellés ci-dessous sont des FAMILLES DE PRODUITS réellement pratiquées
 * sur le marché visé (LAMal, LCA, LAA, LPP, 3e pilier, RC ménage, casco,
 * voyage… pour la Suisse ; IARD, santé, prévoyance, emprunteur, auto,
 * habitation… pour la France). Aucun produit d'assureur, aucune garantie,
 * aucun taux, aucun plafond n'est cité : ce fichier ne dit PAS ce que ces
 * contrats couvrent. Une famille dont le libellé n'était pas certain n'a pas
 * été ajoutée — mieux vaut une famille en moins qu'un produit inventé.
 */

/**
 * Une famille = un code stable (pour un futur filtrage/rapprochement) + un
 * libellé court, tel qu'un courtier du marché le dirait.
 */
const FAMILLES = Object.freeze({
  FR: Object.freeze([
    Object.freeze({ code: 'iard', libelle: 'Assurance IARD (incendie, accidents, risques divers)' }),
    Object.freeze({ code: 'auto', libelle: 'Assurance automobile' }),
    Object.freeze({ code: 'habitation', libelle: 'Assurance habitation (multirisque habitation)' }),
    Object.freeze({ code: 'sante', libelle: 'Complémentaire santé' }),
    Object.freeze({ code: 'prevoyance', libelle: 'Prévoyance (décès, invalidité, incapacité)' }),
    Object.freeze({ code: 'emprunteur', libelle: 'Assurance emprunteur' }),
    Object.freeze({ code: 'vie_epargne', libelle: 'Assurance vie et épargne' }),
    Object.freeze({ code: 'rc_professionnelle', libelle: 'Responsabilité civile professionnelle' }),
    Object.freeze({ code: 'protection_juridique', libelle: 'Protection juridique' }),
    Object.freeze({ code: 'collective', libelle: 'Santé et prévoyance collectives (contrats d’entreprise)' }),
  ]),
  CH: Object.freeze([
    Object.freeze({ code: 'maladie_base', libelle: 'Assurance-maladie de base (LAMal)' }),
    Object.freeze({ code: 'complementaire_lca', libelle: 'Assurances complémentaires (LCA)' }),
    Object.freeze({ code: 'accidents_laa', libelle: 'Assurance-accidents (LAA)' }),
    Object.freeze({ code: 'prevoyance_professionnelle', libelle: 'Prévoyance professionnelle (LPP)' }),
    Object.freeze({ code: 'prevoyance_liee_3a', libelle: 'Prévoyance individuelle liée (pilier 3a)' }),
    Object.freeze({ code: 'vie', libelle: 'Assurance-vie' }),
    Object.freeze({ code: 'rc_menage', libelle: 'Responsabilité civile ménage' }),
    Object.freeze({ code: 'vehicule', libelle: 'Véhicule à moteur (responsabilité civile, casco)' }),
    Object.freeze({ code: 'voyage', libelle: 'Assurance voyage' }),
    Object.freeze({ code: 'protection_juridique', libelle: 'Protection juridique' }),
  ]),
})

/** Mots-clés métier du marché (recherche, classement, rapprochement de libellés). */
const MOTS_CLES = Object.freeze({
  FR: Object.freeze([
    'IARD', 'auto', 'habitation', 'santé', 'prévoyance', 'emprunteur',
    'assurance vie', 'RC professionnelle', 'protection juridique',
  ]),
  CH: Object.freeze([
    'LAMal', 'LCA', 'LAA', 'LPP', '3e pilier', 'pilier 3a', 'ménage',
    'casco', 'voyage', 'protection juridique',
  ]),
})

/**
 * Mention affichée avec la liste : elle dit ce que le référentiel contient
 * (des familles) et ce qu'il ne contient pas (les contrats et garanties d'un
 * assureur, qui relèvent du cabinet et de ses partenaires).
 */
const NOTE = "Familles de produits d'assurance pratiquées sur ce marché. COURTIA ne liste ni assureur, ni garantie, ni tarif : ces éléments viennent du cabinet et de ses partenaires."

const PAYS = Object.freeze({ FR: 'France', CH: 'Suisse' })

/** Normalise un marché : tout ce qui n'est pas 'CH' reste 'FR' (comportement historique). */
function normaliser(marche) {
  return String(marche || '').toUpperCase() === 'CH' ? 'CH' : 'FR'
}

/**
 * Référentiel produits d'un marché. FONCTION PURE — testée unitairement.
 *
 * @param {'FR'|'CH'|string} marche
 * @returns {{marche:'FR'|'CH', pays:string, familles:{code:string,libelle:string}[],
 *            mots_cles:string[], note:string}}
 */
function produitsDuMarche(marche = 'FR') {
  const code = normaliser(marche)
  return {
    marche: code,
    pays: PAYS[code],
    // Copies de surface : un appelant ne peut pas muter le référentiel partagé.
    familles: (FAMILLES[code] || FAMILLES.FR).map((f) => ({ code: f.code, libelle: f.libelle })),
    mots_cles: [...(MOTS_CLES[code] || MOTS_CLES.FR)],
    note: NOTE,
  }
}

/** Libellés des familles du marché (liste simple, pour un champ de formulaire). */
function libellesProduits(marche = 'FR') {
  return produitsDuMarche(marche).familles.map((f) => f.libelle)
}

module.exports = {
  FAMILLES,
  MOTS_CLES,
  NOTE,
  produitsDuMarche,
  libellesProduits,
}
