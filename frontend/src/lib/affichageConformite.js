/* ============================================================================
   affichageConformite.js — CE QUE L'ÉCRAN /conformite MONTRE, PAR MARCHÉ.
   ----------------------------------------------------------------------------
   POURQUOI CE MODULE : deux constats d'audit portaient sur le même écran et le
   même défaut de fond — des libellés FRANÇAIS servis à un cabinet SUISSE :

     • CH-026 — le bloc « 📋 RGPD & Mentions légales » (CGV · CGU · DPA · RGPD)
       était écrit en dur dans la page, pour tous les marchés. Un cabinet suisse
       ne voyait donc AUCUNE mention de son droit (nLPD), et lisait le RGPD, un
       règlement de l'Union européenne qui n'a pas cours chez lui ;
     • CH-039 — les listes de produits restaient françaises (IARD, emprunteur,
       habitation) alors que le cabinet suisse vend des LAMal, des LCA ou des
       LAA.

   RÈGLE : l'écran n'écrit AUCUN fait de marché. Le référentiel vient de l'API
   (`GET /api/conformite/dashboard`, bloc `conformite`), qui le tient de
   `backend/services/referentielConformite` et `referentielProduits`. Le repli
   de cet écran n'est jamais « la valeur française » : c'est un libellé NEUTRE
   (aucune autorité, aucune famille de produits) ou, si l'API a explicitement
   annoncé le marché FR, les libellés historiques français de l'export.

   Aucune valeur réglementaire n'est fabriquée ici : un élément non renseigné
   par le cabinet est affiché comme à renseigner, jamais rempli par une valeur
   plausible. Les fonctions de ce fichier sont PURES (testées par
   `affichageConformite.test.js`) — c'est ce qui permet de prouver, sans
   navigateur, qu'un cabinet suisse reçoit les libellés suisses et un cabinet
   français les libellés français.
   ============================================================================ */

/** Ce qui s'affiche à la place d'une donnée que le cabinet n'a pas renseignée. */
export const A_RENSEIGNER = 'À renseigner par le cabinet'

export const CONFORMITE_NEUTRE = {
  marche: null,
  autorite: null,
  chapeau: 'Registre de conformité · KYC · Mandats · Audit logs · Export',
  checklist_titre: 'Checklist de conformité',
  // Étapes génériques du devoir de conseil : vraies en France comme en
  // Suisse, elles ne nomment ni autorité, ni texte, ni pièce propre à un
  // marché (pas d'IPID, pas de « fiche conseil »).
  checklist_items: [
    'Besoin client exprimé',
    'Devoir de conseil documenté',
    'Documents remis au client',
    'Informations marché transmises',
    'Fiche synthèse signée',
  ],
  export: {
    libelle: 'Exporter le registre de conformité',
    fichier: `registre-conformite-${new Date().getFullYear()}.json`,
    // Aucune route par défaut : sans réponse de l'API on ne sait pas quel
    // registre exporter, et on n'en invente pas un.
    route: null,
  },
}

/**
 * Repli FRANÇAIS — utilisé UNIQUEMENT quand l'API a répondu en annonçant le
 * marché FR (elle seule connaît le pays du cabinet). Il n'est plus le repli
 * par défaut : c'est exactement ce qui faisait apparaître « ACPR » chez un
 * cabinet suisse quand l'API tardait ou échouait.
 */
export const CONFORMITE_DEFAUT_FR = {
  marche: 'FR',
  autorite: 'ACPR',
  chapeau: 'DDA · KYC · Mandats · Audit logs · Export ACPR',
  checklist_titre: 'Checklist DDA (Directive Distribution Assurance)',
  checklist_items: [
    'Besoin client exprimé',
    'Devoir de conseil documenté',
    'Documents remis au client (notice, IPID, fiche conseil)',
    'Informations marché transmises',
    'Fiche synthèse signée',
  ],
  export: {
    libelle: 'Export ACPR',
    fichier: `rapport-acpr-${new Date().getFullYear()}.json`,
    route: '/conformite/export-acpr',
  },
}

/**
 * Référentiel affiché par l'écran.
 *
 * POURQUOI cette fonction : le repli est le point où l'ACPR s'imposait à un
 * cabinet suisse. Ici, le repli français n'est retenu que si l'API a répondu
 * en annonçant `marche: 'FR'` ; dans TOUS les autres cas (API en attente, API
 * en échec, marché CH, marché absent) on affiche un libellé neutre, sans
 * autorité nommée. On ne fabrique jamais un référentiel plausible mais faux.
 */
export function referentielConformite(dashboard) {
  const reponse = dashboard?.conformite
  if (reponse && typeof reponse === 'object') {
    const repli = String(reponse.marche || '').toUpperCase() === 'FR'
      ? CONFORMITE_DEFAUT_FR
      : CONFORMITE_NEUTRE
    return {
      ...repli,
      ...reponse,
      checklist_items: reponse.checklist_items || repli.checklist_items,
      export: { ...repli.export, ...(reponse.export || {}) },
    }
  }
  // Pas de bloc conformite : la seule chose que l'API peut nous avoir dite du
  // marché est `dashboard.marche`. Elle n'a rien dit → neutre.
  return String(dashboard?.marche || '').toUpperCase() === 'FR'
    ? CONFORMITE_DEFAUT_FR
    : CONFORMITE_NEUTRE
}

/**
 * Bloc « protection des données » affiché sous la checklist.
 *
 * Le titre, l'autorité, le texte et la liste des éléments viennent TOUS de
 * l'API (nLPD / PFPDT pour un cabinet suisse, RGPD / CNIL pour un cabinet
 * français). Si l'API n'a rien envoyé, on n'affiche AUCUNE mention : présenter
 * le RGPD à un cabinet suisse par défaut est précisément le défaut corrigé.
 */
export const PROTECTION_DONNEES_ABSENTE = {
  referentiel: null,
  libelle_ecran: '🔒 Protection des données',
  autorite: null,
  autorite_libelle: null,
  resume:
    "Le référentiel de protection des données du cabinet n'a pas pu être chargé : aucune mention n'est affichée, pour ne pas présenter le droit d'un autre marché.",
  pages_legales: [],
  elements: [],
  sources: {},
}

/** Un élément du référentiel : ne renseigne QUE ce que l'API a fourni. */
function elementAffiche(element) {
  const valeur = element && element.valeur != null ? String(element.valeur).trim() : ''
  return {
    cle: element?.cle || '',
    libelle: element?.libelle || '',
    reference: element?.reference || '',
    valeur: valeur || null,
    // Vide ou absente : l'écran le DIT au lieu de remplir. Le champ
    // `a_renseigner` de l'API est honoré, mais un payload sans valeur ne peut
    // pas faire afficher autre chose que « À renseigner par le cabinet ».
    a_renseigner: !valeur,
    texte: valeur || A_RENSEIGNER,
  }
}

/** Bloc de protection des données prêt à afficher (jamais une valeur inventée). */
export function protectionDonneesAffichee(referentiel = {}) {
  const brute = referentiel?.protection_donnees
  if (!brute || typeof brute !== 'object') return PROTECTION_DONNEES_ABSENTE
  return {
    ...PROTECTION_DONNEES_ABSENTE,
    ...brute,
    elements: Array.isArray(brute.elements) ? brute.elements.map(elementAffiche) : [],
    pages_legales: Array.isArray(brute.pages_legales) ? brute.pages_legales : [],
    sources: brute.sources && typeof brute.sources === 'object' ? brute.sources : {},
  }
}

export const PRODUITS_ABSENTS =
  "Le référentiel de produits du marché n'a pas pu être chargé : aucune famille n'est affichée, pour ne pas montrer les produits d'un autre marché."

/**
 * Familles de produits du marché, prêtes à afficher. Sans réponse de l'API, la
 * liste est VIDE : l'écran le dit, il ne retombe pas sur une liste française.
 */
export function produitsAffiches(referentiel = {}) {
  const brute = referentiel?.produits
  const familles = Array.isArray(brute?.familles)
    ? brute.familles.filter((f) => f && typeof f.libelle === 'string' && f.libelle.trim() !== '')
      .map((f) => ({ code: f.code || '', libelle: f.libelle.trim() }))
    : []
  return {
    marche: brute?.marche || referentiel?.marche || null,
    pays: brute?.pays || null,
    familles,
    mots_cles: Array.isArray(brute?.mots_cles) ? brute.mots_cles.filter((m) => typeof m === 'string' && m.trim()) : [],
    note: typeof brute?.note === 'string' ? brute.note : '',
    disponible: familles.length > 0,
    message_indisponible: PRODUITS_ABSENTS,
  }
}

/** Sigle de la checklist : « DDA » n'a de sens que sur le marché français. */
export function sigleChecklist(referentiel = {}) {
  return String(referentiel?.marche || '').toUpperCase() === 'FR' ? 'DDA' : null
}
