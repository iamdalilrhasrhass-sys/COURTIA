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
    // Chapeau de page : identique au libellé historique pour la France.
    chapeau: 'DDA · KYC · Mandats · Audit logs · Export ACPR',
    checklist_titre: 'Checklist DDA (Directive Distribution Assurance)',
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
    // Aucune obligation française n'est citée : DDA est une directive
    // européenne transposée en droit français, l'ACPR n'a pas de compétence
    // en Suisse. Le vocabulaire reste descriptif.
    chapeau: 'Registre de conformité · KYC · Mandats · Audit logs · Export du registre de conformité',
    // Aucune directive française n'est citée pour un cabinet suisse : le
    // titre reste descriptif de ce que le cabinet doit réunir.
    checklist_titre: 'Checklist de conformité du cabinet',
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
 * Libellés de conformité du marché. `options.tutelle_authority` (colonne
 * `cabinets.tutelle_authority`) permet à un cabinet français d'imposer son
 * propre libellé d'autorité — jamais pour le marché suisse, où le nom de
 * l'autorité vient de la loi, pas d'un champ libre.
 *
 * @param {'FR'|'CH'|string} marche
 * @param {{tutelle_authority?: string}} [options]
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
    chapeau: base.chapeau,
    checklist_titre: base.checklist_titre,
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
  chargerProfilConformite,
  chargerMarcheCabinet,
}
