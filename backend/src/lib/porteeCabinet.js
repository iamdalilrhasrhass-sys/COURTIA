/**
 * porteeCabinet.js — POINT D'ENTRÉE UNIQUE de l'autorisation multi-utilisateur.
 *
 * POURQUOI CE MODULE
 * Les routes métier filtraient `courtier_id = req.user.id` : les données
 * appartenaient donc à UN utilisateur, pas à un CABINET. Défaut reproduit en
 * production le 20/09/2026 — un collaborateur invité (rôle `broker`) voyait
 * 0 client quand le propriétaire en voyait 1 : un cabinet à plusieurs
 * commerciaux n'avait pas de CRM commun. Corriger route par route aurait
 * produit dix interprétations différentes de « à qui appartient cette ligne » :
 * ce module est la SEULE qui fasse autorité.
 *
 * RÔLE ET PORTÉE RÉSOLUS (politique implémentée, cf. §POLITIQUE plus bas)
 *   owner / manager  → tout le cabinet, lecture et écriture
 *   broker           → tout le cabinet, lecture et écriture
 *   assistant        → tout le cabinet en LECTURE, écriture refusée
 *   viewer           → tout le cabinet en LECTURE, écriture refusée
 *   aucun cabinet    → repli « mono-utilisateur » : l'utilisateur ne voit que
 *                      ses propres lignes (courtier_id = son id), exactement
 *                      le comportement d'avant la migration 113. C'est le cas
 *                      de trois des quatre comptes réels en production : rien
 *                      ne doit changer pour eux.
 *   APPARTENANCE RÉVOQUÉE → AUCUN droit : ni lecture, ni écriture, ni clé.
 *                      Voir §RÉVOCATION ci-dessous.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * RÉVOCATION (correction du 20/09/2026 — troisième QA adverse, défaut D3-09)
 *
 * DÉFAUT MESURÉ : `UPDATE cabinet_members SET removed_at = NOW()` — le geste
 * d'administration qui retire un collaborateur du cabinet — n'avait AUCUN
 * effet sur sa session. L'appartenance active disparaissant, la résolution
 * retombait sur le repli « mono-utilisateur », dont `peutEcrire` vaut `true` :
 * le collaborateur écarté créait encore des clients (201), des tâches (201),
 * des partenaires (201) et S'ÉMETTAIT UNE CLÉ D'API PERMANENTE (201). Un
 * retrait de membre qui laisse écrire est un retrait qui ne retire rien.
 *
 * RÈGLE TENUE ICI : une appartenance révoquée (`removed_at` renseigné) et
 * AUCUNE appartenance active ⇒ portée « révoquee », soit zéro droit :
 *   * `peutEcrire = false`, `peutSupprimer = false` → toute écriture est
 *     refusée 403 `acces_revoque` (garde globale ET routes) ;
 *   * la clause SQL de portée ne peut correspondre à AUCUNE ligne → le compte
 *     n'obtient plus rien du cabinet (recommandation retenue : rien du
 *     cabinet), pas même le contenu qu'il avait créé pendant son passage ;
 *   * `GET /api/developer/keys` ne liste plus rien, `POST` refuse.
 * Ce qui rouvre les droits : une NOUVELLE invitation acceptée (nouvelle ligne
 * `cabinet_members` active) — jamais le seul écoulement du temps.
 *
 * POURQUOI PAS LE REPLI « MONO » DANS CE CAS : « mono » est le comportement
 * historique des comptes qui n'ont JAMAIS eu de cabinet (trois des quatre
 * comptes réels). Il ne doit pas servir de porte de sortie à un compte dont le
 * rattachement a été délibérément retiré. Les deux situations se distinguent par
 * la PRÉSENCE d'une ligne `cabinet_members` révoquée, pas par une supposition.
 * ────────────────────────────────────────────────────────────────────────────
 *
 * L'appartenance est lue dans `cabinet_members` (jamais créée ici : une lecture
 * ne doit pas fabriquer un cabinet en base — `ensureUserCabinet` le fait
 * ailleurs, sur les routes qui l'assument).
 *
 * TOLÉRANCE : toute erreur de lecture d'appartenance retombe sur la portée
 * mono-utilisateur. Une panne de la table d'appartenance ne doit jamais donner
 * PLUS de droits que l'utilisateur n'en a, et ne doit pas rendre l'application
 * inutilisable pour les cabinets mono-utilisateur.
 */

const ROLE_RANG = Object.freeze({
  owner: 5,
  manager: 4,
  broker: 3,
  assistant: 2,
  viewer: 1,
})

/** Rôles autorisés à ÉCRIRE et à SUPPRIMER dans leur cabinet. */
const ROLES_ECRITURE = Object.freeze(['owner', 'manager', 'broker'])

/** Rôles autorisés à LIRE l'ensemble du cabinet. */
const ROLES_LECTURE = Object.freeze(['owner', 'manager', 'broker', 'assistant', 'viewer'])

/**
 * POURQUOI `broker` écrit dans tout le cabinet.
 * Un cabinet de cette taille n'a pas de cloison étanche par commercial : le
 * collaborateur qui reçoit un appel client doit pouvoir ouvrir, corriger et
 * clore le dossier d'un collègue absent. L'affectation commerciale (qui suit
 * quel dossier) reste portée par `courtier_id` / `assigned_to` / `broker_id`
 * quand la colonne existe : on sépare le DROIT D'AGIR de l'ATTRIBUTION.
 * `assistant` et `viewer` (fonctions d'appui : secrétariat, comptable,
 * direction non commerciale) lisent tout le cabinet mais ne modifient rien —
 * une écriture refusée est explicite (403) puisqu'ils savent déjà que la
 * ressource existe.
 */
function rolePermetEcriture(role) {
  return ROLES_ECRITURE.includes(String(role || '').toLowerCase())
}

function rangRole(role) {
  return ROLE_RANG[String(role || '').toLowerCase()] || 0
}

function identifiantUtilisateur(userOrId) {
  if (typeof userOrId === 'number') return Number.isFinite(userOrId) && userOrId > 0 ? userOrId : null
  const brut = userOrId?.id ?? userOrId?.userId ?? null
  const id = Number.parseInt(brut, 10)
  return Number.isFinite(id) && id > 0 ? id : null
}

/**
 * Une appartenance n'est retenue que si la ligne ressemble VRAIMENT à une ligne
 * de `cabinet_members` : un pool simulé (tests) qui renvoie n'importe quoi ne
 * doit pas fabriquer un cabinet imaginaire, ni une portée élargie.
 *
 * Une ligne RÉVOQUÉE (`removed_at` renseigné, ou `retire` vrai) n'est jamais une
 * appartenance active : elle ne donne accès à rien (voir §RÉVOCATION).
 */
function normaliserAppartenances(rows) {
  if (!Array.isArray(rows)) return []
  return rows
    .filter((ligne) => ligne && typeof ligne.cabinet_id === 'string' && ligne.cabinet_id.length > 0)
    .filter((ligne) => !(ligne.retire === true || ligne.removed_at != null))
    .map((ligne) => ({ cabinet_id: ligne.cabinet_id, role: String(ligne.role || '').toLowerCase() }))
}

/**
 * Portée « mono-utilisateur » : aucune appartenance exploitable.
 * `cabinetIds` vide ⇒ toutes les clauses SQL retombent sur le propriétaire.
 */
function porteeMono(userId, raison) {
  return Object.freeze({
    userId,
    estAuthentifie: userId !== null,
    mode: 'mono',
    role: null,
    appartenances: Object.freeze([]),
    cabinetId: null,
    cabinetIds: Object.freeze([]),
    cabinetIdsEcriture: Object.freeze([]),
    peutLireTout: true,
    peutEcrire: true,
    peutSupprimer: true,
    motif: raison || 'aucune appartenance cabinet : portée mono-utilisateur (comportement historique préservé)',
  })
}

/**
 * Portée d'un compte dont le rattachement au cabinet a été RÉVOQUÉ et qui n'a
 * aucune appartenance active (voir §RÉVOCATION en tête de fichier).
 *
 * Zéro droit : aucune lecture (la clause SQL de `fragment` ne peut correspondre
 * à aucune ligne), aucune écriture (403 `acces_revoque`, cf. refuserEcriture).
 * Le compte reste AUTHENTIFIÉ (son jeton est valide) : il n'est donc pas
 * question de répondre 401 — la personne se reconnecterait pour rien.
 */
function porteeRevoquee(userId, raison) {
  return Object.freeze({
    userId,
    estAuthentifie: userId !== null,
    mode: 'revoquee',
    role: null,
    appartenances: Object.freeze([]),
    cabinetId: null,
    cabinetIds: Object.freeze([]),
    cabinetIdsEcriture: Object.freeze([]),
    peutLireTout: false,
    peutEcrire: false,
    peutSupprimer: false,
    motif:
      raison ||
      'appartenance cabinet révoquée (cabinet_members.removed_at) : aucun droit tant qu’une nouvelle invitation n’a pas été acceptée',
  })
}

function construirePortee(userId, appartenances) {
  if (appartenances.length === 0) return porteeMono(userId)

  // Rôle le plus élevé : c'est lui qui décide des capacités générales de
  // l'utilisateur (le détail par cabinet reste dans `appartenances`).
  const principal = [...appartenances].sort((a, b) => rangRole(b.role) - rangRole(a.role))[0]
  const cabinetIds = [...new Set(appartenances.map((a) => a.cabinet_id))]
  const cabinetIdsEcriture = [
    ...new Set(appartenances.filter((a) => rolePermetEcriture(a.role)).map((a) => a.cabinet_id)),
  ]
  const peutEcrire = cabinetIdsEcriture.length > 0

  return Object.freeze({
    userId,
    estAuthentifie: true,
    mode: 'cabinet',
    role: principal.role,
    appartenances: Object.freeze(appartenances),
    // Cabinet « courant » : celui du rôle le plus élevé. Sert à ESTAMPILLER les
    // créations (clients, devis, tâches…).
    cabinetId: principal.cabinet_id,
    cabinetIds: Object.freeze(cabinetIds),
    cabinetIdsEcriture: Object.freeze(cabinetIdsEcriture),
    peutLireTout: true,
    peutEcrire,
    peutSupprimer: peutEcrire,
    motif: peutEcrire
      ? `rôle ${principal.role} : tout le cabinet en lecture et en écriture`
      : `rôle ${principal.role} : tout le cabinet en lecture, écriture refusée`,
  })
}

/**
 * Décision de portée à partir des lignes BRUTES de `cabinet_members`. Extrait
 * pour être partagé par `resoudrePortee` (route HTTP) et
 * `resoudrePorteeUtilisateur` (service qui ne reçoit qu'un identifiant) : les
 * deux chemins doivent appliquer EXACTEMENT les mêmes règles, sinon un service
 * verrait un périmètre différent de celui de la route qui l'appelle.
 */
function porteeDepuisLignes(userId, lignes) {
  const appartenances = normaliserAppartenances(lignes)
  const revoquees = (lignes || []).filter(
    (ligne) => ligne && (ligne.retire === true || ligne.removed_at != null)
  )
  if (appartenances.length > 0) return construirePortee(userId, appartenances)
  if (revoquees.length > 0) return porteeRevoquee(userId)
  return porteeMono(userId)
}

const REQUETE_APPARTENANCES = `
  SELECT cm.cabinet_id, cm.role, (cm.removed_at IS NOT NULL) AS retire
    FROM cabinet_members cm
   WHERE cm.user_id = $1
   ORDER BY CASE cm.role
              WHEN 'owner'     THEN 0
              WHEN 'manager'   THEN 1
              WHEN 'broker'    THEN 2
              WHEN 'assistant' THEN 3
              WHEN 'viewer'    THEN 4
              ELSE 5
            END,
            cm.created_at ASC
`

/**
 * Résout la portée d'un UTILISATEUR (sans requête HTTP).
 *
 * POURQUOI : de nombreux services (contexte ARK, veille ARK, compose,
 * docvision, quote-intel, portail…) ne reçoivent qu'un `userId` — ils n'ont pas
 * de `req`. Tant qu'ils filtraient `courtier_id = $1`, un collaborateur d'un
 * cabinet à plusieurs commerciaux voyait un portefeuille VIDE là où le CRM lui
 * montrait le cabinet entier : deux vérités pour une même donnée. Ce point
 * d'entrée donne aux services la portée autoritaire, sans dupliquer la règle.
 *
 * @param {object} pool pool `pg` (module `../db` ou `req.app.locals.pool`)
 * @param {number|object} userIdBrut identifiant ou objet porteur de `id`
 * @param {{portee?: object}} [options] portée déjà résolue par la route (évite
 *        un aller-retour base supplémentaire quand la route l'a en main)
 * @returns {Promise<object>} portée (jamais `null` : repli mono si illisible)
 */
async function resoudrePorteeUtilisateur(pool, userIdBrut, options = {}) {
  const userId = identifiantUtilisateur(userIdBrut)
  if (!userId) return porteeMono(null, 'identifiant utilisateur absent')
  if (options && options.portee && options.portee.userId === userId) return options.portee
  if (!pool || typeof pool.query !== 'function') return porteeMono(userId, 'pool indisponible')
  try {
    const resultat = await pool.query(REQUETE_APPARTENANCES, [userId])
    return porteeDepuisLignes(userId, (resultat && resultat.rows) || [])
  } catch (err) {
    // Jamais de droits supplémentaires en cas de panne : repli historique.
    return porteeMono(userId, `appartenance illisible (${err && err.message}) : portée mono-utilisateur`)
  }
}

/**
 * Résout la portée d'une requête authentifiée. Mémoïsée sur la requête : un
 * seul aller-retour base par requête HTTP, quel que soit le nombre d'appels.
 *
 * @param {object} pool pool `pg` réellement utilisé par la route
 *        (`req.app.locals.pool` ou le module `../db` — les deux marchent).
 * @param {object} req requête Express (porte `req.user`, issu du JWT vérifié).
 */
async function resoudrePortee(pool, req) {
  const userId = identifiantUtilisateur(req?.user)
  if (!userId) return porteeMono(null, 'requête non authentifiée')
  if (!pool || typeof pool.query !== 'function') return porteeMono(userId, 'pool indisponible')

  if (req._porteeCabinet && req._porteeCabinet.userId === userId) return req._porteeCabinet
  if (req._porteeCabinetPromesse) return req._porteeCabinetPromesse

  const promesse = (async () => {
    try {
      // UNE SEULE requête, y compris pour les lignes RÉVOQUÉES : on lit l'état
      // d'appartenance en entier (`removed_at`), sans quoi « aucune
      // appartenance » (repli mono légitime) et « appartenance retirée » (zéro
      // droit) seraient indiscernables — c'est exactement le défaut D3-09.
      const resultat = await pool.query(REQUETE_APPARTENANCES, [userId])
      const portee = porteeDepuisLignes(userId, (resultat && resultat.rows) || [])
      req._porteeCabinet = portee
      return portee
    } catch (err) {
      // Jamais de droits supplémentaires en cas de panne : on retombe sur la
      // portée historique (ses propres lignes uniquement).
      const portee = porteeMono(userId, `appartenance illisible (${err && err.message}) : portée mono-utilisateur`)
      req._porteeCabinet = portee
      return portee
    }
  })()

  req._porteeCabinetPromesse = promesse
  return promesse
}

/**
 * Fragment SQL de portée, à insérer dans un WHERE.
 *
 *   const p = porteeCabinet.fragment(portee, {
 *     cabinet: 'clients.cabinet_id',
 *     proprietaire: 'clients.courtier_id',
 *     depart: 1,
 *   })
 *   // p.sql      → "(clients.cabinet_id = ANY($1::uuid[]) OR clients.courtier_id = $2)"
 *   // p.params   → [ ['...uuid...'], 42 ]
 *   // p.suivant  → 3   (indice du prochain paramètre libre de la requête)
 *
 * Deux formes, une seule signification :
 *   * cabinet  → la ligne appartient à un cabinet de l'utilisateur, OU elle a
 *                été créée par lui avant son rattachement (cabinet_id NULL mais
 *                courtier_id = lui) : aucune donnée existante ne disparaît.
 *   * mono     → `proprietaire = $n`, exactement la clause historique.
 *
 * @param {boolean} ecriture pour une ÉCRITURE, on restreint aux cabinets où
 *        l'utilisateur a le DROIT d'écrire (assistant/viewer n'y figurent pas).
 */
function fragment(portee, { cabinet, proprietaire, depart = 1, ecriture = false } = {}) {
  const p = portee || porteeMono(null)
  const cabinetIds = ecriture ? (p.cabinetIdsEcriture || []) : (p.cabinetIds || [])
  if (!proprietaire) throw new Error('porteeCabinet.fragment : colonne propriétaire obligatoire')
  // PORTÉE RÉVOQUÉE : la clause est FAUSSE par construction (aucune ligne ne
  // peut y répondre). On conserve la forme du repli mono — un paramètre, mêmes
  // indices — pour que les requêtes qui numérotent leurs paramètres après le
  // fragment (`f.suivant`) ne changent pas de forme : seule la vérité de la
  // clause change. Un compte écarté du cabinet ne lit donc plus rien, y compris
  // ce qu'il avait créé pendant son passage.
  if (p.mode === 'revoquee') {
    return { sql: `(${proprietaire} = $${depart} AND FALSE)`, params: [p.userId], suivant: depart + 1 }
  }
  if (!cabinetIds.length) {
    return { sql: `${proprietaire} = $${depart}`, params: [p.userId], suivant: depart + 1 }
  }
  return {
    sql: `(${cabinet} = ANY($${depart}::uuid[]) OR ${proprietaire} = $${depart + 1})`,
    params: [cabinetIds, p.userId],
    suivant: depart + 2,
  }
}

/**
 * Refus d'écriture explicite pour un rôle en lecture seule (assistant/viewer)
 * ou pour un compte dont l'appartenance au cabinet a été RÉVOQUÉE (D3-09).
 * Renvoie `true` si la réponse est déjà partie : la route doit alors `return`.
 */
function refuserEcriture(portee, res, action = 'modifier') {
  if (!portee || portee.peutEcrire) return false
  if (portee.mode === 'revoquee') {
    // Message PRODUIT : il dit l'état du compte, pas un détail technique, et il
    // indique le seul chemin de retour (une nouvelle invitation).
    res.status(403).json({
      error: 'acces_revoque',
      message:
        'Votre accès à ce cabinet a été retiré : aucune donnée ne peut être créée ni modifiée. '
        + 'Demandez une nouvelle invitation au propriétaire du cabinet pour retrouver vos accès.',
    })
    return true
  }
  res.status(403).json({
    error: 'lecture_seule',
    role: portee.role,
    message: `Votre rôle (${portee.role}) donne accès à tout le cabinet en lecture, mais pas le droit de ${action}.`,
  })
  return true
}

/** Refus de suppression (mêmes rôles que l'écriture). */
function refuserSuppression(portee, res) {
  if (!portee || portee.peutSupprimer) return false
  if (portee.mode === 'revoquee') {
    res.status(403).json({
      error: 'acces_revoque',
      message:
        'Votre accès à ce cabinet a été retiré : aucune donnée ne peut être supprimée. '
        + 'Demandez une nouvelle invitation au propriétaire du cabinet pour retrouver vos accès.',
    })
    return true
  }
  res.status(403).json({
    error: 'lecture_seule',
    role: portee.role,
    message: `Votre rôle (${portee.role}) ne permet pas de supprimer une donnée du cabinet.`,
  })
  return true
}

/**
 * Cabient à estampiller sur une CRÉATION : le cabinet courant, ou `null` pour
 * un utilisateur sans cabinet (la ligne reste alors portée par courtier_id).
 */
function cabinetPourCreation(portee) {
  return portee && portee.cabinetId ? portee.cabinetId : null
}

module.exports = {
  ROLES_ECRITURE,
  ROLES_LECTURE,
  ROLE_RANG,
  rolePermetEcriture,
  rangRole,
  identifiantUtilisateur,
  resoudrePortee,
  resoudrePorteeUtilisateur,
  fragment,
  refuserEcriture,
  refuserSuppression,
  cabinetPourCreation,
  porteeMono,
  porteeRevoquee,
}
