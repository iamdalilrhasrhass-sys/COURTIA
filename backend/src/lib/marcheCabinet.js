/**
 * marcheCabinet.js — LE MARCHÉ EST UNE PROPRIÉTÉ DU CABINET, PAS DE L'UTILISATEUR.
 *
 * POURQUOI CE MODULE EXISTE (défauts P0 reproduits en production le 20/09/2026,
 * cabinet suisse c8bb6112-4ecf-4807-b01d-b8ca561d11db, 1 propriétaire +
 * 1 commercial + 1 assistant + 1 lecteur)
 *   • `GET /api/auth/me` répondait `marche: 'CH', devise: 'CHF'` au SEUL
 *     propriétaire (dont `broker_profiles.pays = 'CH'`) et `marche: 'FR',
 *     devise: 'EUR'` à ses trois collègues du MÊME cabinet : le cockpit du
 *     propriétaire affichait « 7 450 CHF » et celui du commercial « 7 450 € ».
 *   • `GET /api/billing/plans` servait à ces mêmes collègues la grille
 *     française (« Starter 89 € HT / mois », « TVA 20 % ») au lieu de la grille
 *     suisse (199 / 349 CHF, TVA suisse 8,1 %) — donc une fiscalité fausse.
 *   • `POST /api/documents/generate` refusait au commercial la génération d'un
 *     document client avec `{"error":"orias_required","marche":"FR"}` parce que
 *     le registre était lu dans le profil de la personne connectée.
 * Cause unique : le marché (pays, devise, identité réglementaire) était lu dans
 * `broker_profiles`, c'est-à-dire dans l'UTILISATEUR, alors qu'il caractérise
 * l'ENTREPRISE. Un cabinet a UNE domiciliation, UN registre, UNE devise ; ses
 * collaborateurs ne peuvent pas en changer en se connectant.
 *
 * RÈGLE UNIQUE ET ORDRE DE RÉSOLUTION (implémenté UNE fois, dans
 * `marcheDuCabinet`) :
 *   1. LE CABINET (`cabinets.country`, puis son registre `FINMA`, puis sa
 *      devise) — c'est la source qui fait autorité ;
 *   2. le PROFIL DU RÉFÉRENT DU CABINET (le propriétaire, à défaut le membre le
 *      plus ancien) : repli utilisé tant qu'un cabinet n'a pas encore été
 *      complété — `cabinets.country` vaut 'France' par défaut de colonne pour
 *      TOUT locataire créé, valeur qui n'est donc PAS une décision (voir
 *      migration 117) ;
 *   3. le PROFIL DE L'UTILISATEUR — UNIQUEMENT pour un compte SANS cabinet
 *      (`cabinet_members` vide) : c'est le repli mono-utilisateur, comportement
 *      historique strictement inchangé pour les cabinets d'une seule personne ;
 *   4. la France, en dernier recours (aucun signal nulle part).
 * L'ordre 2 garantit une propriété essentielle : TOUS les membres d'un même
 * cabinet reçoivent LA MÊME réponse. Jamais le profil de l'appelant quand un
 * cabinet existe — c'est précisément ce qui produisait la divergence.
 *
 * REPLI MONO-UTILISATEUR (trois des quatre comptes réels de production)
 * Un compte sans ligne dans `cabinet_members` n'a pas de cabinet : sa réponse
 * continue de venir de son propre `broker_profiles` (marché, devise), puis de la
 * France. Aucune écriture, aucune création de cabinet : une LECTURE ne doit
 * jamais fabriquer un locataire.
 *
 * TOLÉRANCE ET SENS DES PANNES
 * Toute lecture en échec est retentée avec la liste de colonnes minimale (utile
 * si la migration 117 n'est pas encore appliquée), puis abandonnée au profit du
 * niveau suivant. Une panne fait donc retomber sur une réponse PLUS PRUDENTE
 * (jamais un marché plus large, jamais un droit supplémentaire) — à l'inverse
 * du `.catch(() => ({ rows: [] }))` qui transformait une erreur SQL en requête
 * SANS filtre (défaut P0 du classement `/api/objectifs/ranking`).
 */

const { marcheDepuis, devise: deviseDuMarche, symbole } = require('./devise')

/**
 * FUSEAU HORAIRE DU MARCHÉ.
 * POURQUOI : un rendez-vous poussé dans Google Calendar avec `timeZone:
 * 'Europe/Paris'` en dur portait une référence française pour TOUS les cabinets
 * (relevé : une tâche/rencontre d'un cabinet suisse à `Europe/Paris`). Paris et
 * Zurich partagent le même décalage UTC, donc aucune heure n'était fausse — mais
 * afficher « Paris » à un cabinet suisse est une référence étrangère gratuite,
 * et un futur marché à décalage différent deviendrait une vraie erreur d'heure.
 * Une seule source, comme le reste du marché.
 */
const FUSEAUX = Object.freeze({ FR: 'Europe/Paris', CH: 'Europe/Zurich' })

/** Fuseau horaire d'un marché (`FR` par défaut : comportement historique). */
function fuseauDuMarche(marche) {
  const code = String(marche || '').toUpperCase() === 'CH' ? 'CH' : 'FR'
  return FUSEAUX[code]
}

/**
 * Pool par défaut, chargé À L'APPEL et jamais à l'import.
 * POURQUOI : `src/db.js` appelle `process.exit(1)` quand DATABASE_URL est absente.
 * Un `require` en tête de fichier rendrait ce module — décision PURE, sans accès
 * données propre — impossible à charger par les tests unitaires et les outils qui
 * n'ont pas de base configurée (l'erreur était visible : la suite
 * services/arkPrompts.test.js ne pouvait plus démarrer).
 */
function poolParDefaut() {
  return require('../db')
}

/**
 * Nom posé par `DEFAULT` sur `cabinets.name` à la création d'un locataire.
 * Ce n'est PAS un nom : c'est un gabarit. Le traiter comme une valeur réelle
 * faisait imprimer « Cabinet COURTIA » sur le PDF d'un cabinet suisse nommé
 * autrement (défaut constaté) au lieu du nom réel de l'entreprise.
 */
const NOM_CABINET_PLACEHOLDER = 'Cabinet COURTIA'

/** Pays qui n'est qu'un DÉFAUT DE COLONNE (`cabinets.country DEFAULT 'France'`). */
const PAYS_PLACEHOLDER = Object.freeze(['FRANCE', 'FR', ''])

/** Colonnes d'identité ajoutées à `cabinets` par la migration 117. */
const COLONNES_CABINET = `id, name, orias_number, address_line1, postal_code, city, country,
    tutelle_authority, registre_type, registre_numero, uid, canton, telephone, adresse,
    ville, code_postal`

/** Colonnes sûres, présentes depuis l'origine (repli si 117 n'est pas passée). */
const COLONNES_CABINET_MINIMALES = `id, name, orias_number, address_line1, postal_code, city, country,
    tutelle_authority`

const COLONNES_REFERENT = `user_id, cabinet, cabinet_name, telephone, adresse, ville, code_postal,
    pays, langue, registre_type, registre_numero, uid, orias, canton`

/**
 * Lecteur SQL. Accepte, dans cet ordre : une FONCTION `query` (usage interne),
 * un objet `{ query }` (tests, transaction, pool local), et à défaut le pool du
 * module `../db`.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * CORRECTION DU 20/09/2026 — LE LECTEUR PAR OBJET DOIT ÊTRE RE-LIÉ
 *
 * DÉFAUT MESURÉ (preuve `qa_108_rt2_backend.py`, tâche d'un cabinet suisse) :
 * un appelant qui passait un VRAI pool `pg` (`marcheUtilisateur(userId, pool)`)
 * obtenait silencieusement le marché FRANÇAIS. Cause : la forme `{ query }`
 * rendait la méthode DÉTACHÉE de son objet (`return source.query`) ; pour
 * `pg.Pool`, `query` a besoin de son `this` (elle ouvre une connexion) — l'appel
 * levait donc une TypeError que chaque lecture de ce module rattrape, si bien
 * que la résolution retombait sur « aucun cabinet » puis sur la France. Aucun
 * message nulle part : une tâche suisse était estampillée « Europe/Paris ».
 *
 * La forme par objet est donc RE-LIÉE ici (`(sql, params) => source.query(...)`)
 * pour que la lecture annoncée comme supportée le soit réellement, quel que soit
 * le lecteur fourni (pool, transaction, client `pg`).
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Tolérer les deux formes évite le piège qui a réellement été rencontré : une
 * fonction exportée appelée SANS second argument lançait
 * `query is not a function`, l'erreur était absorbée par le repli, et
 * l'appelant croyait que l'utilisateur n'avait pas de cabinet.
 */
function lecteur(source) {
  if (typeof source === 'function') return source
  // Méthode re-liée à son objet : `pool.query` détaché d'un pool `pg` échoue.
  if (source && typeof source.query === 'function') return (sql, params) => source.query(sql, params)
  return (sql, params) => poolParDefaut().query(sql, params)
}

function texte(valeur) {
  return String(valeur ?? '').trim()
}

/** Le nom gabarit n'est pas un nom : renvoie `false` pour '', null ou le placeholder. */
function nomUtilisable(nom) {
  const valeur = texte(nom)
  if (!valeur) return false
  return valeur.toUpperCase() !== NOM_CABINET_PLACEHOLDER.toUpperCase()
}

/** Un pays n'est une DÉCISION que s'il désigne autre chose que le défaut de colonne. */
function paysDecisif(pays) {
  const valeur = texte(pays).toUpperCase()
  if (!valeur) return false
  return !PAYS_PLACEHOLDER.includes(valeur)
}

/** Identifiant de cabinet exploitable (UUID ou chaîne non vide). */
function identifiantCabinet(valeur) {
  const v = texte(valeur)
  return v ? v : null
}

function identifiantUtilisateur(valeur) {
  const id = Number.parseInt(valeur ?? '', 10)
  return Number.isFinite(id) && id > 0 ? id : null
}

/** Libellé d'autorité de tutelle cohérent avec le marché (jamais l'ACPR en Suisse). */
function autoritePour(marche, valeurExistante) {
  const existante = texte(valeurExistante)
  if (existante && !/^ACPR$/i.test(existante)) return existante
  return marche === 'CH'
    ? 'FINMA (Autorité fédérale de surveillance des marchés financiers)'
    : 'ACPR'
}

/** Fabrique la réponse normalisée d'un marché. */
function verdict(marche, { cabinetId = null, pays = '', source = '', nom = '' } = {}) {
  const code = marche === 'CH' ? 'CH' : 'FR'
  return Object.freeze({
    marche: code,
    devise: deviseDuMarche(code),
    symbole: symbole(code),
    fuseau: FUSEAUX[code],
    pays: texte(pays) || (code === 'CH' ? 'CH' : 'FR'),
    cabinet_id: cabinetId,
    nom: nom || '',
    source,
  })
}

/**
 * Lit la ligne `cabinets` demandée. Deux tentatives : colonnes complètes (après
 * migration 117), puis colonnes d'origine si la première échoue (colonne
 * absente). Aucun repli silencieux vers « tous les cabinets » : on rend `null`.
 */
async function lireCabinet(cabinetId, source) {
  const query = lecteur(source)
  const id = identifiantCabinet(cabinetId)
  if (!id) return null
  try {
    const { rows } = await query(`SELECT ${COLONNES_CABINET} FROM cabinets WHERE id = $1 LIMIT 1`, [id])
    return rows[0] || null
  } catch (_err) {
    try {
      const { rows } = await query(`SELECT ${COLONNES_CABINET_MINIMALES} FROM cabinets WHERE id = $1 LIMIT 1`, [id])
      return rows[0] || null
    } catch (_err2) {
      return null
    }
  }
}

/**
 * Cabinet de l'utilisateur, avec son rôle (même ordre de priorité que
 * `lib/porteeCabinet.resoudrePortee` : owner, manager, broker, assistant,
 * viewer, puis la plus ancienne appartenance).
 */
async function cabinetDeLUtilisateur(userId, source) {
  const query = lecteur(source)
  const uid = identifiantUtilisateur(userId)
  if (!uid) return null
  try {
    const { rows } = await query(
      `SELECT cm.cabinet_id, cm.role
         FROM cabinet_members cm
        WHERE cm.user_id = $1 AND cm.removed_at IS NULL
        ORDER BY CASE cm.role
                   WHEN 'owner' THEN 0 WHEN 'manager' THEN 1 WHEN 'broker' THEN 2
                   WHEN 'assistant' THEN 3 WHEN 'viewer' THEN 4 ELSE 5 END,
                 cm.created_at ASC
        LIMIT 1`,
      [uid]
    )
    const ligne = rows[0]
    const cabinetId = identifiantCabinet(ligne && ligne.cabinet_id)
    return cabinetId ? { cabinet_id: cabinetId, role: texte(ligne.role).toLowerCase() } : null
  } catch (_err) {
    // Appartenance illisible : on retombe sur le profil de l'utilisateur
    // (repli mono-utilisateur) — jamais sur un marché élargi.
    return null
  }
}

/**
 * Profil du RÉFÉRENT du cabinet : le propriétaire, à défaut le membre le plus
 * ancien encore présent. C'est lui qui porte l'identité de l'entreprise tant
 * que les colonnes de `cabinets` n'ont pas été complétées.
 */
async function profilReferentDuCabinet(cabinetId, source) {
  const query = lecteur(source)
  const id = identifiantCabinet(cabinetId)
  if (!id) return null
  try {
    const { rows } = await query(
      `SELECT ${COLONNES_REFERENT.split(',').map((c) => `bp.${c.trim()}`).join(', ')}, bp.user_id AS referent_user_id
         FROM cabinet_members cm
         JOIN broker_profiles bp ON bp.user_id = cm.user_id
        WHERE cm.cabinet_id = $1 AND cm.removed_at IS NULL
        ORDER BY CASE cm.role
                   WHEN 'owner' THEN 0 WHEN 'manager' THEN 1 WHEN 'broker' THEN 2
                   WHEN 'assistant' THEN 3 WHEN 'viewer' THEN 4 ELSE 5 END,
                 cm.created_at ASC
        LIMIT 1`,
      [id]
    )
    return rows[0] || null
  } catch (_err) {
    return null
  }
}

/** Profil du courtier (repli mono-utilisateur : aucune appartenance cabinet). */
async function profilUtilisateur(userId, source) {
  const query = lecteur(source)
  const uid = identifiantUtilisateur(userId)
  if (!uid) return null
  try {
    const { rows } = await query(`SELECT ${COLONNES_REFERENT} FROM broker_profiles WHERE user_id = $1 LIMIT 1`, [uid])
    return rows[0] || null
  } catch (_err) {
    return null
  }
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  LA FONCTION — `marcheDuCabinet(cabinetId)`
 *  Résout pays et devise d'un CABINET. Tous les appelants passent par elle.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @param {string|null} cabinetId identifiant du cabinet (uuid)
 * @param {{query?: Function}} [options] lecteur SQL injectable (tests)
 * @returns {Promise<{marche:'CH'|'FR', devise:'CHF'|'EUR', symbole:string,
 *                    pays:string, cabinet_id:string|null, nom:string, source:string}>}
 */
async function marcheDuCabinet(cabinetId, options = {}) {
  const query = lecteur(options)
  const id = identifiantCabinet(cabinetId)
  if (!id) return verdict('FR', { source: 'defaut_aucun_cabinet' })

  const cabinet = await lireCabinet(id, query)
  const nomCabinet = cabinet && nomUtilisable(cabinet.name) ? texte(cabinet.name) : ''

  if (cabinet) {
    // 1. Le cabinet décide : domiciliation réelle, registre FINMA, devise.
    if (paysDecisif(cabinet.country)) {
      return verdict(marcheDepuis({ pays: cabinet.country, registre_type: cabinet.registre_type }), {
        cabinetId: id, pays: cabinet.country, nom: nomCabinet, source: 'cabinet.country',
      })
    }
    if (texte(cabinet.registre_type).toUpperCase().includes('FINMA')) {
      return verdict('CH', { cabinetId: id, pays: 'CH', nom: nomCabinet, source: 'cabinet.registre_type' })
    }
  }

  // 2. Référent du cabinet (propriétaire) : même réponse pour tous les membres.
  const referent = await profilReferentDuCabinet(id, query)
  if (referent) {
    const marche = marcheDepuis(referent)
    const pays = texte(referent.pays)
    if (texte(pays) || texte(referent.registre_type) || texte(referent.uid)) {
      return verdict(marche, {
        cabinetId: id,
        pays: pays || (marche === 'CH' ? 'CH' : 'FR'),
        nom: nomCabinet || (nomUtilisable(referent.cabinet) ? texte(referent.cabinet) : ''),
        source: 'cabinet.referent',
      })
    }
  }

  // 3. Le cabinet existe mais ne porte aucun signal : on reste sur la France,
  //    pays par défaut historique, plutôt que d'inventer un marché.
  return verdict('FR', { cabinetId: id, pays: cabinet ? texte(cabinet.country) : '', nom: nomCabinet, source: 'cabinet.sans_signal' })
}

/**
 * Marché de l'UTILISATEUR : son cabinet s'il en a un (réponse identique pour
 * tous ses collègues), sinon son propre profil (mono-utilisateur), sinon FR.
 */
async function marcheUtilisateur(userId, options = {}) {
  const query = lecteur(options)
  const uid = identifiantUtilisateur(userId)
  if (!uid) return verdict('FR', { source: 'defaut_aucun_utilisateur' })

  const appartenance = await cabinetDeLUtilisateur(uid, query)
  if (appartenance) return marcheDuCabinet(appartenance.cabinet_id, options)

  // Aucun cabinet : repli mono-utilisateur sur le profil de l'utilisateur.
  const profil = await profilUtilisateur(uid, query)
  if (profil) {
    const marche = marcheDepuis(profil)
    if (texte(profil.pays) || texte(profil.registre_type) || texte(profil.uid)) {
      return verdict(marche, { pays: profil.pays, source: 'profil_utilisateur' })
    }
  }
  return verdict('FR', { source: 'defaut_profil_vide' })
}

/** Marché d'une requête Express authentifiée (jeton portant `id` ou `userId`). */
async function marcheDeLaRequete(req, options = {}) {
  const uid = identifiantUtilisateur(req && req.user && (req.user.id ?? req.user.userId))
  return marcheUtilisateur(uid, options)
}

/**
 * IDENTITÉ COMPLÈTE DU CABINET, telle que la voient TOUS ses membres
 * (écran Paramètres, en-tête des documents, e-mails, facturation).
 *
 * Le cabinet est la source ; le profil du référent complète les champs que le
 * cabinet ne porte pas encore (base non migrée, locataire créé avant 117). Le
 * `nom` n'est JAMAIS le gabarit « Cabinet COURTIA » : si aucun nom réel
 * n'existe, le champ reste vide — le gabarit ne doit pas devenir une identité.
 */
async function identiteCabinet(cabinetId, options = {}) {
  const query = lecteur(options)
  const marche = await marcheDuCabinet(cabinetId, options)
  const id = marche.cabinet_id
  if (!id) return { ...marche, nom: '', registre_type: '', registre_numero: '', uid: '', orias: '', canton: '', telephone: '', adresse: '', ville: '', code_postal: '', tutelle_authority: autoritePour(marche.marche, '') }

  const cabinet = (await lireCabinet(id, query)) || {}
  const referent = (await profilReferentDuCabinet(id, query)) || {}

  const premier = (...valeurs) => valeurs.map(texte).find((v) => v !== '') || ''

  const registreType = premier(cabinet.registre_type, referent.registre_type)
  const registreNumero = premier(cabinet.registre_numero, referent.registre_numero)
  const uid = premier(cabinet.uid, referent.uid)

  return {
    ...marche,
    nom: premier(nomUtilisable(cabinet.name) ? cabinet.name : '', referent.cabinet, referent.cabinet_name),
    registre_type: registreType,
    registre_numero: registreNumero,
    uid,
    // Un cabinet suisse n'a PAS d'ORIAS : le champ reste vide plutôt que de
    // faire apparaître un registre français sur un document suisse.
    orias: marche.marche === 'CH' ? '' : premier(cabinet.orias_number, referent.orias),
    canton: premier(cabinet.canton, referent.canton),
    telephone: premier(cabinet.telephone, referent.telephone),
    adresse: premier(cabinet.adresse, cabinet.address_line1, referent.adresse),
    ville: premier(cabinet.ville, cabinet.city, referent.ville),
    code_postal: premier(cabinet.code_postal, cabinet.postal_code, referent.code_postal),
    langue: premier(referent.langue),
    tutelle_authority: autoritePour(marche.marche, cabinet.tutelle_authority),
  }
}

/**
 * ÉCRITURE DU RÉFÉRENTIEL DU CABINET (écran Paramètres > Profil).
 *
 * POURQUOI ICI ET PAS DANS LE PROFIL DE L'UTILISATEUR
 * Quand le propriétaire enregistrait son identité suisse, elle n'allait que
 * dans `broker_profiles` — SA fiche. Les documents, e-mails, prompts et la
 * facturation des AUTRES membres du cabinet continuaient donc d'être résolus
 * depuis leur propre fiche (vide) : le commercial recevait `orias_required` et
 * la grille française. L'écriture doit donc atteindre le CABINET.
 *
 * Aucune valeur n'est inventée : seuls les champs reçus sont écrits, et jamais
 * le nom gabarit. Les colonnes historiques jumelles (`address_line1`, `city`,
 * `postal_code`, lues par la facturation) sont maintenues dans la même
 * écriture pour qu'aucun écran ne puisse afficher une adresse vide d'un côté et
 * remplie de l'autre.
 *
 * @returns {Promise<{ok:boolean, colonnes:string[], motif?:string}>}
 */
const CHAMPS_CABINET_PAR_CHAMP_PROFIL = Object.freeze({
  cabinet: 'name',
  cabinet_name: 'name',
  telephone: 'telephone',
  adresse: 'adresse',
  ville: 'ville',
  code_postal: 'code_postal',
  pays: 'country',
  registre_type: 'registre_type',
  registre_numero: 'registre_numero',
  uid: 'uid',
  canton: 'canton',
  orias: 'orias_number',
  orias_number: 'orias_number',
})

/** Normalise un pays saisi en code exploitable ('Suisse' → 'CH', 'France' → 'FR'). */
function normaliserPays(valeur) {
  const v = texte(valeur).toUpperCase()
  if (!v) return ''
  if (['CH', 'CHE', 'SUISSE', 'SWITZERLAND', 'SWISS'].includes(v)) return 'CH'
  if (['FR', 'FRA', 'FRANCE'].includes(v)) return 'FR'
  return v
}

async function mettreAJourIdentiteCabinet(cabinetId, champs = {}, options = {}) {
  const query = lecteur(options)
  const id = identifiantCabinet(cabinetId)
  if (!id) return { ok: false, colonnes: [], motif: 'aucun cabinet' }

  const valeurs = {}
  for (const [champProfil, colonne] of Object.entries(CHAMPS_CABINET_PAR_CHAMP_PROFIL)) {
    // Un champ NON TRANSMIS ne doit rien écraser : `undefined` est ignoré,
    // `null`/'' est une remise à zéro explicite demandée par l'appelant.
    if (!(champProfil in champs) || champs[champProfil] === undefined) continue
    let valeur = texte(champs[champProfil])
    if (colonne === 'name' && !nomUtilisable(valeur)) continue
    if (colonne === 'country') {
      valeur = normaliserPays(valeur)
      if (!valeur) continue
    }
    valeurs[colonne] = valeur === '' ? null : valeur
  }

  // Colonnes jumelles historiques : maintenues ensemble, jamais en désaccord.
  if ('adresse' in valeurs) valeurs.address_line1 = valeurs.adresse
  if ('ville' in valeurs) valeurs.city = valeurs.ville
  if ('code_postal' in valeurs) valeurs.postal_code = valeurs.code_postal

  const colonnes = Object.keys(valeurs)
  if (colonnes.length === 0) return { ok: false, colonnes: [], motif: 'aucun champ de cabinet fourni' }

  const assignations = colonnes.map((colonne, index) => `${colonne} = $${index + 2}`).join(', ')
  try {
    const { rowCount } = await query(
      `UPDATE cabinets SET ${assignations}, updated_at = NOW() WHERE id = $1`,
      [id, ...colonnes.map((colonne) => valeurs[colonne])]
    )
    if (!rowCount) return { ok: false, colonnes, motif: 'cabinet introuvable' }
    return { ok: true, colonnes }
  } catch (err) {
    // Colonne absente (migration 117 non appliquée) : on le DIT, on ne prétend
    // pas avoir enregistré, et l'appelant sait que son écriture est incomplète.
    return { ok: false, colonnes: [], motif: `écriture refusée : ${err && err.message}` }
  }
}

module.exports = {
  NOM_CABINET_PLACEHOLDER,
  FUSEAUX,
  fuseauDuMarche,
  COLONNES_CABINET,
  COLONNES_CABINET_MINIMALES,
  CHAMPS_CABINET_PAR_CHAMP_PROFIL,
  nomUtilisable,
  paysDecisif,
  normaliserPays,
  marcheDuCabinet,
  marcheUtilisateur,
  marcheDeLaRequete,
  cabinetDeLUtilisateur,
  profilReferentDuCabinet,
  identiteCabinet,
  mettreAJourIdentiteCabinet,
}
