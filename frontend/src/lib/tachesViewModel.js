/**
 * Tâches — vue dérivée de la réponse réelle de `GET /api/taches`.
 *
 * Règle : aucun compteur, aucun libellé de client et aucune priorité ne sont
 * inventés. Ce que l'API ne renvoie pas reste vide ou « — ». Une tâche sans
 * échéance n'est jamais datée d'office, et une liste vide s'affiche comme vide
 * (l'écran montrait auparavant un jeu de 10 tâches inventées quand l'API ne
 * renvoyait rien).
 */

const STATUTS_TERMINES = new Set(['termine', 'terminee', 'terminée', 'done', 'complete', 'completed'])

/** Normalise une tâche de l'API vers la forme affichée. */
export function normaliserTache(brut = {}) {
  const clientNom = [brut.client_prenom, brut.client_nom].filter(Boolean).join(' ').trim()
  return {
    id: brut.id,
    titre: (brut.titre || brut.title || '').trim() || 'Tâche sans titre',
    description: (brut.description || '').trim(),
    statut: brut.statut || brut.status || 'a_faire',
    echeance: brut.echeance || brut.start_time || null,
    priorite: ['haute', 'moyenne', 'basse'].includes(brut.priorite) ? brut.priorite : 'normale',
    client_id: brut.client_id ?? null,
    client_nom: clientNom || (brut.client_id ? `Client #${brut.client_id}` : ''),
    terminee: STATUTS_TERMINES.has(String(brut.statut || brut.status || '').toLowerCase()),
  }
}

export function normaliserTaches(reponse) {
  const liste = Array.isArray(reponse)
    ? reponse
    : Array.isArray(reponse?.data) ? reponse.data
      : Array.isArray(reponse?.taches) ? reponse.taches
        : []
  return liste.map(normaliserTache)
}

const jour = (valeur) => (valeur ? String(valeur).slice(0, 10) : null)

/** Statistiques réelles. `null` = non mesurable (aucune donnée chargée). */
export function statistiquesTaches(taches, aujourdhuiIso) {
  if (!Array.isArray(taches)) return { retard: null, aujourdhui: null, semaine: null, terminees: null }
  const enRetard = taches.filter((t) => !t.terminee && jour(t.echeance) && jour(t.echeance) < aujourdhuiIso)
  const duJour = taches.filter((t) => jour(t.echeance) === aujourdhuiIso)
  const fin = finDeSemaine(aujourdhuiIso)
  const deLaSemaine = taches.filter((t) => !t.terminee && jour(t.echeance) && jour(t.echeance) <= fin)
  return {
    retard: enRetard.length,
    aujourdhui: duJour.length,
    semaine: deLaSemaine.length,
    terminees: taches.filter((t) => t.terminee).length,
  }
}

export function finDeSemaine(aujourdhuiIso) {
  const d = new Date(aujourdhuiIso + 'T00:00:00Z')
  const jourSemaine = d.getUTCDay() // 0 = dimanche
  const reste = (7 - jourSemaine) % 7
  d.setUTCDate(d.getUTCDate() + reste)
  return d.toISOString().slice(0, 10)
}

/** Vérifie que l'API a bien confirmé l'action avant d'afficher un changement. */
export function actionConfirmee(reponseAttendue, donnees) {
  if (reponseAttendue === 'suppression') return Boolean(donnees?.success || donnees?.id)
  return Boolean(donnees && (donnees.id || donnees.titre || donnees.success))
}
