/**
 * referentielConformite.js — LE VOCABULAIRE RÉGLEMENTAIRE SUIT LE PAYS DU CABINET.
 *
 * POURQUOI CE FICHIER (P2 #6 de la Red Team, mesuré en production le 20/09/2026)
 * L'écran /conformite d'un cabinet SUISSE affichait « DDA · KYC · Mandats ·
 * Audit logs · Export ACPR » et un bouton « Export ACPR ». L'ACPR est
 * l'autorité de contrôle prudentiel FRANÇAISE : elle n'a aucune compétence en
 * Suisse. L'écran annonçait donc au courtier suisse une obligation française
 * inexistante, et proposait un export vers un régulateur qui n'est pas le sien.
 * Le même libellé était écrit en dur à deux endroits (chapeau de page + bouton),
 * donc toute correction partielle laissait l'incohérence visible.
 *
 * LA RÈGLE
 * Un seul module décide du vocabulaire de conformité, à partir du marché du
 * cabinet — le même marché que celui utilisé pour les documents (FINMA / ORIAS).
 * Le marché se déduit du profil (`broker_profiles`) : `pays` d'abord, puis la
 * `langue` (de/it ⇒ Suisse), puis le `registre_type` (FINMA ⇒ Suisse). À
 * défaut de tout indice, on reste en FRANÇAIS : c'est le comportement
 * historique, et surtout on ne bascule JAMAIS un cabinet français vers un
 * référentiel étranger sur une donnée manquante.
 *
 * CE QU'ON N'INVENTE PAS
 * Pour la Suisse, aucun format d'export réglementaire n'est défini ici : le
 * bouton s'appelle donc « Export du registre de conformité » (le contenu est le
 * registre de conformité du cabinet, tel qu'il existe déjà) et JAMAIS « Export
 * ACPR », ni « Export FINMA » — on ne prétend pas produire un dépôt officiel
 * dont le format n'est pas spécifié.
 */

// ─────────────────────────────────────────────────────────────────────────────
// LE MARCHÉ VIENT DE `lib/marcheCabinet` (RÈGLE UNIQUE DU PRODUIT)
//
// POURQUOI : le marché (pays, registre, autorité) caractérise le CABINET, pas
// la personne connectée. Un second calcul « depuis broker_profiles » ferait
// diverger deux écrans du même cabinet (le propriétaire en CHF, son
// collaborateur en €). Ce module ne décide donc PAS du marché : il en dérive
// seulement le vocabulaire de conformité, à partir du verdict de
// `lib/marcheCabinet` (cabinet d'abord, profil en repli). Le `require` est
// tolérant : si ce module venait à manquer (base de code partielle), on
// retombe sur la lecture du profil, jamais sur un référentiel étranger.
// ─────────────────────────────────────────────────────────────────────────────
let marcheCabinet = null
try {
  marcheCabinet = require('../lib/marcheCabinet')
} catch (_err) {
  marcheCabinet = null
}

// ─────────────────────────────────────────────────────────────────────────────
// LES FAMILLES DE PRODUITS VIENNENT DE `services/referentielProduits`
//
// POURQUOI : les listes de produits restaient françaises pour un cabinet suisse
// (constat d'audit CH-039 : « les listes restent françaises même pour un
// cabinet suisse »). Une famille de produits n'est PAS une traduction : IARD et
// LAMal n'ont pas d'équivalent d'un marché à l'autre. Le référentiel produits
// est donc une table par marché, et c'est ici — la seule source du vocabulaire
// de conformité d'un cabinet — qu'elle est rattachée à la réponse servie à
// l'écran. Le `require` est tolérant, comme celui du marché : si ce module
// manquait (base de code partielle), on ne sert AUCUNE famille plutôt qu'une
// liste d'un autre marché.
// ─────────────────────────────────────────────────────────────────────────────
let referentielProduits = null
try {
  referentielProduits = require('./referentielProduits')
} catch (_err) {
  referentielProduits = null
}


/**
 * Libellé d'autorité de tutelle, jamais l'ACPR pour un cabinet suisse.
 * Délègue à `lib/marcheCabinet.autoritePour` quand il est disponible (une seule
 * règle pour tout le produit), sinon applique la même règle localement.
 */
function autoriteLibelle(marche, tutelle = '') {
  // SUISSE : le nom de l'autorité vient de la loi, jamais d'un champ libre.
  // Un libellé saisi par un administrateur (« ACPR (champ libre) ») ne doit
  // JAMAIS pouvoir s'afficher sur l'écran d'un cabinet suisse — c'est
  // exactement le défaut mesuré (une autorité française sans compétence).
  if (String(marche).toUpperCase() === 'CH') return MARCHES.CH.autorite_libelle
  if (marcheCabinet && typeof marcheCabinet.autoritePour === 'function') {
    return marcheCabinet.autoritePour(marche, tutelle)
  }
  const existante = String(tutelle || '').trim()
  if (existante && !/^ACPR$/i.test(existante)) return existante
  return 'ACPR'
}

const MARCHES = Object.freeze({
  FR: Object.freeze({
    code: 'FR',
    pays: 'France',
    autorite: 'ACPR',
    autorite_libelle: 'ACPR — Autorité de contrôle prudentiel et de résolution',
    registre: 'ORIAS — registre unique des intermédiaires en assurance',
    // Cadre de protection des données du marché. C'est un texte de loi, pas un
    // libellé d'écran : il est repris tel quel par les rapports (le RGPD est un
    // règlement de l'Union européenne, il ne s'applique pas à un cabinet suisse).
    donnees: 'RGPD — Règlement (UE) 2016/679',
    // Chapeau de page : identique au libellé historique pour la France.
    chapeau: 'DDA · KYC · Mandats · Audit logs · Export ACPR',
    checklist_titre: 'Checklist DDA (Directive Distribution Assurance)',
    // ───────────────────────────────────────────────────────────────────────────
    // MENTIONS DE PROTECTION DES DONNÉES DU MARCHÉ (constat d'audit CH-026)
    //
    // POURQUOI : l'écran /conformite affichait « 📋 RGPD & Mentions légales »
    // avec sa liste CGV/CGU/DPA/RGPD à TOUS les cabinets, y compris suisses. Le
    // texte ci-dessous est le MÊME qu'avant pour la France (RGPD, CNIL, pages
    // légales du footer) : rien n'a été retiré ni reformulé, il est seulement
    // devenu une donnée du marché au lieu d'un littéral de la page.
    //
    // CE QUI N'EST JAMAIS FAIT : remplir un élément à la place du cabinet. Les
    // `elements` ci-dessous sont les informations que le cabinet doit pouvoir
    // documenter ; leur `valeur` reste `null` tant que le cabinet ne les a pas
    // renseignées, et l'écran affiche alors explicitement « À renseigner par le
    // cabinet » — jamais une durée de conservation, un sous-traitant ou une
    // localisation plausibles mais faux.
    // ───────────────────────────────────────────────────────────────────────────
    protection_donnees: Object.freeze({
      referentiel: 'RGPD',
      libelle_ecran: '📋 RGPD & Mentions légales',
      autorite: 'CNIL',
      autorite_libelle: 'CNIL — Commission nationale de l’informatique et des libertés',
      resume: 'Toutes les pages légales sont accessibles depuis le footer public.',
      pages_legales: Object.freeze(['Mentions légales', 'CGV', 'CGU', 'Politique de confidentialité', 'DPA', 'RGPD', 'Sous-traitants']),
      sources: Object.freeze({
        cnil: 'https://www.cnil.fr',
        rgpd: 'https://eur-lex.europa.eu/eli/reg/2016/679/oj',
      }),
      elements: Object.freeze([
        Object.freeze({ cle: 'finalites', libelle: 'Finalités du traitement', reference: 'RGPD, art. 13, § 1, let. c' }),
        Object.freeze({ cle: 'categories_donnees', libelle: 'Catégories de données personnelles traitées', reference: 'RGPD, art. 13 et art. 14' }),
        Object.freeze({ cle: 'duree_conservation', libelle: 'Durée de conservation (ou critères qui la déterminent)', reference: 'RGPD, art. 13, § 2, let. a' }),
        Object.freeze({ cle: 'droits_personne', libelle: 'Droits de la personne concernée (accès, rectification, effacement, opposition)', reference: 'RGPD, art. 13, § 2, let. b et c' }),
        Object.freeze({ cle: 'sous_traitants', libelle: 'Sous-traitants et destinataires des données', reference: 'RGPD, art. 28, et art. 13, § 1, let. e' }),
        Object.freeze({ cle: 'localisation_donnees', libelle: 'Localisation des données et transferts hors Union européenne', reference: 'RGPD, art. 13, § 1, let. f, et art. 44 et suivants' }),
      ]),
    }),
    export: Object.freeze({
      libelle: 'Export ACPR',
      prefixe_fichier: 'rapport-acpr',
      route: '/conformite/export-acpr',
      sources: Object.freeze({ acpr: 'https://acpr.banque-france.fr', orias: 'https://www.orias.fr' }),
      legal: 'Document généré pour exigences ACPR / DDA — usage interne courtier.',
    }),
  }),
  CH: Object.freeze({
    code: 'CH',
    pays: 'Suisse',
    autorite: 'FINMA',
    autorite_libelle: "FINMA — Autorité fédérale de surveillance des marchés financiers",
    registre: "Registre des intermédiaires d'assurance tenu par la FINMA (référence : numéro UID/IDE du cabinet)",
    // Le cadre de protection des données suisse — jamais le RGPD, qui est un
    // règlement de l'Union européenne et n'a pas cours en Suisse.
    donnees: 'nLPD — nouvelle loi fédérale sur la protection des données',
    // Aucune obligation française n'est citée : DDA est une directive
    // européenne transposée en droit français, l'ACPR n'a pas de compétence
    // en Suisse. Le vocabulaire reste descriptif.
    chapeau: 'Registre de conformité · KYC · Mandats · Audit logs · Export du registre de conformité',
    // Aucune directive française n'est citée pour un cabinet suisse : le
    // titre reste descriptif de ce que le cabinet doit réunir.
    checklist_titre: 'Checklist de conformité du cabinet',
    // ───────────────────────────────────────────────────────────────────────────
    // MENTIONS SUISSES DE PROTECTION DES DONNÉES (constat d'audit CH-026)
    //
    // POURQUOI : l'écran /conformite n'avait AUCUNE mention suisse. Le cabinet
    // suisse lisait « 📋 RGPD & Mentions légales · CGV · CGU · DPA · RGPD » alors
    // que le RGPD est un règlement de l'Union européenne : ce n'est pas SON
    // droit, et la liste des pages de la plateforme ne lui dit pas ce qu'il doit
    // pouvoir documenter sous la nLPD. Les éléments ci-dessous sont ceux qu'un
    // cabinet doit réunir, chacun rattaché au texte qui les prévoit.
    //
    // AUCUNE VALEUR RÉGLEMENTAIRE N'EST INVENTÉE. Aucune durée de conservation,
    // aucun sous-traitant, aucun pays d'hébergement n'est écrit ici : ces
    // informations dépendent du cabinet. Tant qu'il ne les a pas renseignées,
    // l'écran affiche « À renseigner par le cabinet ». Si l'écran affichait une
    // durée plausible, elle serait fausse ET présentée comme la sienne.
    //
    // Le nom de l'autorité est celui de la loi (PFPDT), jamais un champ libre —
    // même règle que pour l'autorité de tutelle.
    // ───────────────────────────────────────────────────────────────────────────
    protection_donnees: Object.freeze({
      referentiel: 'nLPD',
      libelle_ecran: '📋 nLPD & protection des données',
      autorite: 'PFPDT',
      autorite_libelle: 'PFPDT — Préposé fédéral à la protection des données et à la transparence',
      entree_en_vigueur: '1er septembre 2023',
      resume: "Sous la nLPD (en vigueur depuis le 1er septembre 2023), votre cabinet doit pouvoir documenter les éléments ci-dessous. COURTIA n'en présume aucun : ce qui n'est pas renseigné est indiqué comme tel. Les pages légales de la plateforme restent accessibles depuis le footer public.",
      pages_legales: Object.freeze(['Mentions légales', 'CGV', 'CGU', 'Politique de confidentialité', 'DPA', 'Sous-traitants']),
      sources: Object.freeze({
        lpd: 'https://www.fedlex.admin.ch/eli/cc/2022/491/fr',
        pfpdt: 'https://www.edoeb.admin.ch/fr',
        confederation: 'https://www.kmu.admin.ch/fr/nouvelle-loi-sur-la-protection-des-donnees-nlpd',
      }),
      elements: Object.freeze([
        Object.freeze({ cle: 'finalites', libelle: 'Finalités du traitement', reference: 'LPD, art. 12, al. 2, et art. 19, al. 2' }),
        Object.freeze({ cle: 'categories_donnees', libelle: 'Catégories de données personnelles traitées', reference: 'LPD, art. 12, al. 2, et art. 19, al. 3' }),
        Object.freeze({ cle: 'duree_conservation', libelle: 'Durée de conservation (ou critères qui la déterminent)', reference: 'LPD, art. 12, al. 2' }),
        Object.freeze({ cle: 'droits_personne', libelle: 'Droits de la personne concernée (accès, rectification, effacement)', reference: 'LPD, art. 25 et art. 32' }),
        Object.freeze({ cle: 'sous_traitants', libelle: 'Sous-traitants et destinataires des données', reference: 'LPD, art. 12, et art. 19, al. 2, let. c' }),
        Object.freeze({ cle: 'localisation_donnees', libelle: 'Localisation des données et communication à l’étranger', reference: 'LPD, art. 16 et art. 17, et art. 19, al. 4' }),
      ]),
    }),
    export: Object.freeze({
      libelle: 'Export du registre de conformité',
      prefixe_fichier: 'registre-conformite',
      route: '/conformite/export-registre',
      sources: Object.freeze({ finma: 'https://www.finma.ch' }),
      // Aucune autorité étrangère n'est NOMMÉE ici (même pour dire qu'elle ne
      // s'applique pas) : un écran suisse ne doit citer aucun régulateur
      // français. On ne présume aucune obligation suisse non plus.
      legal: "Document de travail interne du cabinet (registre de conformité). Aucun référentiel d'un autre pays ne s'applique, et aucune obligation au-delà du registre du cabinet n'est présumée.",
    }),
  }),
})

/**
 * Ramène un pays / une langue / un registre libre vers un marché connu.
 * FONCTION PURE — testée unitairement.
 */
function normaliserMarche(valeur) {
  const v = String(valeur || '').trim().toLowerCase()
  if (!v) return null
  if (['ch', 'che', 'sui', 'suisse', 'switzerland', 'swiss', 'sz'].includes(v)) return 'CH'
  if (['fr', 'fra', 'france', 'français', 'francais'].includes(v)) return 'FR'
  if (v.startsWith('ch') || v.startsWith('suisse') || v.startsWith('switz')) return 'CH'
  if (v.startsWith('fr') || v.startsWith('france')) return 'FR'
  return null
}

/**
 * Marché d'un profil de cabinet. `pays` prime, puis la langue (allemand /
 * italien ⇒ Suisse), puis le registre (FINMA ⇒ Suisse). Défaut : 'FR'.
 *
 * @param {{pays?: string, langue?: string, registre_type?: string}} profil
 * @returns {'FR'|'CH'}
 */
function marcheDuProfil(profil = {}) {
  const depuisPays = normaliserMarche(profil.pays || profil.country)
  if (depuisPays) return depuisPays

  const langue = String(profil.langue || profil.language || '').trim().toLowerCase()
  if (['de', 'de-ch', 'it', 'it-ch', 'gsw'].includes(langue)) return 'CH'

  if (String(profil.registre_type || '').toUpperCase().includes('FINMA')) return 'CH'
  return 'FR'
}

/**
 * MENTIONS DE PROTECTION DES DONNÉES DU MARCHÉ — fonction PURE (testée).
 *
 * `valeurs` permet de rattacher, plus tard, ce que le cabinet a réellement
 * déclaré (par clé d'élément : finalites, duree_conservation, …). Ce qui n'est
 * pas fourni reste `null` avec le statut `a_renseigner` : l'écran affiche alors
 * « À renseigner par le cabinet ». On ne remplit JAMAIS un élément manquant par
 * une valeur plausible — c'est la règle qui protège le cabinet d'une déclaration
 * fausse présentée comme la sienne.
 *
 * @param {'FR'|'CH'|string} marche
 * @param {Record<string, string|number|null|undefined>} [valeurs]
 */
function protectionDonneesDuMarche(marche = 'FR', valeurs = {}) {
  const code = normaliserMarche(marche) || 'FR'
  const base = (MARCHES[code] || MARCHES.FR).protection_donnees
  const fournies = valeurs && typeof valeurs === 'object' ? valeurs : {}
  return {
    referentiel: base.referentiel,
    // Libellé du texte : `donnees` du marché (source unique du cadre applicable).
    referentiel_libelle: MARCHES[code === 'CH' ? 'CH' : 'FR'].donnees,
    libelle_ecran: base.libelle_ecran,
    autorite: base.autorite,
    autorite_libelle: base.autorite_libelle,
    ...(base.entree_en_vigueur ? { entree_en_vigueur: base.entree_en_vigueur } : {}),
    resume: base.resume,
    pages_legales: [...base.pages_legales],
    sources: { ...base.sources },
    elements: base.elements.map((element) => {
      const brut = fournies[element.cle]
      const valeur = brut === undefined || brut === null ? null : String(brut).trim()
      return {
        cle: element.cle,
        libelle: element.libelle,
        reference: element.reference,
        valeur: valeur || null,
        // Libellé affiché pour un élément non renseigné : l'écran n'a rien à
        // décider lui-même, il affiche ce champ.
        a_renseigner: !valeur,
        statut: valeur ? 'renseigne' : 'a_renseigner',
      }
    }),
  }
}

/**
 * Familles de produits du marché. Délègue à `services/referentielProduits`
 * (source unique). S'il est indisponible, on renvoie une liste VIDE — jamais
 * les familles d'un autre marché : un cabinet suisse ne doit pas se voir
 * proposer « IARD » parce qu'un module manquait.
 *
 * @param {'FR'|'CH'|string} marche
 */
function produitsDuMarche(marche = 'FR') {
  if (!referentielProduits || typeof referentielProduits.produitsDuMarche !== 'function') {
    return { marche: normaliserMarche(marche) || 'FR', pays: null, familles: [], mots_cles: [], note: '' }
  }
  return referentielProduits.produitsDuMarche(normaliserMarche(marche) || 'FR')
}

/**
 * Libellés de conformité du marché. `options.tutelle_authority` (colonne
 * `cabinets.tutelle_authority`) permet à un cabinet français d'imposer son
 * propre libellé d'autorité — jamais pour le marché suisse, où le nom de
 * l'autorité vient de la loi, pas d'un champ libre.
 *
 * @param {'FR'|'CH'|string} marche
 * @param {{tutelle_authority?: string, valeurs_protection_donnees?: object}} [options]
 */
function libellesConformite(marche = 'FR', options = {}) {
  const code = normaliserMarche(marche) || 'FR'
  const base = MARCHES[code] || MARCHES.FR
  const tutelle = options.tutelle_authority

  return {
    marche: code,
    pays: base.pays,
    // Code court d'autorité ('FINMA' / 'ACPR') et libellé long : l'écran n'a
    // jamais à traduire lui-même un référentiel.
    autorite: base.autorite,
    autorite_libelle: autoriteLibelle(code, tutelle),
    registre: base.registre,
    // Cadre de protection des données du marché ('RGPD …' / 'nLPD …').
    donnees: base.donnees,
    chapeau: base.chapeau,
    checklist_titre: base.checklist_titre,
    // Mentions de protection des données du marché : nLPD (finalités, catégories
    // de données, durée de conservation, droits, sous-traitants, localisation)
    // pour un cabinet suisse, RGPD / CNIL pour un cabinet français. Les éléments
    // non renseignés par le cabinet sont servis avec `a_renseigner: true` — la
    // page ne fabrique aucune valeur réglementaire.
    protection_donnees: protectionDonneesDuMarche(code, options.valeurs_protection_donnees),
    // Familles de produits réellement pratiquées sur le marché du cabinet : la
    // liste n'est PAS celle du marché français pour un cabinet suisse.
    produits: produitsDuMarche(code),
    export: {
      libelle: base.export.libelle,
      fichier: `${base.export.prefixe_fichier}-${new Date().getFullYear()}.json`,
      route: base.export.route,
      sources: base.export.sources,
      legal: base.export.legal,
    },
  }
}

/**
 * Profil du cabinet pour la conformité : pays / langue / registre (+ tutelle
 * déclarée). Passe par `broker_profiles`, seule source du marché dans COURTIA.
 * Une lecture impossible ne change RIEN au produit : on retombe sur la France.
 *
 * @param {object} pool pool `pg`
 * @param {number} userId identifiant du cabinet / courtier
 */
async function chargerProfilConformite(pool, userId) {
  const vide = { pays: null, langue: null, registre_type: null, tutelle_authority: null }
  if (!pool || !userId) return vide
  try {
    const { rows } = await pool.query(
      `SELECT bp.pays, bp.langue, bp.registre_type, c.tutelle_authority
         FROM broker_profiles bp
         LEFT JOIN cabinets c ON c.created_by = bp.user_id
        WHERE bp.user_id = $1
        LIMIT 1`,
      [userId]
    )
    return rows[0] || vide
  } catch (_) {
    // Table ou colonne absente (base non migrée) : marché français, libellé
    // historique — jamais un référentiel étranger par accident.
    return vide
  }
}

/** Marché du cabinet, lu en base. Défaut 'FR'. */
async function chargerMarcheCabinet(pool, userId) {
  return marcheDuProfil(await chargerProfilConformite(pool, userId))
}

/**
 * Libellés pour une REQUÊTE HTTP : le marché vient du CABINET (règle unique
 * `lib/marcheCabinet`), puis du profil de l'appelant en repli, puis de la
 * France. Tous les membres d'un même cabinet reçoivent donc le même écran.
 *
 * @param {object} req  requête Express (porte `req.user`)
 * @param {{pool?: object, userId?: number}} [options]
 */
async function libellesDeLaRequete(req, options = {}) {
  const pool = options.pool || null
  const userId = options.userId || (req && req.user && (req.user.userId || req.user.id)) || null

  // Le profil sert de repli ET de source du libellé de tutelle déclaré par un
  // cabinet français (`cabinets.tutelle_authority`).
  const profil = await chargerProfilConformite(pool, userId)

  let marche = null
  if (marcheCabinet && typeof marcheCabinet.marcheDeLaRequete === 'function') {
    try {
      // POURQUOI UNE FONCTION ET NON LE POOL : `marcheCabinet.lecteur()` renvoie
      // `source.query` TEL QUEL quand on lui passe un objet pool. Détachée de son
      // instance, `Pool.query` perd `this` et lève un TypeError que le module
      // absorbe : la résolution retombait alors sur « aucun signal » et un
      // cabinet suisse était affiché en ACPR. On lui passe donc un appelant lié
      // — c'est la seule forme que ce module consomme correctement.
      const lecteur = pool ? (sql, params) => pool.query(sql, params) : undefined
      const verdict = await marcheCabinet.marcheDeLaRequete(req, lecteur)
      // Un verdict « defaut_* » signifie qu'aucune donnée n'a pu être lue (aucun
      // cabinet, aucun profil) : il ne vaut pas décision, on retombe sur la
      // lecture directe du profil pour ne pas afficher un marché par défaut.
      const source = String((verdict && verdict.source) || '')
      if (verdict && verdict.marche && !source.startsWith('defaut_')) marche = verdict.marche
    } catch (_err) {
      marche = null // repli profil ci-dessous : jamais un référentiel inventé
    }
  }
  if (!marche) marche = marcheDuProfil(profil)

  return libellesConformite(marche, { tutelle_authority: profil.tutelle_authority })
}

module.exports = {
  MARCHES,
  autoriteLibelle,
  libellesDeLaRequete,
  normaliserMarche,
  marcheDuProfil,
  libellesConformite,
  // Mentions de protection des données et familles de produits du marché :
  // exportées pour être testées et réutilisées (rapports, PDF, écrans), sans
  // qu'un second module ne réinvente la table.
  protectionDonneesDuMarche,
  produitsDuMarche,
  chargerProfilConformite,
  chargerMarcheCabinet,
}
