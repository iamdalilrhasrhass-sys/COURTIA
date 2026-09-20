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
 */
function normaliserAppartenances(rows) {
  if (!Array.isArray(rows)) return []
  return rows
    .filter((ligne) => ligne && typeof ligne.cabinet_id === 'string' && ligne.cabinet_id.length > 0)
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
      const resultat = await pool.query(
        `SELECT cm.cabinet_id, cm.role
           FROM cabinet_members cm
          WHERE cm.user_id = $1
            AND cm.removed_at IS NULL
          ORDER BY CASE cm.role
                     WHEN 'owner'     THEN 0
                     WHEN 'manager'   THEN 1
                     WHEN 'broker'    THEN 2
                     WHEN 'assistant' THEN 3
                     WHEN 'viewer'    THEN 4
                     ELSE 5
                   END,
                   cm.created_at ASC`,
        [userId]
      )
      const appartenances = normaliserAppartenances(resultat && resultat.rows)
      const portee = appartenances.length === 0
        ? porteeMono(userId)
        : construirePortee(userId, appartenances)
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
 * Refus d'écriture explicite pour un rôle en lecture seule (assistant/viewer).
 * Renvoie `true` si la réponse est déjà partie : la route doit alors `return`.
 */
function refuserEcriture(portee, res, action = 'modifier') {
  if (!portee || portee.peutEcrire) return false
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
  fragment,
  refuserEcriture,
  refuserSuppression,
  cabinetPourCreation,
  porteeMono,
}
