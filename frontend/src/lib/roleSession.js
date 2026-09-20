/* ============================================================================
   roleSession — QUI A LE DROIT D'ÉCRIRE, lu depuis la session réelle
   ----------------------------------------------------------------------------
   POURQUOI (défaut P3 mesuré en production le 20/09/2026, QA adverse n° 2)
   Un compte de cabinet dont le rôle est `assistant` (lecture seule) voyait tous
   les formulaires d'écriture (« Nouveau client », « Créer le client »…) et son
   refus s'affichait en CODE MACHINE (`lecture_seule`) : l'écran montrait
   `err.response.data.error` au lieu du message rédigé par l'API.

   CE QUI FAIT AUTORITÉ
   Le rôle d'APPARTENANCE au cabinet (`cabinet_members.role`), que
   `GET /api/auth/me` expose sous `cabinet_role` — c'est exactement la valeur
   qu'utilise le backend (`lib/porteeCabinet.js`) pour accorder ou refuser une
   écriture : `owner`, `manager`, `broker` écrivent ; `assistant` et `viewer`
   lisent tout le cabinet mais n'écrivent pas.

   TROIS ÉTATS, PAS DEUX — ET POURQUOI L'ÉTAT « INCONNU » EXISTE
   La réponse de `POST /api/auth/login` ne porte QUE `id, email, firstName,
   lastName, role` : elle ne dit rien de l'appartenance au cabinet. Le compte
   `assistant` d'un cabinet a d'ailleurs `users.role = 'broker'` (rôle posé par
   l'invitation super-admin) et `cabinet_members.role = 'assistant'`. On ne peut
   donc PAS conclure « écriture autorisée » depuis le profil de connexion.
   Trois états sont distingués :
     • `lecture`  — rôle de cabinet connu et hors rôles d'écriture ;
     • `ecriture` — rôle de cabinet connu et autorisé (ou compte plateforme) ;
     • `inconnu`  — profil incomplet : on ne décide RIEN et on demande le profil
                    réel (`GET /api/auth/me`). Aucun rôle n'est inventé, et un
                    formulaire d'écriture n'est pas proposé sur une supposition.
   ========================================================================== */

const CLES_PROFIL_STOCKE = ['courtia_user', 'user']

/** Rôles de CABINET autorisés à écrire (source : backend/src/lib/porteeCabinet.js). */
export const ROLES_CABINET_ECRITURE = Object.freeze(['owner', 'manager', 'broker'])

/** Rôles de CABINET en lecture seule (écriture refusée par l'API). */
export const ROLES_CABINET_LECTURE = Object.freeze(['assistant', 'viewer'])

/** Rôles de PLATEFORME : ils n'appartiennent pas à la nomenclature cabinet. */
const ROLES_PLATEFORME = Object.freeze(['admin', 'super_admin'])

export const DROITS_LECTURE = 'lecture'
export const DROITS_ECRITURE = 'ecriture'
export const DROITS_INCONNU = 'inconnu'

function normaliser(role) {
  return String(role || '').trim().toLowerCase()
}

/** Profil de session persisté (`courtia_user`, repli `user`). */
export function lireProfilSession() {
  if (typeof localStorage === 'undefined') return null
  for (const cle of CLES_PROFIL_STOCKE) {
    try {
      const brut = localStorage.getItem(cle)
      if (!brut) continue
      const profil = JSON.parse(brut)
      if (profil && typeof profil === 'object') return profil
    } catch {
      // Profil illisible : on retombe sur l'état « inconnu », jamais sur un
      // droit supposé.
    }
  }
  return null
}

/**
 * Vrai si le profil stocké est le PROFIL COMPLET de `GET /api/auth/me`.
 * Le profil de connexion ne porte ni `marche` ni `cabinet_role` : sans ces
 * clés, les droits d'écriture ne sont pas décidables.
 */
export function profilComplet(profil) {
  return Boolean(profil && typeof profil === 'object' && ('cabinet_role' in profil || 'marche' in profil))
}

/**
 * Rôle qui décide de l'écriture, ou `null` si la session ne le dit pas.
 * @param {object|null} profil profil de session (`courtia_user`)
 * @returns {string|null}
 */
export function roleEcriture(profil) {
  if (!profil || typeof profil !== 'object') return null
  const roleCabinet = normaliser(profil.cabinet_role)
  if (roleCabinet) return roleCabinet
  // Profil complet dont l'appartenance est nulle : compte « mono-utilisateur »,
  // que l'API autorise à écrire. Rien à déduire de `users.role`.
  if (profilComplet(profil)) return null
  // Profil de connexion : seul `users.role` est connu, il ne dit pas le rôle de
  // cabinet. S'il désigne déjà un rôle de plateforme, l'écriture est acquise.
  const roleUtilisateur = normaliser(profil.role)
  return ROLES_PLATEFORME.includes(roleUtilisateur) ? roleUtilisateur : null
}

/**
 * État des droits d'écriture de la session.
 * @param {object|null} profil
 * @param {{ demonstration?: boolean }} [options] en démonstration, les écrans
 *        présentent des formulaires sans écrire en base : l'état est `ecriture`
 *        pour que la visite guidée reste utilisable.
 * @returns {'lecture'|'ecriture'|'inconnu'}
 */
export function droitsEcriture(profil, { demonstration = false } = {}) {
  if (demonstration) return DROITS_ECRITURE
  if (!profil || typeof profil !== 'object') return DROITS_INCONNU

  const roleCabinet = normaliser(profil.cabinet_role)
  if (roleCabinet) {
    if (ROLES_CABINET_LECTURE.includes(roleCabinet)) return DROITS_LECTURE
    if (ROLES_CABINET_ECRITURE.includes(roleCabinet)) return DROITS_ECRITURE
    // Rôle de cabinet inattendu : on ne suppose pas qu'il écrit.
    return DROITS_INCONNU
  }

  if (!profilComplet(profil)) {
    // Profil de connexion : `users.role` ne porte PAS le rôle de cabinet (un
    // compte `assistant` de cabinet y vaut `broker`). Seuls les rôles de
    // plateforme autorisent une conclusion ; sinon on ne décide rien.
    return ROLES_PLATEFORME.includes(normaliser(profil.role)) ? DROITS_ECRITURE : DROITS_INCONNU
  }

  // Profil complet SANS appartenance cabinet : portée « mono-utilisateur », que
  // l'API autorise à écrire (comportement historique conservé — trois des
  // quatre comptes réels n'ont pas de cabinet).
  return DROITS_ECRITURE
}

/** Vrai si le profil stocké décrit un rôle de cabinet en lecture seule. */
export function lectureSeulePour(profil) {
  return droitsEcriture(profil) === DROITS_LECTURE
}

/**
 * Phrase affichée pour un rôle en lecture seule — la MÊME formulation que
 * celle rédigée par l'API (`porteeCabinet.refuserEcriture`), avec l'action
 * demandée. Jamais un code technique.
 * @param {string} role rôle de cabinet (« assistant », « viewer »)
 * @param {string} [action] action refusée (« créer un client »…)
 */
export function messageLectureSeule(role, action = 'modifier les données du cabinet') {
  const libelle = normaliser(role) || 'lecture seule'
  return `Votre rôle (${libelle}) donne accès à tout le cabinet en lecture, mais pas le droit de ${action}.`
}
