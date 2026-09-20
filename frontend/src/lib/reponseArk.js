/**
 * Contrat de la bulle ARK avec `POST /api/ark/chat`.
 *
 * Le backend répond `{ reply }` avec un code HTTP explicite
 * (backend/src/routes/ark.js : `res.json({ reply })`). Ce module est la SEULE
 * lecture de cette réponse, et il est testé : aucun texte ne doit être présenté
 * comme une réponse d'ARK quand le backend n'a pas confirmé la sienne.
 *
 * Règle : un statut d'erreur produit toujours un message d'erreur, jamais le
 * corps brut de la réponse ; un corps vide produit une phrase honnête, jamais
 * une invention.
 */

export const MESSAGE_REPONSE_VIDE = "ARK n'a pas produit de réponse. Reformulez votre demande."

export function lireReponseArk(statut, corps) {
  if (Number(statut) === 401) {
    return { texte: 'Session expirée : reconnectez-vous pour utiliser ARK.', erreur: true }
  }
  if (Number(statut) === 400) {
    return { texte: corps?.message || corps?.error || 'Demande invalide.', erreur: true }
  }
  if (Number(statut) === 429) {
    return { texte: 'Trop de demandes envoyées à ARK. Patientez un instant avant de réessayer.', erreur: true }
  }
  if (Number(statut) === 404) {
    return { texte: corps?.message || corps?.error || 'Service ARK introuvable. Contactez le support.', erreur: true }
  }
  if (Number(statut) >= 500) {
    return { texte: 'ARK est momentanément indisponible. Réessayez dans quelques instants.', erreur: true }
  }
  if (Number(statut) >= 400) {
    return { texte: corps?.message || corps?.error || `Erreur ${statut}.`, erreur: true }
  }
  const texte = String(corps?.reply ?? corps?.response ?? corps?.message ?? '').trim()
  return { texte: texte || MESSAGE_REPONSE_VIDE, erreur: !texte }
}

export function messageErreurArk(erreur) {
  return erreur?.name === 'AbortError'
    ? "ARK n'a pas répondu dans les 30 secondes. Reformulez ou réessayez."
    : 'Erreur de connexion'
}
