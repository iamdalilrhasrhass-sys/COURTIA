/* ============================================================================
   COURTIARK — Démonstration : la devise suit le marché du VISITEUR
   ----------------------------------------------------------------------------
   POURQUOI CE MODULE (défauts P1 CH-020/CH-021, mesurés le 20/09/2026)
   La démonstration publique affichait « 39 810 € », « 4 777 € de commissions »
   et des montants en euros à TOUT visiteur, y compris un visiteur suisse : sur
   https://courtiark.fr/demo, un cabinet suisse voyait des euros. Un même produit
   n'a qu'une devise par marché : c'est la règle du reste de l'application
   (backend `lib/marcheCabinet.js`, frontend `lib/monnaie.js` et `lib/marche.js`),
   et la démonstration n'a aucune raison d'y échapper.

   RÈGLE ICI : le marché de la démonstration est celui du VISITEUR — il n'y a pas
   de cabinet connecté en démo. Il est résolu par `lib/marche.marchePublic`, la
   MÊME fonction que les autres écrans publics (override stocké → paramètre
   `?market=` → pays du document → fuseau horaire → France). Aucune heuristique
   n'est réinventée ici, et un visiteur sans signal reste en euros : le
   comportement historique est conservé pour la France.

   Ce module ne FORME pas les écrans à la place de `lib/monnaie.js` : il fournit
   la devise et le formatage des TEXTES de la démonstration (narration, réponses
   synthétiques), tandis que `installerDemo()` configure `lib/monnaie.js` avec le
   marché détecté pour que les composants RÉELS formatent eux aussi dans la bonne
   devise. Une seule règle, deux usages.
   ========================================================================== */

import { marchePublic } from '../lib/marche'

/** Marché de la démonstration : celui du visiteur (défaut FR). */
export function marcheDemo(search) {
  try {
    return marchePublic(search)
  } catch {
    // Résolution impossible (stockage indisponible, mode privé) : le
    // comportement historique, jamais un marché inventé.
    return 'FR'
  }
}

/** Devise de la démonstration : 'CHF' pour la Suisse, 'EUR' sinon. */
export function deviseDemo(marche = marcheDemo()) {
  return marche === 'CH' ? 'CHF' : 'EUR'
}

/** Locale de formatage correspondante : 'fr-CH' ou 'fr-FR'. */
export function localeDemo(marche = marcheDemo()) {
  return marche === 'CH' ? 'fr-CH' : 'fr-FR'
}

/** Symbole à coller à un nombre déjà formaté : « CHF » ou « € ». */
export function symboleDemo(marche = marcheDemo()) {
  return marche === 'CH' ? 'CHF' : '€'
}

/**
 * Montant de démonstration dans la devise du marché du visiteur.
 * Une valeur absente ou non numérique vaut '—' : on n'affiche jamais 0 à la
 * place d'un montant qu'on ne connaît pas.
 */
export function montantDemo(valeur, marche = marcheDemo(), options = {}) {
  const nombre = Number(valeur)
  if (!Number.isFinite(nombre)) return '—'
  return new Intl.NumberFormat(localeDemo(marche), {
    style: 'currency',
    currency: deviseDemo(marche),
    ...options,
  }).format(nombre)
}
