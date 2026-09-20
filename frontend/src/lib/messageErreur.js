/* ============================================================================
   messageErreur — le TEXTE d'un refus, jamais son code technique
   ----------------------------------------------------------------------------
   POURQUOI (défaut P3 mesuré en production le 20/09/2026, QA adverse n° 2)
   Après une création de client refusée, l'écran affichait `lecture_seule` —
   l'identifiant technique renvoyé dans `error` — pendant plusieurs secondes,
   alors que l'API rédigeait à côté, dans `message` :
   « Votre rôle (assistant) donne accès à tout le cabinet en lecture, mais pas
     le droit de créer un client. »
   Cause : `toast.error(err.response.data.error)` (ClientNew.jsx:232).

   RÈGLE ICI : on affiche `message` s'il est rédigé ; `error` n'est utilisé que
   s'il s'agit d'une phrase (jamais un identifiant en `snake_case`). Un code
   machine est toujours remplacé par une phrase, et jamais montré au courtier.
   Aucune donnée n'est inventée : à défaut de texte exploitable, l'appelant
   fournit son propre message.
   ========================================================================== */

/** Identifiant technique : « lecture_seule », « statement_pdf_unavailable »… */
const CODE_MACHINE = /^[a-z0-9]+(?:_[a-z0-9]+)+$/

/** Codes connus des fonctions annoncées mais non installées (réponses 501). */
const CODES_NON_DISPONIBLE = ['fonctionnalite_non_implementee', 'statement_pdf_unavailable', 'not_implemented']

function texte(valeur) {
  return typeof valeur === 'string' ? valeur.trim() : ''
}

/** Une phrase rédigée, pas un identifiant technique. */
function estMessageHumain(valeur) {
  const t = texte(valeur)
  if (!t) return false
  if (CODE_MACHINE.test(t)) return false
  // Un identifiant isolé reste un code, même sans souligné (« forbidden »).
  if (!/\s/.test(t) && /^[a-z0-9]+$/.test(t)) return false
  return true
}

/**
 * Message affichable pour une erreur d'API.
 * @param {*} err erreur axios (ou toute erreur portant `response.data`)
 * @param {string} defaut phrase de repli fournie par l'écran
 * @returns {string} toujours une phrase, jamais un code
 */
export function messageErreurApi(err, defaut = 'Action impossible pour le moment. Réessayez.') {
  const data = err?.response?.data
  const statut = err?.response?.status
  const code = texte(data?.error) || texte(err?.code)

  // `message` d'abord : c'est lui qui porte la phrase rédigée par l'API.
  if (estMessageHumain(data?.message)) return data.message.trim()
  // Certaines routes imbriquent l'erreur : { error: { code, message } }.
  if (estMessageHumain(data?.error?.message)) return data.error.message.trim()
  // `error` n'est repris que s'il s'agit d'une phrase.
  if (estMessageHumain(data?.error)) return data.error.trim()
  // Repli honnête pour les fonctions annoncées mais non installées : on le dit.
  if (statut === 501 || CODES_NON_DISPONIBLE.includes(code) || CODES_NON_DISPONIBLE.includes(texte(data?.message))) {
    return 'Fonctionnalité non disponible dans cette version : aucune donnée n’a été produite.'
  }
  return defaut
}

/** Vrai si la réponse décrit une fonction annoncée mais non installée (501). */
export function erreurNonDisponible(err) {
  const data = err?.response?.data
  const statut = err?.response?.status
  const code = texte(data?.error) || texte(err?.code)
  return statut === 501 || CODES_NON_DISPONIBLE.includes(code)
}

/** Vrai si la réponse est le refus d'écriture d'un rôle en lecture seule. */
export function erreurLectureSeule(err) {
  const data = err?.response?.data
  return err?.response?.status === 403 && texte(data?.error) === 'lecture_seule'
}
