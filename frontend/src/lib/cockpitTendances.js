/**
 * Libellés de tendance du cockpit — dérivés des données, jamais écrits en dur.
 *
 * Le cockpit affichait « +8 ce mois », « +12 ce mois », « +5,2 % vs M-1 » et
 * « +2 pts · bon état » sur un cabinet VIDE : quatre progressions inventées, sur
 * le premier écran vu par un prospect. Aucune de ces variations n'est mesurable
 * aujourd'hui (l'API ne fournit pas d'historique). La règle est donc : ne rien
 * afficher plutôt qu'un chiffre inventé, sauf lorsque la valeur est calculable.
 */

/** Interprétation du score de santé — `null` s'il n'y a pas de quoi le calculer. */
export function libelleSante(healthScore, aDesDonnees) {
  if (!aDesDonnees) return null
  const score = Number(healthScore)
  if (!Number.isFinite(score)) return null
  if (score >= 70) return 'bon état'
  if (score >= 40) return 'à surveiller'
  return 'à traiter'
}

/** Variation d'un compteur entre deux mesures ; `null` si non calculable.
 *  `null`/`undefined`/chaîne vide = absence de mesure (et non zéro) : sans la
 *  mesure précédente, aucune variation ne peut être annoncée. */
export function variation(actuel, precedent) {
  if (precedent === null || precedent === undefined || precedent === '') return null
  const a = Number(actuel)
  const p = Number(precedent)
  if (!Number.isFinite(a) || !Number.isFinite(p)) return null
  const delta = a - p
  if (delta === 0) return null
  return `${delta > 0 ? '+' : ''}${delta} ce mois`
}
